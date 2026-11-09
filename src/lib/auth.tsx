import React, { createContext, useContext, useEffect, useState, useCallback } from "react"
import { authApi, tokenStorage } from "@/lib/api"
import type { User } from "@/lib/types"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: { email: string; password: string; first_name: string; last_name: string }) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    return typeof window !== "undefined" && !!tokenStorage.getAccess()
  })

  useEffect(() => {
    const token = tokenStorage.getAccess()
    if (!token) {
      return
    }

    let isMounted = true
    authApi
      .me()
      .then((res) => {
        if (isMounted) {
          setUser(res.data)
        }
      })
      .catch(() => {
        if (isMounted) {
          tokenStorage.clear()
          setUser(null)
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password })
    tokenStorage.set(res.data.tokens.access_token, res.data.tokens.refresh_token)
    setUser(res.data.user)
  }, [])

  const register = useCallback(
    async (data: {
      email: string
      password: string
      first_name: string
      last_name: string
    }) => {
      const res = await authApi.register(data)
      tokenStorage.set(res.data.tokens.access_token, res.data.tokens.refresh_token)
      setUser(res.data.user)
    },
    [],
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // Ignore errors on logout
    } finally {
      tokenStorage.clear()
      setUser(null)
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return ctx
}
