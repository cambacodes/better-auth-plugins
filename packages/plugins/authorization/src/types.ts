import type { InferOptionSchema } from "better-auth/types"

import type z from "zod"
import type { schema } from "./schema"
import type { permissionBaseSchema, permissionSetBaseSchema, permissionSource } from "./validation"

export type AuthorizationMode = "user" | "member" | "both"

export interface AuthorizationOptions {
  /**
   * Authorization mode determines how permissions are assigned and managed
   * - "user": Users have direct permissions and permission sets
   * - "member": Members have permissions and permission sets within organizations
   * - "both": Both user and member permissions are supported
   * @default "organization"
   */
  mode: AuthorizationMode

  /**
   * Default pagination settings
   */
  pagination?: {
    defaultLimit?: number
    maxLimit?: number
  }

  /**
   * Custom schema for the authorization plugin
   */
  schema?: InferOptionSchema<schema>
}

export type QueryResponseOptions = {
  includeMembers?: boolean
  includePermissionSets?: boolean
  includeUsers?: boolean
  includePermissions?: boolean
}
export type PermissionSource = (typeof permissionSource)[keyof typeof permissionSource]

type PermissionBase = z.infer<typeof permissionBaseSchema>
export type Permission<O extends AuthorizationOptions> = PermissionBase &
  (O["mode"] extends "user" ? Record<never, never> : { organizationId: string })
export type PermissionResponse<
  O extends AuthorizationOptions,
  Q extends Omit<QueryResponseOptions, "includePermissions">,
> = Permission<O> & { source: PermissionSource } & (Q["includeMembers"] extends true
    ? {
        members: Array<{ id: string; userId: string; role?: string }>
      }
    : Record<never, never>) &
  (Q["includePermissionSets"] extends true
    ? {
        permissionSets: Array<{ id: string; name: string }>
      }
    : Record<never, never>) &
  (Q["includeUsers"] extends true
    ? {
        users: Array<{ id: string; name: string; email: string }>
      }
    : Record<never, never>)

type PermissionSetBase = z.infer<typeof permissionSetBaseSchema>
export type PermissionSet<O extends AuthorizationOptions> = PermissionSetBase &
  (O["mode"] extends "user" ? Record<never, never> : { organizationId: string })
export type PermissionSetResponse<
  O extends AuthorizationOptions,
  Q extends Omit<QueryResponseOptions, "includePermissionSets">,
> = PermissionSet<O> &
  (Q["includeMembers"] extends true
    ? { members: Array<{ id: string; userId: string; role?: string }> }
    : Record<never, never>) &
  (Q["includePermissions"] extends true
    ? { permissions: Array<{ id: string; name: string }> }
    : Record<never, never>) &
  (Q["includeUsers"] extends true
    ? { users: Array<{ id: string; name: string; email: string }> }
    : Record<never, never>)
