// Problem details (RFC 7807)
export interface ProblemDetails {
  type: string
  title: string
  status: number
  detail?: string
  instance?: string
  extensions?: Record<string, unknown>
}

// API Response wrappers
export interface ApiResponse<T> {
  message: string
  data: T
}

export interface PaginationMeta {
  has_next: boolean
  has_prev: boolean
  limit: number
  records?: string
  next_after_id?: string
  next_after_created_at?: string
  prev_before_id?: string
  prev_before_created_at?: string
}

export interface PaginatedResponse<T> {
  message: string
  data: T[]
  meta?: PaginationMeta
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
  expires_in: string // int64 string
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
  | "depository"
  | "credit"
  | "loan"
  | "investment"
  | "other_asset"
  | "other_liability"

export type AccountSourceType = "manual" | "connected"

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  depository: "Checking / Savings",
  credit: "Credit Card",
  loan: "Loan",
  investment: "Investment",
  other_asset: "Other Asset",
  other_liability: "Other Liability",
}

export const LIABILITY_TYPES: AccountType[] = [
  "credit",
  "loan",
  "other_liability",
]

export const ASSET_TYPES: AccountType[] = [
  "depository",
  "investment",
  "other_asset",
]

export interface Account {
  id: string
  user_id: string
  name: string
  account_type: AccountType
  account_subtype: string
  currency: string
  current_balance: string
  available_balance: string | null
  credit_limit: string | null
  interest_rate: string | null
  institution_id: string | null
  institution_name: string | null
  institution_display_name: string | null
  institution_logo_url: string | null
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
  parent_category_id: string | null
  name: string
  type: CategoryType
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
  account_name: string
  category_id: string | null
  category_name: string | null
  category_color: string | null
  category_icon: string | null
  category_type: string | null
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
  category_name?: string
  allocated_amount: string
  actual_amount: string
  created_at: string
  updated_at: string
}

// Dashboard
export interface CategorySpending {
  category_id: string
  category_name: string
  category_icon: string | null
  category_color: string | null
  total_spent: string
  percentage: number
  transaction_count: string
}

export interface CurrencySummary {
  currency: string
  net_worth: string
  total_assets: string
  total_liabilities: string
  total_cash: string
}

export interface DashboardSummary {
  primary_currency: string
  total_cash: string
  total_assets: string
  total_liabilities: string
  net_worth: string
  monthly_income: string
  monthly_expenses: string
  savings_rate: number
  by_currency: CurrencySummary[]
  spending_by_category: CategorySpending[]
  recent_transactions: Transaction[]
}

// Transaction filters
export interface TransactionFilters {
  limit?: number
  after?: string
  before?: string
  account_id?: string
  category_id?: string
  start_date?: string
  end_date?: string
  transaction_type?: TransactionType
  search?: string
}
