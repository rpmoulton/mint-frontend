import React, { useState, useMemo, useCallback } from "react"
import { useSearchParams } from "react-router"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  AlertCircle,
  PiggyBank,
  CheckCircle2,
} from "lucide-react"

import { budgetsApi, categoriesApi } from "@/lib/api"
import type { Budget, BudgetCategory, Category } from "@/lib/types"
import { formatCurrency, formatPercentage, monthName, currentYearMonth } from "@/lib/format"

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStatusBadge(percent: number, isOver: boolean) {
  if (isOver || percent > 100) {
    return (
      <Badge variant="destructive" className="gap-1 font-semibold" data-testid="status-over-budget">
        <AlertTriangle className="h-3 w-3" /> Over Budget
      </Badge>
    )
  }
  if (percent >= 80) {
    return (
      <Badge variant="secondary" className="gap-1 bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-300 font-semibold" data-testid="status-approaching-limit">
        <AlertCircle className="h-3 w-3" /> Approaching Limit
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="gap-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-300 font-semibold" data-testid="status-on-track">
      <CheckCircle2 className="h-3 w-3" /> Under Budget
    </Badge>
  )
}

function getProgressBarColor(percent: number, isOver: boolean) {
  if (isOver || percent > 100) return "bg-destructive"
  if (percent >= 80) return "bg-amber-500"
  return "bg-emerald-500"
}

// ─── Create Budget Sheet ──────────────────────────────────────────────────────

interface CreateBudgetSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  month: number
  year: number
  onSuccess: () => void
}

function CreateBudgetSheet({ open, onOpenChange, month, year, onSuccess }: CreateBudgetSheetProps) {
  const [budgetName, setBudgetName] = useState(`${monthName(month)} ${year} Budget`)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!budgetName.trim()) return

    setSubmitting(true)
    setErrorMsg(null)
    try {
      await budgetsApi.create({
        name: budgetName.trim(),
        month,
        year,
      })
      onSuccess()
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create budget"
      setErrorMsg(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md" data-testid="create-budget-sheet">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <SheetHeader className="text-left pb-4">
            <SheetTitle>Create Monthly Budget</SheetTitle>
            <SheetDescription>
              Set up a budget for {monthName(month)} {year}. You will be able to allocate spending amounts to categories.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4 flex-1">
            {errorMsg && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md" data-testid="create-budget-error">
                {errorMsg}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="create-budget-name">Budget Name</Label>
              <Input
                id="create-budget-name"
                data-testid="budget-name-input"
                value={budgetName}
                onChange={(e) => setBudgetName(e.target.value)}
                placeholder="e.g. November 2026 Budget"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Month</Label>
                <Input value={monthName(month)} disabled />
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Input value={String(year)} disabled />
              </div>
            </div>
          </div>

          <SheetFooter className="flex flex-row gap-2 justify-end pt-4">
            <SheetClose
              render={
                <Button type="button" variant="outline" disabled={submitting}>
                  Cancel
                </Button>
              }
            />
            <Button type="submit" disabled={submitting || !budgetName.trim()} data-testid="submit-create-budget-btn">
              {submitting ? "Creating…" : "Create Budget"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

// ─── Add Category Allocation Sheet ───────────────────────────────────────────

interface AddAllocationSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  budgetId: string
  categories: Category[]
  existingAllocations: BudgetCategory[]
  onSuccess: () => void
}

function AddAllocationSheet({
  open,
  onOpenChange,
  budgetId,
  categories,
  existingAllocations,
  onSuccess,
}: AddAllocationSheetProps) {
  const [selectedCatId, setSelectedCatId] = useState<string>("")
  const [amount, setAmount] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Pre-calculate allocated category IDs
  const allocatedCatIds = useMemo(
    () => new Set(existingAllocations.map((a) => a.category_id)),
    [existingAllocations]
  )

  // Map category ID to category for hierarchy checks
  const catMap = useMemo(() => {
    const map = new Map<string, Category>()
    for (const c of categories) {
      map.set(c.id, c)
    }
    return map
  }, [categories])

  // Filter only expense categories and determine eligibility
  const eligibleCategories = useMemo(() => {
    return categories
      .filter((c) => c.type === "expense")
      .map((c) => {
        const isAlreadyAllocated = allocatedCatIds.has(c.id)

        // Check if its parent is already allocated
        let parentAllocated = false
        if (c.parent_category_id && allocatedCatIds.has(c.parent_category_id)) {
          parentAllocated = true
        }

        // Check if any of its children is already allocated
        let childAllocated = false
        for (const existingId of allocatedCatIds) {
          const existingCat = catMap.get(existingId)
          if (existingCat?.parent_category_id === c.id) {
            childAllocated = true
            break
          }
        }

        let disabledReason = ""
        if (isAlreadyAllocated) {
          disabledReason = "Already allocated"
        } else if (parentAllocated) {
          const parent = c.parent_category_id ? catMap.get(c.parent_category_id) : undefined
          disabledReason = `Parent (${parent?.name ?? "Parent"}) already allocated`
        } else if (childAllocated) {
          disabledReason = "Subcategories already allocated"
        }

        return {
          category: c,
          isDisabled: isAlreadyAllocated || parentAllocated || childAllocated,
          disabledReason,
        }
      })
  }, [categories, allocatedCatIds, catMap])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCatId || !amount) return

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount < 0) {
      setErrorMsg("Amount must be a non-negative number")
      return
    }

    setSubmitting(true)
    setErrorMsg(null)
    try {
      await budgetsApi.upsertCategory(budgetId, {
        category_id: selectedCatId,
        allocated_amount: numAmount.toFixed(2),
      })
      onSuccess()
      onOpenChange(false)
      setSelectedCatId("")
      setAmount("")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add allocation"
      setErrorMsg(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md" data-testid="add-allocation-sheet">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <SheetHeader className="text-left pb-4">
            <SheetTitle>Add Category Budget</SheetTitle>
            <SheetDescription>
              Allocate a monthly spending limit to an expense category. To prevent double-counting, you cannot allocate both a parent category and its subcategories.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4 flex-1">
            {errorMsg && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md" data-testid="allocation-error">
                {errorMsg}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="category-select">Expense Category</Label>
              <Select value={selectedCatId} onValueChange={(val) => setSelectedCatId(val ?? "")}>
                <SelectTrigger id="category-select" data-testid="category-select">
                  <SelectValue placeholder="Select an expense category" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {eligibleCategories.map(({ category, isDisabled, disabledReason }) => (
                    <SelectItem
                      key={category.id}
                      value={category.id}
                      disabled={isDisabled}
                      data-testid={`category-option-${category.id}`}
                    >
                      {category.name}
                      {isDisabled && ` (${disabledReason})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="allocation-amount">Budget Amount ($)</Label>
              <Input
                id="allocation-amount"
                data-testid="allocation-amount-input"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="500.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </div>

          <SheetFooter className="flex flex-row gap-2 justify-end pt-4">
            <SheetClose
              render={
                <Button type="button" variant="outline" disabled={submitting}>
                  Cancel
                </Button>
              }
            />
            <Button
              type="submit"
              disabled={submitting || !selectedCatId || !amount}
              data-testid="submit-allocation-btn"
            >
              {submitting ? "Saving…" : "Save Allocation"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

// ─── Edit Category Allocation Sheet ──────────────────────────────────────────

interface EditAllocationSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  budgetId: string
  allocation: BudgetCategory
  onSuccess: () => void
}

function EditAllocationSheetInner({
  open,
  onOpenChange,
  budgetId,
  allocation,
  onSuccess,
}: EditAllocationSheetProps) {
  const [amount, setAmount] = useState<string>(allocation.allocated_amount)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount < 0) {
      setErrorMsg("Amount must be a non-negative number")
      return
    }

    setSubmitting(true)
    setErrorMsg(null)
    try {
      await budgetsApi.upsertCategory(budgetId, {
        category_id: allocation.category_id,
        allocated_amount: numAmount.toFixed(2),
      })
      onSuccess()
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update allocation"
      setErrorMsg(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md" data-testid="edit-allocation-sheet">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <SheetHeader className="text-left pb-4">
            <SheetTitle>Edit Allocation: {allocation.category_name}</SheetTitle>
            <SheetDescription>
              Adjust your monthly budget target for this category.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4 flex-1">
            {errorMsg && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                {errorMsg}
              </div>
            )}

            <div className="space-y-2">
              <Label>Category</Label>
              <Input value={allocation.category_name ?? ""} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-amount">Budget Amount ($)</Label>
              <Input
                id="edit-amount"
                data-testid="edit-amount-input"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </div>

          <SheetFooter className="flex flex-row gap-2 justify-end pt-4">
            <SheetClose
              render={
                <Button type="button" variant="outline" disabled={submitting}>
                  Cancel
                </Button>
              }
            />
            <Button type="submit" disabled={submitting || !amount} data-testid="submit-edit-allocation-btn">
              {submitting ? "Saving…" : "Save Changes"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function EditAllocationSheet(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  budgetId: string
  allocation: BudgetCategory | null
  onSuccess: () => void
}) {
  if (!props.allocation) return null
  return <EditAllocationSheetInner key={props.allocation.id} {...props} allocation={props.allocation} />
}

// ─── Delete Allocation Confirmation Sheet ────────────────────────────────────

interface DeleteAllocationSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  budgetId: string
  allocation: BudgetCategory | null
  onSuccess: () => void
}

function DeleteAllocationSheet({
  open,
  onOpenChange,
  budgetId,
  allocation,
  onSuccess,
}: DeleteAllocationSheetProps) {
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!allocation) return null

  const handleConfirm = async () => {
    setSubmitting(true)
    setErrorMsg(null)
    try {
      await budgetsApi.deleteCategory(budgetId, allocation.category_id)
      onSuccess()
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove allocation"
      setErrorMsg(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="sm:max-w-md mx-auto" data-testid="delete-allocation-confirm-sheet">
        <SheetHeader className="text-left pb-2">
          <SheetTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="h-5 w-5" /> Remove Category Allocation
          </SheetTitle>
          <SheetDescription>
            Are you sure you want to remove the budget allocation for{" "}
            <strong>{allocation.category_name}</strong>?
            <br />
            This will not delete the category, existing transactions, or historical spending records.
          </SheetDescription>
        </SheetHeader>

        {errorMsg && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md my-2">
            {errorMsg}
          </div>
        )}

        <SheetFooter className="flex flex-row gap-2 justify-end pt-4">
          <SheetClose
            render={
              <Button type="button" variant="outline" disabled={submitting}>
                Cancel
              </Button>
            }
          />
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={submitting}
            data-testid="confirm-delete-allocation-btn"
          >
            {submitting ? "Removing…" : "Confirm Remove"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ─── Delete Budget Confirmation Sheet ────────────────────────────────────────

interface DeleteBudgetSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  budget: Budget | null
  onSuccess: () => void
}

function DeleteBudgetSheet({
  open,
  onOpenChange,
  budget,
  onSuccess,
}: DeleteBudgetSheetProps) {
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!budget) return null

  const handleConfirm = async () => {
    setSubmitting(true)
    setErrorMsg(null)
    try {
      await budgetsApi.delete(budget.id)
      onSuccess()
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete budget"
      setErrorMsg(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="sm:max-w-md mx-auto" data-testid="delete-budget-confirm-sheet">
        <SheetHeader className="text-left pb-2">
          <SheetTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="h-5 w-5" /> Delete Budget
          </SheetTitle>
          <SheetDescription>
            Are you sure you want to delete the budget <strong>{budget.name}</strong> for {monthName(budget.month)} {budget.year}? All category allocations for this month will be deleted. Transactions will not be affected.
          </SheetDescription>
        </SheetHeader>

        {errorMsg && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md my-2">
            {errorMsg}
          </div>
        )}

        <SheetFooter className="flex flex-row gap-2 justify-end pt-4">
          <SheetClose
            render={
              <Button type="button" variant="outline" disabled={submitting}>
                Cancel
              </Button>
            }
          />
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={submitting}
            data-testid="confirm-delete-budget-btn"
          >
            {submitting ? "Deleting…" : "Confirm Delete"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ─── Main Budgets Page Component ─────────────────────────────────────────────

export function BudgetsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()

  // Extract selected month and year from URL or default to current date
  const { year: currentYear, month: currentMonth } = currentYearMonth()
  const selectedYear = parseInt(searchParams.get("year") || String(currentYear), 10)
  const selectedMonth = parseInt(searchParams.get("month") || String(currentMonth), 10)

  // Sheet states
  const [createSheetOpen, setCreateSheetOpen] = useState(false)
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  const [editingAllocation, setEditingAllocation] = useState<BudgetCategory | null>(null)
  const [deletingAllocation, setDeletingAllocation] = useState<BudgetCategory | null>(null)
  const [deleteBudgetOpen, setDeleteBudgetOpen] = useState(false)

  // Month navigation handlers
  const handlePrevMonth = () => {
    let nextM = selectedMonth - 1
    let nextY = selectedYear
    if (nextM < 1) {
      nextM = 12
      nextY -= 1
    }
    setSearchParams({ year: String(nextY), month: String(nextM) })
  }

  const handleNextMonth = () => {
    let nextM = selectedMonth + 1
    let nextY = selectedYear
    if (nextM > 12) {
      nextM = 1
      nextY += 1
    }
    setSearchParams({ year: String(nextY), month: String(nextM) })
  }

  // TanStack Query for budgets of this month
  const {
    data: budgetsData,
    isLoading: isLoadingBudgets,
    isError: isErrorBudgets,
  } = useQuery({
    queryKey: ["budgets", selectedYear, selectedMonth],
    queryFn: () => budgetsApi.list({ year: selectedYear, month: selectedMonth }),
  })

  // Categories query to resolve hierarchy
  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.list(),
  })

  const categories = useMemo(() => categoriesData?.data ?? [], [categoriesData])

  // Category parent map: id -> parentName
  const categoryParentMap = useMemo(() => {
    const map = new Map<string, string>()
    const catMap = new Map<string, Category>()
    for (const c of categories) {
      catMap.set(c.id, c)
    }
    for (const c of categories) {
      if (c.parent_category_id) {
        const parent = catMap.get(c.parent_category_id)
        if (parent) {
          map.set(c.id, parent.name)
        }
      }
    }
    return map
  }, [categories])

  // Current budget for selected month
  const activeBudget = useMemo(() => {
    const list = budgetsData?.data ?? []
    return list.find((b) => b.month === selectedMonth && b.year === selectedYear) ?? null
  }, [budgetsData, selectedMonth, selectedYear])

  const allocations = useMemo(() => activeBudget?.categories ?? [], [activeBudget])

  const totalAllocatedNum = parseFloat(activeBudget?.total_allocated || "0.00")
  const totalSpentNum = parseFloat(activeBudget?.total_spent || "0.00")
  const remainingTotal = totalAllocatedNum - totalSpentNum
  const percentConsumed = totalAllocatedNum > 0 ? (totalSpentNum / totalAllocatedNum) * 100 : 0
  const isOverOverall = totalSpentNum > totalAllocatedNum

  // Alerts calculations
  const overBudgetCats = useMemo(
    () => allocations.filter((c) => c.is_over_budget || (c.percent_used !== undefined && c.percent_used > 100)),
    [allocations]
  )

  const approachingBudgetCats = useMemo(
    () => allocations.filter((c) => !c.is_over_budget && (c.percent_used ?? 0) >= 80 && (c.percent_used ?? 0) <= 100),
    [allocations]
  )

  const invalidateBudgets = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["budgets"] })
  }, [queryClient])

  return (
    <div className="space-y-6 p-6">
      {/* Month Navigation & Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monthly Budgets</h1>
          <p className="text-muted-foreground text-sm">
            Plan expense limits and track actual spending by category
          </p>
        </div>

        {/* Month Selector Buttons */}
        <div className="flex items-center gap-2 bg-card border rounded-lg p-1 shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevMonth}
            data-testid="prev-month-btn"
            aria-label="Previous Month"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <span
            className="font-semibold text-sm sm:text-base px-3 min-w-[140px] text-center"
            data-testid="current-month-display"
          >
            {monthName(selectedMonth)} {selectedYear}
          </span>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextMonth}
            data-testid="next-month-btn"
            aria-label="Next Month"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoadingBudgets && (
        <div className="space-y-6" data-testid="budgets-loading">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Skeleton className="h-28 rounded-lg" />
            <Skeleton className="h-28 rounded-lg" />
            <Skeleton className="h-28 rounded-lg" />
            <Skeleton className="h-28 rounded-lg" />
          </div>
          <Skeleton className="h-64 rounded-lg" />
        </div>
      )}

      {/* Error State */}
      {isErrorBudgets && (
        <Card className="border-destructive/50 bg-destructive/5" data-testid="budgets-error">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" /> Error Loading Budgets
            </CardTitle>
            <CardDescription>
              Could not retrieve budget data. Please try refreshing or check your connection.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Empty State: No Budget For This Month */}
      {!isLoadingBudgets && !isErrorBudgets && !activeBudget && (
        <Card className="border-dashed text-center py-12" data-testid="empty-budget-state">
          <CardContent className="space-y-4 max-w-md mx-auto">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
              <PiggyBank className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">
                No Budget for {monthName(selectedMonth)} {selectedYear}
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                You haven&apos;t created a budget for this month yet. Create one to allocate spending limits across categories and monitor your progress.
              </p>
            </div>
            <Button
              onClick={() => setCreateSheetOpen(true)}
              data-testid="create-budget-btn"
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> Create Budget
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Active Budget Content */}
      {!isLoadingBudgets && !isErrorBudgets && activeBudget && (
        <div className="space-y-6" data-testid="active-budget-content">
          {/* Alert Banner for Over-budget or Approaching Limit */}
          {overBudgetCats.length > 0 && (
            <div
              className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-center gap-3 text-destructive"
              data-testid="budget-alert-banner"
            >
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div className="text-sm">
                <span className="font-semibold">Budget Warning:</span>{" "}
                {overBudgetCats.length} {overBudgetCats.length === 1 ? "category has" : "categories have"} exceeded their monthly spending limit!
              </div>
            </div>
          )}

          {/* Budget Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="budget-summary-cards">
            {/* Total Budgeted */}
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-medium">Total Budget</CardDescription>
                <CardTitle className="text-2xl font-bold" data-testid="total-budgeted-amount">
                  {formatCurrency(totalAllocatedNum)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Total planned monthly allocations</p>
              </CardContent>
            </Card>

            {/* Total Spent */}
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-medium">Total Spending</CardDescription>
                <CardTitle className="text-2xl font-bold" data-testid="total-spent-amount">
                  {formatCurrency(totalSpentNum)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground" data-testid="percent-consumed-text">
                  {formatPercentage(percentConsumed)} consumed
                </p>
              </CardContent>
            </Card>

            {/* Remaining Amount */}
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-medium">
                  {isOverOverall ? "Budget Deficit" : "Remaining Budget"}
                </CardDescription>
                <CardTitle
                  className={`text-2xl font-bold ${isOverOverall ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}
                  data-testid="remaining-budget-amount"
                >
                  {formatCurrency(remainingTotal)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {isOverOverall ? "Over budget limit" : "Left to spend this month"}
                </p>
              </CardContent>
            </Card>

            {/* Category Status & Alerts */}
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-medium">Category Alerts</CardDescription>
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                  <span className="text-destructive" data-testid="over-budget-count">
                    {overBudgetCats.length}
                  </span>
                  <span className="text-xs text-muted-foreground font-normal">over /</span>
                  <span className="text-amber-500 text-lg font-semibold" data-testid="approaching-budget-count">
                    {approachingBudgetCats.length}
                  </span>
                  <span className="text-xs text-muted-foreground font-normal">warning</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {allocations.length} total allocated {allocations.length === 1 ? "category" : "categories"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Category Allocations Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Category Allocations</h2>
                <p className="text-xs text-muted-foreground">
                  Track actual spending against budgeted targets for each category
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setAddSheetOpen(true)}
                  data-testid="add-allocation-btn"
                  size="sm"
                  className="gap-1.5"
                >
                  <Plus className="h-4 w-4" /> Add Category Budget
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteBudgetOpen(true)}
                  data-testid="delete-budget-btn"
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Empty Allocations State */}
            {allocations.length === 0 && (
              <Card className="border-dashed text-center py-8" data-testid="empty-allocations-state">
                <CardContent className="space-y-3">
                  <p className="text-muted-foreground text-sm">
                    No expense categories allocated yet. Add an allocation to start budgeting.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddSheetOpen(true)}
                    className="gap-1.5"
                  >
                    <Plus className="h-4 w-4" /> Add Category Budget
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Allocations Grid / Cards */}
            {allocations.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="allocations-list">
                {allocations.map((alloc) => {
                  const allocAmount = parseFloat(alloc.allocated_amount || "0")
                  const spentAmount = parseFloat(alloc.spent_amount || "0")
                  const remaining = allocAmount - spentAmount
                  const percentUsed = alloc.percent_used ?? (allocAmount > 0 ? (spentAmount / allocAmount) * 100 : 0)
                  const isOver = alloc.is_over_budget ?? spentAmount > allocAmount
                  const parentName = categoryParentMap.get(alloc.category_id)
                  const visualProgress = Math.min(100, Math.max(0, percentUsed))
                  const barColor = getProgressBarColor(percentUsed, isOver)

                  return (
                    <Card key={alloc.id} className="p-4 flex flex-col justify-between" data-testid={`allocation-card-${alloc.category_id}`}>
                      {/* Top Row: Name, Parent badge, Status & Actions */}
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              {alloc.category_color && (
                                <span
                                  className="h-3 w-3 rounded-full shrink-0"
                                  style={{ backgroundColor: alloc.category_color }}
                                />
                              )}
                              <span className="font-semibold text-base" data-testid={`allocation-name-${alloc.id}`}>
                                {alloc.category_name}
                              </span>
                            </div>

                            {parentName && (
                              <p className="text-xs text-muted-foreground mt-0.5" data-testid={`parent-category-badge-${alloc.id}`}>
                                Subcategory of <span className="font-medium text-foreground">{parentName}</span>
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {getStatusBadge(percentUsed, isOver)}

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => setEditingAllocation(alloc)}
                              data-testid={`edit-allocation-btn-${alloc.id}`}
                              aria-label={`Edit ${alloc.category_name} allocation`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeletingAllocation(alloc)}
                              data-testid={`delete-allocation-btn-${alloc.id}`}
                              aria-label={`Delete ${alloc.category_name} allocation`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Progress Bar & Numerical Metrics */}
                        <div className="mt-4 space-y-2">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>
                              Spent: <strong className="text-foreground">{formatCurrency(spentAmount)}</strong>
                            </span>
                            <span>
                              Budget: <strong className="text-foreground">{formatCurrency(allocAmount)}</strong>
                            </span>
                          </div>

                          {/* Progress bar container */}
                          <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${barColor}`}
                              style={{ width: `${visualProgress}%` }}
                              data-testid={`progress-bar-${alloc.id}`}
                            />
                          </div>

                          {/* Bottom Metric Row: Remaining and Percentage */}
                          <div className="flex items-center justify-between text-xs pt-1">
                            <div>
                              {isOver ? (
                                <span className="text-destructive font-medium" data-testid={`overage-text-${alloc.id}`}>
                                  Over by {formatCurrency(Math.abs(remaining))}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  Remaining: <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(remaining)}</strong>
                                </span>
                              )}
                            </div>

                            <span
                              className={`font-semibold ${isOver ? "text-destructive" : percentUsed >= 80 ? "text-amber-500" : "text-muted-foreground"}`}
                              data-testid={`percent-text-${alloc.id}`}
                            >
                              {formatPercentage(percentUsed)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sheets / Dialogs */}
      <CreateBudgetSheet
        open={createSheetOpen}
        onOpenChange={setCreateSheetOpen}
        month={selectedMonth}
        year={selectedYear}
        onSuccess={invalidateBudgets}
      />

      {activeBudget && (
        <>
          <AddAllocationSheet
            open={addSheetOpen}
            onOpenChange={setAddSheetOpen}
            budgetId={activeBudget.id}
            categories={categories}
            existingAllocations={allocations}
            onSuccess={invalidateBudgets}
          />

          <EditAllocationSheet
            open={!!editingAllocation}
            onOpenChange={(open) => !open && setEditingAllocation(null)}
            budgetId={activeBudget.id}
            allocation={editingAllocation}
            onSuccess={invalidateBudgets}
          />

          <DeleteAllocationSheet
            open={!!deletingAllocation}
            onOpenChange={(open) => !open && setDeletingAllocation(null)}
            budgetId={activeBudget.id}
            allocation={deletingAllocation}
            onSuccess={invalidateBudgets}
          />

          <DeleteBudgetSheet
            open={deleteBudgetOpen}
            onOpenChange={setDeleteBudgetOpen}
            budget={activeBudget}
            onSuccess={invalidateBudgets}
          />
        </>
      )}
    </div>
  )
}
