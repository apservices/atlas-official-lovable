"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"

import type { UserRole } from "@/lib/types"
import type { Database } from "@/lib/supabase/database.types"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  avatarUrl?: string
  linkedModelId?: string
  linkedBrandId?: string
  linkedClientId?: string
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signup: (
    email: string,
    password: string,
    fullName: string,
    role?: UserRole,
  ) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  hasPermission: (requiredRole: UserRole) => boolean
  hasScope: (scope: string) => boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)



export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const fetchProfile = useCallback(
    async (authUser: SupabaseUser) => {
      try {
        const { data: profileData, error } = await supabase.from("profiles").select("*").eq("id", authUser.id).single()

        if (error) {
          console.error("[v0] Error fetching profile:", error)
          return null
        }

        return profileData
      } catch (error) {
        console.error("[v0] Error in fetchProfile:", error)
        return null
      }
    },
    [supabase],
  )

  const fetchLinkedEntities = useCallback(
    async (profileData: Profile) => {
      let linkedModelId: string | undefined
      let linkedBrandId: string | undefined

      if (profileData.role === "model") {
        const { data: modelData } = await supabase.from("models").select("id").eq("user_id", profileData.id).single()
        linkedModelId = modelData?.id
      }

      if (profileData.role === "brand") {
        const { data: brandData } = await supabase.from("brands").select("id").eq("user_id", profileData.id).single()
        linkedBrandId = brandData?.id
      }

      return { linkedModelId, linkedBrandId }
    },
    [supabase],
  )

  const buildUser = useCallback(
    async (authUser: SupabaseUser): Promise<User | null> => {
      const profileData = await fetchProfile(authUser)
      if (!profileData) return null

      const { linkedModelId, linkedBrandId } = await fetchLinkedEntities(profileData)

      // Map Supabase role to app UserRole
      let mappedRole: import("@/lib/types").UserRole = "CLIENT";
      switch (profileData.role) {
        case "admin":
          mappedRole = "ADMIN";
          break;
        case "model":
          mappedRole = "MODEL";
          break;
        case "brand":
          mappedRole = "OPERATOR";
          break;
        case "viewer":
          mappedRole = "CLIENT";
          break;
      }
      // Add linkedClientId for CLIENT role
      let linkedClientId: string | undefined = undefined;
      if (mappedRole === "CLIENT") {
        linkedClientId = profileData.id;
      }
      return {
        id: authUser.id,
        email: authUser.email || profileData.email,
        name: profileData.full_name,
        role: mappedRole,
        avatarUrl: profileData.avatar_url || undefined,
        linkedModelId,
        linkedBrandId,
        linkedClientId,
      }
    },
    [fetchProfile, fetchLinkedEntities],
  )

  const refreshProfile = useCallback(async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    if (authUser) {
      const userData = await buildUser(authUser)
      setUser(userData)
      const profileData = await fetchProfile(authUser)
      setProfile(profileData)
    }
  }, [supabase, buildUser, fetchProfile])

  useEffect(() => {
    const initAuth = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()

        if (authUser) {
          const userData = await buildUser(authUser)
          setUser(userData)
          const profileData = await fetchProfile(authUser)
          setProfile(profileData)
        }
      } catch (error) {
        console.error("[v0] Error initializing auth:", error)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const userData = await buildUser(session.user)
        setUser(userData)
        const profileData = await fetchProfile(session.user)
        setProfile(profileData)
      } else if (event === "SIGNED_OUT") {
        setUser(null)
        setProfile(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, buildUser, fetchProfile])

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          return { success: false, error: error.message }
        }

        if (data.user) {
          const userData = await buildUser(data.user)
          setUser(userData)
          const profileData = await fetchProfile(data.user)
          setProfile(profileData)

          // Log audit event
          await supabase.from("audit_logs").insert({
            actor_id: data.user.id,
            actor_name: userData?.name || email,
            action: "USER_LOGIN",
            metadata: { email },
          })
        }

        return { success: true }
      } catch (error) {
        console.error("[v0] Login error:", error)
        return { success: false, error: "An unexpected error occurred" }
      }
    },
    [supabase, buildUser, fetchProfile],
  )

  const signup = useCallback(
    async (email: string, password: string, fullName: string, role: UserRole = "viewer") => {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || window.location.origin,
            data: {
              full_name: fullName,
              role: role,
            },
          },
        })

        if (error) {
          return { success: false, error: error.message }
        }

        return { success: true }
      } catch (error) {
        console.error("[v0] Signup error:", error)
        return { success: false, error: "An unexpected error occurred" }
      }
    },
    [supabase],
  )

  const logout = useCallback(async () => {
    try {
      if (user) {
        await supabase.from("audit_logs").insert({
          actor_id: user.id,
          actor_name: user.name,
          action: "USER_LOGOUT",
        })
      }

      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
    } catch (error) {
      console.error("[v0] Logout error:", error)
    }
  }, [supabase, user])



  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        login,
        signup,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
