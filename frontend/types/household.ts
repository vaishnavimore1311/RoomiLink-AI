export interface HouseholdInfo {
  id: number;
  name: string;
  address: string;
  invite_code: string;
  created_by_id: number;
  created_at: string | null;
  member_count: number;
}

export interface HouseholdMemberInfo {
  id: number;
  household_id: number;
  user_id: number;
  role: "admin" | "member";
  joined_at: string | null;
  user_name: string;
  user_email: string;
  avatar_url?: string | null;
}

export interface ExpenseItem {
  id: number;
  household_id: number;
  payer_id: number;
  payer_name: string;
  title: string;
  amount: number;
  category: string;
  split_type: string;
  created_at: string | null;
  payments: Array<{
    id: number;
    expense_id: number;
    from_user_id: number;
    from_user_name: string;
    to_user_id: number;
    to_user_name: string;
    amount: number;
    is_settled: boolean;
    settled_at: string | null;
  }>;
}

export interface DebtObligation {
  from_user_id: number;
  from_user_name: string;
  to_user_id: number;
  to_user_name: string;
  amount: number;
}

export interface LedgerData {
  total_i_owe: number;
  total_owed_to_me: number;
  net_balance: number;
  debts: DebtObligation[];
  recent_expenses: ExpenseItem[];
  category_breakdown?: Record<string, number>;
}

export interface ChoreItem {
  id: number;
  household_id: number;
  assigned_to_id?: number | null;
  assigned_to_name?: string;
  title: string;
  frequency: string;
  due_date?: string | null;
  is_completed: boolean;
  completed_at?: string | null;
}
