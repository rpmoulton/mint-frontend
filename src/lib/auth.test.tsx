import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import { AuthProvider, useAuth } from "./auth"
import { tokenStorage, authApi } from "./api"

function AuthConsumer() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth()
  if (isLoading) return <div>Loading Auth...</div>
  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? "authenticated" : "guest"}</div>
      <div data-testid="user-email">{user?.email || "none"}</div>
      <button onClick={() => login("demo@mint.local", "Password123!")}>Login</button>
      <button onClick={() => logout()}>Logout</button>
    </div>
  )
}

describe("AuthProvider", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it("initializes as guest when no token is in storage", () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )

    expect(screen.getByTestId("auth-status")).toHaveTextContent("guest")
    expect(screen.getByTestId("user-email")).toHaveTextContent("none")
  })

  it("handles login state transition and stores tokens", async () => {
    const mockAuthResponse = {
      message: "Login successful",
      data: {
        user: {
          id: "u123",
          email: "demo@mint.local",
          first_name: "Alex",
          last_name: "Morgan",
          preferred_currency: "USD",
          timezone: "UTC",
          created_at: "2026-11-04T18:18:49Z",
          updated_at: "2026-11-04T18:18:49Z",
        },
        tokens: {
          access_token: "mock-access-token",
          refresh_token: "mock-refresh-token",
          expires_in: "300",
        },
      },
    }

    vi.spyOn(authApi, "login").mockResolvedValueOnce(mockAuthResponse)

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )

    const loginButton = screen.getByText("Login")
    await act(async () => {
      loginButton.click()
    })

    await waitFor(() => {
      expect(screen.getByTestId("auth-status")).toHaveTextContent("authenticated")
      expect(screen.getByTestId("user-email")).toHaveTextContent("demo@mint.local")
    })

    expect(tokenStorage.getAccess()).toBe("mock-access-token")
    expect(tokenStorage.getRefresh()).toBe("mock-refresh-token")
  })

  it("handles logout state transition and clears tokens", async () => {
    tokenStorage.set("access-123", "refresh-123")
    vi.spyOn(authApi, "me").mockResolvedValueOnce({
      message: "Current user retrieved",
      data: {
        id: "u123",
        email: "demo@mint.local",
        first_name: "Alex",
        last_name: "Morgan",
        preferred_currency: "USD",
        timezone: "UTC",
        created_at: "2026-11-04T18:18:49Z",
        updated_at: "2026-11-04T18:18:49Z",
      },
    })
    vi.spyOn(authApi, "logout").mockResolvedValueOnce({
      message: "Logged out successfully",
      data: { message: "Logged out successfully" },
    })

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId("auth-status")).toHaveTextContent("authenticated")
    })

    const logoutButton = screen.getByText("Logout")
    await act(async () => {
      logoutButton.click()
    })

    await waitFor(() => {
      expect(screen.getByTestId("auth-status")).toHaveTextContent("guest")
      expect(tokenStorage.getAccess()).toBeNull()
    })
  })
})
