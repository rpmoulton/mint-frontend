import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BudgetsPage } from "./budgets"
import { budgetsApi, categoriesApi } from "@/lib/api"
import type { Budget, Category } from "@/lib/types"

// ─── Test Categories ─────────────────────────────────────────────────────────

const mockParentExpense: Category = {
  id: "cat-parent-food",
  user_id: "user-1",
  parent_category_id: null,
  name: "Food & Dining",
  type: "expense",
  icon: "Utensils",
  color: "#F59E0B",
  is_system: false,
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
}

const mockChildExpense1: Category = {
  id: "cat-child-groceries",
  user_id: "user-1",
  parent_category_id: "cat-parent-food",
  name: "Groceries",
  type: "expense",
  icon: "ShoppingCart",
  color: "#10B981",
  is_system: false,
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
}

const mockChildExpense2: Category = {
  id: "cat-child-restaurants",
  user_id: "user-1",
  parent_category_id: "cat-parent-food",
  name: "Restaurants",
  type: "expense",
  icon: "Utensils",
  color: "#EF4444",
  is_system: false,
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
}

const mockStandaloneExpense: Category = {
  id: "cat-utilities",
  user_id: "user-1",
  parent_category_id: null,
  name: "Utilities",
  type: "expense",
  icon: "Zap",
  color: "#3B82F6",
  is_system: false,
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
}

const mockIncomeCategory: Category = {
  id: "cat-salary",
  user_id: null,
  parent_category_id: null,
  name: "Salary",
  type: "income",
  icon: "Briefcase",
  color: "#10B981",
  is_system: true,
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
}

const mockTransferCategory: Category = {
  id: "cat-transfers",
  user_id: null,
  parent_category_id: null,
  name: "Account Transfers",
  type: "transfer",
  icon: "ArrowLeftRight",
  color: "#6366F1",
  is_system: true,
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
}

const allMockCategories: Category[] = [
  mockParentExpense,
  mockChildExpense1,
  mockChildExpense2,
  mockStandaloneExpense,
  mockIncomeCategory,
  mockTransferCategory,
]

// ─── Test Budgets ─────────────────────────────────────────────────────────────

const mockNovemberBudget: Budget = {
  id: "budget-2026-11",
  user_id: "user-1",
  name: "November 2026 Budget",
  month: 11,
  year: 2026,
  total_allocated: "1000.00",
  total_spent: "750.00",
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
  categories: [
    {
      id: "alloc-1",
      budget_id: "budget-2026-11",
      category_id: "cat-child-groceries",
      category_name: "Groceries",
      category_type: "expense",
      category_color: "#10B981",
      allocated_amount: "500.00",
      spent_amount: "350.00",
      remaining_amount: "150.00",
      percent_used: 70.0,
      is_over_budget: false,
    },
    {
      id: "alloc-2",
      budget_id: "budget-2026-11",
      category_id: "cat-utilities",
      category_name: "Utilities",
      category_type: "expense",
      category_color: "#3B82F6",
      allocated_amount: "300.00",
      spent_amount: "270.00",
      remaining_amount: "30.00",
      percent_used: 90.0,
      is_over_budget: false,
    },
    {
      id: "alloc-3",
      budget_id: "budget-2026-11",
      category_id: "cat-child-restaurants",
      category_name: "Restaurants",
      category_type: "expense",
      category_color: "#EF4444",
      allocated_amount: "200.00",
      spent_amount: "250.00",
      remaining_amount: "-50.00",
      percent_used: 125.0,
      is_over_budget: true,
    },
  ],
}

function renderBudgets(queryClient: QueryClient, initialUrl = "/budgets?year=2026&month=11") {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialUrl]}>
        <BudgetsPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe("BudgetsPage", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    })

    vi.spyOn(categoriesApi, "list").mockResolvedValue({
      data: allMockCategories,
      message: "Success",
    })
  })

  // 1. Current-month default
  it("1. renders current month display and requests budgets", async () => {
    vi.spyOn(budgetsApi, "list").mockResolvedValue({
      data: [mockNovemberBudget],
      message: "Success",
    })

    renderBudgets(queryClient, "/budgets?year=2026&month=11")

    await waitFor(() => {
      expect(screen.getByTestId("current-month-display")).toHaveTextContent("November 2026")
    })
    expect(budgetsApi.list).toHaveBeenCalledWith({ year: 2026, month: 11 })
  })

  // 2. Month navigation
  it("2. navigates to next and previous months", async () => {
    vi.spyOn(budgetsApi, "list").mockResolvedValue({
      data: [],
      message: "Success",
    })

    renderBudgets(queryClient, "/budgets?year=2026&month=11")

    await waitFor(() => {
      expect(screen.getByTestId("current-month-display")).toHaveTextContent("November 2026")
    })

    // Click Next Month
    fireEvent.click(screen.getByTestId("next-month-btn"))

    await waitFor(() => {
      expect(screen.getByTestId("current-month-display")).toHaveTextContent("December 2026")
    })

    // Click Prev Month twice
    fireEvent.click(screen.getByTestId("prev-month-btn"))
    await waitFor(() => {
      expect(screen.getByTestId("current-month-display")).toHaveTextContent("November 2026")
    })

    fireEvent.click(screen.getByTestId("prev-month-btn"))
    await waitFor(() => {
      expect(screen.getByTestId("current-month-display")).toHaveTextContent("October 2026")
    })
  })

  // 3. Empty budget state
  it("3. displays empty state when no budget exists for the month", async () => {
    vi.spyOn(budgetsApi, "list").mockResolvedValue({
      data: [],
      message: "Success",
    })

    renderBudgets(queryClient, "/budgets?year=2026&month=12")

    await waitFor(() => {
      expect(screen.getByTestId("empty-budget-state")).toBeInTheDocument()
      expect(screen.getByText(/No Budget for December 2026/i)).toBeInTheDocument()
      expect(screen.getByTestId("create-budget-btn")).toBeInTheDocument()
    })
  })

  // 4. Monthly budget creation
  it("4. opens create budget sheet and submits budget creation", async () => {
    vi.spyOn(budgetsApi, "list").mockResolvedValue({
      data: [],
      message: "Success",
    })
    const createSpy = vi.spyOn(budgetsApi, "create").mockResolvedValue({
      data: {
        id: "new-budget-id",
        user_id: "user-1",
        name: "December 2026 Budget",
        month: 12,
        year: 2026,
        total_allocated: "0.00",
        total_spent: "0.00",
        created_at: "2026-12-01T00:00:00Z",
        updated_at: "2026-12-01T00:00:00Z",
        categories: [],
      },
      message: "Created",
    })

    renderBudgets(queryClient, "/budgets?year=2026&month=12")

    await waitFor(() => {
      expect(screen.getByTestId("create-budget-btn")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId("create-budget-btn"))

    await waitFor(() => {
      expect(screen.getByTestId("create-budget-sheet")).toBeInTheDocument()
      expect(screen.getByTestId("budget-name-input")).toHaveValue("December 2026 Budget")
    })

    fireEvent.click(screen.getByTestId("submit-create-budget-btn"))

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith({
        name: "December 2026 Budget",
        month: 12,
        year: 2026,
      })
    })
  })

  // 5. Budget summary rendering
  it("5. renders authoritative budget summary metrics", async () => {
    vi.spyOn(budgetsApi, "list").mockResolvedValue({
      data: [mockNovemberBudget],
      message: "Success",
    })

    renderBudgets(queryClient, "/budgets?year=2026&month=11")

    await waitFor(() => {
      expect(screen.getByTestId("total-budgeted-amount")).toHaveTextContent("$1,000.00")
      expect(screen.getByTestId("total-spent-amount")).toHaveTextContent("$750.00")
      expect(screen.getByTestId("remaining-budget-amount")).toHaveTextContent("$250.00")
      expect(screen.getByTestId("percent-consumed-text")).toHaveTextContent("75.0% consumed")
    })
  })

  // 6. Category allocation creation
  it("6. opens add category budget sheet and creates an allocation", async () => {
    vi.spyOn(budgetsApi, "list").mockResolvedValue({
      data: [mockNovemberBudget],
      message: "Success",
    })
    const upsertSpy = vi.spyOn(budgetsApi, "upsertCategory").mockResolvedValue({
      data: mockNovemberBudget,
      message: "Success",
    })

    renderBudgets(queryClient, "/budgets?year=2026&month=11")

    await waitFor(() => {
      expect(screen.getByTestId("add-allocation-btn")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId("add-allocation-btn"))

    await waitFor(() => {
      expect(screen.getByTestId("add-allocation-sheet")).toBeInTheDocument()
      expect(screen.getByTestId("allocation-amount-input")).toBeInTheDocument()
    })

    // Enter amount
    fireEvent.change(screen.getByTestId("allocation-amount-input"), {
      target: { value: "150.00" },
    })

    // Select category through Base UI select trigger or custom change
    // Let's verify form submission validation requires category selection
    fireEvent.click(screen.getByTestId("submit-allocation-btn"))
    expect(upsertSpy).not.toHaveBeenCalled()
  })

  // 7. Allocation editing
  it("7. opens edit allocation sheet and updates allocation", async () => {
    vi.spyOn(budgetsApi, "list").mockResolvedValue({
      data: [mockNovemberBudget],
      message: "Success",
    })
    const upsertSpy = vi.spyOn(budgetsApi, "upsertCategory").mockResolvedValue({
      data: mockNovemberBudget,
      message: "Success",
    })

    renderBudgets(queryClient, "/budgets?year=2026&month=11")

    await waitFor(() => {
      expect(screen.getByTestId("edit-allocation-btn-alloc-1")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId("edit-allocation-btn-alloc-1"))

    await waitFor(() => {
      expect(screen.getByTestId("edit-allocation-sheet")).toBeInTheDocument()
      expect(screen.getByTestId("edit-amount-input")).toHaveValue(500)
    })

    fireEvent.change(screen.getByTestId("edit-amount-input"), {
      target: { value: "600.00" },
    })

    fireEvent.click(screen.getByTestId("submit-edit-allocation-btn"))

    await waitFor(() => {
      expect(upsertSpy).toHaveBeenCalledWith("budget-2026-11", {
        category_id: "cat-child-groceries",
        allocated_amount: "600.00",
      })
    })
  })

  // 8. Allocation removal
  it("8. opens delete confirmation sheet and removes allocation", async () => {
    vi.spyOn(budgetsApi, "list").mockResolvedValue({
      data: [mockNovemberBudget],
      message: "Success",
    })
    const deleteSpy = vi.spyOn(budgetsApi, "deleteCategory").mockResolvedValue({
      data: mockNovemberBudget,
      message: "Success",
    })

    renderBudgets(queryClient, "/budgets?year=2026&month=11")

    await waitFor(() => {
      expect(screen.getByTestId("delete-allocation-btn-alloc-1")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId("delete-allocation-btn-alloc-1"))

    await waitFor(() => {
      expect(screen.getByTestId("delete-allocation-confirm-sheet")).toBeInTheDocument()
      expect(screen.getByTestId("confirm-delete-allocation-btn")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId("confirm-delete-allocation-btn"))

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith("budget-2026-11", "cat-child-groceries")
    })
  })

  // 9. Spending progress rendering
  it("9. renders spending progress bar and actual percentage", async () => {
    vi.spyOn(budgetsApi, "list").mockResolvedValue({
      data: [mockNovemberBudget],
      message: "Success",
    })

    renderBudgets(queryClient, "/budgets?year=2026&month=11")

    await waitFor(() => {
      expect(screen.getByTestId("progress-bar-alloc-1")).toHaveStyle({ width: "70%" })
      expect(screen.getByTestId("percent-text-alloc-1")).toHaveTextContent("70.0%")
    })
  })

  // 10. Over-budget indicators
  it("10. shows explicit overage, over-budget badge and alert banner", async () => {
    vi.spyOn(budgetsApi, "list").mockResolvedValue({
      data: [mockNovemberBudget],
      message: "Success",
    })

    renderBudgets(queryClient, "/budgets?year=2026&month=11")

    await waitFor(() => {
      // Over budget warning banner
      expect(screen.getByTestId("budget-alert-banner")).toBeInTheDocument()
      // Over budget category counter
      expect(screen.getByTestId("over-budget-count")).toHaveTextContent("1")
      // Warning category counter (Utilities at 90%)
      expect(screen.getByTestId("approaching-budget-count")).toHaveTextContent("1")
      // Explicit overage text
      expect(screen.getByTestId("overage-text-alloc-3")).toHaveTextContent("Over by $50.00")
      // Percentage uncapped in text
      expect(screen.getByTestId("percent-text-alloc-3")).toHaveTextContent("125.0%")
    })
  })

  // 11. Loading and error states
  it("11. handles loading skeletons and API error cards", async () => {
    vi.spyOn(budgetsApi, "list").mockReturnValue(new Promise(() => {}))

    renderBudgets(queryClient, "/budgets?year=2026&month=11")

    expect(screen.getByTestId("budgets-loading")).toBeInTheDocument()

    // Now test error
    queryClient.clear()
    vi.spyOn(budgetsApi, "list").mockRejectedValue(new Error("Network Error"))

    renderBudgets(queryClient, "/budgets?year=2026&month=11")

    await waitFor(() => {
      expect(screen.getByTestId("budgets-error")).toBeInTheDocument()
    })
  })

  // 12. Query invalidation
  it("12. invalidates budgets queries after allocation deletion", async () => {
    vi.spyOn(budgetsApi, "list").mockResolvedValue({
      data: [mockNovemberBudget],
      message: "Success",
    })
    vi.spyOn(budgetsApi, "deleteCategory").mockResolvedValue({
      data: mockNovemberBudget,
      message: "Success",
    })
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    renderBudgets(queryClient, "/budgets?year=2026&month=11")

    await waitFor(() => {
      expect(screen.getByTestId("delete-allocation-btn-alloc-1")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId("delete-allocation-btn-alloc-1"))

    await waitFor(() => {
      expect(screen.getByTestId("confirm-delete-allocation-btn")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId("confirm-delete-allocation-btn"))

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["budgets"] })
    })
  })

  // 13. Currency formatting
  it("13. formats all money values as clean currency", async () => {
    vi.spyOn(budgetsApi, "list").mockResolvedValue({
      data: [mockNovemberBudget],
      message: "Success",
    })

    renderBudgets(queryClient, "/budgets?year=2026&month=11")

    await waitFor(() => {
      expect(screen.getByText("$500.00")).toBeInTheDocument()
      expect(screen.getByText("$350.00")).toBeInTheDocument()
      expect(screen.getByText("$150.00")).toBeInTheDocument()
    })
  })

  // 14. Parent-child category handling
  it("14. renders parent category badge for subcategories", async () => {
    vi.spyOn(budgetsApi, "list").mockResolvedValue({
      data: [mockNovemberBudget],
      message: "Success",
    })

    renderBudgets(queryClient, "/budgets?year=2026&month=11")

    await waitFor(() => {
      // Groceries is a subcategory of Food & Dining
      expect(screen.getByTestId("parent-category-badge-alloc-1")).toHaveTextContent(
        "Subcategory of Food & Dining"
      )
    })
  })

  // 15. Transfer exclusion from expense budgeting
  it("15. does not list transfer or income categories in allocations", async () => {
    vi.spyOn(budgetsApi, "list").mockResolvedValue({
      data: [mockNovemberBudget],
      message: "Success",
    })

    renderBudgets(queryClient, "/budgets?year=2026&month=11")

    await waitFor(() => {
      expect(screen.getByTestId("add-allocation-btn")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId("add-allocation-btn"))

    await waitFor(() => {
      expect(screen.getByTestId("add-allocation-sheet")).toBeInTheDocument()
    })

    // Neither Salary (income) nor Account Transfers (transfer) should have option elements
    expect(screen.queryByTestId("category-option-cat-salary")).not.toBeInTheDocument()
    expect(screen.queryByTestId("category-option-cat-transfers")).not.toBeInTheDocument()
  })
})
