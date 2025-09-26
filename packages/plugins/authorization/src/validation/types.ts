import type z from "zod"
import type {
  batchCreatePermissionSetsResponseSchema,
  batchCreatePermissionsResponseSchema,
  batchDeletePermissionSetsResponseSchema,
  batchDeletePermissionsResponseSchema,
  checkPermissionResponseSchema,
  getAbilityResponseSchema,
  listPermissionSetsResponseSchema,
  listPermissionsResponseSchema,
  messageResponseSchema,
  permissionResponseSchema,
  permissionSetResponseSchema,
} from "./responses"
import type { paginationMetadataSchema } from "./shared"

/**
 * Consolidated type definitions for the validation system
 * Clean, organized exports with proper type inference
 */

// Base Entity Types
export type PaginationMetadata = z.infer<typeof paginationMetadataSchema>
export type PermissionResponse = z.infer<typeof permissionResponseSchema>
export type PermissionSetResponse = z.infer<typeof permissionSetResponseSchema>

// Permission Endpoint Response Types
export type CreatePermissionResponse = z.infer<typeof permissionResponseSchema>
export type GetPermissionResponse = z.infer<typeof permissionResponseSchema>
export type UpdatePermissionResponse = z.infer<typeof permissionResponseSchema>
export type DeletePermissionResponse = z.infer<typeof messageResponseSchema>
export type ListPermissionsResponse = z.infer<typeof listPermissionsResponseSchema>
export type BatchCreatePermissionsResponse = z.infer<typeof batchCreatePermissionsResponseSchema>
export type BatchDeletePermissionsResponse = z.infer<typeof batchDeletePermissionsResponseSchema>

// Permission Set Endpoint Response Types
export type CreatePermissionSetResponse = z.infer<typeof permissionSetResponseSchema>
export type GetPermissionSetResponse = z.infer<typeof permissionSetResponseSchema>
export type UpdatePermissionSetResponse = z.infer<typeof permissionSetResponseSchema>
export type DeletePermissionSetResponse = z.infer<typeof messageResponseSchema>
export type ListPermissionSetsResponse = z.infer<typeof listPermissionSetsResponseSchema>
export type BatchCreatePermissionSetsResponse = z.infer<
  typeof batchCreatePermissionSetsResponseSchema
>
export type BatchDeletePermissionSetsResponse = z.infer<
  typeof batchDeletePermissionSetsResponseSchema
>
export type CheckPermissionResponse = z.infer<typeof checkPermissionResponseSchema>

export type GetAbilityResponse = z.infer<typeof getAbilityResponseSchema>

/**
 * Generic operation response type (assignments, removals)
 */
export type AssignmentRemovalResponse = {
  message: string
  count?: number
}
