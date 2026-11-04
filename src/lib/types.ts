// API Response wrappers
export interface ApiResponse<T> {
  message: string
  data: T
}

export interface PaginatedResponse<T> {
  message: string
  data: T[]
  meta: {
    total: number
    limit: number
    offset: number
  }
}

// Auth
export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  preferred_currency: string
  timezone: string
  created_at: string
  updated_at: string
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  expires_at: string
}

export interface AuthResponse {
  user: User
  tokens: AuthTokens
}

// Institution
export interface Institution {
  id: string
  name: string
  display_name: string
  logo_url: string | null
  website: string | null
  created_at: string
  updated_at: string
}

// Account
export type AccountType =
  | "checking"
  | "savings"
  | "credit_card"
  | "cash"
  | "investment"
  | "mortgage"
  | "auto_loan"
  | "personal_loan"
  | "student_loan"
  | "other_asset"
  | "other_liability"

export type AccountSourceType = "manual" | "connected"

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: "Checking",
  savings: "Savings",
  credit_card: "Credit Card",
  cash: "Cash",
  investment: "Investment",
  mortgage: "Mortgage",
  auto_loan: "Auto Loan",
  personal_loan: "Personal Loan",
  student_loan: "Student Loan",
  other_asset: "Other Asset",
  other_liability: "Other Liability",
}

export const LIABILITY_TYPES: AccountType[] = [
  "credit_card",
  "mortgage",
  "auto_loan",
  "personal_loan",
  "student_loan",
  "other_liability",
]

export interface Account {
  id: string
  user_id: string
  institution_id: string | null
  institution: Institution | null
  name: string
  account_type: AccountType
  account_subtype: string | null
  currency: string
  current_balance: string
  available_balance: string | null
  credit_limit: string | null
  interest_rate: string | null
  source_type: AccountSourceType
  created_at: string
  updated_at: string
  archived_at: string | null
}

// Category
export type CategoryType = "income" | "expense" | "transfer"

export interface Category {
  id: string
  user_id: string | null
  parent_id: string | null
  name: string
  category_type: CategoryType
  icon: string | null
  color: string | null
  is_system: boolean
  created_at: string
  updated_at: string
}

// Transaction
export type TransactionType = "debit" | "credit" | "transfer"
export type TransactionStatus = "pending" | "posted"
export type TransactionSourceType = "manual" | "imported"

export interface Transaction {
  id: string
  user_id: string
  account_id: string
  account: Account | null
  category_id: string | null
  category: Category | null
  amount: string
  currency: string
  transaction_date: string
  posted_date: string | null
  merchant_name: string | null
  description: string
  notes: string | null
  transaction_type: TransactionType
  status: TransactionStatus
  source_type: TransactionSourceType
  external_transaction_id: string | null
  created_at: string
  updated_at: string
}

// Budget
export interface Budget {
  id: string
  user_id: string
  name: string
  month: number
  year: number
  created_at: string
  updated_at: string
  categories?: BudgetCategory[]
}

export interface BudgetCategory {
  id: string
  budget_id: string
  category_id: string
  category: Category | null
  allocated_amount: string
  actual_amount: string
  created_at: string
  updated_at: string
}

// Dashboard
export interface SpendingByCategory {
  category_id: string
  category_name: string
  color: string | null
  icon: string | null
  amount: string
}

export interface DashboardSummary {
  currency: string
  net_worth: string
  total_assets: string
  total_liabilities: string
  monthly_income: string
  monthly_expenses: string
  spending_by_category: SpendingByCategory[]
  recent_transactions: Transaction[]
}

// Pagination
export interface PaginationParams {
  limit?: number
  offset?: number
}

// Transaction filters
export interface TransactionFilters extends PaginationParams {
  account_id?: string
  category_id?: string
  start_date?: string
  end_date?: string
  transaction_type?: TransactionType
  search?: string
}
