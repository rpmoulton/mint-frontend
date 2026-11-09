import { useQuery } from "@tanstack/react-query"
import { dashboardApi } from "@/lib/api"
import { formatCurrency, formatDate, formatPercentage } from "@/lib/format"
import { useAuth } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts"
import {
  Wallet,
  DollarSign,
  PiggyBank,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  ShoppingBag,
  Home,
  ShoppingCart,
  Utensils,
  Briefcase,
  Car,
  Zap,
  Tag,
  CircleAlert,
} from "lucide-react"

const CATEGORY_ICON_MAP: Record<string, typeof Tag> = {
  Home,
  ShoppingCart,
  Utensils,
  Briefcase,
  Car,
  Zap,
  ShoppingBag,
  CreditCard,
  Wallet,
  DollarSign,
}

function CategoryIcon({ icon, className }: { icon?: string | null; className?: string }) {
  const IconComponent = (icon && CATEGORY_ICON_MAP[icon]) || Tag
  return <IconComponent className={className || "size-4"} />
}

export function DashboardPage() {
  const { user } = useAuth()

  const {
    data: response,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => dashboardApi.summary(),
    staleTime: 1000 * 60 * 2, // 2 minutes
  })

  const summary = response?.data
  const currency = summary?.primary_currency || user?.preferred_currency || "USD"

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (isError || !summary) {
    return (
      <div className="p-4 sm:p-6 max-w-6xl mx-auto w-full">
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <CircleAlert className="size-5" />
              <CardTitle className="text-lg">Failed to load dashboard data</CardTitle>
            </div>
            <CardDescription>
              {error instanceof Error ? error.message : "Unable to retrieve financial metrics from the server."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-2">
              <RefreshCw className="size-4" />
              Retry Connection
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const netWorthNum = parseFloat(summary.net_worth) || 0
  const isNetWorthPositive = netWorthNum >= 0

  const incomeNum = parseFloat(summary.monthly_income) || 0
  const expensesNum = parseFloat(summary.monthly_expenses) || 0
  const netSavings = incomeNum - expensesNum

  // Chart data for Income vs Expenses
  const cashflowData = [
    { name: "Income", amount: incomeNum, fill: "#10B981" },
    { name: "Expenses", amount: expensesNum, fill: "#EF4444" },
  ]

  // Spending chart data
  const spendingData = summary.spending_by_category.map((cat, idx) => ({
    name: cat.category_name,
    value: parseFloat(cat.total_spent) || 0,
    color: cat.category_color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
    percentage: cat.percentage,
  }))

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Financial Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Welcome back{user?.first_name ? `, ${user.first_name}` : ""}. Here is your financial overview.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs px-2.5 py-1">
            Primary Currency: {currency}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh dashboard data"
            className="size-8 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
            <span className="sr-only">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Multi-currency alert banner if user has multiple currencies */}
      {summary.by_currency && summary.by_currency.length > 1 && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="size-4 text-primary" />
            <span>
              You hold accounts across multiple currencies:{" "}
              <strong>{summary.by_currency.map((c) => c.currency).join(", ")}</strong>. Metrics below are aggregated in your primary currency ({currency}).
            </span>
          </div>
        </div>
      )}

      {/* Primary Financial Metric: Net Worth Hero Card */}
      <Card className="border-border bg-gradient-to-br from-card via-card to-muted/40 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Net Worth
              </span>
              <div className="mt-1 flex items-baseline gap-3">
                <span className={`text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums ${isNetWorthPositive ? "text-foreground" : "text-destructive"}`}>
                  {formatCurrency(summary.net_worth, currency)}
                </span>
                <Badge
                  variant={isNetWorthPositive ? "default" : "destructive"}
                  className="text-xs font-medium"
                >
                  {isNetWorthPositive ? "Solvent" : "Deficit"}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Calculated from Total Assets minus Total Liabilities
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t pt-4 sm:border-t-0 sm:border-l sm:pl-6 sm:pt-0">
              <div>
                <span className="text-xs text-muted-foreground block">Assets</span>
                <span className="text-base sm:text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(summary.total_assets, currency)}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Liabilities</span>
                <span className="text-base sm:text-lg font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                  {formatCurrency(summary.total_liabilities, currency)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Cash */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Liquid Cash</CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Wallet className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {formatCurrency(summary.total_cash, currency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Available depository funds</p>
          </CardContent>
        </Card>

        {/* Monthly Income */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Income</CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatCurrency(summary.monthly_income, currency, { showPlus: true })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Income earned this month</p>
          </CardContent>
        </Card>

        {/* Monthly Expenses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Expenses</CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <ArrowDownRight className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-rose-600 dark:text-rose-400">
              {formatCurrency(summary.monthly_expenses, currency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Outgoing spending this month</p>
          </CardContent>
        </Card>

        {/* Savings Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Savings Rate</CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PiggyBank className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {formatPercentage(summary.savings_rate)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Net cashflow: {formatCurrency(netSavings, currency, { showPlus: true })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Visualizations Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Spending by Category */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Spending by Category</CardTitle>
            <CardDescription>Breakdown of expenses for the current period</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {summary.spending_by_category && summary.spending_by_category.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="h-[200px] w-[200px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={spendingData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                      >
                        {spendingData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(val: unknown) => [
                          formatCurrency(Number(val) || 0, currency),
                          "Total Spent",
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex-1 w-full space-y-3">
                  {summary.spending_by_category.map((cat, idx) => (
                    <div key={cat.category_id || idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="size-3 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              cat.category_color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
                          }}
                        />
                        <CategoryIcon
                          icon={cat.category_icon}
                          className="size-3.5 text-muted-foreground shrink-0"
                        />
                        <span className="font-medium truncate">{cat.category_name}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 tabular-nums">
                        <span className="text-xs text-muted-foreground">
                          {formatPercentage(cat.percentage)}
                        </span>
                        <span className="font-semibold">
                          {formatCurrency(cat.total_spent, currency)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground">
                <ShoppingBag className="size-8 opacity-40 mb-2" />
                <p className="text-sm font-medium">No category spending recorded</p>
                <p className="text-xs mt-1">Expenses will appear here as transactions are logged.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Cashflow Comparison */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Monthly Cashflow</CardTitle>
            <CardDescription>Comparison of income vs expenses</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashflowData} layout="vertical" margin={{ left: 10, right: 30, top: 20, bottom: 20 }}>
                  <XAxis type="number" tickFormatter={(val) => `$${val}`} />
                  <YAxis type="category" dataKey="name" width={70} />
                  <RechartsTooltip
                    formatter={(val: unknown) => [formatCurrency(Number(val) || 0, currency), "Amount"]}
                  />
                  <Bar dataKey="amount" radius={[0, 6, 6, 0]}>
                    {cashflowData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-lg bg-muted/40 p-3 mt-4 flex items-center justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground font-medium">Net Monthly Cashflow:</span>
              <span
                className={`font-bold tabular-nums ${
                  netSavings >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {formatCurrency(netSavings, currency, { showPlus: true })}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
            <CardDescription>Latest financial activity across all connected accounts</CardDescription>
          </div>
          <Badge variant="secondary" className="text-xs">
            {summary.recent_transactions?.length || 0} Transactions
          </Badge>
        </CardHeader>
        <CardContent>
          {summary.recent_transactions && summary.recent_transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    <th className="pb-3 pl-2">Description / Merchant</th>
                    <th className="pb-3 px-3">Account</th>
                    <th className="pb-3 px-3">Category</th>
                    <th className="pb-3 px-3">Date</th>
                    <th className="pb-3 pr-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {summary.recent_transactions.map((tx) => {
                    const txAmountNum = parseFloat(tx.amount) || 0
                    const isIncome = tx.transaction_type === "credit" || txAmountNum > 0

                    return (
                      <tr key={tx.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 pl-2">
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{tx.description}</span>
                            {tx.merchant_name && tx.merchant_name !== tx.description && (
                              <span className="text-xs text-muted-foreground">{tx.merchant_name}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-muted-foreground text-xs whitespace-nowrap">
                          {tx.account_name}
                        </td>
                        <td className="py-3 px-3">
                          {tx.category_name ? (
                            <span
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: tx.category_color ? `${tx.category_color}20` : undefined,
                                color: tx.category_color || undefined,
                              }}
                            >
                              <CategoryIcon icon={tx.category_icon} className="size-3" />
                              {tx.category_name}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Uncategorized</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(tx.transaction_date)}
                        </td>
                        <td className="py-3 pr-2 text-right font-semibold tabular-nums whitespace-nowrap">
                          <span
                            className={
                              isIncome
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-foreground"
                            }
                          >
                            {formatCurrency(tx.amount, tx.currency, { showPlus: isIncome })}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <CreditCard className="size-8 opacity-40 mb-2" />
              <p className="text-sm font-medium">No transactions found</p>
              <p className="text-xs mt-1">Your recent financial activity will appear here.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

const DEFAULT_COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#64748B",
]

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-60" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>

      <Skeleton className="h-32 w-full rounded-2xl" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>

      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  )
}
