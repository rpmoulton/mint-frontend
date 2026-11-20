import { useState, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { accountsApi, institutionsApi } from "@/lib/api"
import { formatCurrency } from "@/lib/format"
import type { Account, AccountType, Institution } from "@/lib/types"
import { ASSET_TYPES, LIABILITY_TYPES, ACCOUNT_TYPE_LABELS } from "@/lib/types"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import {
  Landmark,
  CreditCard,
  TrendingUp,
  Receipt,
  PiggyBank,
  Scale,
  CircleAlert,
  RefreshCw,
  Building2,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Pencil,
  Archive,
  ArchiveRestore,
  Eye,
  EyeOff,
} from "lucide-react"

// ─── Types ─────────────────────────────────────────────────────────────────

interface GroupDefinition {
  type: AccountType
  title: string
  description: string
  icon: typeof Landmark
}

const ACCOUNT_GROUPS: GroupDefinition[] = [
  {
    type: "depository",
    title: "Cash & Bank Accounts",
    description: "Checking, savings, and liquid cash balances",
    icon: Landmark,
  },
  {
    type: "credit",
    title: "Credit Cards",
    description: "Revolving credit cards and lines",
    icon: CreditCard,
  },
  {
    type: "investment",
    title: "Investments",
    description: "Brokerage, retirement, and investment holdings",
    icon: TrendingUp,
  },
  {
    type: "loan",
    title: "Loans",
    description: "Mortgages, vehicle, personal, and student debt",
    icon: Receipt,
  },
  {
    type: "other_asset",
    title: "Other Assets",
    description: "Real estate, vehicles, and personal assets",
    icon: PiggyBank,
  },
  {
    type: "other_liability",
    title: "Other Liabilities",
    description: "Miscellaneous debts and obligations",
    icon: Scale,
  },
]

// Subtypes per account type (backend allows any string but we suggest sensible defaults)
const ACCOUNT_SUBTYPES: Record<AccountType, string[]> = {
  depository: ["checking", "savings", "money_market", "cd", "cash_management"],
  credit: ["credit_card", "line_of_credit", "charge_card"],
  loan: ["mortgage", "auto", "student", "personal", "home_equity"],
  investment: ["brokerage", "401k", "ira", "roth_ira", "pension", "mutual_fund", "hsa"],
  other_asset: ["real_estate", "vehicle", "cryptocurrency", "collectible", "other"],
  other_liability: ["tax_liability", "medical_debt", "other"],
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatSubtype(subtype?: string | null): string {
  if (!subtype) return ""
  return subtype
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function sumBalances(accounts: Account[]): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const acc of accounts) {
    const cur = acc.currency || "USD"
    const val = parseFloat(acc.current_balance) || 0
    totals[cur] = (totals[cur] || 0) + val
  }
  return totals
}

function formatCurrencyTotals(totals: Record<string, number>): string {
  const entries = Object.entries(totals)
  if (entries.length === 0) return "$0.00"
  return entries
    .map(([curr, val]) => formatCurrency(val, curr))
    .join(" • ")
}

// Determine if a type needs credit-limit field
function needsCreditLimit(type: AccountType) {
  return type === "credit"
}

// Determine if a type needs interest-rate field
function needsInterestRate(type: AccountType) {
  return type === "credit" || type === "loan"
}

// ─── Account Form State ─────────────────────────────────────────────────────

interface AccountFormState {
  name: string
  account_type: AccountType
  account_subtype: string
  institution_id: string
  currency: string
  current_balance: string
  available_balance: string
  credit_limit: string
  interest_rate: string
}

const EMPTY_FORM: AccountFormState = {
  name: "",
  account_type: "depository",
  account_subtype: "checking",
  institution_id: "",
  currency: "USD",
  current_balance: "0.00",
  available_balance: "",
  credit_limit: "",
  interest_rate: "",
}

// ─── Account Form Validation ────────────────────────────────────────────────

interface FormErrors {
  name?: string
  account_type?: string
  current_balance?: string
  credit_limit?: string
  interest_rate?: string
  currency?: string
}

function validateForm(form: AccountFormState, isEdit = false): FormErrors {
  const errors: FormErrors = {}

  if (!form.name.trim()) {
    errors.name = "Account name is required"
  } else if (form.name.trim().length > 100) {
    errors.name = "Account name must be 100 characters or fewer"
  }

  if (!isEdit && !form.current_balance) {
    errors.current_balance = "Opening balance is required"
  }
  if (form.current_balance && isNaN(parseFloat(form.current_balance))) {
    errors.current_balance = "Balance must be a valid number"
  }

  if (form.credit_limit && isNaN(parseFloat(form.credit_limit))) {
    errors.credit_limit = "Credit limit must be a valid number"
  }

  if (form.interest_rate && isNaN(parseFloat(form.interest_rate))) {
    errors.interest_rate = "Interest rate must be a valid number"
  }

  if (form.currency && form.currency.length !== 3) {
    errors.currency = "Currency must be a 3-letter code (e.g. USD)"
  }

  return errors
}

// ─── Account Form Sheet ──────────────────────────────────────────────────────

interface AccountFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing?: Account | null
  institutions: Institution[]
  onSuccess: () => void
}

function AccountFormSheet({
  open,
  onOpenChange,
  editing,
  institutions,
  onSuccess,
}: AccountFormSheetProps) {
  const [form, setForm] = useState<AccountFormState>(() => {
    if (editing) {
      return {
        name: editing.name,
        account_type: editing.account_type,
        account_subtype: editing.account_subtype || "",
        institution_id: editing.institution_id || "",
        currency: editing.currency,
        current_balance: editing.current_balance,
        available_balance: editing.available_balance || "",
        credit_limit: editing.credit_limit || "",
        interest_rate: editing.interest_rate || "",
      }
    }
    return { ...EMPTY_FORM }
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  // Reset form when sheet opens/closes or editing target changes
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setErrors({})
      setServerError(null)
      setSubmitting(false)
      if (!editing) setForm({ ...EMPTY_FORM })
    } else {
      if (editing) {
        setForm({
          name: editing.name,
          account_type: editing.account_type,
          account_subtype: editing.account_subtype || "",
          institution_id: editing.institution_id || "",
          currency: editing.currency,
          current_balance: editing.current_balance,
          available_balance: editing.available_balance || "",
          credit_limit: editing.credit_limit || "",
          interest_rate: editing.interest_rate || "",
        })
      } else {
        setForm({ ...EMPTY_FORM })
      }
    }
    onOpenChange(nextOpen)
  }

  const setField = <K extends keyof AccountFormState>(key: K, val: AccountFormState[K]) => {
    setForm((prev) => {
      const updated = { ...prev, [key]: val }
      // Reset subtype when type changes
      if (key === "account_type") {
        const subtypes = ACCOUNT_SUBTYPES[val as AccountType]
        updated.account_subtype = subtypes[0] ?? ""
      }
      return updated
    })
    if (errors[key as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }))
    }
  }

  const handleSubmit = async () => {
    const validationErrors = validateForm(form, !!editing)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSubmitting(true)
    setServerError(null)

    try {
      if (editing) {
        // Edit: only send metadata fields (not balance — see limitation note)
        const body: Parameters<typeof accountsApi.update>[1] = {}
        if (form.name !== editing.name) body.name = form.name
        if (form.account_subtype !== (editing.account_subtype || ""))
          body.account_subtype = form.account_subtype
        if (form.institution_id !== (editing.institution_id || ""))
          body.institution_id = form.institution_id || undefined
        if (form.credit_limit !== (editing.credit_limit || ""))
          body.credit_limit = form.credit_limit || undefined
        if (form.interest_rate !== (editing.interest_rate || ""))
          body.interest_rate = form.interest_rate || undefined

        await accountsApi.update(editing.id, body)
      } else {
        // Create
        const body: Parameters<typeof accountsApi.create>[0] = {
          name: form.name,
          account_type: form.account_type,
          account_subtype: form.account_subtype || undefined,
          institution_id: form.institution_id || undefined,
          currency: form.currency || "USD",
          current_balance: form.current_balance,
          available_balance: form.available_balance || undefined,
          credit_limit: form.credit_limit || undefined,
          interest_rate: form.interest_rate || undefined,
        }
        await accountsApi.create(body)
      }
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Failed to save account")
    } finally {
      setSubmitting(false)
    }
  }

  const isEdit = !!editing
  const subtypes = ACCOUNT_SUBTYPES[form.account_type] ?? []

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md overflow-y-auto"
        data-testid="account-form-sheet"
      >
        <SheetHeader className="pb-4">
          <SheetTitle>{isEdit ? "Edit Account" : "New Account"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update the account's metadata. Balance changes are managed through transactions."
              : "Add a new financial account. Opening balance sets the starting point."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-6 pb-4">
          {serverError && (
            <div
              className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              role="alert"
              data-testid="account-form-error"
            >
              {serverError}
            </div>
          )}

          {/* Account Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="acc-name">Account Name *</Label>
            <Input
              id="acc-name"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="e.g. Chase Checking"
              maxLength={100}
              data-testid="account-name-input"
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-xs text-destructive" role="alert">
                {errors.name}
              </p>
            )}
          </div>

          {/* Account Type (create only — backend allows update but we keep it locked for clarity) */}
          {!isEdit && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="acc-type">Account Type *</Label>
              <Select
                value={form.account_type}
                onValueChange={(v) => {
                  if (v) setField("account_type", v as AccountType)
                }}
              >
                <SelectTrigger id="acc-type" data-testid="account-type-select">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(ACCOUNT_TYPE_LABELS) as [AccountType, string][]).map(
                    ([val, label]) => (
                      <SelectItem key={val} value={val}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Account Subtype */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="acc-subtype">Subtype</Label>
            <Select
              value={form.account_subtype}
              onValueChange={(v) => setField("account_subtype", v ?? "")}
            >
              <SelectTrigger id="acc-subtype" data-testid="account-subtype-select">
                <SelectValue placeholder="Select subtype" />
              </SelectTrigger>
              <SelectContent>
                {subtypes.map((st) => (
                  <SelectItem key={st} value={st}>
                    {formatSubtype(st)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Institution */}
          {institutions.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="acc-institution">Institution</Label>
              <Select
                value={form.institution_id || "none"}
                onValueChange={(v) => setField("institution_id", !v || v === "none" ? "" : v)}
              >
                <SelectTrigger id="acc-institution" data-testid="account-institution-select">
                  <SelectValue placeholder="Select institution (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None / Manual</SelectItem>
                  {institutions.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id}>
                      {inst.display_name || inst.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Currency (create only) */}
          {!isEdit && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="acc-currency">Currency</Label>
              <Input
                id="acc-currency"
                value={form.currency}
                onChange={(e) => setField("currency", e.target.value.toUpperCase())}
                placeholder="USD"
                maxLength={3}
                data-testid="account-currency-input"
                aria-invalid={!!errors.currency}
              />
              {errors.currency && (
                <p className="text-xs text-destructive" role="alert">
                  {errors.currency}
                </p>
              )}
            </div>
          )}

          {/* Opening Balance (create only) */}
          {!isEdit && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="acc-balance">Opening Balance *</Label>
              <Input
                id="acc-balance"
                value={form.current_balance}
                onChange={(e) => setField("current_balance", e.target.value)}
                placeholder="0.00"
                type="text"
                inputMode="decimal"
                data-testid="account-balance-input"
                aria-invalid={!!errors.current_balance}
              />
              {errors.current_balance && (
                <p className="text-xs text-destructive" role="alert">
                  {errors.current_balance}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {LIABILITY_TYPES.includes(form.account_type)
                  ? "For liability accounts (credit, loans), enter the current amount owed as a positive number."
                  : "Enter the current balance as a positive number."}
              </p>
            </div>
          )}

          {/* Credit Limit (credit accounts only) */}
          {needsCreditLimit(form.account_type) && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="acc-credit-limit">Credit Limit</Label>
              <Input
                id="acc-credit-limit"
                value={form.credit_limit}
                onChange={(e) => setField("credit_limit", e.target.value)}
                placeholder="e.g. 10000.00"
                type="text"
                inputMode="decimal"
                data-testid="account-credit-limit-input"
                aria-invalid={!!errors.credit_limit}
              />
              {errors.credit_limit && (
                <p className="text-xs text-destructive" role="alert">
                  {errors.credit_limit}
                </p>
              )}
            </div>
          )}

          {/* Interest Rate (credit and loan accounts) */}
          {needsInterestRate(form.account_type) && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="acc-interest-rate">Interest Rate (%)</Label>
              <Input
                id="acc-interest-rate"
                value={form.interest_rate}
                onChange={(e) => setField("interest_rate", e.target.value)}
                placeholder="e.g. 19.99"
                type="text"
                inputMode="decimal"
                data-testid="account-interest-rate-input"
                aria-invalid={!!errors.interest_rate}
              />
              {errors.interest_rate && (
                <p className="text-xs text-destructive" role="alert">
                  {errors.interest_rate}
                </p>
              )}
            </div>
          )}

          {/* Edit balance limitation notice */}
          {isEdit && (
            <div className="rounded-md border border-muted bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <strong>Balance note:</strong> Account balances are managed by transactions.
              To adjust a balance, create a correcting transaction on this account.
            </div>
          )}
        </div>

        <SheetFooter className="px-6 pt-2 pb-6 gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
            data-testid="account-form-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            data-testid="account-form-submit"
          >
            {submitting ? "Saving…" : isEdit ? "Save Changes" : "Add Account"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ─── Archive Confirm Sheet ───────────────────────────────────────────────────

interface ArchiveConfirmSheetProps {
  account: Account | null
  onConfirm: () => void
  onCancel: () => void
  archiving: boolean
}

function ArchiveConfirmSheet({
  account,
  onConfirm,
  onCancel,
  archiving,
}: ArchiveConfirmSheetProps) {
  const isUnarchive = account?.archived_at != null

  return (
    <Sheet open={!!account} onOpenChange={(o) => { if (!o) onCancel() }}>
      <SheetContent side="bottom" data-testid="archive-confirm-sheet">
        <SheetHeader className="text-left">
          <SheetTitle>
            {isUnarchive ? "Reactivate Account?" : "Archive Account?"}
          </SheetTitle>
          <SheetDescription>
            {isUnarchive
              ? `Reactivating "${account?.name}" will allow new transactions on this account.`
              : `Archiving "${account?.name}" will hide it from active views and prevent new transactions. All historical transactions are preserved.`}
          </SheetDescription>
        </SheetHeader>
        <SheetFooter className="flex flex-row gap-2 justify-end pt-4 px-6 pb-6">
          <SheetClose
            render={
              <Button variant="outline" onClick={onCancel} disabled={archiving} data-testid="archive-cancel-btn">
                Cancel
              </Button>
            }
          />
          <Button
            variant={isUnarchive ? "default" : "destructive"}
            onClick={onConfirm}
            disabled={archiving}
            data-testid="archive-confirm-btn"
          >
            {archiving
              ? isUnarchive
                ? "Reactivating…"
                : "Archiving…"
              : isUnarchive
                ? "Reactivate"
                : "Archive Account"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function AccountsPage() {
  const queryClient = useQueryClient()
  const [showArchived, setShowArchived] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [archivingAccount, setArchivingAccount] = useState<Account | null>(null)

  // ── Data Fetching ─────────────────────────────────────────────────────────
  const {
    data: response,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["accounts", showArchived],
    queryFn: () => accountsApi.list(showArchived),
    staleTime: 1000 * 60 * 2,
  })

  const { data: institutionsResponse } = useQuery({
    queryKey: ["institutions"],
    queryFn: () => institutionsApi.list(),
    staleTime: 1000 * 60 * 10,
  })

  const accounts = response?.data ?? []
  const institutions = institutionsResponse?.data ?? []

  // ── Invalidation ──────────────────────────────────────────────────────────
  const invalidateAll = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["accounts"] })
    void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] })
    void queryClient.invalidateQueries({ queryKey: ["transactions"] })
  }, [queryClient])

  // ── Archive Mutation ──────────────────────────────────────────────────────
  const archiveMutation = useMutation({
    mutationFn: (account: Account) => {
      const isUnarchive = account.archived_at != null
      return accountsApi.update(account.id, isUnarchive ? { unarchive: true } : { archive: true })
    },
    onSuccess: () => {
      invalidateAll()
      setArchivingAccount(null)
    },
    onError: () => {
      setArchivingAccount(null)
    },
  })

  // ── Computed totals ────────────────────────────────────────────────────────
  const activeAccounts = accounts.filter((a) => !a.archived_at)
  const assetAccounts = activeAccounts.filter((a) => ASSET_TYPES.includes(a.account_type))
  const liabilityAccounts = activeAccounts.filter((a) => LIABILITY_TYPES.includes(a.account_type))

  const assetTotals = sumBalances(assetAccounts)
  const liabilityTotals = sumBalances(liabilityAccounts)

  const allCurrencies = Array.from(
    new Set([...Object.keys(assetTotals), ...Object.keys(liabilityTotals)])
  )
  const netWorthByCurrency: Record<string, number> = {}
  for (const curr of allCurrencies) {
    netWorthByCurrency[curr] = (assetTotals[curr] || 0) - (liabilityTotals[curr] || 0)
  }

  // ── Loading State ─────────────────────────────────────────────────────────
  if (isLoading) {
    return <AccountsSkeleton />
  }

  // ── Error State ───────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="p-4 sm:p-6 max-w-6xl mx-auto w-full">
        <Card className="border-destructive/40 bg-destructive/5" data-testid="accounts-error">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <CircleAlert className="size-5" />
              <CardTitle className="text-lg">Failed to load financial accounts</CardTitle>
            </div>
            <CardDescription>
              {error instanceof Error
                ? error.message
                : "Unable to retrieve financial accounts from the server."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-2">
              <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
              Retry Connection
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 max-w-6xl mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Financial Accounts
            </h1>
            <Badge variant="secondary" className="font-medium">
              {accounts.length} {accounts.length === 1 ? "Account" : "Accounts"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            View real-time balances, linked institutions, and debt obligations.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => setShowArchived((v) => !v)}
            variant="outline"
            size="sm"
            className="gap-2"
            aria-label={showArchived ? "Hide archived accounts" : "Show archived accounts"}
            data-testid="toggle-archived-btn"
          >
            {showArchived ? (
              <>
                <EyeOff className="size-3.5" />
                <span>Hide Archived</span>
              </>
            ) : (
              <>
                <Eye className="size-3.5" />
                <span>Show Archived</span>
              </>
            )}
          </Button>
          <Button
            onClick={() => refetch()}
            variant="outline"
            size="sm"
            disabled={isFetching}
            className="gap-2"
            aria-label="Refresh accounts"
          >
            <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
          <Button
            onClick={() => setAddOpen(true)}
            size="sm"
            className="gap-2"
            data-testid="add-account-btn"
          >
            <Plus className="size-3.5" />
            <span>Add Account</span>
          </Button>
        </div>
      </div>

      {/* Portfolio Overview Cards */}
      {activeAccounts.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Assets
              </CardTitle>
              <ArrowUpRight className="size-4 text-emerald-600 dark:text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div
                className="text-2xl font-bold tracking-tight text-foreground"
                data-testid="total-assets"
              >
                {formatCurrencyTotals(assetTotals)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {assetAccounts.length} asset {assetAccounts.length === 1 ? "account" : "accounts"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Liabilities
              </CardTitle>
              <ArrowDownRight className="size-4 text-amber-600 dark:text-amber-400" />
            </CardHeader>
            <CardContent>
              <div
                className="text-2xl font-bold tracking-tight text-foreground"
                data-testid="total-liabilities"
              >
                {formatCurrencyTotals(liabilityTotals)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {liabilityAccounts.length} liability{" "}
                {liabilityAccounts.length === 1 ? "account" : "accounts"}
              </p>
            </CardContent>
          </Card>

          <Card className="sm:col-span-2 lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Net Portfolio
              </CardTitle>
              <Wallet className="size-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div
                className="text-2xl font-bold tracking-tight text-foreground"
                data-testid="net-portfolio"
              >
                {formatCurrencyTotals(netWorthByCurrency)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Assets minus debt liabilities</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {accounts.length === 0 && (
        <Card className="border-dashed border-2 py-12" data-testid="accounts-empty">
          <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Landmark className="size-7" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg">No Financial Accounts Found</CardTitle>
              <CardDescription className="max-w-md mx-auto text-sm">
                You do not have any linked or manual financial accounts yet.
              </CardDescription>
            </div>
            <Button onClick={() => setAddOpen(true)} className="gap-2" data-testid="empty-add-account-btn">
              <Plus className="size-4" />
              Add Your First Account
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Grouped Account Sections */}
      {accounts.length > 0 && (
        <div className="space-y-6">
          {ACCOUNT_GROUPS.map((group) => {
            const groupAccounts = accounts.filter((a) => a.account_type === group.type)
            if (groupAccounts.length === 0) return null

            const GroupIcon = group.icon
            const activeGroupAccounts = groupAccounts.filter((a) => !a.archived_at)
            const groupTotals = sumBalances(activeGroupAccounts)

            return (
              <Card
                key={group.type}
                className="overflow-hidden"
                data-testid={`group-${group.type}`}
              >
                <CardHeader className="border-b bg-muted/20 pb-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <GroupIcon className="size-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-semibold">{group.title}</CardTitle>
                        <CardDescription className="text-xs">{group.description}</CardDescription>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="text-xs text-muted-foreground font-medium">
                        Category Total
                      </div>
                      <div
                        className="text-lg font-bold text-foreground"
                        data-testid={`group-total-${group.type}`}
                      >
                        {formatCurrencyTotals(groupTotals)}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {groupAccounts.map((account) => (
                      <AccountRow
                        key={account.id}
                        account={account}
                        onEdit={() => setEditingAccount(account)}
                        onArchive={() => setArchivingAccount(account)}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Account Sheet */}
      <AccountFormSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        institutions={institutions}
        onSuccess={invalidateAll}
      />

      {/* Edit Account Sheet */}
      <AccountFormSheet
        key={editingAccount?.id ?? "edit-none"}
        open={!!editingAccount}
        onOpenChange={(o) => {
          if (!o) setEditingAccount(null)
        }}
        editing={editingAccount}
        institutions={institutions}
        onSuccess={invalidateAll}
      />

      {/* Archive Confirm Sheet */}
      <ArchiveConfirmSheet
        account={archivingAccount}
        onConfirm={() => {
          if (archivingAccount) archiveMutation.mutate(archivingAccount)
        }}
        onCancel={() => setArchivingAccount(null)}
        archiving={archiveMutation.isPending}
      />
    </div>
  )
}

// ─── Account Row ─────────────────────────────────────────────────────────────

interface AccountRowProps {
  account: Account
  onEdit: () => void
  onArchive: () => void
}

function AccountRow({ account, onEdit, onArchive }: AccountRowProps) {
  const institution = account.institution_display_name || account.institution_name
  const isArchived = account.archived_at != null

  return (
    <div
      className={`flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between transition-colors hover:bg-muted/30 ${isArchived ? "opacity-60" : ""}`}
      data-testid={`account-row-${account.id}`}
    >
      {/* Account Info */}
      <div className="space-y-1 min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-foreground text-sm truncate">{account.name}</span>
          {account.account_subtype && (
            <Badge variant="secondary" className="text-[11px] font-normal capitalize">
              {formatSubtype(account.account_subtype)}
            </Badge>
          )}
          {isArchived ? (
            <Badge
              variant="outline"
              className="text-[10px] border-amber-500/40 text-amber-600 dark:text-amber-400"
            >
              Archived
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-[10px] border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
            >
              Active
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px] text-muted-foreground uppercase">
            {account.currency}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {institution ? (
            <span className="flex items-center gap-1">
              <Building2 className="size-3.5" />
              <span>{institution}</span>
            </span>
          ) : (
            <span>Manual Account</span>
          )}

          {account.available_balance != null &&
            account.available_balance !== account.current_balance && (
              <span>
                Available:{" "}
                <span className="font-medium text-foreground">
                  {formatCurrency(account.available_balance, account.currency)}
                </span>
              </span>
            )}

          {account.credit_limit && (
            <span>
              Limit:{" "}
              <span className="font-medium text-foreground">
                {formatCurrency(account.credit_limit, account.currency)}
              </span>
            </span>
          )}

          {account.interest_rate && (
            <span>
              Rate:{" "}
              <span className="font-medium text-foreground">{account.interest_rate}%</span>
            </span>
          )}
        </div>
      </div>

      {/* Balance + Actions */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-left sm:text-right">
          <div className="text-base font-bold text-foreground">
            {formatCurrency(account.current_balance, account.currency)}
          </div>
          <div className="text-[11px] text-muted-foreground capitalize">
            {account.source_type} sync
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onEdit}
            aria-label={`Edit ${account.name}`}
            data-testid={`edit-account-btn-${account.id}`}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onArchive}
            aria-label={isArchived ? `Reactivate ${account.name}` : `Archive ${account.name}`}
            data-testid={`archive-account-btn-${account.id}`}
          >
            {isArchived ? (
              <ArchiveRestore className="size-3.5" />
            ) : (
              <Archive className="size-3.5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function AccountsSkeleton() {
  return (
    <div
      className="flex flex-col gap-6 p-4 sm:p-6 max-w-6xl mx-auto w-full"
      data-testid="accounts-skeleton"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl sm:col-span-2 lg:col-span-1" />
      </div>

      <div className="space-y-6">
        <Skeleton className="h-44 rounded-xl" />
        <Skeleton className="h-44 rounded-xl" />
      </div>
    </div>
  )
}
