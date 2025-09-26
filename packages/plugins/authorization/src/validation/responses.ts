import z from "zod"
import {
  caslPermissionSchema,
  memberSchema,
  paginationMetadataSchema,
  permissionSchema,
  permissionSetSchema,
  sourceSchema,
  storedPermissionSchema,
  userSchema,
} from "./shared"

/**
 * Creates a generic list response schema with pagination
 */
export function createListResponse<T extends z.ZodTypeAny>(entitySchema: T) {
  return z.object({
    data: z.array(entitySchema),
    pagination: paginationMetadataSchema,
  })
}

/**
 * Creates a generic batch operation response schema
 */
export function createBatchResponse<T extends z.ZodTypeAny>(entitySchema: T) {
  return z.object({
    count: z.number(),
    results: z.array(entitySchema),
  })
}

/**
 * Creates a generic operation response schema (assignments, removals)
 */
export const operationResponseSchema = z.object({
  count: z.number().optional(),
  message: z.string(),
})

/**
 * Creates a generic message response schema
 */
export const messageResponseSchema = z.object({
  message: z.string(),
})

export const permissionResponseSchema = permissionSchema.extend({
  members: z.array(memberSchema).optional(),
  permissionSets: z.array(permissionSetSchema).optional(),
  source: sourceSchema.optional(),
  users: z.array(userSchema).optional(),
})

export const permissionSetResponseSchema = permissionSetSchema.extend({
  members: z.array(memberSchema).optional(),
  permissions: z.array(storedPermissionSchema).optional(),
  users: z.array(userSchema).optional(),
})

// Permission endpoint responses
export const listPermissionsResponseSchema = createListResponse(permissionResponseSchema)
export const batchCreatePermissionsResponseSchema = createBatchResponse(permissionResponseSchema)
export const batchDeletePermissionsResponseSchema = z.object({
  count: z.number(),
  deletedIds: z.array(z.string()),
})

// Permission Set endpoint responses
export const listPermissionSetsResponseSchema = createListResponse(permissionSetResponseSchema)
export const batchCreatePermissionSetsResponseSchema = createBatchResponse(
  permissionSetResponseSchema
)
export const batchDeletePermissionSetsResponseSchema = z.object({
  count: z.number(),
  deletedIds: z.array(z.string()),
})

// Generic endpoint responses
export const checkPermissionResponseSchema = z.object({
  allowed: z.boolean(),
  meta: z.object({
    hasPermissions: z.boolean(),
    source: z.string(),
    totalPermissions: z.number(),
  }),
  reason: z.string().optional(),
})

export const getAbilityResponseSchema = caslPermissionSchema.array()
