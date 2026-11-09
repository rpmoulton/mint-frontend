import { useState, type FormEvent } from "react"
import { useNavigate, useLocation } from "react-router"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Lock, Mail, Landmark } from "lucide-react"

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/"

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError("Please enter both email and password")
      return
    }

    try {
      setError(null)
      setIsSubmitting(true)
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to sign in. Please verify your credentials."
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const fillDemoCredentials = () => {
    setEmail("demo@mint.local")
    setPassword("Password123!")
    setError(null)
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted/40 p-4 sm:p-8">
      <Card className="w-full max-w-md shadow-lg border-border">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Landmark className="size-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Mint Alternative</CardTitle>
          <CardDescription className="text-sm">
            Sign in to access your personal finance dashboard
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-lg bg-destructive/15 p-3 text-sm text-destructive font-medium border border-destructive/20"
              >
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-3 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-foreground">Local Dev Account</span>
                  <p className="mt-0.5">demo@mint.local</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={fillDemoCredentials}
                  className="text-xs h-7 px-2"
                >
                  Fill Demo
                </Button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="pt-2">
            <Button
              type="submit"
              className="w-full font-medium"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
