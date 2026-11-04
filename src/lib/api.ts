import type { ApiResponse, PaginatedResponse } from "./types"

const API_BASE = "/api/v1"

// Token storage
const ACCESS_TOKEN_KEY = "access_token"
const REFRESH_TOKEN_KEY = "refresh_token"

export const tokenStorage = {
  getAccess: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  set: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, access)
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
  },
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  },
}

// Core fetch wrapper
async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = tokenStorage.getAccess()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  if (res.status === 401) {
    // Try refresh
    const refreshed = await tryRefresh()
    if (refreshed) {
      // Retry original request with new token
      headers["Authorization"] = `Bearer ${tokenStorage.getAccess()}`
      const retryRes = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
      })
      if (!retryRes.ok) {
        const err = await retryRes.json().catch(() => ({ message: "Request failed" }))
        throw new ApiError(retryRes.status, err.message || "Request failed")
      }
      return retryRes.json() as Promise<T>
    }
    // Refresh failed — clear tokens (let the auth context handle redirect)
    tokenStorage.clear()
    throw new ApiError(401, "Session expired")
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Request failed" }))
    throw new ApiError(res.status, err.message || "Request failed")
  }

  // 204 No Content
  if (res.status === 204) {
    return undefined as T
  }

  return res.json() as Promise<T>
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = tokenStorage.getRefresh()
  if (!refreshToken) return false

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
    if (!res.ok) return false
    const data = await res.json()
    if (data.data?.tokens) {
      tokenStorage.set(data.data.tokens.access_token, data.data.tokens.refresh_token)
      return true
    }
    return false
  } catch {
    return false
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
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

// Auth
export const authApi = {
  register: (body: { email: string; password: string; first_name: string; last_name: string }) =>
    apiFetch<ApiResponse<{ user: import("./types").User; tokens: import("./types").AuthTokens }>>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  login: (body: { email: string; password: string }) =>
    apiFetch<ApiResponse<{ user: import("./types").User; tokens: import("./types").AuthTokens }>>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  me: () => apiFetch<ApiResponse<import("./types").User>>("/auth/me"),
  logout: () => apiFetch<void>("/auth/logout", { method: "POST" }),
}

// Institutions
export const institutionsApi = {
  list: () => apiFetch<ApiResponse<import("./types").Institution[]>>("/institutions"),
  create: (body: { name: string; display_name: string; logo_url?: string; website?: string }) =>
    apiFetch<ApiResponse<import("./types").Institution>>("/institutions", {
      method: "POST",
      body: JSON.stringify(body),
    }),
}

// Accounts
export const accountsApi = {
  list: (includeArchived = false) =>
    apiFetch<ApiResponse<import("./types").Account[]>>(
      `/accounts${buildQuery({ include_archived: includeArchived || undefined })}`,
    ),
  get: (id: string) => apiFetch<ApiResponse<import("./types").Account>>(`/accounts/${id}`),
  create: (body: {
    name: string
    account_type: string
    account_subtype?: string
    institution_id?: string
    currency: string
    current_balance: string
    available_balance?: string
    credit_limit?: string
    interest_rate?: string
  }) =>
    apiFetch<ApiResponse<import("./types").Account>>("/accounts", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (id: string, body: Partial<{
    name: string
    account_type: string
    account_subtype: string
    institution_id: string
    currency: string
    current_balance: string
    available_balance: string
    credit_limit: string
    interest_rate: string
  }>) =>
    apiFetch<ApiResponse<import("./types").Account>>(`/accounts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  delete: (id: string) => apiFetch<void>(`/accounts/${id}`, { method: "DELETE" }),
}

// Categories
export const categoriesApi = {
  list: () => apiFetch<ApiResponse<import("./types").Category[]>>("/categories"),
  get: (id: string) => apiFetch<ApiResponse<import("./types").Category>>(`/categories/${id}`),
  create: (body: {
    name: string
    category_type: string
    parent_id?: string
    icon?: string
    color?: string
  }) =>
    apiFetch<ApiResponse<import("./types").Category>>("/categories", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (id: string, body: Partial<{ name: string; category_type: string; icon: string; color: string }>) =>
    apiFetch<ApiResponse<import("./types").Category>>(`/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  delete: (id: string) => apiFetch<void>(`/categories/${id}`, { method: "DELETE" }),
}

// Transactions
export const transactionsApi = {
  list: (filters: import("./types").TransactionFilters = {}) =>
    apiFetch<PaginatedResponse<import("./types").Transaction>>(
      `/transactions${buildQuery(filters as Record<string, string | number | boolean | undefined | null>)}`,
    ),
  get: (id: string) => apiFetch<ApiResponse<import("./types").Transaction>>(`/transactions/${id}`),
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
    apiFetch<ApiResponse<import("./types").Transaction>>("/transactions", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (id: string, body: Partial<{
    category_id: string | null
    amount: string
    merchant_name: string
    description: string
    notes: string
    transaction_date: string
  }>) =>
    apiFetch<ApiResponse<import("./types").Transaction>>(`/transactions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  delete: (id: string) => apiFetch<void>(`/transactions/${id}`, { method: "DELETE" }),
}

// Budgets
export const budgetsApi = {
  list: () => apiFetch<ApiResponse<import("./types").Budget[]>>("/budgets"),
  get: (id: string) => apiFetch<ApiResponse<import("./types").Budget>>(`/budgets/${id}`),
  create: (body: { name: string; month: number; year: number }) =>
    apiFetch<ApiResponse<import("./types").Budget>>("/budgets", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (id: string, body: Partial<{ name: string }>) =>
    apiFetch<ApiResponse<import("./types").Budget>>(`/budgets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  delete: (id: string) => apiFetch<void>(`/budgets/${id}`, { method: "DELETE" }),
  upsertCategory: (budgetId: string, body: { category_id: string; allocated_amount: string }) =>
    apiFetch<ApiResponse<import("./types").BudgetCategory>>(`/budgets/${budgetId}/categories`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  deleteCategory: (budgetId: string, categoryId: string) =>
    apiFetch<void>(`/budgets/${budgetId}/categories/${categoryId}`, { method: "DELETE" }),
}

// Dashboard
export const dashboardApi = {
  summary: () => apiFetch<ApiResponse<import("./types").DashboardSummary>>("/dashboard/summary"),
}
