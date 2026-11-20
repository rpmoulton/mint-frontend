import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { CategoriesPage } from "./categories"
import { categoriesApi } from "@/lib/api"
import type { Category } from "@/lib/types"

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mockSystemExpenseParent: Category = {
  id: "00000000-0000-0000-0000-000000000004",
  user_id: null,
  parent_category_id: null,
  name: "Groceries",
  type: "expense",
  icon: "ShoppingCart",
  color: "#F59E0B",
  is_system: true,
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
}

const mockSystemIncomeParent: Category = {
  id: "00000000-0000-0000-0000-000000000001",
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

const mockSystemTransferParent: Category = {
  id: "00000000-0000-0000-0000-000000000003",
  user_id: null,
  parent_category_id: null,
  name: "Transfers",
  type: "transfer",
  icon: "ArrowLeftRight",
  color: "#6366F1",
  is_system: true,
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
}

const mockCustomExpenseChild: Category = {
  id: "cat-sub-1",
  user_id: "user-1",
  parent_category_id: "00000000-0000-0000-0000-000000000004",
  name: "Organic Produce",
  type: "expense",
  icon: "ShoppingCart",
  color: "#10B981",
  is_system: false,
  created_at: "2026-11-02T00:00:00Z",
  updated_at: "2026-11-02T00:00:00Z",
}

const mockCustomExpenseParent: Category = {
  id: "cat-custom-parent-1",
  user_id: "user-1",
  parent_category_id: null,
  name: "Hobbies",
  type: "expense",
  icon: "Film",
  color: "#8B5CF6",
  is_system: false,
  created_at: "2026-11-03T00:00:00Z",
  updated_at: "2026-11-03T00:00:00Z",
}

// ─── Query Client Helper ──────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })
}

function renderCategories(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CategoriesPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("CategoriesPage", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.restoreAllMocks()
    queryClient = makeQueryClient()
  })

  // 1. Category list rendering
  it("1. renders category list with names, icons, types, and counts", async () => {
    vi.spyOn(categoriesApi, "list").mockResolvedValue({
      message: "ok",
      data: [mockSystemExpenseParent, mockCustomExpenseChild, mockCustomExpenseParent],
    })

    renderCategories(queryClient)

    await waitFor(() => {
      expect(screen.getByText("Groceries")).toBeInTheDocument()
    })

    expect(screen.getByText("Hobbies")).toBeInTheDocument()
    expect(screen.getByText("Organic Produce")).toBeInTheDocument()
    expect(screen.getByText("1 subcategory")).toBeInTheDocument()
    expect(screen.getByText("No subcategories")).toBeInTheDocument()
  })

  // 2. Parent-child hierarchy
  it("2. renders hierarchical structure with indented children and no parent duplication", async () => {
    vi.spyOn(categoriesApi, "list").mockResolvedValue({
      message: "ok",
      data: [mockSystemExpenseParent, mockCustomExpenseChild],
    })

    renderCategories(queryClient)

    await waitFor(() => {
      expect(screen.getByTestId("category-card-00000000-0000-0000-0000-000000000004")).toBeInTheDocument()
    })

    // Child is inside the parent's card
    const parentCard = screen.getByTestId("category-card-00000000-0000-0000-0000-000000000004")
    expect(parentCard).toHaveTextContent("Organic Produce")

    // The subcategory row is rendered
    expect(screen.getByTestId("subcategory-row-cat-sub-1")).toBeInTheDocument()

    // Parent category is not listed twice
    const groceryTitles = screen.getAllByText("Groceries")
    expect(groceryTitles).toHaveLength(1)
  })

  // 3. System versus custom categories identification
  it("3. clearly distinguishes system categories from custom categories", async () => {
    vi.spyOn(categoriesApi, "list").mockResolvedValue({
      message: "ok",
      data: [mockSystemExpenseParent, mockCustomExpenseParent],
    })

    renderCategories(queryClient)

    await waitFor(() => {
      expect(screen.getByText("Groceries")).toBeInTheDocument()
    })

    expect(screen.getByTestId("badge-system")).toHaveTextContent("System")
    expect(screen.getByTestId("badge-custom")).toHaveTextContent("Custom")
  })

  // 4. Loading, empty, and error states
  it("4. handles loading, empty, and error states properly", async () => {
    // A. Empty state
    vi.spyOn(categoriesApi, "list").mockResolvedValue({
      message: "ok",
      data: [],
    })

    const { rerender } = renderCategories(queryClient)

    await waitFor(() => {
      expect(screen.getByTestId("empty-categories")).toBeInTheDocument()
    })
    expect(screen.getByText("No categories found")).toBeInTheDocument()

    // B. Error state
    vi.spyOn(categoriesApi, "list").mockRejectedValue(new Error("Database connection lost"))
    queryClient.clear()

    rerender(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CategoriesPage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId("categories-error")).toBeInTheDocument()
    })
    expect(screen.getByText("Database connection lost")).toBeInTheDocument()
    expect(screen.getByText("Retry Connection")).toBeInTheDocument()
  })

  // 5. Category creation
  it("5. successfully creates a new category and invalidates queries", async () => {
    vi.spyOn(categoriesApi, "list").mockResolvedValue({
      message: "ok",
      data: [mockSystemExpenseParent],
    })

    const createSpy = vi.spyOn(categoriesApi, "create").mockResolvedValue({
      message: "Category created",
      data: {
        id: "cat-new",
        user_id: "user-1",
        parent_category_id: null,
        name: "Home Improvement",
        type: "expense",
        icon: "Wrench",
        color: "#EF4444",
        is_system: false,
        created_at: "2026-11-05T00:00:00Z",
        updated_at: "2026-11-05T00:00:00Z",
      },
    })
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    renderCategories(queryClient)

    await waitFor(() => {
      expect(screen.getByTestId("add-category-btn")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId("add-category-btn"))

    await waitFor(() => {
      expect(screen.getByTestId("add-category-sheet")).toBeInTheDocument()
    })

    // Type name
    fireEvent.change(screen.getByTestId("category-name-input"), {
      target: { value: "Home Improvement" },
    })

    // Click submit
    fireEvent.click(screen.getByTestId("category-submit-btn"))

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Home Improvement",
          type: "expense",
        })
      )
    })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["categories"] })
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["transactions"] })
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["dashboard-summary"] })
    })
  })

  // 6. Form validation
  it("6. validates form inputs and rejects empty or duplicate names", async () => {
    vi.spyOn(categoriesApi, "list").mockResolvedValue({
      message: "ok",
      data: [mockSystemExpenseParent],
    })

    renderCategories(queryClient)

    await waitFor(() => {
      expect(screen.getByTestId("add-category-btn")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId("add-category-btn"))

    await waitFor(() => {
      expect(screen.getByTestId("add-category-sheet")).toBeInTheDocument()
    })

    // Submit with empty name
    fireEvent.click(screen.getByTestId("category-submit-btn"))
    await waitFor(() => {
      expect(screen.getByTestId("category-form-validation-error")).toHaveTextContent(
        "Category name is required."
      )
    })

    // Submit with duplicate top-level name "Groceries"
    fireEvent.change(screen.getByTestId("category-name-input"), {
      target: { value: "Groceries" },
    })
    fireEvent.click(screen.getByTestId("category-submit-btn"))
    await waitFor(() => {
      expect(screen.getByTestId("category-form-validation-error")).toHaveTextContent(
        "A category with this name already exists in this hierarchy level."
      )
    })
  })

  // 7. Category editing
  it("7. allows editing custom category and preserves ID", async () => {
    vi.spyOn(categoriesApi, "list").mockResolvedValue({
      message: "ok",
      data: [mockCustomExpenseParent],
    })

    const updateSpy = vi.spyOn(categoriesApi, "update").mockResolvedValue({
      message: "Category updated",
      data: {
        ...mockCustomExpenseParent,
        name: "Outdoor Hobbies",
      },
    })
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    renderCategories(queryClient)

    await waitFor(() => {
      expect(screen.getByTestId("edit-btn-cat-custom-parent-1")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId("edit-btn-cat-custom-parent-1"))

    await waitFor(() => {
      expect(screen.getByTestId("edit-category-sheet")).toBeInTheDocument()
    })

    expect(screen.getByTestId("category-name-input")).toHaveValue("Hobbies")

    fireEvent.change(screen.getByTestId("category-name-input"), {
      target: { value: "Outdoor Hobbies" },
    })

    fireEvent.click(screen.getByTestId("category-submit-btn"))

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        "cat-custom-parent-1",
        expect.objectContaining({
          name: "Outdoor Hobbies",
        })
      )
    })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["categories"] })
    })
  })

  // 8. Parent selection and compatibility
  it("8. supports creating subcategory with preset parent and matching type", async () => {
    vi.spyOn(categoriesApi, "list").mockResolvedValue({
      message: "ok",
      data: [mockSystemExpenseParent],
    })

    const createSpy = vi.spyOn(categoriesApi, "create").mockResolvedValue({
      message: "Category created",
      data: mockCustomExpenseChild,
    })

    renderCategories(queryClient)

    await waitFor(() => {
      expect(screen.getByTestId("add-subcat-btn-00000000-0000-0000-0000-000000000004")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId("add-subcat-btn-00000000-0000-0000-0000-000000000004"))

    await waitFor(() => {
      expect(screen.getByTestId("add-category-sheet")).toBeInTheDocument()
    })

    // Type is locked because parent is selected
    expect(screen.getByTestId("category-type-select")).toBeDisabled()

    fireEvent.change(screen.getByTestId("category-name-input"), {
      target: { value: "Organic Produce" },
    })

    fireEvent.click(screen.getByTestId("category-submit-btn"))

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Organic Produce",
          parent_category_id: "00000000-0000-0000-0000-000000000004",
          type: "expense",
        })
      )
    })
  })

  // 9. Protected system category actions
  it("9. protects system categories from edit and delete actions", async () => {
    vi.spyOn(categoriesApi, "list").mockResolvedValue({
      message: "ok",
      data: [mockSystemExpenseParent],
    })

    renderCategories(queryClient)

    await waitFor(() => {
      expect(screen.getByText("Groceries")).toBeInTheDocument()
    })

    // No edit or delete buttons exist for system category
    expect(screen.queryByTestId("edit-btn-00000000-0000-0000-0000-000000000004")).not.toBeInTheDocument()
    expect(screen.queryByTestId("delete-btn-00000000-0000-0000-0000-000000000004")).not.toBeInTheDocument()

    // Protected notice is shown
    expect(screen.getByTestId("protected-notice-00000000-0000-0000-0000-000000000004")).toBeInTheDocument()
  })

  // 10. Safe deletion behavior
  it("10. shows confirmation dialog and displays server rejection error when category has transactions", async () => {
    vi.spyOn(categoriesApi, "list").mockResolvedValue({
      message: "ok",
      data: [mockCustomExpenseParent],
    })

    const deleteSpy = vi.spyOn(categoriesApi, "delete").mockRejectedValue(
      new Error("cannot delete category referenced by existing transactions")
    )

    renderCategories(queryClient)

    await waitFor(() => {
      expect(screen.getByTestId("delete-btn-cat-custom-parent-1")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId("delete-btn-cat-custom-parent-1"))

    await waitFor(() => {
      expect(screen.getByTestId("delete-category-confirm-sheet")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId("delete-confirm-btn"))

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith("cat-custom-parent-1")
    })

    // Error is displayed inside the sheet explaining the block
    await waitFor(() => {
      expect(screen.getByTestId("delete-category-error")).toHaveTextContent(
        "cannot delete category referenced by existing transactions"
      )
    })
  })

  // 11. Tab filtering
  it("11. filters categories by income, expense, and transfer tabs", async () => {
    vi.spyOn(categoriesApi, "list").mockResolvedValue({
      message: "ok",
      data: [mockSystemExpenseParent, mockSystemIncomeParent, mockSystemTransferParent],
    })

    renderCategories(queryClient)

    await waitFor(() => {
      expect(screen.getByText("Groceries")).toBeInTheDocument()
    })

    // Income tab
    fireEvent.click(screen.getByTestId("tab-income"))
    await waitFor(() => {
      expect(screen.getByText("Salary")).toBeInTheDocument()
    })
    expect(screen.queryByText("Groceries")).not.toBeInTheDocument()
    expect(screen.queryByText("Transfers")).not.toBeInTheDocument()

    // Transfers tab
    fireEvent.click(screen.getByTestId("tab-transfer"))
    await waitFor(() => {
      expect(screen.getByText("Transfers")).toBeInTheDocument()
    })
    expect(screen.queryByText("Salary")).not.toBeInTheDocument()
  })
})
