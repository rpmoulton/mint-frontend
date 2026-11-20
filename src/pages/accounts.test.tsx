import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AccountsPage } from "./accounts"
import { accountsApi, institutionsApi } from "@/lib/api"
import type { Account, Institution } from "@/lib/types"

// ─── Mock data ────────────────────────────────────────────────────────────────

const mockCheckingAccount: Account = {
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
  institution_display_name: "Chase Bank",
  institution_logo_url: null,
  source_type: "manual",
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
  archived_at: null,
}

const mockCreditCard: Account = {
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
}

const mockArchivedAccount: Account = {
  id: "acc-3",
  user_id: "u1",
  name: "Old Savings",
  account_type: "depository",
  account_subtype: "savings",
  currency: "USD",
  current_balance: "0.00",
  available_balance: null,
  credit_limit: null,
  interest_rate: null,
  institution_id: null,
  institution_name: null,
  institution_display_name: null,
  institution_logo_url: null,
  source_type: "manual",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-10-01T00:00:00Z",
  archived_at: "2026-10-01T00:00:00Z",
}

const mockLoanAccount: Account = {
  id: "acc-4",
  user_id: "u1",
  name: "Auto Loan",
  account_type: "loan",
  account_subtype: "auto",
  currency: "USD",
  current_balance: "14500.00",
  available_balance: null,
  credit_limit: null,
  interest_rate: "6.50",
  institution_id: null,
  institution_name: "Ford Credit",
  institution_display_name: "Ford Credit",
  institution_logo_url: null,
  source_type: "manual",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
  archived_at: null,
}

const mockInstitution: Institution = {
  id: "inst-1",
  name: "chase",
  display_name: "Chase Bank",
  logo_url: null,
  website: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
}

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })
}

function renderAccounts(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AccountsPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("AccountsPage", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.restoreAllMocks()
    queryClient = makeQueryClient()

    // Default: empty institutions
    vi.spyOn(institutionsApi, "list").mockResolvedValue({
      message: "ok",
      data: [],
    })
  })

  // 1. Account list rendering
  it("1. renders account list with all required fields", async () => {
    vi.spyOn(accountsApi, "list").mockResolvedValue({
      message: "ok",
      data: [mockCheckingAccount, mockCreditCard],
    })

    renderAccounts(queryClient)

    await waitFor(() => {
      expect(screen.getByText("Premier Checking")).toBeInTheDocument()
    })

    expect(screen.getByText("Sapphire Credit Card")).toBeInTheDocument()
    expect(screen.getAllByText(/Chase/).length).toBeGreaterThan(0)
    // Balance display (appears in both account row and group total — use getAllByText)
    expect(screen.getAllByText("$5,420.50").length).toBeGreaterThan(0)
    expect(screen.getAllByText("$850.00").length).toBeGreaterThan(0)
    // Credit limit display
    expect(screen.getAllByText("$10,000.00").length).toBeGreaterThan(0)
    // Interest rate
    expect(screen.getByText("19.99%")).toBeInTheDocument()
  })

  // 2. Account grouping
  it("2. groups accounts by type with correct section headers", async () => {
    vi.spyOn(accountsApi, "list").mockResolvedValue({
      message: "ok",
      data: [mockCheckingAccount, mockCreditCard, mockLoanAccount],
    })

    renderAccounts(queryClient)

    await waitFor(() => {
      expect(screen.getByTestId("group-depository")).toBeInTheDocument()
    })

    expect(screen.getByTestId("group-credit")).toBeInTheDocument()
    expect(screen.getByTestId("group-loan")).toBeInTheDocument()
    // No investment group since there are no investment accounts
    expect(screen.queryByTestId("group-investment")).not.toBeInTheDocument()
  })

  // 3. Loading skeleton
  it("3a. displays loading skeleton while fetching", () => {
    vi.spyOn(accountsApi, "list").mockImplementation(() => new Promise(() => {}))
    vi.spyOn(institutionsApi, "list").mockImplementation(() => new Promise(() => {}))

    renderAccounts(queryClient)

    expect(screen.getByTestId("accounts-skeleton")).toBeInTheDocument()
  })

  // 4. Empty state
  it("3b. displays empty state when no accounts exist", async () => {
    vi.spyOn(accountsApi, "list").mockResolvedValue({
      message: "ok",
      data: [],
    })

    renderAccounts(queryClient)

    await waitFor(() => {
      expect(screen.getByTestId("accounts-empty")).toBeInTheDocument()
    })

    expect(screen.getByText("No Financial Accounts Found")).toBeInTheDocument()
    expect(screen.getByTestId("empty-add-account-btn")).toBeInTheDocument()
  })

  // 5. Error state
  it("3c. displays error state with retry on fetch failure", async () => {
    vi.spyOn(accountsApi, "list").mockRejectedValue(new Error("Network error"))

    renderAccounts(queryClient)

    await waitFor(() => {
      expect(screen.getByTestId("accounts-error")).toBeInTheDocument()
    })

    expect(screen.getByText("Failed to load financial accounts")).toBeInTheDocument()
    expect(screen.getByText("Network error")).toBeInTheDocument()
  })

  // 6. Summary cards
  it("4. shows correct asset, liability, and net portfolio totals (excluding archived)", async () => {
    vi.spyOn(accountsApi, "list").mockResolvedValue({
      message: "ok",
      data: [mockCheckingAccount, mockCreditCard, mockArchivedAccount],
    })

    renderAccounts(queryClient)

    await waitFor(() => {
      expect(screen.getByTestId("total-assets")).toBeInTheDocument()
    })

    // Assets: checking 5420.50 (archived not counted)
    expect(screen.getByTestId("total-assets")).toHaveTextContent("$5,420.50")
    // Liabilities: credit card 850.00
    expect(screen.getByTestId("total-liabilities")).toHaveTextContent("$850.00")
    // Net: 5420.50 - 850.00 = 4570.50
    expect(screen.getByTestId("net-portfolio")).toHaveTextContent("$4,570.50")
  })

  // 7. Add Account form opens
  it("5. opens Add Account sheet when button is clicked", async () => {
    vi.spyOn(accountsApi, "list").mockResolvedValue({
      message: "ok",
      data: [mockCheckingAccount],
    })

    renderAccounts(queryClient)

    await waitFor(() => {
      expect(screen.getByTestId("add-account-btn")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId("add-account-btn"))

    await waitFor(() => {
      expect(screen.getByTestId("account-form-sheet")).toBeInTheDocument()
    })

    // The form title says "New Account"
    expect(screen.getByText("New Account")).toBeInTheDocument()
    expect(screen.getByTestId("account-name-input")).toBeInTheDocument()
    expect(screen.getByTestId("account-type-select")).toBeInTheDocument()
    expect(screen.getByTestId("account-balance-input")).toBeInTheDocument()
  })

  // 8. Form validation
  it("6. validates required fields in account creation form", async () => {
    vi.spyOn(accountsApi, "list").mockResolvedValue({ message: "ok", data: [] })

    renderAccounts(queryClient)

    await waitFor(() => {
      expect(screen.getByTestId("empty-add-account-btn")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId("empty-add-account-btn"))

    await waitFor(() => {
      expect(screen.getByTestId("account-form-sheet")).toBeInTheDocument()
    })

    // Clear the name and submit
    fireEvent.change(screen.getByTestId("account-name-input"), {
      target: { value: "" },
    })
    // Clear balance too
    fireEvent.change(screen.getByTestId("account-balance-input"), {
      target: { value: "" },
    })

    fireEvent.click(screen.getByTestId("account-form-submit"))

    await waitFor(() => {
      expect(screen.getByText("Account name is required")).toBeInTheDocument()
    })
    expect(screen.getByText("Opening balance is required")).toBeInTheDocument()
  })

  // 9. Account creation submission
  it("7. successfully creates an account and invalidates queries", async () => {
    const listSpy = vi
      .spyOn(accountsApi, "list")
      .mockResolvedValue({ message: "ok", data: [] })
    const createSpy = vi.spyOn(accountsApi, "create").mockResolvedValue({
      message: "Account created",
      data: {
        ...mockCheckingAccount,
        id: "acc-new",
        name: "New Test Account",
      },
    })
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    renderAccounts(queryClient)

    await waitFor(() => {
      expect(screen.getByTestId("empty-add-account-btn")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId("empty-add-account-btn"))

    await waitFor(() => {
      expect(screen.getByTestId("account-form-sheet")).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("account-name-input"), {
      target: { value: "New Test Account" },
    })
    fireEvent.change(screen.getByTestId("account-balance-input"), {
      target: { value: "1000.00" },
    })

    fireEvent.click(screen.getByTestId("account-form-submit"))

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "New Test Account",
          account_type: "depository",
          current_balance: "1000.00",
        })
      )
    })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["accounts"] })
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["dashboard-summary"] })
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["transactions"] })
    })

    expect(listSpy).toHaveBeenCalled()
  })

  // 10. Account editing
  it("8. opens Edit Account sheet prefilled with existing account data", async () => {
    vi.spyOn(accountsApi, "list").mockResolvedValue({
      message: "ok",
      data: [mockCreditCard],
    })
    const updateSpy = vi.spyOn(accountsApi, "update").mockResolvedValue({
      message: "Account updated",
      data: { ...mockCreditCard, name: "Updated Card" },
    })

    renderAccounts(queryClient)

    await waitFor(() => {
      expect(screen.getByTestId(`edit-account-btn-${mockCreditCard.id}`)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId(`edit-account-btn-${mockCreditCard.id}`))

    await waitFor(() => {
      expect(screen.getByTestId("account-form-sheet")).toBeInTheDocument()
    })

    expect(screen.getByText("Edit Account")).toBeInTheDocument()

    const nameInput = screen.getByTestId("account-name-input") as HTMLInputElement
    expect(nameInput.value).toBe("Sapphire Credit Card")

    // Should show credit limit field
    expect(screen.getByTestId("account-credit-limit-input")).toBeInTheDocument()
    expect(screen.getByTestId("account-interest-rate-input")).toBeInTheDocument()

    // Should NOT show balance input (edit mode)
    expect(screen.queryByTestId("account-balance-input")).not.toBeInTheDocument()

    // Update the name
    fireEvent.change(nameInput, { target: { value: "Updated Card" } })
    fireEvent.click(screen.getByTestId("account-form-submit"))

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        mockCreditCard.id,
        expect.objectContaining({ name: "Updated Card" })
      )
    })
  })

  // 11. Archive confirmation
  it("9. shows archive confirmation sheet and archives account on confirm", async () => {
    vi.spyOn(accountsApi, "list").mockResolvedValue({
      message: "ok",
      data: [mockCheckingAccount],
    })
    const updateSpy = vi.spyOn(accountsApi, "update").mockResolvedValue({
      message: "Account updated",
      data: { ...mockCheckingAccount, archived_at: "2026-11-18T00:00:00Z" },
    })

    renderAccounts(queryClient)

    await waitFor(() => {
      expect(
        screen.getByTestId(`archive-account-btn-${mockCheckingAccount.id}`)
      ).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId(`archive-account-btn-${mockCheckingAccount.id}`))

    await waitFor(() => {
      expect(screen.getByTestId("archive-confirm-sheet")).toBeInTheDocument()
    })

    expect(screen.getByText("Archive Account?")).toBeInTheDocument()
    // The description contains the account name — use getAllByText since account row also shows it
    expect(screen.getAllByText(/Premier Checking/).length).toBeGreaterThan(0)
    expect(screen.getByText(/historical transactions are preserved/)).toBeInTheDocument()

    // Cancel first
    fireEvent.click(screen.getByTestId("archive-cancel-btn"))
    expect(updateSpy).not.toHaveBeenCalled()

    // Open again and confirm
    fireEvent.click(screen.getByTestId(`archive-account-btn-${mockCheckingAccount.id}`))

    await waitFor(() => {
      expect(screen.getByTestId("archive-confirm-btn")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId("archive-confirm-btn"))

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        mockCheckingAccount.id,
        { archive: true }
      )
    })
  })

  // 12. Reactivation
  it("10. shows reactivate option for archived accounts", async () => {
    vi.spyOn(accountsApi, "list").mockResolvedValue({
      message: "ok",
      data: [mockArchivedAccount],
    })
    const updateSpy = vi.spyOn(accountsApi, "update").mockResolvedValue({
      message: "Account updated",
      data: { ...mockArchivedAccount, archived_at: null },
    })

    renderAccounts(queryClient)

    await waitFor(() => {
      expect(screen.getByText("Old Savings")).toBeInTheDocument()
    })

    // Should show Archived badge
    expect(screen.getByText("Archived")).toBeInTheDocument()

    fireEvent.click(screen.getByTestId(`archive-account-btn-${mockArchivedAccount.id}`))

    await waitFor(() => {
      expect(screen.getByText("Reactivate Account?")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId("archive-confirm-btn"))

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        mockArchivedAccount.id,
        { unarchive: true }
      )
    })
  })

  // 13. Query invalidation after archive
  it("11. invalidates accounts, dashboard, and transactions queries after archive", async () => {
    vi.spyOn(accountsApi, "list").mockResolvedValue({
      message: "ok",
      data: [mockCheckingAccount],
    })
    vi.spyOn(accountsApi, "update").mockResolvedValue({
      message: "ok",
      data: { ...mockCheckingAccount, archived_at: "2026-11-18T00:00:00Z" },
    })
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    renderAccounts(queryClient)

    await waitFor(() => {
      expect(
        screen.getByTestId(`archive-account-btn-${mockCheckingAccount.id}`)
      ).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId(`archive-account-btn-${mockCheckingAccount.id}`))
    await waitFor(() => {
      expect(screen.getByTestId("archive-confirm-btn")).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId("archive-confirm-btn"))

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["accounts"] })
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["dashboard-summary"] })
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["transactions"] })
    })
  })

  // 14. Currency formatting
  it("12. formats currency amounts correctly", async () => {
    const eurAccount: Account = {
      ...mockCheckingAccount,
      id: "acc-eur",
      name: "Euro Account",
      currency: "EUR",
      current_balance: "2500.75",
    }

    vi.spyOn(accountsApi, "list").mockResolvedValue({
      message: "ok",
      data: [eurAccount],
    })

    renderAccounts(queryClient)

    await waitFor(() => {
      expect(screen.getByText("Euro Account")).toBeInTheDocument()
    })

    // EUR formatting (may appear multiple times in group total and account row)
    expect(screen.getAllByText("€2,500.75").length).toBeGreaterThan(0)
  })

  // 15. Conditional fields: credit limit only shown for credit accounts
  it("13. shows credit limit field only for credit account type", async () => {
    vi.spyOn(accountsApi, "list").mockResolvedValue({ message: "ok", data: [] })

    renderAccounts(queryClient)

    await waitFor(() => {
      expect(screen.getByTestId("add-account-btn")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId("add-account-btn"))

    await waitFor(() => {
      expect(screen.getByTestId("account-form-sheet")).toBeInTheDocument()
    })

    // Default type is depository — no credit limit
    expect(screen.queryByTestId("account-credit-limit-input")).not.toBeInTheDocument()

    // Interest rate also not shown for depository
    expect(screen.queryByTestId("account-interest-rate-input")).not.toBeInTheDocument()
  })

  // 16. Toggle archived accounts visibility
  it("14. toggles showing archived accounts", async () => {
    const listSpy = vi.spyOn(accountsApi, "list").mockResolvedValue({
      message: "ok",
      data: [mockCheckingAccount],
    })

    renderAccounts(queryClient)

    await waitFor(() => {
      expect(screen.getByTestId("toggle-archived-btn")).toBeInTheDocument()
    })

    expect(listSpy).toHaveBeenCalledWith(false)

    fireEvent.click(screen.getByTestId("toggle-archived-btn"))

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(true)
    })
  })

  // 17. Institution shown in accounts list
  it("15. displays institution name when present", async () => {
    vi.spyOn(accountsApi, "list").mockResolvedValue({
      message: "ok",
      data: [mockCheckingAccount],
    })
    vi.spyOn(institutionsApi, "list").mockResolvedValue({
      message: "ok",
      data: [mockInstitution],
    })

    renderAccounts(queryClient)

    await waitFor(() => {
      expect(screen.getByText("Premier Checking")).toBeInTheDocument()
    })

    // Institution display name shown in account row
    expect(screen.getByText("Chase Bank")).toBeInTheDocument()
  })

  // 18. Server error shown in form
  it("16. displays server error in form on failed submission", async () => {
    vi.spyOn(accountsApi, "list").mockResolvedValue({ message: "ok", data: [] })
    vi.spyOn(accountsApi, "create").mockRejectedValue(new Error("Invalid balance format"))

    renderAccounts(queryClient)

    await waitFor(() => {
      expect(screen.getByTestId("add-account-btn")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId("add-account-btn"))

    await waitFor(() => {
      expect(screen.getByTestId("account-form-sheet")).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("account-name-input"), {
      target: { value: "Test Account" },
    })
    fireEvent.change(screen.getByTestId("account-balance-input"), {
      target: { value: "100.00" },
    })

    fireEvent.click(screen.getByTestId("account-form-submit"))

    await waitFor(() => {
      expect(screen.getByTestId("account-form-error")).toBeInTheDocument()
    })

    expect(screen.getByText("Invalid balance format")).toBeInTheDocument()
  })
})
