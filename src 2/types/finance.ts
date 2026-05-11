export type ProjectType = 'Basic' | 'Business' | 'Ecommerce' | 'Custom SaaS';
export type PaymentMethod = 'UPI' | 'BankTransfer' | 'Cash' | 'Other';
export type PaymentStage = 'Advance' | 'Milestone' | 'Final' | 'Other';
export type ExpenseCategory = 'Infrastructure' | 'Tools' | 'Marketing' | 'Travel' | 'Entertainment' | 'Miscellaneous';
export type ProofStatus = 'verified' | 'unverified';

export interface Founder {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'super_admin' | 'founder';
}

export interface FinanceProject {
  id: string;
  project_code: string;
  client_name: string;
  project_type: ProjectType;
  agreed_value: number;
  payment_structure: string;
  lead_founder_id: string;
  admin_lead_id?: string;
  status: 'active' | 'completed' | 'cancelled';
  created_by: string;
  created_at: string;
  // Computed fields (from joins)
  total_received?: number;
  outstanding_balance?: number;
  payment_entries?: PaymentEntry[];
}

export interface PaymentEntry {
  id: string;
  project_id: string;
  amount: number;
  received_date: string;
  received_by: string;
  payment_method: PaymentMethod;
  transaction_ref?: string;
  payment_stage: PaymentStage;
  proof_status: ProofStatus;
  notes?: string;
  created_by: string;
  created_at: string;
}

export interface Expense {
  id: string;
  amount: number;
  description: string;
  paid_by: string;
  category: ExpenseCategory;
  expense_date: string;
  transaction_ref?: string;
  receipt_url?: string;
  proof_status: ProofStatus;
  project_id?: string;
  notes?: string;
  created_by: string;
  created_at: string;
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
