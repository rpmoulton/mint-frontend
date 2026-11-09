import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { DashboardPage } from "./dashboard"
import { dashboardApi } from "@/lib/api"
import * as AuthModule from "@/lib/auth"
import type { DashboardSummary, ApiResponse } from "@/lib/types"

// Real backend seed data example from /api/v1/dashboard/summary
const realSummaryResponse: ApiResponse<DashboardSummary> = {
  message: "Dashboard summary retrieved",
  data: {
    primary_currency: "USD",
    total_cash: "27250.25",
    total_assets: "95401.05",
    total_liabilities: "15025.40",
    net_worth: "80375.65",
    monthly_income: "4250.00",
    monthly_expenses: "1816.80",
    savings_rate: 57.251764705882344,
    by_currency: [
      {
        currency: "USD",
        total_cash: "27250.25",
        total_assets: "95401.05",
        total_liabilities: "15025.40",
        net_worth: "80375.65",
      },
    ],
    spending_by_category: [
      {
        category_id: "00000000-0000-0000-0000-000000000007",
        category_name: "Housing",
        category_color: "#8B5CF6",
        category_icon: "Home",
        total_spent: "1650.00",
        percentage: 90.81902245706736,
        transaction_count: "1",
      },
      {
        category_id: "00000000-0000-0000-0000-000000000004",
        category_name: "Groceries",
        category_color: "#F59E0B",
        category_icon: "ShoppingCart",
        total_spent: "142.30",
        percentage: 7.83245266402466,
        transaction_count: "1",
      },
      {
        category_id: "00000000-0000-0000-0000-000000000005",
        category_name: "Restaurants",
        category_color: "#F97316",
        category_icon: "Utensils",
        total_spent: "24.50",
        percentage: 1.34852487890797,
        transaction_count: "1",
      },
    ],
    recent_transactions: [
      {
        id: "d310c7b9-ee9a-45ab-b940-2ca0d731795e",
        user_id: "bec5bf23-ce01-425b-8705-7ccf8857266e",
        account_id: "4acb87ff-056a-4743-97a1-89448107e9a6",
        account_name: "Sapphire Preferred",
        category_id: "00000000-0000-0000-0000-000000000004",
        category_name: "Groceries",
        category_color: "#F59E0B",
        category_icon: "ShoppingCart",
        category_type: "expense",
        amount: "-142.3000",
        currency: "USD",
        transaction_date: "2026-11-03",
        posted_date: null,
        merchant_name: "Trader Joe's",
        description: "Weekly groceries haul",
        notes: null,
        transaction_type: "debit",
        status: "posted",
        source_type: "manual",
        external_transaction_id: null,
        created_at: "2026-11-04T18:18:49Z",
        updated_at: "2026-11-04T18:18:49Z",
      },
      {
        id: "3b8080dd-3153-4ef8-8924-b883df0ff6ba",
        user_id: "bec5bf23-ce01-425b-8705-7ccf8857266e",
        account_id: "42c12e77-efe8-4fcf-a43e-1ef1a18b6f1b",
        account_name: "Premier Checking",
        category_id: "00000000-0000-0000-0000-000000000001",
        category_name: "Salary",
        category_color: "#10B981",
        category_icon: "Briefcase",
        category_type: "income",
        amount: "4250.0000",
        currency: "USD",
        transaction_date: "2026-11-01",
        posted_date: null,
        merchant_name: "Acme Corp",
        description: "Acme Corp Direct Deposit",
        notes: null,
        transaction_type: "credit",
        status: "posted",
        source_type: "manual",
        external_transaction_id: null,
        created_at: "2026-11-04T18:18:49Z",
        updated_at: "2026-11-04T18:18:49Z",
      },
    ],
  },
}

function renderDashboard(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <DashboardPage />
    </QueryClientProvider>,
  )
}

describe("DashboardPage", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.restoreAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    })

    vi.spyOn(AuthModule, "useAuth").mockReturnValue({
      user: {
        id: "bec5bf23-ce01-425b-8705-7ccf8857266e",
        email: "demo@mint.local",
        first_name: "Alex",
        last_name: "Morgan",
        preferred_currency: "USD",
        timezone: "America/New_York",
        created_at: "",
        updated_at: "",
      },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    })
  })

  it("5. displays loading skeleton state when fetching dashboard data", () => {
    vi.spyOn(dashboardApi, "summary").mockImplementation(
      () => new Promise(() => {}), // Never resolves to keep loading state active
    )

    const { container } = renderDashboard(queryClient)
    expect(container.querySelectorAll("[data-slot=skeleton]").length).toBeGreaterThan(0)
  })

  it("6. renders successful dashboard with real financial metrics, spending, and transactions", async () => {
    vi.spyOn(dashboardApi, "summary").mockResolvedValueOnce(realSummaryResponse)

    renderDashboard(queryClient)

    // Summary cards
    await waitFor(() => {
      expect(screen.getByText("$80,375.65")).toBeInTheDocument() // Net Worth
    })

    expect(screen.getByText("$95,401.05")).toBeInTheDocument() // Total Assets
    expect(screen.getByText("$15,025.40")).toBeInTheDocument() // Total Liabilities
    expect(screen.getByText("$27,250.25")).toBeInTheDocument() // Total Cash
    expect(screen.getAllByText("+$4,250.00").length).toBe(2) // Monthly Income & Salary Transaction
    expect(screen.getByText("$1,816.80")).toBeInTheDocument() // Monthly Expenses
    expect(screen.getByText("57.3%")).toBeInTheDocument() // Savings Rate

    // Spending by Category
    expect(screen.getByText("Housing")).toBeInTheDocument()
    expect(screen.getByText("$1,650.00")).toBeInTheDocument()
    expect(screen.getAllByText("Groceries").length).toBe(2) // Category Breakdown & Transaction Category
    expect(screen.getByText("$142.30")).toBeInTheDocument()

    // Recent Transactions
    expect(screen.getByText("Weekly groceries haul")).toBeInTheDocument()
    expect(screen.getByText("Trader Joe's")).toBeInTheDocument()
    expect(screen.getByText("-$142.30")).toBeInTheDocument()
    expect(screen.getByText("Acme Corp Direct Deposit")).toBeInTheDocument()
  })

  it("7. renders error state with retry button when API fails", async () => {
    vi.spyOn(dashboardApi, "summary").mockRejectedValueOnce(
      new Error("Could not connect to financial aggregation service"),
    )

    renderDashboard(queryClient)

    await waitFor(() => {
      expect(screen.getByText("Failed to load dashboard data")).toBeInTheDocument()
      expect(
        screen.getByText("Could not connect to financial aggregation service"),
      ).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument()
    })
  })
})
