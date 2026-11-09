import { Navigate, Outlet, useLocation } from "react-router"
import { useAuth } from "@/lib/auth"
import { Skeleton } from "@/components/ui/skeleton"

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center p-6">
        <div className="flex w-full max-w-md flex-col gap-4">
          <Skeleton className="h-10 w-48 mx-auto" />
          <Skeleton className="h-6 w-64 mx-auto" />
          <div className="mt-6 flex flex-col gap-3">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
