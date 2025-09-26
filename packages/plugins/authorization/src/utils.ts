import { AbilityBuilder, createMongoAbility, type MongoQuery } from "@casl/ability"
import { logger, type OpenAPISchemaType, type ZodType } from "better-auth"
import { APIError } from "better-auth/api"
import type { Adapter } from "better-auth/types"
import Mustache from "mustache"
import { createSchema } from "zod-openapi"
import type { AuthorizationAdapter } from "./adapter"
import type {
  AbilityCan,
  AbilityCannot,
  AuthorizationOptions,
  CaslPermission,
  PermissionBase,
  PermissionSource,
  TemplateValue,
} from "./types"
import { permissionSource } from "./validation"

/**
 * Configurable batch chunk size for processing large batch operations
 * This helps prevent memory issues and database timeouts with large datasets
 */
export const BATCH_CHUNK_SIZE = 100

/**
 * Checks if an error is a duplicate key error from the database
 */
export const isDuplicateKeyError = (error: unknown): boolean => {
  if (error instanceof APIError) {
    return (
      error.status === "CONFLICT" ||
      error.message.includes("duplicate") ||
      error.message.includes("unique") ||
      error.message.includes("UNIQUE constraint failed") ||
      error.message.includes("duplicate key value")
    )
  }

  // Handle raw database errors that might not be wrapped in APIError
  if (error && typeof error === "object" && "message" in error) {
    const message = String(error.message).toLowerCase()
    return (
      message.includes("duplicate") ||
      message.includes("unique") ||
      message.includes("constraint") ||
      message.includes("already exists")
    )
  }

  return false
}

/**
 * Idempotent junction assignment handler that gracefully handles duplicate assignments
 * Uses try-catch pattern for idempotent behavior instead of check-then-create to avoid race conditions
 *
 * This approach prevents race conditions by:
 * 1. Attempting the create operation directly (optimistic approach)
 * 2. Catching duplicate key errors and treating them as success (idempotent)
 * 3. Using transactions when available for consistency
 * 4. Rethrowing non-duplicate errors for proper error handling
 */
export const handleIdempotentJunctionAssignment = async (
  adapter: Adapter | Omit<Adapter, "transaction">,
  model: string,
  data: Record<string, string>
): Promise<void> => {
  if ("transaction" in adapter) {
    return await adapter.transaction(async (tx) => {
      try {
        await tx.create({ data, model })
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          return
        }
        throw error
      }
    })
  }
  try {
    await adapter.create({ data, model })
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return
    }
    throw error
  }
}

/**
 * Safely parse JSON data with comprehensive error handling
 * @param data The data to parse (string, null, undefined, or already parsed object)
 * @param context Optional context for error reporting
 * @returns Parsed data or null if parsing fails
 */
export function safeJSONParse<T>(data: unknown, context?: string): T | null {
  if (data === null || data === undefined) {
    return null
  }

  if (typeof data === "object") {
    return data as T
  }

  if (typeof data !== "string") {
    return data as T
  }

  if (data.trim() === "") {
    return null
  }

  function reviver(_: string, value: unknown): unknown {
    if (typeof value === "string") {
      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/
      if (iso8601Regex.test(value)) {
        const date = new Date(value)
        if (!Number.isNaN(date.getTime())) {
          return date
        }
      }
    }
    return value
  }

  try {
    const parsed = JSON.parse(data, reviver)
    return parsed
  } catch (e) {
    const errorMessage = `Error parsing JSON${context ? ` in ${context}` : ""}`
    logger.error(errorMessage, {
      context,
      data: typeof data === "string" ? data.substring(0, 100) : data,
      error: e,
    })
    return null
  }
}

/**
 * Transform permission data for storage by properly handling JSON fields
 * @param permission The permission object to transform
 * @returns Permission with JSON fields properly stringified
 */
export function transformPermissionForStorage<T extends { fields?: unknown; conditions?: unknown }>(
  permission: T
): T & { fields: string | null; conditions: string | null } {
  return {
    ...permission,
    conditions: JSON.stringify(permission.conditions),
    fields: JSON.stringify(permission.fields),
  }
}

/**
 * Transform permission data from storage by properly parsing JSON fields
 * @param permission The permission object from storage
 * @returns Permission with JSON fields properly parsed
 */
export function transformPermissionFromStorage<T extends { fields?: string; conditions?: string }>(
  permission: T
): T & { fields?: string[]; conditions?: Record<string, unknown> } {
  return {
    ...permission,
    conditions: safeJSONParse(permission.conditions) ?? undefined,
    fields: safeJSONParse(permission.fields) ?? undefined,
  }
}

const DISALLOWED_TEMPLATE_VARIABLES = new Set(["process.env"])
const DANGEROUS_TEMPLATE_KEYS = new Set(["__proto__", "constructor", "prototype"])

/**
 * Validates template variables against whitelist to prevent injection attacks
 * @param template The template string to validate
 * @returns Array of validation errors, empty if valid
 */
function validateTemplateVariables(template: string): string[] {
  const errors: string[] = []

  const templateRegex = /\{\{([^}]+)\}\}/g
  let match: RegExpExecArray | null

  match = templateRegex.exec(template)
  while (match !== null) {
    const variable = match[1].trim()

    if (DISALLOWED_TEMPLATE_VARIABLES.has(variable)) {
      errors.push(`Unauthorized template variable: ${variable}`)
    }

    if (variable.includes("..") || variable.includes("/") || variable.includes("\\")) {
      errors.push(`Invalid template variable format: ${variable}`)
    }

    if (
      variable.includes("(") ||
      variable.includes(")") ||
      variable.includes("[") ||
      variable.includes("]")
    ) {
      errors.push(`Template variable cannot contain function calls or array access: ${variable}`)
    }

    match = templateRegex.exec(template)
  }

  return errors
}

/**
 * Safely interpolates template strings in permission conditions with security validation
 *
 * Security measures:
 * - Whitelist validation for template variables
 * - Input sanitization to prevent injection attacks
 * - Secure failure handling for template processing errors
 * - Comprehensive error logging for security monitoring
 *
 * Example: { authorId: "{{user.id}}" } becomes { authorId: "123" }
 */
export function interpolateConditions(
  rule: CaslPermission,
  context: Record<string, unknown>
): CaslPermission {
  if (!rule.conditions) return rule

  try {
    const interpolatedConditions = secureInterpolateObject(
      rule.conditions as TemplateValue,
      context
    )

    return {
      ...rule,
      conditions: interpolatedConditions,
    }
  } catch (error) {
    logger.error(`Template interpolation failed for permission ${rule.id}`, {
      error: error instanceof Error ? error.message : "Unknown error",
      permissionId: rule.id,
      permissionName: rule.name,
    })

    return rule
  }
}

/**
 * Recursively interpolates template strings in nested objects with security validation
 * @param value The value to interpolate
 * @param context The context object for interpolation
 * @returns Safely interpolated value
 */
function secureInterpolateObject(
  value: TemplateValue,
  context: Record<string, unknown>
): MongoQuery<unknown> {
  if (value === null || value === undefined) {
    return null as unknown as MongoQuery<unknown>
  }

  if (typeof value === "string") {
    if (!value.includes("{{")) {
      return value
    }

    const validationErrors = validateTemplateVariables(value)
    if (validationErrors.length > 0) {
      logger.error("Template validation failed", {
        errors: validationErrors,
        template: value,
      })

      return value
    }

    try {
      const interpolated = Mustache.render(value, context)

      if (typeof interpolated !== "string") {
        logger.error("Template interpolation produced non-string result", {
          resultType: typeof interpolated,
          template: value,
        })
        return value
      }

      return interpolated
    } catch (error) {
      logger.error("Template interpolation failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        template: value,
      })

      return value
    }
  }

  if (Array.isArray(value)) {
    return value.map((item) => secureInterpolateObject(item, context))
  }

  if (typeof value === "object") {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) {
      if (DANGEROUS_TEMPLATE_KEYS.has(key)) {
        logger.error("Potentially dangerous object key detected", { key })
        continue
      }

      result[key] = secureInterpolateObject(val as TemplateValue, context)
    }
    return result
  }

  return value as MongoQuery<unknown>
}

/**
 * Validates that a context object is safe for template interpolation
 * @param context The context object to validate
 * @returns Validation result with sanitized context
 */
export function validateAndSanitizeContext(context: Record<string, unknown>): {
  isValid: boolean
  sanitizedContext: Record<string, unknown>
  errors: string[]
} {
  const errors: string[] = []
  const sanitizedContext: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(context)) {
    if (DANGEROUS_TEMPLATE_KEYS.has(key)) {
      errors.push(`Dangerous context key: ${key}`)
      continue
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
      sanitizedContext[key] = sanitizeNestedObject(value as Record<string, unknown>)
    } else if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      sanitizedContext[key] = value
    } else {
      errors.push(`Invalid context value type for key ${key}: ${typeof value}`)
    }
  }

  return {
    errors,
    isValid: errors.length === 0,
    sanitizedContext,
  }
}

/**
 * Sanitizes nested objects in context to prevent injection
 * @param obj The object to sanitize
 * @returns Sanitized object
 */
function sanitizeNestedObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (DANGEROUS_TEMPLATE_KEYS.has(key)) {
      continue
    }

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      sanitized[key] = value
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      const nestedSanitized: Record<string, unknown> = {}
      for (const [nestedKey, nestedValue] of Object.entries(value as Record<string, unknown>)) {
        if (DANGEROUS_TEMPLATE_KEYS.has(nestedKey)) {
          if (
            typeof nestedValue === "string" ||
            typeof nestedValue === "number" ||
            typeof nestedValue === "boolean" ||
            nestedValue === null
          ) {
            nestedSanitized[nestedKey] = nestedValue
          }
        }
      }
      sanitized[key] = nestedSanitized
    }
  }

  return sanitized
}

/**
 * Creates CASL ability from permissions with secure context interpolation
 */
export function createAbilityFromPermissions(
  permissions: CaslPermission[],
  context?: Record<string, unknown>
) {
  const { can, cannot, build } = new AbilityBuilder(createMongoAbility)

  let sanitizedContext: Record<string, unknown> | undefined
  if (context) {
    const validation = validateAndSanitizeContext(context)
    if (!validation.isValid) {
      logger.error("Context validation failed for CASL ability creation", {
        errors: validation.errors,
      })
      sanitizedContext = validation.sanitizedContext
    } else {
      sanitizedContext = validation.sanitizedContext
    }
  }

  for (const permission of permissions) {
    try {
      const rule = sanitizedContext
        ? interpolateConditions(permission, sanitizedContext)
        : permission
      applyPermissionRule(rule, can, cannot)
    } catch (error) {
      logger.error(`Failed to process permission ${permission.id}`, {
        error: error instanceof Error ? error.message : "Unknown error",
        permissionId: permission.id,
        permissionName: permission.name,
      })
      // Continue processing other permissions even if one fails
    }
  }

  return build()
}

/**
 * Apply a permission rule to CASL ability
 */
export function applyPermissionRule(rule: CaslPermission, can: AbilityCan, cannot: AbilityCannot) {
  const { action, subject, fields, conditions, inverted, reason } = rule

  const actions = Array.isArray(action) ? action : [action]
  const subjects = subject ? (Array.isArray(subject) ? subject : [subject]) : ["all"]

  for (const act of actions) {
    for (const subj of subjects) {
      if (inverted) {
        cannot(act, subj, fields, conditions).because(reason ?? "")
      } else {
        can(act, subj, fields, conditions)
      }
    }
  }
}

/**
 * Enhanced permission priority sorting implementing CASL best practices
 *
 * CASL Rule Priority Implementation (Last Rule Wins):
 * According to CASL documentation and the design requirements, permissions must be ordered
 * so that higher-priority sources are applied LAST to override lower-priority sources.
 *
 * Priority Hierarchy:
 * 1. Member Permission Set → Member Direct → User Permission Set → User Direct
 * 2. Within same source: Allow rules before deny rules (deny can override allow)
 * 3. Within same type: General rules before specific rules (specific can override general)
 * 4. Deterministic ordering by timestamp for consistent behavior
 *
 * Business Logic Rationale:
 * - Member permissions are organization-scoped and should be overridable by user permissions
 * - Permission sets group permissions that can be overridden by direct assignments
 * - User direct permissions have highest priority as they represent explicit user grants
 * - Deny rules must come after allow rules to properly restrict permissions
 * - Specific conditions/fields override general rules to provide fine-grained control
 * - Timestamp ordering ensures consistent behavior when all other factors are equal
 *
 * Why this ordering matters for CASL compatibility:
 * - CASL applies rules in order, with later rules taking precedence
 * - Higher-priority sources (user direct) come LAST to override lower-priority sources
 * - Deny rules come AFTER allow rules so they can restrict previous permissions
 * - Specific rules come after general rules to provide exceptions
 * - Deterministic ordering prevents unpredictable authorization behavior
 */
export function sortPermissionsByPriority(permissions: CaslPermission[]): CaslPermission[] {
  // Source priority mapping according to design requirements
  // Lower number = applied earlier = lower priority
  // Higher number = applied later = higher priority (can override previous rules)
  const sourcePriority: Record<PermissionSource, number> = {
    [permissionSource.MEMBER_PERMISSION_SET]: 1, // Lowest priority - applied FIRST
    [permissionSource.MEMBER_DIRECT]: 2, // Can override member permission sets
    [permissionSource.USER_PERMISSION_SET]: 3, // Can override member permissions
    [permissionSource.USER_DIRECT]: 4, // Highest priority - applied LAST (can override all)
  }

  return permissions.sort((a, b) => {
    // 1. Primary sort: Source type hierarchy
    const aSourcePriority = sourcePriority[a.source]
    const bSourcePriority = sourcePriority[b.source]

    if (aSourcePriority !== bSourcePriority) {
      return aSourcePriority - bSourcePriority // Lower priority sources come first
    }

    // 2. Secondary sort: Allow rules before deny rules within same source
    // This ensures deny rules can restrict the permissions granted by allow rules
    if (a.inverted !== b.inverted) {
      return a.inverted ? 1 : -1 // Allow rules (false) first, deny rules (true) second
    }

    // 3. Tertiary sort: General rules before specific rules
    // More specific rules should come after general rules to provide exceptions
    const getSpecificity = (p: CaslPermission): number => {
      let specificity = 0

      // Conditions make a rule more specific
      if (p.conditions && Object.keys(p.conditions).length > 0) {
        specificity += 2
      }

      // Field restrictions make a rule more specific
      if (p.fields && p.fields.length > 0) {
        specificity += 1
      }

      return specificity
    }

    const aSpecificity = getSpecificity(a)
    const bSpecificity = getSpecificity(b)

    if (aSpecificity !== bSpecificity) {
      return aSpecificity - bSpecificity // General rules (lower specificity) first
    }

    // 4. Quaternary sort: Deterministic ordering by timestamp
    // Ensures consistent behavior when all other factors are equal
    const getTimestamp = (p: CaslPermission): number => {
      // Use updatedAt if available, otherwise fall back to createdAt
      const timestamp = p.updatedAt || p.createdAt
      return new Date(timestamp).getTime()
    }

    const aTimestamp = getTimestamp(a)
    const bTimestamp = getTimestamp(b)

    if (aTimestamp !== bTimestamp) {
      return aTimestamp - bTimestamp // Older rules first (newer rules can override)
    }

    // 5. Final fallback: Sort by ID for absolute determinism
    return a.id.localeCompare(b.id)
  })
}

/**
 * Convert database permission to CASL permission rule with proper JSON parsing
 * @param permission The permission from database
 * @param source The permission source
 * @returns CASL permission rule with properly parsed JSON fields
 */
export function convertDbPermissionToRule(
  permission: PermissionBase,
  source: PermissionSource
): CaslPermission {
  return {
    action: permission.action,
    conditions: safeJSONParse(permission.conditions) ?? undefined,
    createdAt: permission.createdAt,
    expiresAt: permission.expiresAt,
    fields: safeJSONParse(permission.fields) ?? undefined,
    id: permission.id,
    inverted: permission.inverted,
    name: permission.name,
    organizationId: permission.organizationId,
    reason: permission.reason ?? "",
    source,
    subject: permission.subject,
    updatedAt: permission.updatedAt,
  }
}

export function flattenGroupedRecords<T extends { id: string }>(
  recordOfArrays: Record<string, Array<T>>
): Array<T> {
  const result: T[] = []
  const seen = new Set<string>()

  for (const items of Object.values(recordOfArrays)) {
    for (const item of items) {
      if (!seen.has(item.id)) {
        seen.add(item.id)
        result.push(item)
      }
    }
  }

  return result
}

/**
 * Splits an array into chunks of specified size for batch processing
 * @param array The array to chunk
 * @param chunkSize The size of each chunk (defaults to BATCH_CHUNK_SIZE)
 * @returns Array of chunks
 */
export function chunkArray<T>(array: T[], chunkSize: number = BATCH_CHUNK_SIZE): T[][] {
  if (array.length === 0) {
    return []
  }

  if (chunkSize <= 0) {
    throw new Error("Chunk size must be greater than 0")
  }

  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize))
  }
  return chunks
}

export const fetchSortedPermissions = async (
  adapter: AuthorizationAdapter,
  mode: AuthorizationOptions["mode"],
  userId?: string,
  memberId?: string
) => {
  const allPermissions: CaslPermission[] = []
  if ((mode === "user" || mode === "both") && userId) {
    const userPermissions = await adapter.getUserPermissions(userId)
    const userPermissionSets = await adapter.getUserPermissionSets(userId)

    const userPermissionSetIds = userPermissionSets.map((ps) => ps.permissionSetId)
    if (userPermissionSetIds.length > 0) {
      const batchedUserPermissionSetPermissions =
        await adapter.batchGetPermissionsForPermissionSets(userPermissionSetIds)

      if (batchedUserPermissionSetPermissions) {
        const userPermissionSetPermissions = flattenGroupedRecords(
          batchedUserPermissionSetPermissions
        )

        allPermissions.push(
          ...userPermissions.map((p) => ({
            ...p,
            source: permissionSource.USER_DIRECT,
          })),
          ...userPermissionSetPermissions.map((p) => ({
            ...p,
            fields: safeJSONParse<string[]>(p.fields) ?? undefined,
            conditions: safeJSONParse<Record<string, unknown>>(p.conditions) ?? undefined,
            source: permissionSource.USER_PERMISSION_SET,
          }))
        )
      }
    } else {
      allPermissions.push(
        ...userPermissions.map((p) => ({
          ...p,
          source: permissionSource.USER_DIRECT,
        }))
      )
    }
  }

  if ((mode === "member" || mode === "both") && memberId) {
    const memberPermissions = await adapter.getMemberPermissions(memberId)
    const memberPermissionSets = await adapter.getMemberPermissionSets(memberId)

    const memberPermissionSetIds = memberPermissionSets.map((ps) => ps.permissionSetId)

    if (memberPermissionSetIds.length > 0) {
      const batchedMemberPermissionSetPermissions =
        await adapter.batchGetPermissionsForPermissionSets(memberPermissionSetIds)

      if (batchedMemberPermissionSetPermissions) {
        const memberPermissionSetPermissions = flattenGroupedRecords(
          batchedMemberPermissionSetPermissions
        )

        allPermissions.push(
          ...memberPermissions.map((p) => ({
            ...p,
            source: permissionSource.MEMBER_DIRECT,
          })),
          ...memberPermissionSetPermissions.map((p) => ({
            ...p,
            fields: safeJSONParse<string[]>(p.fields) ?? undefined,
            conditions: safeJSONParse<Record<string, unknown>>(p.conditions) ?? undefined,
            source: permissionSource.MEMBER_PERMISSION_SET,
          }))
        )
      }
    } else {
      allPermissions.push(
        ...memberPermissions.map((p) => ({
          ...p,
          source: permissionSource.MEMBER_DIRECT,
        }))
      )
    }
  }

  const sortedPermissions = sortPermissionsByPriority(allPermissions)

  return sortedPermissions
}

export const generateSchema = (zodSchema: ZodType) => {
  return {
    "application/json": {
      schema: createSchema(zodSchema).schema as {
        type?: OpenAPISchemaType | undefined
        properties?: Record<string, unknown>
        required?: string[]
        $ref?: string
      },
    },
  }
}
