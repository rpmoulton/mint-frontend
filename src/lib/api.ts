import type {
  ApiResponse,
  AuthResponse,
  AuthTokens,
  PaginatedResponse,
  ProblemDetails,
  User,
  Institution,
  Account,
  Category,
  Transaction,
  Budget,
  BudgetCategory,
  DashboardSummary,
  TransactionFilters,
} from "./types"

const API_BASE = "/api/v1"

// Token storage
const ACCESS_TOKEN_KEY = "mint_access_token"
const REFRESH_TOKEN_KEY = "mint_refresh_token"

export const tokenStorage = {
  getAccess: () => {
    try {
      return localStorage.getItem(ACCESS_TOKEN_KEY)
    } catch {
      return null
    }
  },
  getRefresh: () => {
    try {
      return localStorage.getItem(REFRESH_TOKEN_KEY)
    } catch {
      return null
    }
  },
  set: (access: string, refresh: string) => {
    try {
      localStorage.setItem(ACCESS_TOKEN_KEY, access)
      localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
    } catch {
      // storage unavailable
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
    } catch {
      // storage unavailable
    }
  },
}

export class ApiError extends Error {
  status: number
  problem?: ProblemDetails

  constructor(status: number, message: string, problem?: ProblemDetails) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.problem = problem
  }
}

let refreshPromise: Promise<boolean> | null = null

export async function tryRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise

  const refreshToken = tokenStorage.getRefresh()
  if (!refreshToken) return false

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${refreshToken}`,
        },
      })
      if (!res.ok) {
        tokenStorage.clear()
        return false
      }
      const json = (await res.json()) as ApiResponse<AuthTokens>
      if (json.data?.access_token && json.data?.refresh_token) {
        tokenStorage.set(json.data.access_token, json.data.refresh_token)
        return true
      }
      tokenStorage.clear()
      return false
    } catch {
      tokenStorage.clear()
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

// Core fetch wrapper
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = tokenStorage.getAccess()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }
  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  // Handle 401 Unauthorized — attempt refresh once unless this was the refresh/login call
  if (res.status === 401 && !path.startsWith("/auth/refresh") && !path.startsWith("/auth/login")) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      headers["Authorization"] = `Bearer ${tokenStorage.getAccess()}`
      const retryRes = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
      })
      if (!retryRes.ok) {
        const problem = await parseProblem(retryRes)
        throw new ApiError(retryRes.status, extractErrorMessage(problem), problem)
      }
      if (retryRes.status === 204) {
        return undefined as T
      }
      return retryRes.json() as Promise<T>
    }
    // Refresh failed
    tokenStorage.clear()
    throw new ApiError(401, "Session expired")
  }

  if (!res.ok) {
    const problem = await parseProblem(res)
    throw new ApiError(res.status, extractErrorMessage(problem), problem)
  }

  // 204 No Content
  if (res.status === 204) {
    return undefined as T
  }

  return res.json() as Promise<T>
}

async function parseProblem(res: Response): Promise<ProblemDetails | undefined> {
  try {
    const text = await res.text()
    if (!text) return undefined
    return JSON.parse(text) as ProblemDetails
  } catch {
    return undefined
  }
}

function extractErrorMessage(problem?: ProblemDetails): string {
  if (!problem) return "Request failed"
  if (problem.detail) return problem.detail
  if (problem.title) return problem.title
  const obj = problem as unknown as Record<string, unknown>
  if (typeof obj.message === "string") {
    return obj.message
  }
  return "Request failed"
}

// Helper to build query string
function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      qs.set(k, String(v))
    }
  }
  const str = qs.toString()
  return str ? `?${str}` : ""
}

// Auth API
export const authApi = {
  register: (body: { email: string; password: string; first_name: string; last_name: string }) =>
    apiFetch<ApiResponse<AuthResponse>>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  login: (body: { email: string; password: string }) =>
    apiFetch<ApiResponse<AuthResponse>>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  me: () => apiFetch<ApiResponse<User>>("/auth/me"),
  logout: () => apiFetch<ApiResponse<{ message: string }>>("/auth/logout", { method: "POST" }),
}

// Institutions API
export const institutionsApi = {
  list: () => apiFetch<ApiResponse<Institution[]>>("/institutions"),
  create: (body: { name: string; display_name: string; logo_url?: string; website?: string }) =>
    apiFetch<ApiResponse<Institution>>("/institutions", {
      method: "POST",
      body: JSON.stringify(body),
    }),
}

// Accounts API
export const accountsApi = {
  list: (includeArchived = false) =>
    apiFetch<ApiResponse<Account[]>>(
      `/accounts${buildQuery({ include_archived: includeArchived || undefined })}`,
    ),
  get: (id: string) => apiFetch<ApiResponse<Account>>(`/accounts/${id}`),
  create: (body: {
    name: string
    account_type: string
    account_subtype?: string
    institution_id?: string
    currency?: string
    current_balance: string
    available_balance?: string
    credit_limit?: string
    interest_rate?: string
  }) =>
    apiFetch<ApiResponse<Account>>("/accounts", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (
    id: string,
    body: Partial<{
      name: string
      account_type: string
      account_subtype: string
      institution_id: string
      currency: string
      current_balance: string
      available_balance: string
      credit_limit: string
      interest_rate: string
      archive: boolean
      unarchive: boolean
    }>,
  ) =>
    apiFetch<ApiResponse<Account>>(`/accounts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  delete: (id: string) => apiFetch<void>(`/accounts/${id}`, { method: "DELETE" }),
}

// Categories API
export const categoriesApi = {
  list: () => apiFetch<ApiResponse<Category[]>>("/categories"),
  get: (id: string) => apiFetch<ApiResponse<Category>>(`/categories/${id}`),
  create: (body: {
    name: string
    type: string
    parent_category_id?: string
    icon?: string
    color?: string
  }) =>
    apiFetch<ApiResponse<Category>>("/categories", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (
    id: string,
    body: Partial<{
      name: string
      type: string
      parent_category_id: string
      icon: string
      color: string
    }>,
  ) =>
    apiFetch<ApiResponse<Category>>(`/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  delete: (id: string) => apiFetch<void>(`/categories/${id}`, { method: "DELETE" }),
}

// Transactions API
export const transactionsApi = {
  list: (filters: TransactionFilters = {}) =>
    apiFetch<PaginatedResponse<Transaction>>(
      `/transactions${buildQuery(filters as Record<string, string | number | boolean | undefined | null>)}`,
    ),
  get: (id: string) => apiFetch<ApiResponse<Transaction>>(`/transactions/${id}`),
  create: (body: {
    account_id: string
    category_id?: string
    amount: string
    currency: string
    transaction_date: string
    merchant_name?: string
    description: string
    notes?: string
    transaction_type: string
  }) =>
    apiFetch<ApiResponse<Transaction>>("/transactions", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (
    id: string,
    body: Partial<{
      category_id: string | null
      amount: string
      merchant_name: string
      description: string
      notes: string
      transaction_date: string
    }>,
  ) =>
    apiFetch<ApiResponse<Transaction>>(`/transactions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  delete: (id: string) => apiFetch<void>(`/transactions/${id}`, { method: "DELETE" }),
}

// Budgets API
export const budgetsApi = {
  list: () => apiFetch<ApiResponse<Budget[]>>("/budgets"),
  get: (id: string) => apiFetch<ApiResponse<Budget>>(`/budgets/${id}`),
  create: (body: { name: string; month: number; year: number }) =>
    apiFetch<ApiResponse<Budget>>("/budgets", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (id: string, body: Partial<{ name: string }>) =>
    apiFetch<ApiResponse<Budget>>(`/budgets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  delete: (id: string) => apiFetch<void>(`/budgets/${id}`, { method: "DELETE" }),
  upsertCategory: (budgetId: string, body: { category_id: string; allocated_amount: string }) =>
    apiFetch<ApiResponse<BudgetCategory>>(`/budgets/${budgetId}/categories`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  deleteCategory: (budgetId: string, categoryId: string) =>
    apiFetch<void>(`/budgets/${budgetId}/categories/${categoryId}`, { method: "DELETE" }),
}

// Dashboard API
export const dashboardApi = {
  summary: (params?: { month?: number; year?: number }) =>
    apiFetch<ApiResponse<DashboardSummary>>(
      `/dashboard/summary${buildQuery(params || {})}`,
    ),
}
