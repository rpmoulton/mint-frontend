import React, { useState, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { transactionsApi, accountsApi, categoriesApi } from "@/lib/api"
import { formatCurrency, formatDate } from "@/lib/format"
import type { Transaction, Account, Category, TransactionFilters } from "@/lib/types"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
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
  ArrowLeftRight,
  CircleAlert,
  RefreshCw,
  Search,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react"
import { toast } from "sonner"

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25

// ─── Helper: safe number parse ────────────────────────────────────────────────

function parseDecimal(s: string | number | null | undefined): number {
  if (s == null) return 0
  const n = typeof s === "number" ? s : parseFloat(s)
  return isNaN(n) ? 0 : n
}

// ─── Transaction amount display ───────────────────────────────────────────────
// Backend stores debit as negative, credit as positive.
// Display: credit → green +amount, debit → default -amount.

function TransactionAmount({ tx }: { tx: Transaction }) {
  const amount = parseDecimal(tx.amount)
  const isCredit = tx.transaction_type === "credit" || amount > 0
  return (
    <span
      className={`tabular-nums font-semibold ${isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}
    >
      {formatCurrency(tx.amount, tx.currency, { showPlus: isCredit })}
    </span>
  )
}

// ─── Category badge ───────────────────────────────────────────────────────────

function CategoryBadge({ tx }: { tx: Transaction }) {
  if (!tx.category_name) {
    return <span className="text-xs text-muted-foreground">Uncategorized</span>
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: tx.category_color ? `${tx.category_color}22` : undefined,
        color: tx.category_color ?? undefined,
      }}
    >
      {tx.category_name}
    </span>
  )
}

// ─── Transaction type badge ───────────────────────────────────────────────────

function TxTypeBadge({ type }: { type: string }) {
  if (type === "credit") {
    return (
      <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-600 dark:text-emerald-400 capitalize">
        {type}
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-[10px] text-muted-foreground capitalize">
      {type}
    </Badge>
  )
}

// ─── Transaction form ─────────────────────────────────────────────────────────

interface TxFormState {
  account_id: string
  category_id: string
  amount: string
  transaction_date: string
  description: string
  merchant_name: string
  notes: string
  transaction_type: string
  status: string
}

const EMPTY_FORM: TxFormState = {
  account_id: "",
  category_id: "",
  amount: "",
  transaction_date: new Date().toISOString().slice(0, 10),
  description: "",
  merchant_name: "",
  notes: "",
  transaction_type: "debit",
  status: "posted",
}

function txToFormState(tx: Transaction): TxFormState {
  // Show the absolute value in the form; the type (debit/credit) governs sign
  const absAmount = Math.abs(parseDecimal(tx.amount)).toFixed(2)
  return {
    account_id: tx.account_id,
    category_id: tx.category_id ?? "",
    amount: absAmount,
    transaction_date: tx.transaction_date,
    description: tx.description,
    merchant_name: tx.merchant_name ?? "",
    notes: tx.notes ?? "",
    transaction_type: tx.transaction_type,
    status: tx.status,
  }
}

interface FormErrors {
  account_id?: string
  amount?: string
  transaction_date?: string
  description?: string
  transaction_type?: string
}

function validateForm(form: TxFormState): FormErrors {
  const errs: FormErrors = {}
  if (!form.account_id) errs.account_id = "Account is required"
  if (!form.amount || isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0)
    errs.amount = "Enter a positive numeric amount"
  if (!form.transaction_date) errs.transaction_date = "Date is required"
  if (!form.description.trim()) errs.description = "Description is required"
  if (!form.transaction_type) errs.transaction_type = "Type is required"
  return errs
}

interface TransactionFormSheetProps {
  open: boolean
  onOpenChange: (o: boolean) => void
  editing: Transaction | null
  accounts: Account[]
  categories: Category[]
  onSuccess: () => void
}

function TransactionFormSheet({
  open,
  onOpenChange,
  editing,
  accounts,
  categories,
  onSuccess,
}: TransactionFormSheetProps) {
  const [form, setForm] = useState<TxFormState>(editing ? txToFormState(editing) : EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  // Reset form when sheet opens/closes or editing target changes
  React.useEffect(() => {
    if (open) {
      setForm(editing ? txToFormState(editing) : EMPTY_FORM)
      setErrors({})
      setServerError(null)
    }
  }, [open, editing])

  function field(key: keyof TxFormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key as keyof FormErrors]) {
      setErrors((e) => ({ ...e, [key]: undefined }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validateForm(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setSubmitting(true)
    setServerError(null)

    try {
      if (editing) {
        await transactionsApi.update(editing.id, {
          account_id: form.account_id,
          category_id: form.category_id || undefined,
          amount: form.amount,
          transaction_date: form.transaction_date,
          description: form.description,
          merchant_name: form.merchant_name || undefined,
          notes: form.notes || undefined,
          transaction_type: form.transaction_type,
          status: form.status,
        })
        toast.success("Transaction updated")
      } else {
        await transactionsApi.create({
          account_id: form.account_id,
          category_id: form.category_id || undefined,
          amount: form.amount,
          transaction_date: form.transaction_date,
          description: form.description,
          merchant_name: form.merchant_name || undefined,
          notes: form.notes || undefined,
          transaction_type: form.transaction_type,
          status: form.status,
        })
        toast.success("Transaction created")
      }
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save transaction"
      setServerError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // Filter categories relevant to transaction type
  const relevantCategories = categories.filter((c) => {
    if (form.transaction_type === "credit") return c.type === "income" || c.type === "transfer"
    if (form.transaction_type === "debit") return c.type === "expense" || c.type === "transfer"
    return true
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle>{editing ? "Edit Transaction" : "Add Transaction"}</SheetTitle>
          <SheetDescription>
            {editing
              ? "Update the transaction details below."
              : "Enter the details for a new manual transaction."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 px-6 pb-2">
          {serverError && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            >
              <CircleAlert className="size-4 shrink-0" />
              {serverError}
            </div>
          )}

          {/* Account */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tx-account">Account *</Label>
            <Select value={form.account_id} onValueChange={(v) => field("account_id", v ?? "")}>
              <SelectTrigger
                id="tx-account"
                className="w-full"
                aria-invalid={!!errors.account_id}
                aria-describedby={errors.account_id ? "tx-account-err" : undefined}
              >
                <SelectValue placeholder="Select account…" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} ({a.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.account_id && (
              <p id="tx-account-err" className="text-xs text-destructive">
                {errors.account_id}
              </p>
            )}
          </div>

          {/* Transaction type */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tx-type">Transaction Type *</Label>
            <Select value={form.transaction_type} onValueChange={(v) => field("transaction_type", v ?? "debit")}>
              <SelectTrigger
                id="tx-type"
                className="w-full"
                aria-invalid={!!errors.transaction_type}
              >
                <SelectValue placeholder="Select type…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="debit">Debit (expense / payment)</SelectItem>
                <SelectItem value="credit">Credit (income / deposit)</SelectItem>
              </SelectContent>
            </Select>
            {errors.transaction_type && (
              <p className="text-xs text-destructive">{errors.transaction_type}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Debit reduces assets; Credit increases assets. The backend applies sign automatically.
            </p>
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tx-amount">Amount *</Label>
            <Input
              id="tx-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => field("amount", e.target.value)}
              aria-invalid={!!errors.amount}
              aria-describedby={errors.amount ? "tx-amount-err" : undefined}
            />
            {errors.amount && (
              <p id="tx-amount-err" className="text-xs text-destructive">
                {errors.amount}
              </p>
            )}
          </div>

          {/* Date */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tx-date">Transaction Date *</Label>
            <Input
              id="tx-date"
              type="date"
              value={form.transaction_date}
              onChange={(e) => field("transaction_date", e.target.value)}
              aria-invalid={!!errors.transaction_date}
              aria-describedby={errors.transaction_date ? "tx-date-err" : undefined}
            />
            {errors.transaction_date && (
              <p id="tx-date-err" className="text-xs text-destructive">
                {errors.transaction_date}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tx-desc">Description *</Label>
            <Input
              id="tx-desc"
              type="text"
              maxLength={255}
              placeholder="e.g. Monthly rent payment"
              value={form.description}
              onChange={(e) => field("description", e.target.value)}
              aria-invalid={!!errors.description}
              aria-describedby={errors.description ? "tx-desc-err" : undefined}
            />
            {errors.description && (
              <p id="tx-desc-err" className="text-xs text-destructive">
                {errors.description}
              </p>
            )}
          </div>

          {/* Merchant */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tx-merchant">Merchant Name</Label>
            <Input
              id="tx-merchant"
              type="text"
              maxLength={100}
              placeholder="e.g. Trader Joe's"
              value={form.merchant_name}
              onChange={(e) => field("merchant_name", e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tx-category">Category</Label>
            <Select value={form.category_id} onValueChange={(v) => field("category_id", v)}>
              <SelectTrigger id="tx-category" className="w-full">
                <SelectValue placeholder="Uncategorized" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Uncategorized</SelectItem>
                {relevantCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tx-status">Status</Label>
            <Select value={form.status} onValueChange={(v) => field("status", v)}>
              <SelectTrigger id="tx-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="posted">Posted</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tx-notes">Notes</Label>
            <Input
              id="tx-notes"
              type="text"
              maxLength={500}
              placeholder="Optional notes…"
              value={form.notes}
              onChange={(e) => field("notes", e.target.value)}
            />
          </div>
        </form>

        <SheetFooter className="px-6 pt-2">
          <SheetClose
            render={
              <Button type="button" variant="outline" disabled={submitting}>
                Cancel
              </Button>
            }
          />
          <Button type="submit" disabled={submitting} onClick={handleSubmit}>
            {submitting ? "Saving…" : editing ? "Save Changes" : "Add Transaction"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ─── Delete confirmation ───────────────────────────────────────────────────────

interface DeleteConfirmSheetProps {
  tx: Transaction | null
  onConfirm: () => void
  onCancel: () => void
  deleting: boolean
}

function DeleteConfirmSheet({ tx, onConfirm, onCancel, deleting }: DeleteConfirmSheetProps) {
  return (
    <Sheet open={!!tx} onOpenChange={(o) => { if (!o) onCancel() }}>
      <SheetContent side="bottom">
        <SheetHeader className="text-left">
          <SheetTitle>Delete Transaction?</SheetTitle>
          <SheetDescription>
            This will permanently delete{" "}
            <strong>{tx?.description ?? "this transaction"}</strong> and reverse its effect on the
            account balance. This action cannot be undone.
          </SheetDescription>
        </SheetHeader>
        <SheetFooter className="flex flex-row gap-2 justify-end pt-4 px-6 pb-6">
          <Button variant="outline" onClick={onCancel} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={deleting}
            aria-label="Confirm delete transaction"
          >
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TransactionsSkeleton() {
  return (
    <div
      className="flex flex-col gap-4 p-4 sm:p-6 max-w-6xl mx-auto w-full"
      data-testid="transactions-skeleton"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function TransactionsPage() {
  const queryClient = useQueryClient()

  // ── Filter state ───────────────────────────────────────────────────────────
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const searchTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const [filterAccountId, setFilterAccountId] = useState("")
  const [filterCategoryId, setFilterCategoryId] = useState("")
  const [filterType, setFilterType] = useState("")
  const [filterStartDate, setFilterStartDate] = useState("")
  const [filterEndDate, setFilterEndDate] = useState("")
  const [page, setPage] = useState(0) // zero-based page index

  // ── Sheet / modal state ────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // ── Debounce search ────────────────────────────────────────────────────────
  function handleSearchChange(val: string) {
    setSearch(val)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(val)
      setPage(0)
    }, 350)
  }

  // ── Invalidation helper ────────────────────────────────────────────────────
  const invalidateAll = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["transactions"] })
    void queryClient.invalidateQueries({ queryKey: ["accounts"] })
    void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] })
  }, [queryClient])

  // ── Queries ────────────────────────────────────────────────────────────────
  const filters: TransactionFilters = {
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(filterAccountId ? { account_id: filterAccountId } : {}),
    ...(filterCategoryId ? { category_id: filterCategoryId } : {}),
    ...(filterType ? { transaction_type: filterType } : {}),
    ...(filterStartDate ? { start_date: filterStartDate } : {}),
    ...(filterEndDate ? { end_date: filterEndDate } : {}),
  }

  const {
    data: txResponse,
    isLoading: txLoading,
    isError: txError,
    error: txErr,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["transactions", filters],
    queryFn: () => transactionsApi.list(filters),
    staleTime: 1000 * 30,
  })

  const { data: accountsResponse } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => accountsApi.list(),
    staleTime: 1000 * 60 * 5,
  })

  const { data: categoriesResponse } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.list(),
    staleTime: 1000 * 60 * 5,
  })

  const transactions = txResponse?.data ?? []
  const meta = txResponse?.meta
  const accounts = accountsResponse?.data ?? []
  const categories = categoriesResponse?.data ?? []

  const totalRecords = meta ? (typeof meta.records === "string" ? parseInt(meta.records, 10) : (meta.records ?? 0)) : 0
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE))
  const hasNext = meta?.has_next ?? false
  const hasPrev = meta?.has_prev ?? false

  // ── Mutations ──────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => transactionsApi.delete(id),
    onSuccess: () => {
      toast.success("Transaction deleted")
      invalidateAll()
      setDeletingTx(null)
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Failed to delete transaction"
      toast.error(msg)
      setIsDeleting(false)
    },
  })

  async function handleDeleteConfirm() {
    if (!deletingTx) return
    setIsDeleting(true)
    deleteMutation.mutate(deletingTx.id)
  }

  function openAdd() {
    setEditingTx(null)
    setFormOpen(true)
  }

  function openEdit(tx: Transaction) {
    setEditingTx(tx)
    setFormOpen(true)
  }

  function handleFilterChange() {
    setPage(0)
  }

  function clearFilters() {
    setSearch("")
    setDebouncedSearch("")
    setFilterAccountId("")
    setFilterCategoryId("")
    setFilterType("")
    setFilterStartDate("")
    setFilterEndDate("")
    setPage(0)
  }

  const hasActiveFilters =
    debouncedSearch || filterAccountId || filterCategoryId || filterType || filterStartDate || filterEndDate

  // ── Loading / Error states ─────────────────────────────────────────────────
  if (txLoading && !txResponse) {
    return <TransactionsSkeleton />
  }

  if (txError) {
    return (
      <div className="p-4 sm:p-6 max-w-6xl mx-auto w-full">
        <Card className="border-destructive/40 bg-destructive/5" data-testid="transactions-error">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <CircleAlert className="size-5" />
              <CardTitle className="text-lg">Failed to load transactions</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              {txErr instanceof Error ? txErr.message : "Unable to retrieve transactions."}
            </p>
          </CardHeader>
          <div className="px-6 pb-6">
            <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-2">
              <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
              Retry
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6 max-w-6xl mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Transactions</h1>
            {totalRecords > 0 && (
              <Badge variant="secondary" className="font-medium">
                {totalRecords.toLocaleString()}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            View, search, and manage your financial transactions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => refetch()}
            variant="ghost"
            size="icon"
            disabled={isFetching}
            aria-label="Refresh transactions"
          >
            <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={openAdd} className="gap-2" data-testid="add-transaction-btn">
            <Plus className="size-4" />
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2" data-testid="transactions-filters">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-9 h-9"
              placeholder="Search description or merchant…"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              aria-label="Search transactions"
              data-testid="search-input"
            />
          </div>

          {/* Account filter */}
          <Select
            value={filterAccountId}
            onValueChange={(v) => { setFilterAccountId(v); handleFilterChange() }}
          >
            <SelectTrigger className="h-9 min-w-[150px]" aria-label="Filter by account">
              <SelectValue placeholder="All accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All accounts</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Type filter */}
          <Select
            value={filterType}
            onValueChange={(v) => { setFilterType(v); handleFilterChange() }}
          >
            <SelectTrigger className="h-9 min-w-[130px]" aria-label="Filter by type">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All types</SelectItem>
              <SelectItem value="debit">Debit</SelectItem>
              <SelectItem value="credit">Credit</SelectItem>
            </SelectContent>
          </Select>

          {/* Category filter */}
          <Select
            value={filterCategoryId}
            onValueChange={(v) => { setFilterCategoryId(v); handleFilterChange() }}
          >
            <SelectTrigger className="h-9 min-w-[150px]" aria-label="Filter by category">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date range */}
          <Input
            type="date"
            className="h-9 w-auto"
            title="Start date"
            aria-label="Start date filter"
            value={filterStartDate}
            onChange={(e) => { setFilterStartDate(e.target.value); handleFilterChange() }}
            data-testid="start-date-input"
          />
          <Input
            type="date"
            className="h-9 w-auto"
            title="End date"
            aria-label="End date filter"
            value={filterEndDate}
            onChange={(e) => { setFilterEndDate(e.target.value); handleFilterChange() }}
            data-testid="end-date-input"
          />

          {/* Clear filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="gap-1 text-muted-foreground"
              aria-label="Clear all filters"
              data-testid="clear-filters-btn"
            >
              <X className="size-3.5" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Transaction table */}
      <Card className="overflow-hidden">
        {transactions.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground"
            data-testid="transactions-empty"
          >
            <ArrowLeftRight className="size-10 opacity-30 mb-3" />
            <p className="text-sm font-medium">
              {hasActiveFilters ? "No transactions match your filters" : "No transactions found"}
            </p>
            <p className="text-xs mt-1">
              {hasActiveFilters
                ? "Try adjusting your search or filter criteria."
                : "Add your first transaction to get started."}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto" data-testid="transactions-table">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  <th className="py-3 pl-4 pr-3">Date</th>
                  <th className="py-3 px-3">Description</th>
                  <th className="py-3 px-3 hidden md:table-cell">Account</th>
                  <th className="py-3 px-3 hidden sm:table-cell">Category</th>
                  <th className="py-3 px-3 hidden lg:table-cell">Type</th>
                  <th className="py-3 px-3 text-right">Amount</th>
                  <th className="py-3 pl-3 pr-4">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-muted/30 transition-colors"
                    data-testid={`transaction-row-${tx.id}`}
                  >
                    <td className="py-3 pl-4 pr-3 whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(tx.transaction_date)}
                    </td>
                    <td className="py-3 px-3 min-w-[150px]">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground leading-tight">
                          {tx.description}
                        </span>
                        {tx.merchant_name && tx.merchant_name !== tx.description && (
                          <span className="text-xs text-muted-foreground">{tx.merchant_name}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs text-muted-foreground whitespace-nowrap hidden md:table-cell">
                      {tx.account_name}
                    </td>
                    <td className="py-3 px-3 hidden sm:table-cell">
                      <CategoryBadge tx={tx} />
                    </td>
                    <td className="py-3 px-3 hidden lg:table-cell">
                      <TxTypeBadge type={tx.transaction_type} />
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <TransactionAmount tx={tx} />
                      <div className="text-[10px] text-muted-foreground uppercase">
                        {tx.currency}
                      </div>
                    </td>
                    <td className="py-3 pl-3 pr-4">
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-foreground"
                          onClick={() => openEdit(tx)}
                          aria-label={`Edit ${tx.description}`}
                          data-testid={`edit-btn-${tx.id}`}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeletingTx(tx)}
                          aria-label={`Delete ${tx.description}`}
                          data-testid={`delete-btn-${tx.id}`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalRecords > PAGE_SIZE && (
          <div
            className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground"
            data-testid="pagination"
          >
            <span>
              Page {page + 1} of {totalPages} &nbsp;·&nbsp; {totalRecords.toLocaleString()} total
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={!hasPrev}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                aria-label="Previous page"
                data-testid="prev-page-btn"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={!hasNext}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Next page"
                data-testid="next-page-btn"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Add / Edit Sheet */}
      <TransactionFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editingTx}
        accounts={accounts}
        categories={categories}
        onSuccess={invalidateAll}
      />

      {/* Delete confirmation */}
      <DeleteConfirmSheet
        tx={deletingTx}
        onConfirm={handleDeleteConfirm}
        onCancel={() => { setDeletingTx(null); setIsDeleting(false) }}
        deleting={isDeleting}
      />
    </div>
  )
}
