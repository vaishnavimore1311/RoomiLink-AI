"""Shared Expense Splitting and Debt Ledger Engine.

Calculates equal splits, maintains debt obligations, and computes
net 'Who Owes Whom' ledgers.
"""

from datetime import datetime, timezone
from typing import Dict, List, Any
from app import db
from app.models.household_models import Household, HouseholdMember, Expense, Payment
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
