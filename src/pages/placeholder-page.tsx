import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Landmark, ArrowLeftRight, PiggyBank, Tags, Settings, type LucideIcon } from "lucide-react"

interface PlaceholderProps {
  title: string
  description: string
  icon: LucideIcon
  plannedFeatures: string[]
}

export function PlaceholderView({ title, description, icon: Icon, plannedFeatures }: PlaceholderProps) {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 max-w-5xl mx-auto w-full">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          <Badge variant="outline" className="text-xs font-normal">Phase 2 Milestone</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <Card className="border-dashed border-2">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-2">
            <Icon className="size-6" />
          </div>
          <CardTitle className="text-lg">{title} Management</CardTitle>
          <CardDescription className="max-w-md mx-auto text-sm">
            This module is reserved for Phase 2 implementation. The backend endpoints and database schemas are already configured and ready for integration.
          </CardDescription>
        </CardHeader>
        <CardContent className="max-w-md mx-auto w-full pt-2">
          <div className="rounded-lg bg-muted/50 p-4 border text-xs">
            <span className="font-semibold text-foreground uppercase tracking-wider block mb-2">Planned Capabilities:</span>
            <ul className="space-y-1.5 text-muted-foreground list-disc list-inside">
              {plannedFeatures.map((feat, i) => (
                <li key={i}>{feat}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function AccountsPage() {
  return (
    <PlaceholderView
      title="Financial Accounts"
      description="Manage bank accounts, credit cards, loans, and investment accounts"
      icon={Landmark}
      plannedFeatures={[
        "View depository, credit, loan, and investment accounts",
        "Manual balance adjustments and credit limits",
        "Archive / unarchive financial accounts",
        "Institution linkage and details",
      ]}
    />
  )
}

export function TransactionsPage() {
  return (
    <PlaceholderView
      title="Transactions"
      description="Search, filter, and categorize financial activity"
      icon={ArrowLeftRight}
      plannedFeatures={[
        "Cursor-based paginated transaction browsing",
        "Full-text search across merchants and descriptions",
        "Date range and category filtering",
        "Create, edit, and split transactions",
      ]}
    />
  )
}

export function BudgetsPage() {
  return (
    <PlaceholderView
      title="Budgets"
      description="Monthly budget planning and expense tracking"
      icon={PiggyBank}
      plannedFeatures={[
        "Monthly budget targets and envelopes",
        "Category allocation vs actual spending",
        "Progress bars and overspend alerts",
        "Rollover and multi-month comparison",
      ]}
    />
  )
}

export function CategoriesPage() {
  return (
    <PlaceholderView
      title="Categories"
      description="Configure spending and income categorization"
      icon={Tags}
      plannedFeatures={[
        "Hierarchical category trees (parent & subcategories)",
        "Custom category colors and icons",
        "Income, expense, and transfer category types",
        "Default system vs custom user categories",
      ]}
    />
  )
}

export function SettingsPage() {
  return (
    <PlaceholderView
      title="Settings"
      description="User preferences, currencies, and account configuration"
      icon={Settings}
      plannedFeatures={[
        "Preferred display currency configuration",
        "Timezone and date format settings",
        "Security, password changes, and active sessions",
        "Export financial data",
      ]}
    />
  )
}
