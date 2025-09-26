import z from "zod"
import type { AuthorizationConfig } from "../types"
import {
  createAssignmentSchema,
  idSchema,
  includesSchema,
  listSchema,
  permissionSchema,
  permissionSetSchema,
  withModeAwareOrgId,
} from "./shared"

/**
 * Request validation schemas - only the ones actually used in handlers
 * Uses shared.ts helpers for consistency and reusability
 */

// =============================================================================
// CRUD Operation Request Schemas
// =============================================================================

/**
 * Permission CRUD request schemas
 */
export function createPermissionRequestSchema<O extends AuthorizationConfig>(options: O) {
  return withModeAwareOrgId(permissionSchema, options.mode)
}

export function updatePermissionRequestSchema<O extends AuthorizationConfig>(options: O) {
  return withModeAwareOrgId(
    permissionSchema.partial().extend({ id: z.string().min(1) }),
    options.mode
  )
}

export const getPermissionRequestSchema = idSchema.extend({
  ...includesSchema.omit({ includePermissions: true }).shape,
})

export const listPermissionsRequestSchema = listSchema.extend({
  ...includesSchema.omit({ includePermissions: true }).shape,
})

/**
 * Permission Set CRUD request schemas
 */
export function createPermissionSetRequestSchema<O extends AuthorizationConfig>(options: O) {
  return withModeAwareOrgId(permissionSetSchema, options.mode)
}

export function updatePermissionSetRequestSchema<O extends AuthorizationConfig>(options: O) {
  return withModeAwareOrgId(
    permissionSetSchema.partial().extend({ id: z.string().min(1) }),
    options.mode
  )
}

export const getPermissionSetRequestSchema = idSchema.extend({
  ...includesSchema.omit({ includeExpired: true, includePermissionSets: true }).shape,
})

export const listPermissionSetsRequestSchema = listSchema.extend({
  ...includesSchema.omit({ includeExpired: true, includePermissionSets: true }).shape,
})

// =============================================================================
// Assignment Operation Request Schemas
// =============================================================================

export const operationUsersToPermissionRequestSchema = createAssignmentSchema("permission", "user")

export const operationMembersToPermissionRequestSchema = createAssignmentSchema(
  "permission",
  "member"
)

export const operationPermissionsToPermissionSetRequestSchema = createAssignmentSchema(
  "permissionSet",
  "permission"
)

export const operationUsersToPermissionSetRequestSchema = createAssignmentSchema(
  "permissionSet",
  "user"
)

export const operationMembersToPermissionSetRequestSchema = createAssignmentSchema(
  "permissionSet",
  "member"
)

// =============================================================================
// Batch Operation Request Schemas
// =============================================================================

export function createPermissionsRequestSchema<O extends AuthorizationConfig>(options: O) {
  return createPermissionRequestSchema(options).array()
}

export function createPermissionSetsRequestSchema<O extends AuthorizationConfig>(options: O) {
  return createPermissionSetRequestSchema(options).array()
}

// =============================================================================
// Permission Checking Request Schemas
// =============================================================================

export const checkPermissionRequestSchema = z.object({
  action: z.string().min(1),
  context: z.record(z.string(), z.unknown()).optional(),
  fields: z.array(z.string().min(1)).optional(),
  memberId: z.string().min(1),
  resource: z.record(z.string(), z.unknown()).optional(),
  subject: z.string().min(1),
  userId: z.string().min(1).optional(),
})
