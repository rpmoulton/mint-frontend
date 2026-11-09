import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Routes, Route } from "react-router"
import { ProtectedRoute } from "./protected-route"
import * as AuthModule from "@/lib/auth"

describe("ProtectedRoute", () => {
  it("redirects unauthenticated users to /login", () => {
    vi.spyOn(AuthModule, "useAuth").mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Secret Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText("Login Page")).toBeInTheDocument()
    expect(screen.queryByText("Secret Dashboard")).not.toBeInTheDocument()
  })

  it("renders protected content when authenticated", () => {
    vi.spyOn(AuthModule, "useAuth").mockReturnValue({
      user: {
        id: "u1",
        email: "demo@mint.local",
        first_name: "Alex",
        last_name: "Morgan",
        preferred_currency: "USD",
        timezone: "UTC",
        created_at: "",
        updated_at: "",
      },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Secret Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText("Secret Dashboard")).toBeInTheDocument()
    expect(screen.queryByText("Login Page")).not.toBeInTheDocument()
  })

  it("renders loading state while authentication is resolving", () => {
    vi.spyOn(AuthModule, "useAuth").mockReturnValue({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    })

    const { container } = render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Secret Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    // Skeleton elements should be rendered
    expect(container.querySelectorAll("[data-slot=skeleton]").length).toBeGreaterThan(0)
    expect(screen.queryByText("Secret Dashboard")).not.toBeInTheDocument()
  })
})
