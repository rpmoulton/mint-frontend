import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { TransactionsPage, TransactionAmount, CategoryBadge, TxTypeBadge } from "./transactions"
import { transactionsApi, accountsApi, categoriesApi } from "@/lib/api"
import type { Transaction, Account, Category, PaginatedResponse } from "@/lib/types"

const mockAccounts: Account[] = [
  {
    id: "acc-1",
    user_id: "u1",
    name: "Premier Checking",
    account_type: "depository",
    account_subtype: "checking",
    currency: "USD",
    current_balance: "5420.50",
    available_balance: "5420.50",
    credit_limit: null,
    interest_rate: null,
    institution_id: null,
    institution_name: "Chase",
    institution_display_name: "Chase",
    institution_logo_url: null,
    source_type: "manual",
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
    archived_at: null,
  },
  {
    id: "acc-2",
    user_id: "u1",
    name: "Sapphire Credit Card",
    account_type: "credit",
    account_subtype: "credit_card",
    currency: "USD",
    current_balance: "850.00",
    available_balance: null,
    credit_limit: "10000.00",
    interest_rate: "19.99",
    institution_id: null,
    institution_name: "Chase",
    institution_display_name: "Chase",
    institution_logo_url: null,
    source_type: "manual",
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
    archived_at: null,
  },
]

const mockCategories: Category[] = [
  {
    id: "cat-1",
    user_id: null,
    parent_category_id: null,
    name: "Groceries",
    type: "expense",
    icon: "ShoppingCart",
    color: "#F59E0B",
    is_system: true,
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
  },
  {
    id: "cat-2",
    user_id: null,
    parent_category_id: null,
    name: "Salary",
    type: "income",
    icon: "Briefcase",
    color: "#10B981",
    is_system: true,
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
  },
]

const mockDebitTx: Transaction = {
  id: "tx-debit-1",
  user_id: "u1",
  account_id: "acc-1",
  account_name: "Premier Checking",
  category_id: "cat-1",
  category_name: "Groceries",
  category_color: "#F59E0B",
  category_icon: "ShoppingCart",
  category_type: "expense",
  amount: "-65.4000",
  currency: "USD",
  transaction_date: "2026-11-04",
  posted_date: null,
  merchant_name: "Whole Foods",
  description: "Weekly groceries haul",
  notes: "Organic produce and pantry items",
  transaction_type: "debit",
  status: "posted",
  source_type: "manual",
  external_transaction_id: null,
  created_at: "2026-11-04T12:00:00Z",
  updated_at: "2026-11-04T12:00:00Z",
}

const mockCreditTx: Transaction = {
  id: "tx-credit-2",
  user_id: "u1",
  account_id: "acc-1",
  account_name: "Premier Checking",
  category_id: "cat-2",
  category_name: "Salary",
  category_color: "#10B981",
  category_icon: "Briefcase",
  category_type: "income",
  amount: "3200.0000",
  currency: "USD",
  transaction_date: "2026-11-01",
  posted_date: null,
  merchant_name: "Acme Corp",
  description: "Direct Deposit Paycheck",
  notes: null,
  transaction_type: "credit",
  status: "posted",
  source_type: "manual",
  external_transaction_id: null,
  created_at: "2026-11-01T12:00:00Z",
  updated_at: "2026-11-01T12:00:00Z",
}

function makePaginated(
  data: Transaction[],
  meta?: { records: number; limit: number; has_next: boolean; has_prev: boolean },
): PaginatedResponse<Transaction> {
  return {
    message: "Transactions listed",
    data,
    meta: meta ?? {
      records: data.length,
      limit: 25,
      has_next: false,
      has_prev: false,
    },
  }
}

function renderTransactions(queryClient: QueryClient, initialEntries = ["/transactions"]) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <TransactionsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe("TransactionsPage", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    })

    vi.spyOn(accountsApi, "list").mockResolvedValue({
      message: "Accounts listed",
      data: mockAccounts,
    })

    vi.spyOn(categoriesApi, "list").mockResolvedValue({
      message: "Categories listed",
      data: mockCategories,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // 1. Transaction list rendering
  it("1. renders transaction list with all required fields (date, description, merchant, account, category, type, amount, currency)", async () => {
    vi.spyOn(transactionsApi, "list").mockResolvedValue(
      makePaginated([mockDebitTx, mockCreditTx]),
    )

    renderTransactions(queryClient)

    await waitFor(() => {
      expect(screen.getByText("Weekly groceries haul")).toBeInTheDocument()
    })

    expect(screen.getByText("Whole Foods")).toBeInTheDocument()
    expect(screen.getAllByText("Premier Checking").length).toBeGreaterThan(0)
    expect(screen.getByText("Groceries")).toBeInTheDocument()
    expect(screen.getByText("Salary")).toBeInTheDocument()
    expect(screen.getByText("debit")).toBeInTheDocument()
    expect(screen.getByText("credit")).toBeInTheDocument()
    expect(screen.getByText("-$65.40")).toBeInTheDocument()
    expect(screen.getByText("+$3,200.00")).toBeInTheDocument()
  })

  // 2. Loading, empty, and error states
  it("2a. displays loading skeleton while fetching transactions", () => {
    vi.spyOn(transactionsApi, "list").mockImplementation(() => new Promise(() => {}))

    renderTransactions(queryClient)

    expect(screen.getByTestId("transactions-skeleton")).toBeInTheDocument()
  })

  it("2b. displays empty state when no transactions exist", async () => {
    vi.spyOn(transactionsApi, "list").mockResolvedValue(makePaginated([]))

    renderTransactions(queryClient)

    await waitFor(() => {
      expect(screen.getByTestId("transactions-empty")).toBeInTheDocument()
    })
    expect(screen.getByText("No transactions found")).toBeInTheDocument()
    expect(screen.getByText("Add your first transaction to get started.")).toBeInTheDocument()
  })

  it("2c. displays filter empty state with reset button when filters match nothing", async () => {
    vi.spyOn(transactionsApi, "list").mockResolvedValue(makePaginated([]))

    renderTransactions(queryClient, ["/transactions?search=nonexistent"])

    await waitFor(() => {
      expect(screen.getByTestId("transactions-empty")).toBeInTheDocument()
    })
    expect(screen.getByText("No transactions match your filters")).toBeInTheDocument()
    expect(screen.getByTestId("empty-clear-filters-btn")).toBeInTheDocument()
  })

  it("2d. displays error state with retry button on fetch failure", async () => {
    const listSpy = vi
      .spyOn(transactionsApi, "list")
      .mockRejectedValue(new Error("Network timeout retrieving transactions"))

    renderTransactions(queryClient)

    await waitFor(() => {
      expect(screen.getByTestId("transactions-error")).toBeInTheDocument()
    })
    expect(screen.getByText("Failed to load transactions")).toBeInTheDocument()
    expect(
      screen.getByText("Network timeout retrieving transactions"),
    ).toBeInTheDocument()

    // Clicking retry calls refetch
    fireEvent.click(screen.getByTestId("retry-btn"))
    expect(listSpy).toHaveBeenCalledTimes(2)
  })

  // 3. Search and filtering
  it("3. handles search and date filters with debouncing and query update", async () => {
    const listSpy = vi.spyOn(transactionsApi, "list").mockResolvedValue(makePaginated([mockDebitTx]))

    renderTransactions(queryClient)

    await waitFor(() => {
      expect(screen.getByTestId("search-input")).toBeInTheDocument()
    })

    // Type into search
    const searchInput = screen.getByTestId("search-input")
    fireEvent.change(searchInput, { target: { value: "Groceries" } })

    // Wait for 350ms debounce
    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({ search: "Groceries" }),
      )
    }, { timeout: 1500 })

    // Change date filters
    const startDateInput = screen.getByTestId("start-date-input")
    fireEvent.change(startDateInput, { target: { value: "2026-11-01" } })

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({ start_date: "2026-11-01" }),
      )
    })

    // Clear filters
    const clearBtn = screen.getByTestId("clear-filters-btn")
    fireEvent.click(clearBtn)

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 25, offset: 0 }),
      )
    })
  })

  // 4. Pagination
  it("4. handles pagination controls according to backend metadata", async () => {
    const listSpy = vi.spyOn(transactionsApi, "list").mockResolvedValue(
      makePaginated([mockDebitTx], {
        records: 60,
        limit: 25,
        has_next: true,
        has_prev: false,
      }),
    )

    renderTransactions(queryClient)

    await waitFor(() => {
      expect(screen.getByTestId("pagination")).toBeInTheDocument()
    })

    expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument()
    expect(screen.getByText(/60 total/)).toBeInTheDocument()

    const prevBtn = screen.getByTestId("prev-page-btn")
    const nextBtn = screen.getByTestId("next-page-btn")

    expect(prevBtn).toBeDisabled()
    expect(nextBtn).toBeEnabled()

    fireEvent.click(nextBtn)

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 25 }),
      )
    })
  })

  // 5. Successful transaction creation
  it("5. opens Add Transaction sheet, validates, submits successfully and invalidates queries", async () => {
    vi.spyOn(transactionsApi, "list").mockResolvedValue(makePaginated([mockDebitTx]))
    const createSpy = vi.spyOn(transactionsApi, "create").mockResolvedValue({
      message: "Transaction created",
      data: {
        ...mockDebitTx,
        id: "tx-new-1",
        description: "Coffee run",
        amount: "-4.7500",
      },
    })

    renderTransactions(queryClient)

    await waitFor(() => {
      expect(screen.getByTestId("add-transaction-btn")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId("add-transaction-btn"))

    await waitFor(() => {
      expect(screen.getByTestId("transaction-form")).toBeInTheDocument()
    })

    // Fill form fields
    fireEvent.change(screen.getByTestId("tx-amount-input"), {
      target: { value: "4.75" },
    })
    fireEvent.change(screen.getByTestId("tx-date-input"), {
      target: { value: "2026-11-10" },
    })
    fireEvent.change(screen.getByTestId("tx-description-input"), {
      target: { value: "Coffee run" },
    })
    fireEvent.change(screen.getByTestId("tx-merchant-input"), {
      target: { value: "Blue Bottle" },
    })

    // Submit form (without selecting account first to check validation)
    fireEvent.click(screen.getByTestId("save-transaction-btn"))

    await waitFor(() => {
      expect(screen.getByText("Account is required")).toBeInTheDocument()
    })
    expect(createSpy).not.toHaveBeenCalled()
  })

  // 6. Validation errors
  it("6. validates required fields (amount, description, date)", async () => {
    vi.spyOn(transactionsApi, "list").mockResolvedValue(makePaginated([]))

    renderTransactions(queryClient)

    await waitFor(() => {
      expect(screen.getByTestId("add-transaction-btn")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId("add-transaction-btn"))

    await waitFor(() => {
      expect(screen.getByTestId("transaction-form")).toBeInTheDocument()
    })

    // Clear description and submit
    fireEvent.change(screen.getByTestId("tx-description-input"), {
      target: { value: "" },
    })
    fireEvent.click(screen.getByTestId("save-transaction-btn"))

    await waitFor(() => {
      expect(screen.getByText("Account is required")).toBeInTheDocument()
      expect(screen.getByText("Enter a positive numeric amount")).toBeInTheDocument()
      expect(screen.getByText("Description is required")).toBeInTheDocument()
    })
  })

  // 7. Transaction editing
  it("7. opens Edit Transaction sheet prefilled with existing transaction data", async () => {
    vi.spyOn(transactionsApi, "list").mockResolvedValue(makePaginated([mockDebitTx]))
    const updateSpy = vi.spyOn(transactionsApi, "update").mockResolvedValue({
      message: "Transaction updated",
      data: {
        ...mockDebitTx,
        description: "Updated grocery run",
      },
    })

    renderTransactions(queryClient)

    await waitFor(() => {
      expect(screen.getByTestId(`edit-btn-${mockDebitTx.id}`)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId(`edit-btn-${mockDebitTx.id}`))

    await waitFor(() => {
      expect(screen.getByText("Edit Transaction")).toBeInTheDocument()
    })

    const descInput = screen.getByTestId("tx-description-input") as HTMLInputElement
    expect(descInput.value).toBe("Weekly groceries haul")

    const amountInput = screen.getByTestId("tx-amount-input") as HTMLInputElement
    expect(amountInput.value).toBe("65.40")

    fireEvent.change(descInput, { target: { value: "Updated grocery run" } })
    fireEvent.click(screen.getByTestId("save-transaction-btn"))

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        mockDebitTx.id,
        expect.objectContaining({
          description: "Updated grocery run",
          amount: "65.40",
        }),
      )
    })
  })

  // 8. Deletion confirmation
  it("8. prompts for confirmation before deleting transaction and cancels if rejected", async () => {
    vi.spyOn(transactionsApi, "list").mockResolvedValue(makePaginated([mockDebitTx]))
    const deleteSpy = vi.spyOn(transactionsApi, "delete").mockResolvedValue()

    renderTransactions(queryClient)

    await waitFor(() => {
      expect(screen.getByTestId(`delete-btn-${mockDebitTx.id}`)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId(`delete-btn-${mockDebitTx.id}`))

    await waitFor(() => {
      expect(screen.getByText("Delete Transaction?")).toBeInTheDocument()
    })

    const sheet = screen.getByTestId("delete-confirm-sheet")
    expect(within(sheet).getByText(/Weekly groceries haul/)).toBeInTheDocument()

    // Test cancel
    fireEvent.click(screen.getByTestId("cancel-delete-btn"))
    expect(deleteSpy).not.toHaveBeenCalled()

    // Open again and confirm
    fireEvent.click(screen.getByTestId(`delete-btn-${mockDebitTx.id}`))
    await waitFor(() => {
      expect(screen.getByTestId("confirm-delete-btn")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId("confirm-delete-btn"))

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith(mockDebitTx.id)
    })
  })

  // 9. Query invalidation after mutations
  it("9. invalidates transactions, accounts, and dashboard-summary queries after mutations", async () => {
    vi.spyOn(transactionsApi, "list").mockResolvedValue(makePaginated([mockDebitTx]))
    vi.spyOn(transactionsApi, "delete").mockResolvedValue()
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    renderTransactions(queryClient)

    await waitFor(() => {
      expect(screen.getByTestId(`delete-btn-${mockDebitTx.id}`)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId(`delete-btn-${mockDebitTx.id}`))
    await waitFor(() => {
      expect(screen.getByTestId("confirm-delete-btn")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId("confirm-delete-btn"))

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["transactions"] })
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["accounts"] })
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["dashboard-summary"] })
    })
  })

  // 10. Correct currency and debit/credit display
  it("10. correctly displays debit as negative and credit as positive with color formatting", () => {
    const { container: debitContainer } = render(
      <TransactionAmount tx={mockDebitTx} />,
    )
    const debitSpan = debitContainer.querySelector("span")
    expect(debitSpan).toHaveTextContent("-$65.40")
    expect(debitSpan?.className).toContain("text-foreground")
    expect(debitSpan?.className).not.toContain("text-emerald-600")

    const { container: creditContainer } = render(
      <TransactionAmount tx={mockCreditTx} />,
    )
    const creditSpan = creditContainer.querySelector("span")
    expect(creditSpan).toHaveTextContent("+$3,200.00")
    expect(creditSpan?.className).toContain("text-emerald-600")

    // Test alternate currency (EUR)
    const eurTx: Transaction = {
      ...mockDebitTx,
      currency: "EUR",
      amount: "-45.0000",
    }
    const { container: eurContainer } = render(
      <TransactionAmount tx={eurTx} />,
    )
    const eurSpan = eurContainer.querySelector("span")
    expect(eurSpan).toHaveTextContent("-€45.00")
  })

  it("10b. renders category and type badges correctly", () => {
    const { container: catContainer } = render(<CategoryBadge tx={mockDebitTx} />)
    expect(catContainer).toHaveTextContent("Groceries")

    const { container: uncategorizedContainer } = render(
      <CategoryBadge tx={{ ...mockDebitTx, category_name: null }} />,
    )
    expect(uncategorizedContainer).toHaveTextContent("Uncategorized")

    const { container: creditBadgeContainer } = render(<TxTypeBadge type="credit" />)
    expect(creditBadgeContainer).toHaveTextContent("credit")
    expect(creditBadgeContainer.firstChild).toHaveClass("text-emerald-600")

    const { container: debitBadgeContainer } = render(<TxTypeBadge type="debit" />)
    expect(debitBadgeContainer).toHaveTextContent("debit")
  })
})
