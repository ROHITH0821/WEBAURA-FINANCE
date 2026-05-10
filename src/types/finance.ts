export type ProjectType = 'basic' | 'business' | 'ecommerce' | 'saas' | 'custom'
export type PaymentMethod = 'upi' | 'bank_transfer' | 'cash' | 'cheque'
export type PaymentStage = 'advance' | 'milestone_1' | 'milestone_2' | 'milestone_3' | 'final' | 'full'
export type ExpenseCategory =
  | 'infrastructure'
  | 'tools'
  | 'marketing'
  | 'travel'
  | 'client_work'
  | 'team'
  | 'subscriptions'
  | 'miscellaneous'

export interface Founder {
  name: string
  email: string
  role: 'super_admin' | 'founder'
}

export interface FinanceProject {
  id: string
  project_code: string
  client_name: string
  project_type: ProjectType
  agreed_value: number
  payment_structure: 'full_upfront' | 'fifty_fifty' | 'milestone' | 'custom'
  project_lead: string
  status: 'active' | 'completed' | 'on_hold' | 'cancelled'
  created_at: string
  total_received: number
  total_expenses: number
  net_profit: number
}

export interface PaymentEntry {
  id: string
  project_id: string
  amount: number
  payment_date: string
  received_by: string
  payment_method: PaymentMethod
  payment_stage: PaymentStage
  transaction_ref: string
  receipt_url?: string | null
  notes?: string | null
  verified: boolean
  verified_by?: string | null
  created_at: string
}

export interface Expense {
  id: string
  requested_by: string
  amount: number
  spent_on: string
  category: ExpenseCategory
  project_id?: string | null
  client_name_manual?: string | null
  transaction_ref: string
  receipt_url?: string | null
  request_date: string
  status: 'pending' | 'approved' | 'paid' | 'rejected'
  approved_by?: string | null
  approved_at?: string | null
  paid_at?: string | null
  payment_transaction_ref?: string | null
  created_at: string
}

export interface FounderBalance {
  founder_id: string;
  founder_name: string;
  total_received: number;     // payments that landed in their account
  total_expenses: number;     // expenses paid from their account
  company_liability: number;  // total_received - total_expenses (what they owe the company)
  fair_share_expenses: number;
  reimbursement_owed: number; // positive = owed to them, negative = they owe others
}

export interface MonthlySummary {
  month: string;             // e.g. "April 2026"
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  founder_balances: FounderBalance[];
  outstanding_payments: { project_code: string; client_name: string; amount: number }[];
  unverified_entries: number;
}
