import { describe, it, expect, vi, beforeEach } from "vitest"
import { apiFetch, tokenStorage } from "./api"

describe("tokenStorage", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("stores and retrieves access and refresh tokens", () => {
    tokenStorage.set("test-access", "test-refresh")
    expect(tokenStorage.getAccess()).toBe("test-access")
    expect(tokenStorage.getRefresh()).toBe("test-refresh")
  })

  it("clears tokens", () => {
    tokenStorage.set("test-access", "test-refresh")
    tokenStorage.clear()
    expect(tokenStorage.getAccess()).toBeNull()
    expect(tokenStorage.getRefresh()).toBeNull()
  })
})

describe("apiFetch & ApiError", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it("parses successful JSON envelopes matching backend { message, data }", async () => {
    const mockData = { id: "123", email: "demo@mint.local" }
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ message: "Success", data: mockData }),
    } as Response)

    const res = await apiFetch<{ message: string; data: typeof mockData }>("/test")
    expect(res.message).toBe("Success")
    expect(res.data.id).toBe("123")
  })

  it("handles 204 No Content as undefined", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 204,
    } as Response)

    const res = await apiFetch<void>("/test", { method: "DELETE" })
    expect(res).toBeUndefined()
  })

  it("extracts ProblemDetails from 4xx/5xx responses", async () => {
    const problemDetails = {
      type: "urn:mint-alternative:error:validation",
      title: "Validation Error",
      status: 422,
      detail: "Password must be at least 8 characters",
    }
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 422,
      text: async () => JSON.stringify(problemDetails),
    } as Response)

    await expect(apiFetch("/test")).rejects.toThrow("Password must be at least 8 characters")
  })

  it("attaches Authorization header with access token", async () => {
    tokenStorage.set("my-access-token", "my-refresh-token")

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ message: "OK", data: {} }),
    } as Response)

    await apiFetch("/protected")
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/v1/protected",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer my-access-token",
        }),
      }),
    )
  })

  it("performs token refresh on 401 using Authorization: Bearer <refresh_token>", async () => {
    tokenStorage.set("old-access", "valid-refresh-token")

    const fetchSpy = vi.spyOn(globalThis, "fetch")
      // First call -> 401 Unauthorized
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ title: "Unauthorized", status: 401 }),
      } as Response)
      // Refresh call -> 200 with new tokens
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          message: "Token refreshed successfully",
          data: {
            access_token: "new-access",
            refresh_token: "new-refresh",
            expires_in: "300",
          },
        }),
      } as Response)
      // Retry call -> 200 OK
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ message: "Success", data: { secure: true } }),
      } as Response)

    const res = await apiFetch<{ message: string; data: { secure: boolean } }>("/resource")

    expect(fetchSpy).toHaveBeenCalledTimes(3)
    // Check refresh request header
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      "/api/v1/auth/refresh",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer valid-refresh-token",
        }),
      }),
    )

    // Token storage was updated
    expect(tokenStorage.getAccess()).toBe("new-access")
    expect(tokenStorage.getRefresh()).toBe("new-refresh")
    expect(res.data.secure).toBe(true)
  })

  it("clears tokens and fails if refresh returns 401", async () => {
    tokenStorage.set("expired-access", "expired-refresh")

    vi.spyOn(globalThis, "fetch")
      // First call -> 401
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ title: "Unauthorized", status: 401 }),
      } as Response)
      // Refresh call -> 401
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ title: "Invalid refresh token", status: 401 }),
      } as Response)

    await expect(apiFetch("/resource")).rejects.toThrow("Session expired")
    expect(tokenStorage.getAccess()).toBeNull()
    expect(tokenStorage.getRefresh()).toBeNull()
  })
})
