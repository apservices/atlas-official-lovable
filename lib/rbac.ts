import type { Database } from "@/lib/supabase/database.types"

type UserRole = Database["public"]["Enums"]["user_role"]
type ForgeState = "CREATED" | "CAPTURED" | "NORMALIZED" | "SEEDED" | "PARAMETRIZED" | "VALIDATED" | "CERTIFIED"

// Permission definitions - updated for new role names
export const PERMISSIONS = {
  // Model permissions
  "models:read": ["admin", "model", "brand"],
  "models:create": ["admin"],
  "models:update": ["admin"],
  "models:delete": ["admin"],
  "models:archive": ["admin"],

  // Forge permissions
  "forges:read": ["admin", "model", "brand"],
  "forges:create": ["admin"],
  "forges:transition": ["admin"],
  "forges:rollback": ["admin"],
  "forges:delete": ["admin"],

  // Capture permissions
  "captures:read": ["admin"],
  "captures:upload": ["admin"],

  "capture_viewer:read": ["admin", "model"],

  // Validation permissions
  "validation:execute": ["admin"],

  // Certification permissions
  "certification:execute": ["admin"],
  "certification:revoke": ["admin"],

  "vtp:generate": ["admin"],
  "vtp:read": ["admin", "model"],

  "vtg:generate": ["admin"],
  "vtg:read": ["admin"],

  "assets:read": ["admin", "model", "brand"],
  "assets:download": ["admin", "brand"],

  "licenses:read": ["admin", "model", "brand"],
  "licenses:create": ["admin"],
  "licenses:revoke": ["admin"],

  "career:read": ["model"],
  "career:consents": ["model"],

  // Audit permissions
  "audit:read": ["admin"],
  "audit:export": ["admin"],

  // System permissions
  "system:read": ["admin"],
  "system:configure": ["admin"],
} as const

export type Permission = keyof typeof PERMISSIONS

// Check if a role has a specific permission
export function hasPermission(role: UserRole | undefined, permission: Permission): boolean {
  if (!role) return false
  const allowedRoles = PERMISSIONS[permission]
  return (allowedRoles as readonly string[]).includes(role)
}

export function canAccessDigitalTwin(
  role: UserRole | undefined,
  userLinkedModelId: string | undefined,
  userLinkedBrandId: string | undefined,
  targetDigitalTwinId: string,
  modelIdForTwin: string,
  brandIdWithLicense?: string,
): boolean {
  if (!role) return false

  // Admin has full access
  if (role === "admin") return true

  // Model can only access their own data
  if (role === "model") {
    return userLinkedModelId === modelIdForTwin
  }

  // Brand can only access licensed assets
  if (role === "brand") {
    return userLinkedBrandId === brandIdWithLicense
  }

  return false
}

// Check if user can transition to a specific forge state
export function canTransitionToState(role: UserRole | undefined, fromState: ForgeState, toState: ForgeState): boolean {
  if (!role) return false

  // Only admin can transition states
  if (role !== "admin") return false

  // Certified forges cannot be modified
  if (fromState === "CERTIFIED") return false

  // Certification requires explicit permission
  if (toState === "CERTIFIED") {
    return hasPermission(role, "certification:execute")
  }

  return hasPermission(role, "forges:transition")
}

// Check if forge can be rolled back
export function canRollbackForge(role: UserRole | undefined, currentState: ForgeState): boolean {
  if (!role) return false

  // Cannot rollback certified forges
  if (currentState === "CERTIFIED") return false

  // Cannot rollback from CREATED (nothing to rollback to)
  if (currentState === "CREATED") return false

  return hasPermission(role, "forges:rollback")
}

// Check if user can access a specific route
export function canAccessRoute(role: UserRole | undefined, route: string): boolean {
  if (!role) return false

  // Admin can access everything
  if (role === "admin") return true

  // Define route permissions
  const routePermissions: Record<string, Permission[]> = {
    "/dashboard": ["models:read"],
    "/dashboard/models": ["models:read"],
    "/dashboard/forges": ["forges:read"],
    "/dashboard/capture": ["captures:upload"],
    "/dashboard/validation": ["validation:execute"],
    "/dashboard/certification": ["certification:execute"],
    "/dashboard/registry": ["forges:read"],
    "/dashboard/capture-viewer": ["capture_viewer:read"],
    "/dashboard/visual-preview": ["vtp:read"],
    "/dashboard/visual-generator": ["vtg:read"],
    "/dashboard/assets": ["assets:read"],
    "/dashboard/licenses": ["licenses:read"],
    "/dashboard/career": ["career:read"],
    "/dashboard/audit": ["audit:read"],
    "/dashboard/system": ["system:read"],
  }

  const requiredPermissions = routePermissions[route]
  if (requiredPermissions) {
    return requiredPermissions.some((permission) => hasPermission(role, permission))
  }

  // Check for dynamic routes
  const dynamicRoutePatterns: Array<{ pattern: RegExp; permissions: Permission[] }> = [
    { pattern: /^\/dashboard\/forges\/[^/]+$/, permissions: ["forges:read"] },
    { pattern: /^\/dashboard\/models\/[^/]+$/, permissions: ["models:read"] },
  ]

  for (const { pattern, permissions } of dynamicRoutePatterns) {
    if (pattern.test(route)) {
      return permissions.some((permission) => hasPermission(role, permission))
    }
  }

  return true
}

// Get allowed actions for a forge based on role and state
export function getForgeActions(
  role: UserRole | undefined,
  forgeState: ForgeState,
): {
  canAdvance: boolean
  canRollback: boolean
  canDelete: boolean
  canView: boolean
} {
  return {
    canAdvance: canTransitionToState(role, forgeState, getNextState(forgeState)),
    canRollback: canRollbackForge(role, forgeState),
    canDelete: hasPermission(role, "forges:delete") && forgeState !== "CERTIFIED",
    canView: hasPermission(role, "forges:read"),
  }
}

function getNextState(currentState: ForgeState): ForgeState {
  const states: ForgeState[] = ["CREATED", "CAPTURED", "NORMALIZED", "SEEDED", "PARAMETRIZED", "VALIDATED", "CERTIFIED"]
  const currentIndex = states.indexOf(currentState)
  return states[currentIndex + 1] || currentState
}

export function canDownloadAsset(
  role: UserRole | undefined,
  assetType: "PREVIEW" | "LICENSED",
  licenseStatus?: "active" | "expired" | "revoked",
): boolean {
  if (!role) return false

  // Previews cannot be downloaded
  if (assetType === "PREVIEW") return false

  // Admin can always download licensed assets
  if (role === "admin") return true

  // Brands can only download if license is active
  if (role === "brand") {
    return assetType === "LICENSED" && licenseStatus === "active"
  }

  return false
}

export function canUseGuidedCapture(role: UserRole | undefined): boolean {
  if (!role) return false
  return role === "admin"
}

export function canUseManualUpload(role: UserRole | undefined): boolean {
  if (!role) return false
  return role === "admin"
}
