export type ProjectType = 'basic' | 'business' | 'ecommerce' | 'saas' | 'custom'
export type PaymentMethod = 'upi' | 'bank_transfer' | 'cash' | 'cheque'
export type PaymentStage = 'advance' | 'milestone_1' | 'milestone_2' | 'milestone_3' | 'final' | 'full'

/** Default seeded slugs — kept for migration seed + fallback when catalog table is unavailable. */
export const EXPENSE_CATEGORIES = [
  'infrastructure',
  'tools',
  'marketing',
  'travel',
  'client_work',
  'team',
  'subscriptions',
  'salaries',
  'agency_payout',
  'office',
  'miscellaneous',
  'other',
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  infrastructure: 'Infrastructure',
  tools: 'Tools',
  marketing: 'Marketing',
  travel: 'Travel',
  client_work: 'Client Work',
  team: 'Team',
  subscriptions: 'Subscriptions',
  salaries: 'Salaries',
  agency_payout: 'Agency Payout',
  office: 'Office',
  miscellaneous: 'Miscellaneous',
  other: 'Other',
}

/** Row from finance.expense_categories — admin-managed catalog for expense tagging. */
export interface ExpenseCategoryCatalogItem {
  id: string
  slug: string
  label: string
  sort_order: number
  is_active: boolean
  is_system: boolean
  created_at: string
}

/** How each project/recurring client's revenue is sourced — drives share-of-revenue reporting. */
export const REVENUE_TYPES = ['agency_digital_marketing', 'website_maintenance', 'direct_client'] as const

export type RevenueType = (typeof REVENUE_TYPES)[number]

export const REVENUE_TYPE_LABELS: Record<RevenueType, string> = {
  agency_digital_marketing: 'Agency Digital Marketing',
  website_maintenance: 'Website Maintenance',
  direct_client: 'Direct Client',
}

export interface Founder {
  name: string
  email: string
  role: 'super_admin' | 'founder'
}

/** A marketing agency partner — one agency can have many projects/recurring clients feeding into it. */
export interface Agency {
  id: string
  name: string
  is_active: boolean
  notes?: string | null
  created_at: string
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
  revenue_type: RevenueType
  agency_id?: string | null
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
  category: string
  custom_category_label?: string | null
  project_id?: string | null
  agency_id?: string | null
  client_name_manual?: string | null
  transaction_ref: string
  receipt_url?: string | null
  request_date: string
  /** Exact add time for expenses created after migration 039; null on legacy rows. */
  logged_at?: string | null
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
