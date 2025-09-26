import { generateId } from "better-auth"
import z from "zod"
import type { AuthorizationConfig } from "../types"

/**
 * Permission source constants defining where a permission originates from
 *
 * These sources are used for CASL priority ordering:
 * - USER_DIRECT: Highest priority - direct user permission assignments
 * - USER_PERMISSION_SET: User permissions inherited from permission sets
 * - MEMBER_DIRECT: Member permissions within organization context
 * - MEMBER_PERMISSION_SET: Lowest priority - member permissions from permission sets
 */
export const permissionSource = {
  MEMBER_DIRECT: "member_direct",
  MEMBER_PERMISSION_SET: "member_permission_set",
  USER_DIRECT: "user_direct",
  USER_PERMISSION_SET: "user_permission_set",
} as const

/**
 * Shared validation schemas and utilities used across requests and responses
 * These components provide the foundation for all other validation schemas
 */

export const idSchema = z.object({ id: z.string().min(1) })
export const idArraySchema = z.object({ ids: z.array(z.string().min(1)) })
export const sourceSchema = z.enum(permissionSource)

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).default(1000),
  page: z.coerce.number().int().min(1).default(1),
})

export const includesSchema = z.object({
  includeExpired: z.coerce.boolean().optional(),
  includeMembers: z.coerce.boolean().optional(),
  includePermissionSets: z.coerce.boolean().optional(),
  includePermissions: z.coerce.boolean().optional(),
  includeUsers: z.coerce.boolean().optional(),
})

export const listSchema = paginationQuerySchema.extend({
  organizationId: z.string().min(1).optional(),
  search: z.string().optional(),
})

export const storedPermissionSchema = z.object({
  action: z.string(),
  conditions: z.string().min(1).optional(),
  createdAt: z.date().default(() => new Date()),
  expiresAt: z.date().optional(),
  fields: z.string().min(1).optional(),
  id: z.string().default(generateId),
  inverted: z.boolean().default(false),
  name: z.string(),
  organizationId: z.string().optional(),
  reason: z.string().optional(),
  subject: z.string(),
  updatedAt: z.date().optional(),
})

export const permissionSchema = storedPermissionSchema
  .extend({
    fields: z.array(z.string()).optional(),
    conditions: z.record(z.string(), z.unknown()).optional(),
  })
  .omit({ organizationId: true })

export const caslPermissionSchema = permissionSchema.extend({
  source: sourceSchema,
  organizationId: z.string().optional(),
})

export const permissionSetSchema = z.object({
  createdAt: z.date().default(() => new Date()),
  description: z.string().optional(),
  id: z.string().default(generateId),
  name: z.string(),
  organizationId: z.string().optional(),
  updatedAt: z.date().optional(),
})

export const paginationMetadataSchema = z.object({
  currentPage: z.number(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
  total: z.number(),
  totalPages: z.number(),
})

/**
 * Creates assignment operation schemas with consistent structure
 */
export function createAssignmentSchema<E extends string, T extends string>(
  entityType: E,
  targetType: T
) {
  const schema = z.object({
    [`${entityType}Id`]: z.string().min(1),
    [`${targetType}Ids`]: z.array(z.string().min(1)),
  } as const)
  return schema as z.ZodObject<
    {
      [K in `${E}Id`]: z.ZodString
    } & {
      [K in `${T}Ids`]: z.ZodArray<z.ZodString>
    }
  >
}

export function withModeAwareOrgId<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  mode: AuthorizationConfig["mode"]
) {
  if (mode === "member") {
    return schema.extend({ organizationId: z.string().min(1) })
  }
  if (mode === "both") {
    return schema.extend({ organizationId: z.string().optional() })
  }
  return schema
}

export const userSchema = z.object({
  email: z.string(),
  id: z.string(),
  image: z.string().nullish(),
  name: z.string(),
})

export const memberSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  role: z.string(),
  userId: z.string(),
})

export const assignmentRemovalSchema = z.object({
  message: z.string().optional(),
  count: z.number().optional(),
})
