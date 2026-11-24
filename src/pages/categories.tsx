import React, { useState, useMemo, useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { categoriesApi } from "@/lib/api"
import type { Category, CategoryType } from "@/lib/types"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
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
  Briefcase,
  DollarSign,
  ArrowLeftRight,
  ShoppingCart,
  Utensils,
  Car,
  Home,
  Zap,
  ShoppingBag,
  Film,
  HeartPulse,
  GraduationCap,
  HelpCircle,
  Wallet,
  CreditCard,
  TrendingUp,
  Receipt,
  PiggyBank,
  Scale,
  Building2,
  Tag,
  Coffee,
  Plane,
  Music,
  Gift,
  Smile,
  ShieldCheck,
  Smartphone,
  Wifi,
  Tv,
  Book,
  Gamepad2,
  Package,
  Wrench,
  Fuel,
  Baby,
  Dog,
  Dumbbell,
  Plus,
  Pencil,
  Trash2,
  CircleAlert,
  RefreshCw,
  FolderTree,
  CornerDownRight,
  Lock,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"

// ─── Icon & Color Palette ────────────────────────────────────────────────────

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Briefcase,
  DollarSign,
  ArrowLeftRight,
  ShoppingCart,
  Utensils,
  Car,
  Home,
  Zap,
  ShoppingBag,
  Film,
  HeartPulse,
  GraduationCap,
  HelpCircle,
  Wallet,
  CreditCard,
  TrendingUp,
  Receipt,
  PiggyBank,
  Scale,
  Building2,
  Tag,
  Coffee,
  Plane,
  Music,
  Gift,
  Smile,
  ShieldCheck,
  Smartphone,
  Wifi,
  Tv,
  Book,
  Gamepad2,
  Package,
  Wrench,
  Fuel,
  Baby,
  Dog,
  Dumbbell,
}

export function getCategoryIcon(name: string | null | undefined): LucideIcon {
  if (!name) return Tag
  return CATEGORY_ICONS[name] || Tag
}

export function CategoryIcon({ name, className }: { name: string | null | undefined; className?: string }) {
  const IconComponent = (name && CATEGORY_ICONS[name]) ? CATEGORY_ICONS[name] : Tag
  return React.createElement(IconComponent, { className })
}

export const COLOR_PALETTE = [
  { label: "Red", value: "#EF4444" },
  { label: "Orange", value: "#F97316" },
  { label: "Amber", value: "#F59E0B" },
  { label: "Emerald", value: "#10B981" },
  { label: "Teal", value: "#14B8A6" },
  { label: "Cyan", value: "#06B6D4" },
  { label: "Blue", value: "#3B82F6" },
  { label: "Indigo", value: "#6366F1" },
  { label: "Purple", value: "#8B5CF6" },
  { label: "Pink", value: "#EC4899" },
  { label: "Slate", value: "#64748B" },
]

export const POPULAR_ICONS = [
  "Briefcase",
  "DollarSign",
  "ArrowLeftRight",
  "ShoppingCart",
  "Utensils",
  "Car",
  "Home",
  "Zap",
  "ShoppingBag",
  "Film",
  "HeartPulse",
  "GraduationCap",
  "Wallet",
  "Coffee",
  "Plane",
  "Music",
  "Gift",
  "Smile",
  "PiggyBank",
  "Building2",
  "Smartphone",
  "Wifi",
  "Fuel",
  "Wrench",
  "HelpCircle",
]

// ─── Hierarchy Helpers ────────────────────────────────────────────────────────

export function getDescendantIds(catId: string, allCategories: Category[]): Set<string> {
  const descendants = new Set<string>()
  const queue = [catId]
  while (queue.length > 0) {
    const current = queue.shift()!
    for (const c of allCategories) {
      if (c.parent_category_id === current && !descendants.has(c.id)) {
        descendants.add(c.id)
        queue.push(c.id)
      }
    }
  }
  return descendants
}

export interface HierarchyNode {
  parent: Category
  children: Category[]
}

export function buildHierarchy(categories: Category[], typeFilter?: CategoryType | "all"): {
  roots: HierarchyNode[]
  orphans: Category[]
} {
  const filtered = typeFilter && typeFilter !== "all"
    ? categories.filter((c) => c.type === typeFilter)
    : categories

  const map = new Map<string, Category>()
  filtered.forEach((c) => map.set(c.id, c))

  const topLevel = filtered.filter((c) => !c.parent_category_id)
  const children = filtered.filter((c) => c.parent_category_id)

  const childrenByParent = new Map<string, Category[]>()
  const orphans: Category[] = []

  for (const child of children) {
    const pid = child.parent_category_id!
    if (map.has(pid)) {
      const list = childrenByParent.get(pid) || []
      list.push(child)
      childrenByParent.set(pid, list)
    } else {
      orphans.push(child)
    }
  }

  // Sort roots alphabetically
  topLevel.sort((a, b) => a.name.localeCompare(b.name))

  const roots: HierarchyNode[] = topLevel.map((parent) => {
    const subs = childrenByParent.get(parent.id) || []
    subs.sort((a, b) => a.name.localeCompare(b.name))
    return {
      parent,
      children: subs,
    }
  })

  return { roots, orphans }
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

export function CategoriesSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 max-w-6xl mx-auto w-full" data-testid="categories-skeleton">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      <div className="flex gap-2">
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-28" />
      </div>

      <div className="grid gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-lg" />
                <div className="space-y-1.5">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─── Category Form Sheet Inner ────────────────────────────────────────────────

interface CategoryFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingCategory?: Category | null
  presetParentId?: string | null
  categories: Category[]
  onSuccess: () => void
}

function CategoryFormSheetInner({
  open,
  onOpenChange,
  editingCategory,
  presetParentId,
  categories,
  onSuccess,
}: CategoryFormSheetProps) {
  const isEditing = !!editingCategory

  const [name, setName] = useState(() => editingCategory ? editingCategory.name : "")
  const [type, setType] = useState<CategoryType>(() => {
    if (editingCategory) return editingCategory.type
    if (presetParentId) {
      const p = categories.find((c) => c.id === presetParentId)
      if (p) return p.type
    }
    return "expense"
  })
  const [parentId, setParentId] = useState<string>(() => {
    if (editingCategory) return editingCategory.parent_category_id || ""
    if (presetParentId) return presetParentId
    return ""
  })
  const [color, setColor] = useState<string>(() => {
    if (editingCategory?.color) return editingCategory.color
    if (presetParentId) {
      const p = categories.find((c) => c.id === presetParentId)
      if (p?.color) return p.color
    }
    return "#3B82F6"
  })
  const [icon, setIcon] = useState<string>(() => editingCategory?.icon || "Tag")
  const [serverError, setServerError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Compute descendant IDs to prevent cycle when editing
  const descendantIds = useMemo(() => {
    if (!editingCategory) return new Set<string>()
    return getDescendantIds(editingCategory.id, categories)
  }, [editingCategory, categories])

  // Candidate parents: must match type, must not be self, must not be descendant
  const candidateParents = useMemo(() => {
    return categories.filter((c) => {
      // Must match selected category type
      if (c.type !== type) return false
      // Cannot be category itself
      if (editingCategory && c.id === editingCategory.id) return false
      // Cannot be any descendant (cycle prevention)
      if (descendantIds.has(c.id)) return false
      // Only top-level categories can be parents
      if (c.parent_category_id) return false
      return true
    })
  }, [categories, type, editingCategory, descendantIds])

  const handleParentChange = (val: string | null) => {
    const newPid = !val || val === "none" ? "" : val
    setParentId(newPid)
    if (newPid) {
      const parentCat = categories.find((c) => c.id === newPid)
      if (parentCat) {
        setType(parentCat.type)
      }
    }
  }

  const handleTypeChange = (newType: CategoryType) => {
    setType(newType)
    // If current parent is not compatible with new type, clear it
    if (parentId) {
      const parentCat = categories.find((c) => c.id === parentId)
      if (parentCat && parentCat.type !== newType) {
        setParentId("")
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError(null)
    setValidationError(null)

    const trimmedName = name.trim()
    if (!trimmedName) {
      setValidationError("Category name is required.")
      return
    }

    if (trimmedName.length > 100) {
      setValidationError("Category name must not exceed 100 characters.")
      return
    }

    // Check duplicate name within the same type and parent
    const duplicate = categories.find((c) => {
      if (editingCategory && c.id === editingCategory.id) return false
      const sameParent = (c.parent_category_id || "") === (parentId || "")
      return c.type === type && sameParent && c.name.toLowerCase() === trimmedName.toLowerCase()
    })
    if (duplicate) {
      setValidationError("A category with this name already exists in this hierarchy level.")
      return
    }

    setSubmitting(true)
    try {
      if (isEditing && editingCategory) {
        await categoriesApi.update(editingCategory.id, {
          name: trimmedName,
          type,
          parent_category_id: parentId ? parentId : "",
          color,
          icon,
        })
        toast.success(`Category "${trimmedName}" updated`)
      } else {
        await categoriesApi.create({
          name: trimmedName,
          type,
          parent_category_id: parentId ? parentId : undefined,
          color,
          icon,
        })
        toast.success(`Category "${trimmedName}" created`)
      }
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save category"
      setServerError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-md overflow-y-auto"
        data-testid={isEditing ? "edit-category-sheet" : "add-category-sheet"}
      >
        <SheetHeader className="text-left pb-2">
          <SheetTitle>{isEditing ? "Edit Category" : "Add Category"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update category properties and hierarchy associations."
              : "Create a custom category for classifying transactions."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 px-6 pb-6 pt-2">
          {serverError && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              data-testid="category-form-server-error"
            >
              <CircleAlert className="size-4 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          {validationError && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              data-testid="category-form-validation-error"
            >
              <CircleAlert className="size-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cat-name">Category Name *</Label>
            <Input
              id="cat-name"
              placeholder="e.g. Groceries, Streaming, Freelance"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setValidationError(null)
              }}
              maxLength={100}
              data-testid="category-name-input"
            />
          </div>

          {/* Type */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cat-type">Classification Type *</Label>
            <Select
              value={type}
              onValueChange={(v) => {
                if (v) handleTypeChange(v as CategoryType)
              }}
              disabled={!!parentId}
            >
              <SelectTrigger id="cat-type" className="w-full" data-testid="category-type-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>
            {parentId && (
              <p className="text-xs text-muted-foreground">
                Type is locked to match the selected parent category.
              </p>
            )}
          </div>

          {/* Parent Category */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cat-parent">Parent Category (Optional)</Label>
            <Select
              value={parentId || "none"}
              onValueChange={handleParentChange}
            >
              <SelectTrigger id="cat-parent" className="w-full" data-testid="category-parent-select">
                <SelectValue placeholder="None (Top-level Category)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Top-level Category)</SelectItem>
                {candidateParents.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {c.is_system ? "(System)" : "(Custom)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select a parent to nest this category as a subcategory.
            </p>
          </div>

          {/* Color Selection */}
          <div className="flex flex-col gap-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2 pt-1" data-testid="category-color-picker">
              {COLOR_PALETTE.map((c) => (
                <button
                  type="button"
                  key={c.value}
                  title={c.label}
                  aria-label={c.label}
                  onClick={() => setColor(c.value)}
                  className={`size-7 rounded-full transition-transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${
                    color === c.value ? "scale-125 ring-2 ring-primary ring-offset-2" : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </div>

          {/* Icon Selection */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Icon</Label>
              <div
                className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md"
                style={{ backgroundColor: `${color}20`, color }}
              >
                <CategoryIcon name={icon} className="size-4" />
                <span>{icon}</span>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2 max-h-36 overflow-y-auto p-1 border rounded-lg" data-testid="category-icon-picker">
              {POPULAR_ICONS.map((iconName) => {
                const isSelected = icon === iconName
                return (
                  <button
                    type="button"
                    key={iconName}
                    title={iconName}
                    aria-label={iconName}
                    onClick={() => setIcon(iconName)}
                    className={`flex flex-col items-center justify-center p-2 rounded-md transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <CategoryIcon name={iconName} className="size-5" />
                  </button>
                )
              })}
            </div>
          </div>

          <SheetFooter className="flex flex-row gap-2 justify-end pt-4">
            <SheetClose
              render={
                <Button variant="outline" type="button" disabled={submitting} data-testid="category-cancel-btn">
                  Cancel
                </Button>
              }
            />
            <Button type="submit" disabled={submitting} data-testid="category-submit-btn">
              {submitting ? "Saving…" : isEditing ? "Save Changes" : "Create Category"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

export function CategoryFormSheet(props: CategoryFormSheetProps) {
  if (!props.open) return null
  const key = props.editingCategory
    ? `edit-${props.editingCategory.id}`
    : `add-${props.presetParentId ?? "none"}`
  return <CategoryFormSheetInner key={key} {...props} />
}

// ─── Delete Category Confirmation Sheet ───────────────────────────────────────

interface DeleteConfirmSheetProps {
  category: Category | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

function DeleteCategoryConfirmSheetInner({
  category,
  open,
  onOpenChange,
  onSuccess,
}: DeleteConfirmSheetProps) {
  const [deleting, setDeleting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!category) return null

  const handleDelete = async () => {
    setDeleting(true)
    setErrorMsg(null)
    try {
      await categoriesApi.delete(category.id)
      toast.success(`Category "${category.name}" deleted`)
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete category"
      setErrorMsg(msg)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" data-testid="delete-category-confirm-sheet">
        <SheetHeader className="text-left pb-2">
          <SheetTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="size-5" />
            Delete Category &ldquo;{category.name}&rdquo;?
          </SheetTitle>
          <SheetDescription>
            This action cannot be undone. System categories and categories currently used by transactions or subcategories cannot be deleted.
          </SheetDescription>
        </SheetHeader>

        <div className="px-6 py-2">
          {errorMsg && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive mb-3"
              data-testid="delete-category-error"
            >
              <CircleAlert className="size-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1 text-muted-foreground border">
            <p className="font-semibold text-foreground">Safety Rules:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Transactions associated with this category will prevent deletion to preserve financial history.</li>
              <li>Subcategories under this category must be reassigned or deleted first.</li>
              <li>System categories are protected and cannot be deleted.</li>
            </ul>
          </div>
        </div>

        <SheetFooter className="flex flex-row gap-2 justify-end px-6 pb-6 pt-2">
          <SheetClose
            render={
              <Button variant="outline" disabled={deleting} data-testid="delete-cancel-btn">
                Cancel
              </Button>
            }
          />
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
            data-testid="delete-confirm-btn"
          >
            {deleting ? "Deleting…" : "Confirm Delete"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function DeleteCategoryConfirmSheet(props: DeleteConfirmSheetProps) {
  if (!props.open || !props.category) return null
  return <DeleteCategoryConfirmSheetInner key={props.category.id} {...props} />
}

// ─── Main Categories Page ─────────────────────────────────────────────────────

export function CategoriesPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<string>("expense")
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [presetParentId, setPresetParentId] = useState<string | null>(null)

  // ── Data Fetching ─────────────────────────────────────────────────────────
  const {
    data: response,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.list(),
    staleTime: 1000 * 60 * 5,
  })

  const rawCategories = response?.data
  const categories = useMemo(() => rawCategories ?? [], [rawCategories])

  // ── Query Invalidation ────────────────────────────────────────────────────
  const invalidateAll = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["categories"] })
    void queryClient.invalidateQueries({ queryKey: ["transactions"] })
    void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] })
    void queryClient.invalidateQueries({ queryKey: ["budgets"] })
  }, [queryClient])

  // Counts for tabs
  const expenseCount = useMemo(() => categories.filter((c) => c.type === "expense").length, [categories])
  const incomeCount = useMemo(() => categories.filter((c) => c.type === "income").length, [categories])
  const transferCount = useMemo(() => categories.filter((c) => c.type === "transfer").length, [categories])

  // Current tab hierarchy
  const currentHierarchy = useMemo(() => {
    const filter = activeTab === "all" ? "all" : (activeTab as CategoryType)
    return buildHierarchy(categories, filter)
  }, [categories, activeTab])

  const handleOpenAddWithParent = (parentId: string) => {
    setPresetParentId(parentId)
    setEditingCategory(null)
    setAddSheetOpen(true)
  }

  const handleOpenAdd = () => {
    setPresetParentId(null)
    setEditingCategory(null)
    setAddSheetOpen(true)
  }

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat)
    setAddSheetOpen(true)
  }

  // ── Loading State ─────────────────────────────────────────────────────────
  if (isLoading) {
    return <CategoriesSkeleton />
  }

  // ── Error State ───────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="p-4 sm:p-6 max-w-6xl mx-auto w-full">
        <Card className="border-destructive/40 bg-destructive/5" data-testid="categories-error">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <CircleAlert className="size-5" />
              <CardTitle className="text-lg">Failed to load categories</CardTitle>
            </div>
            <CardDescription>
              {error instanceof Error
                ? error.message
                : "Unable to retrieve financial categories from the server."}
            </CardDescription>
          </CardHeader>
          <div className="p-6 pt-0">
            <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-2">
              <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
              Retry Connection
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 max-w-6xl mx-auto w-full" data-testid="categories-page">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Categories</h1>
          <p className="text-sm text-muted-foreground">
            Organize transactions using system and custom income, expense, and transfer categories.
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="gap-2 self-start sm:self-auto" data-testid="add-category-btn">
          <Plus className="size-4" />
          Add Category
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 max-w-md" data-testid="category-type-tabs">
          <TabsTrigger value="expense" data-testid="tab-expense">
            Expenses ({expenseCount})
          </TabsTrigger>
          <TabsTrigger value="income" data-testid="tab-income">
            Income ({incomeCount})
          </TabsTrigger>
          <TabsTrigger value="transfer" data-testid="tab-transfer">
            Transfers ({transferCount})
          </TabsTrigger>
          <TabsTrigger value="all" data-testid="tab-all">
            All ({categories.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="pt-4">
          {currentHierarchy.roots.length === 0 && currentHierarchy.orphans.length === 0 ? (
            <Card className="border-dashed p-8 text-center" data-testid="empty-categories">
              <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3">
                <FolderTree className="size-6" />
              </div>
              <CardTitle className="text-base">No categories found</CardTitle>
              <CardDescription className="max-w-sm mx-auto mt-1 mb-4">
                There are currently no categories matching this classification filter.
              </CardDescription>
              <Button variant="outline" size="sm" onClick={handleOpenAdd} className="gap-1.5">
                <Plus className="size-4" />
                Create New Category
              </Button>
            </Card>
          ) : (
            <div className="space-y-4" data-testid="categories-list">
              {currentHierarchy.roots.map(({ parent, children }) => {
                return (
                  <Card key={parent.id} className="overflow-hidden" data-testid={`category-card-${parent.id}`}>
                    {/* Parent Category Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 border-b bg-card">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex size-10 items-center justify-center rounded-lg shrink-0 font-medium"
                          style={{
                            backgroundColor: parent.color ? `${parent.color}22` : "#3B82F622",
                            color: parent.color || "#3B82F6",
                          }}
                        >
                          <CategoryIcon name={parent.icon} className="size-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground text-sm sm:text-base">
                              {parent.name}
                            </span>
                            {parent.is_system ? (
                              <Badge variant="secondary" className="text-[10px] gap-1 font-normal" data-testid="badge-system">
                                <Lock className="size-2.5" />
                                System
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] font-normal border-primary/30 text-primary" data-testid="badge-custom">
                                Custom
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[10px] capitalize text-muted-foreground">
                              {parent.type}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {children.length > 0
                              ? `${children.length} subcategor${children.length === 1 ? "y" : "ies"}`
                              : "No subcategories"}
                          </p>
                        </div>
                      </div>

                      {/* Parent Actions */}
                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1 text-xs"
                          onClick={() => handleOpenAddWithParent(parent.id)}
                          data-testid={`add-subcat-btn-${parent.id}`}
                        >
                          <Plus className="size-3.5" />
                          <span className="hidden sm:inline">Add Subcategory</span>
                          <span className="sm:hidden">Subcategory</span>
                        </Button>
                        {!parent.is_system ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="size-8 p-0"
                              onClick={() => handleOpenEdit(parent)}
                              title="Edit Category"
                              aria-label={`Edit ${parent.name}`}
                              data-testid={`edit-btn-${parent.id}`}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="size-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeletingCategory(parent)}
                              title="Delete Category"
                              aria-label={`Delete ${parent.name}`}
                              data-testid={`delete-btn-${parent.id}`}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </>
                        ) : (
                          <div
                            className="text-xs text-muted-foreground/60 px-2 flex items-center gap-1"
                            title="System categories are protected from direct modification"
                            data-testid={`protected-notice-${parent.id}`}
                          >
                            <Lock className="size-3" />
                            <span className="hidden sm:inline">Protected</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Children Categories Listing */}
                    {children.length > 0 && (
                      <div className="divide-y bg-muted/20">
                        {children.map((child) => {
                          return (
                            <div
                              key={child.id}
                              className="flex items-center justify-between py-2.5 px-4 pl-8 sm:pl-12 hover:bg-muted/40 transition-colors"
                              data-testid={`subcategory-row-${child.id}`}
                            >
                              <div className="flex items-center gap-3">
                                <CornerDownRight className="size-3.5 text-muted-foreground/60 shrink-0" />
                                <div
                                  className="flex size-7 items-center justify-center rounded-md shrink-0"
                                  style={{
                                    backgroundColor: child.color ? `${child.color}22` : "#3B82F622",
                                    color: child.color || "#3B82F6",
                                  }}
                                >
                                  <CategoryIcon name={child.icon} className="size-3.5" />
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-foreground">
                                    {child.name}
                                  </span>
                                  {child.is_system ? (
                                    <Badge variant="secondary" className="text-[9px] gap-0.5 font-normal">
                                      <Lock className="size-2" />
                                      System
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[9px] font-normal border-primary/30 text-primary">
                                      Custom
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {/* Child Actions */}
                              <div className="flex items-center gap-1">
                                {!child.is_system ? (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="size-7 p-0"
                                      onClick={() => handleOpenEdit(child)}
                                      title="Edit Subcategory"
                                      aria-label={`Edit ${child.name}`}
                                      data-testid={`edit-btn-${child.id}`}
                                    >
                                      <Pencil className="size-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="size-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => setDeletingCategory(child)}
                                      title="Delete Subcategory"
                                      aria-label={`Delete ${child.name}`}
                                      data-testid={`delete-btn-${child.id}`}
                                    >
                                      <Trash2 className="size-3" />
                                    </Button>
                                  </>
                                ) : (
                                  <div
                                    className="text-[11px] text-muted-foreground/60 px-2 flex items-center gap-1"
                                    title="System categories are protected"
                                  >
                                    <Lock className="size-2.5" />
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </Card>
                )
              })}

              {/* Orphans (if any category has an unknown parent) */}
              {currentHierarchy.orphans.length > 0 && (
                <Card className="overflow-hidden border-dashed" data-testid="orphans-card">
                  <div className="p-3 bg-muted/30 border-b">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Other Subcategories
                    </span>
                  </div>
                  <div className="divide-y">
                    {currentHierarchy.orphans.map((child) => {
                      return (
                        <div
                          key={child.id}
                          className="flex items-center justify-between p-3 px-4 hover:bg-muted/20"
                          data-testid={`orphan-row-${child.id}`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className="flex size-7 items-center justify-center rounded-md shrink-0"
                              style={{
                                backgroundColor: child.color ? `${child.color}22` : "#3B82F622",
                                color: child.color || "#3B82F6",
                              }}
                            >
                              <CategoryIcon name={child.icon} className="size-3.5" />
                            </div>
                            <span className="text-sm font-medium">{child.name}</span>
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {child.type}
                            </Badge>
                          </div>
                          {!child.is_system && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="size-7 p-0"
                                onClick={() => handleOpenEdit(child)}
                                aria-label={`Edit ${child.name}`}
                              >
                                <Pencil className="size-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="size-7 p-0 text-destructive"
                                onClick={() => setDeletingCategory(child)}
                                aria-label={`Delete ${child.name}`}
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add / Edit Sheet */}
      <CategoryFormSheet
        open={addSheetOpen}
        onOpenChange={setAddSheetOpen}
        editingCategory={editingCategory}
        presetParentId={presetParentId}
        categories={categories}
        onSuccess={invalidateAll}
      />

      {/* Delete Confirmation Sheet */}
      <DeleteCategoryConfirmSheet
        category={deletingCategory}
        open={!!deletingCategory}
        onOpenChange={(open) => {
          if (!open) setDeletingCategory(null)
        }}
        onSuccess={invalidateAll}
      />
    </div>
  )
}
