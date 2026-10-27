"""Shared Expense Splitting and Debt Ledger Engine.

Calculates equal splits, maintains debt obligations, and computes
net 'Who Owes Whom' ledgers.
"""

from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from app import db
from app.models.household_models import Household, HouseholdMember, Expense, Payment, Activity, ActivityParticipant
from app.models.user_models import User

def add_household_expense(
    household_id: int,
    payer_id: int,
    title: str,
    amount: float,
    category: str = "Groceries",
    split_type: str = "equal",
    split_with_user_ids: List[int] = None
) -> Expense:
    """Add an expense and generate payment debt obligations."""
    expense = Expense(
        household_id=household_id,
        payer_id=payer_id,
        title=title,
        amount=amount,
        category=category,
        split_type=split_type
    )
    db.session.add(expense)
    db.session.flush()

    # Determine participating members
    if split_with_user_ids:
        participant_ids = list(set(split_with_user_ids))
        if payer_id not in participant_ids:
            participant_ids.append(payer_id)
    else:
        members = HouseholdMember.query.filter_by(household_id=household_id).all()
        participant_ids = [m.user_id for m in members]

    if not participant_ids:
        participant_ids = [payer_id]

    share_per_person = round(amount / len(participant_ids), 2)

    # Create debt obligations for non-payers
    for uid in participant_ids:
        if uid != payer_id:
            payment = Payment(
                expense_id=expense.id,
                from_user_id=uid,
                to_user_id=payer_id,
                amount=share_per_person,
                is_settled=False
            )
            db.session.add(payment)

    db.session.commit()
    return expense


def create_activity_expense(
    household_id: int,
    created_by_id: int,
    payer_id: int,
    title: str,
    total_amount: float,
    category: str = "general",
    split_method: str = "equal",
    participant_ids: Optional[List[int]] = None,
    custom_shares: Optional[Any] = None,
    description: Optional[str] = None,
    activity_date: Optional[Any] = None,
    notes: Optional[str] = None
) -> Activity:
    """Create an activity and generate split expenses strictly for participating roommates."""
    # 1. Basic validation
    if not title or not title.strip():
        raise ValueError("Activity name is required.")
    
    try:
        total_float = round(float(total_amount), 2)
    except (ValueError, TypeError):
        raise ValueError("Total amount must be a valid number.")

    if total_float <= 0:
        raise ValueError("Total amount must be greater than zero.")

    total_cents = int(round(total_float * 100))

    # 2. Participant validation
    if not participant_ids:
        raise ValueError("At least one participant is required.")

    # Deduplicate while preserving order
    clean_participant_ids = []
    seen = set()
    for uid in participant_ids:
        try:
            uid_int = int(uid)
            if uid_int not in seen:
                seen.add(uid_int)
                clean_participant_ids.append(uid_int)
        except (ValueError, TypeError):
            continue

    if not clean_participant_ids:
        raise ValueError("At least one valid participant is required.")

    # 3. Household membership verification
    household_members = HouseholdMember.query.filter_by(household_id=household_id).all()
    valid_member_ids = {m.user_id for m in household_members}

    if not valid_member_ids:
        raise ValueError("Household has no active members.")

    if created_by_id not in valid_member_ids:
        raise ValueError("Creator does not belong to this household.")

    if payer_id not in valid_member_ids:
        raise ValueError("Payer does not belong to this household.")

    for pid in clean_participant_ids:
        if pid not in valid_member_ids:
            raise ValueError(f"Participant {pid} does not belong to this household.")

    # 4. Split calculation
    split_method = (split_method or "equal").strip().lower()
    shares_map: Dict[int, float] = {}

    if split_method == "equal":
        n = len(clean_participant_ids)
        base_cents = total_cents // n
        remainder_cents = total_cents % n

        # Allocate remainder cents to the first remainder_cents participants
        for idx, uid in enumerate(clean_participant_ids):
            cents = base_cents + (1 if idx < remainder_cents else 0)
            shares_map[uid] = round(cents / 100.0, 2)

    elif split_method == "custom":
        # Normalize custom_shares into a dict: {user_id: float_amount}
        normalized_custom: Dict[int, float] = {}
        if isinstance(custom_shares, dict):
            for k, v in custom_shares.items():
                try:
                    normalized_custom[int(k)] = round(float(v), 2)
                except (ValueError, TypeError):
                    raise ValueError(f"Invalid custom share amount for participant {k}.")
        elif isinstance(custom_shares, list):
            for item in custom_shares:
                if isinstance(item, dict) and "user_id" in item:
                    try:
                        normalized_custom[int(item["user_id"])] = round(float(item.get("amount", 0)), 2)
                    except (ValueError, TypeError):
                        raise ValueError("Invalid custom share in list format.")

        # Ensure all participants have an amount
        for uid in clean_participant_ids:
            if uid not in normalized_custom:
                raise ValueError(f"Custom share amount missing for participant {uid}.")
            amt = normalized_custom[uid]
            if amt < 0:
                raise ValueError("Custom share amount cannot be negative.")
            shares_map[uid] = amt

        # Ensure no extraneous positive shares for non-participants
        for uid, amt in normalized_custom.items():
            if uid not in clean_participant_ids and amt > 0:
                raise ValueError(f"User {uid} was given a share but is not in the participant list.")

        # Sum validation in cents to prevent paise rounding loopholes
        custom_sum_cents = sum(int(round(shares_map[uid] * 100)) for uid in clean_participant_ids)
        if custom_sum_cents != total_cents:
            raise ValueError(
                f"Custom split amounts sum to ₹{custom_sum_cents / 100:.2f}, "
                f"which does not match the total expense amount of ₹{total_cents / 100:.2f}."
            )
    else:
        raise ValueError(f"Invalid split method '{split_method}'. Must be 'equal' or 'custom'.")

    # 5. Parse activity date
    parsed_date = datetime.now(timezone.utc)
    if activity_date:
        if isinstance(activity_date, datetime):
            parsed_date = activity_date
        elif isinstance(activity_date, str):
            try:
                parsed_date = datetime.fromisoformat(activity_date.replace("Z", "+00:00"))
            except Exception:
                parsed_date = datetime.now(timezone.utc)

    # 6. Database transaction
    try:
        activity = Activity(
            household_id=household_id,
            created_by_id=created_by_id,
            payer_id=payer_id,
            title=title.strip(),
            description=description.strip() if description else None,
            category=category or "general",
            total_amount=total_float,
            split_method=split_method,
            activity_date=parsed_date,
            notes=notes.strip() if notes else None
        )
        db.session.add(activity)
        db.session.flush()

        # Add participant records
        for uid in clean_participant_ids:
            participant = ActivityParticipant(
                activity_id=activity.id,
                user_id=uid,
                share_amount=shares_map[uid],
                has_paid=(uid == payer_id)  # Payer pays their own share directly
            )
            db.session.add(participant)

        # Create integrated Expense record for ledger, category breakdown & history
        expense = Expense(
            household_id=household_id,
            payer_id=payer_id,
            title=title.strip(),
            amount=total_float,
            category=category or "general",
            split_type=split_method,
            activity_id=activity.id
        )
        db.session.add(expense)
        db.session.flush()

        # Generate debt obligations for non-payer participants
        for uid in clean_participant_ids:
            if uid != payer_id and shares_map[uid] > 0:
                payment = Payment(
                    expense_id=expense.id,
                    from_user_id=uid,
                    to_user_id=payer_id,
                    amount=shares_map[uid],
                    is_settled=False
                )
                db.session.add(payment)

        db.session.commit()
        return activity

    except Exception:
        db.session.rollback()
        raise


def calculate_ledger(household_id: int, current_user_id: int = None) -> Dict[str, Any]:
    """Calculate net balances and pairwise who-owes-whom ledger."""
    # Fetch all unsettled payments for this household's expenses
    expenses = Expense.query.filter_by(household_id=household_id).all()
    expense_ids = [e.id for e in expenses]

    if not expense_ids:
        return {
            "total_i_owe": 0.0,
            "total_owed_to_me": 0.0,
            "net_balance": 0.0,
            "debts": [],
            "recent_expenses": [],
            "category_breakdown": {}
        }

    unsettled_payments = Payment.query.filter(
        Payment.expense_id.in_(expense_ids),
        Payment.is_settled == False
    ).all()

    # Pairwise ledger map: (user_a, user_b) -> net balance
    net_pairs: Dict[tuple, float] = {}
    total_i_owe = 0.0
    total_owed_to_me = 0.0

    for p in unsettled_payments:
        if current_user_id:
            if p.from_user_id == current_user_id:
                total_i_owe += p.amount
            elif p.to_user_id == current_user_id:
                total_owed_to_me += p.amount

        pair_key = (min(p.from_user_id, p.to_user_id), max(p.from_user_id, p.to_user_id))
        direction = 1 if p.from_user_id < p.to_user_id else -1
        # Positive means min_id owes max_id
        net_pairs[pair_key] = net_pairs.get(pair_key, 0.0) + (p.amount * direction)

    debts_list = []
    for (u1, u2), net_amt in net_pairs.items():
        net_amt = round(net_amt, 2)
        if net_amt == 0.0:
            continue

        debtor_id = u1 if net_amt > 0 else u2
        creditor_id = u2 if net_amt > 0 else u1
        owed_amount = abs(net_amt)

        debtor = db.session.get(User, debtor_id)
        creditor = db.session.get(User, creditor_id)

        debtor_name = debtor.profile.full_name if debtor and debtor.profile else f"User {debtor_id}"
        creditor_name = creditor.profile.full_name if creditor and creditor.profile else f"User {creditor_id}"

        debts_list.append({
            "from_user_id": debtor_id,
            "from_user_name": debtor_name,
            "to_user_id": creditor_id,
            "to_user_name": creditor_name,
            "amount": owed_amount
        })

    recent_expenses = [e.to_dict() for e in sorted(expenses, key=lambda x: x.created_at or datetime.min, reverse=True)[:15]]

    category_breakdown: Dict[str, float] = {}
    for e in expenses:
        cat = e.category or "Other"
        category_breakdown[cat] = round(category_breakdown.get(cat, 0.0) + float(e.amount), 2)

    return {
        "total_i_owe": round(total_i_owe, 2),
        "total_owed_to_me": round(total_owed_to_me, 2),
        "net_balance": round(total_owed_to_me - total_i_owe, 2),
        "debts": debts_list,
        "recent_expenses": recent_expenses,
        "category_breakdown": category_breakdown
    }


def settle_debt_between_users(household_id: int, from_user_id: int, to_user_id: int) -> int:
    """Settle mutual debt between two users, marking opposing obligations as settled."""
    expenses = Expense.query.filter_by(household_id=household_id).all()
    expense_ids = [e.id for e in expenses]

    if not expense_ids:
        return 0

    # Retrieve all unsettled payments in both directions between the two users
    payments = Payment.query.filter(
        Payment.expense_id.in_(expense_ids),
        Payment.is_settled == False,
        db.or_(
            db.and_(Payment.from_user_id == from_user_id, Payment.to_user_id == to_user_id),
            db.and_(Payment.from_user_id == to_user_id, Payment.to_user_id == from_user_id)
        )
    ).all()

    if not payments:
        return 0

    now = datetime.now(timezone.utc)
    for p in payments:
        p.is_settled = True
        p.settled_at = now

    db.session.commit()
    return len(payments)
