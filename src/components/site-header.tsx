import { useLocation } from "react-router"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

const ROUTE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/accounts": "Accounts",
  "/transactions": "Transactions",
  "/budgets": "Budgets",
  "/categories": "Categories",
  "/settings": "Settings",
}

export function SiteHeader() {
  const location = useLocation()
  const title = ROUTE_TITLES[location.pathname] || "Dashboard"

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4 transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 h-4" />
        <h1 className="text-sm font-semibold tracking-tight text-foreground">{title}</h1>
      </div>
    </header>
  )
}
