import React, { createContext, useContext, useEffect, useState } from "react"
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
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = tokenStorage.getAccess()
    if (!token) {
      setIsLoading(false)
      return
    }
    authApi
      .me()
      .then((res) => setUser(res.data))
      .catch(() => {
        tokenStorage.clear()
        setUser(null)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    const res = await authApi.login({ email, password })
    tokenStorage.set(res.data.tokens.access_token, res.data.tokens.refresh_token)
    setUser(res.data.user)
  }

  const register = async (data: {
    email: string
    password: string
    first_name: string
    last_name: string
  }) => {
    const res = await authApi.register(data)
    tokenStorage.set(res.data.tokens.access_token, res.data.tokens.refresh_token)
    setUser(res.data.user)
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch {
      // Ignore errors on logout
    }
    tokenStorage.clear()
    setUser(null)
  }

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
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
