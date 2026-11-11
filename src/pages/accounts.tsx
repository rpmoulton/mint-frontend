import { useQuery } from "@tanstack/react-query"
import { accountsApi } from "@/lib/api"
import { formatCurrency } from "@/lib/format"
import type { Account, AccountType } from "@/lib/types"
import { ASSET_TYPES, LIABILITY_TYPES } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
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
} from "lucide-react"

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

export function AccountsPage() {
  const {
    data: response,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => accountsApi.list(),
    staleTime: 1000 * 60 * 2,
  })

  const accounts = response?.data || []

  if (isLoading) {
    return <AccountsSkeleton />
  }

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
              {error instanceof Error ? error.message : "Unable to retrieve financial accounts from the server."}
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

  // Calculate summary metrics accurately without mixing differing currencies
  const assetAccounts = accounts.filter((a) => ASSET_TYPES.includes(a.account_type))
  const liabilityAccounts = accounts.filter((a) => LIABILITY_TYPES.includes(a.account_type))

  const assetTotals = sumBalances(assetAccounts)
  const liabilityTotals = sumBalances(liabilityAccounts)

  // Net worth per currency
  const allCurrencies = Array.from(
    new Set([...Object.keys(assetTotals), ...Object.keys(liabilityTotals)])
  )

  const netWorthByCurrency: Record<string, number> = {}
  for (const curr of allCurrencies) {
    const assets = assetTotals[curr] || 0
    const liabilities = liabilityTotals[curr] || 0
    netWorthByCurrency[curr] = assets - liabilities
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 max-w-6xl mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Financial Accounts</h1>
            <Badge variant="secondary" className="font-medium">
              {accounts.length} {accounts.length === 1 ? "Account" : "Accounts"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            View real-time balances, linked institutions, and debt obligations.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {/* Portfolio Overview Cards */}
      {accounts.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Total Assets */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Assets</CardTitle>
              <ArrowUpRight className="size-4 text-emerald-600 dark:text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground" data-testid="total-assets">
                {formatCurrencyTotals(assetTotals)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {assetAccounts.length} asset {assetAccounts.length === 1 ? "account" : "accounts"}
              </p>
            </CardContent>
          </Card>

          {/* Total Liabilities */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Liabilities</CardTitle>
              <ArrowDownRight className="size-4 text-amber-600 dark:text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground" data-testid="total-liabilities">
                {formatCurrencyTotals(liabilityTotals)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {liabilityAccounts.length} liability {liabilityAccounts.length === 1 ? "account" : "accounts"}
              </p>
            </CardContent>
          </Card>

          {/* Net Portfolio Balance */}
          <Card className="sm:col-span-2 lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Net Portfolio</CardTitle>
              <Wallet className="size-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground" data-testid="net-portfolio">
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
          <CardContent className="flex flex-col items-center justify-center text-center space-y-3">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Landmark className="size-7" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg">No Financial Accounts Found</CardTitle>
              <CardDescription className="max-w-md mx-auto text-sm">
                You do not have any linked or manual financial accounts yet.
              </CardDescription>
            </div>
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
            const groupTotals = sumBalances(groupAccounts)

            return (
              <Card key={group.type} className="overflow-hidden" data-testid={`group-${group.type}`}>
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
                      <div className="text-xs text-muted-foreground font-medium">Category Total</div>
                      <div className="text-lg font-bold text-foreground" data-testid={`group-total-${group.type}`}>
                        {formatCurrencyTotals(groupTotals)}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {groupAccounts.map((account) => {
                      const institution =
                        account.institution_display_name || account.institution_name
                      const isArchived = Boolean(account.archived_at)

                      return (
                        <div
                          key={account.id}
                          className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between transition-colors hover:bg-muted/30"
                          data-testid={`account-row-${account.id}`}
                        >
                          {/* Account Info */}
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-foreground text-sm truncate">
                                {account.name}
                              </span>
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

                              {account.available_balance !== null &&
                                account.available_balance !== undefined &&
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
                                  <span className="font-medium text-foreground">
                                    {account.interest_rate}%
                                  </span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Account Balance */}
                          <div className="text-left sm:text-right shrink-0">
                            <div className="text-base font-bold text-foreground">
                              {formatCurrency(account.current_balance, account.currency)}
                            </div>
                            <div className="text-[11px] text-muted-foreground capitalize">
                              {account.source_type} sync
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AccountsSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 max-w-6xl mx-auto w-full" data-testid="accounts-skeleton">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-24" />
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
