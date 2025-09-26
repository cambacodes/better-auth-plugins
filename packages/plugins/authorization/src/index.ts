import type { BetterAuthPlugin } from "better-auth"
import { mergeSchema } from "better-auth/db"
import { genericEndpoints } from "./endpoints/generic-endpoints"
import { permissionEndpoints } from "./endpoints/permission-endpoints"
import { permissionSetEndpoints } from "./endpoints/permission-set-endpoints"
import { createAuthorizationSchema } from "./schema"
import type { AuthorizationConfig, AuthorizationOptions } from "./types"

export {
  AUTHORIZATION_ERROR_CODES,
  VALIDATION_ERROR_MESSAGES,
} from "./constants/error-codes"

export type {
  AuthorizationConfig,
  AuthorizationContext,
  AuthorizationOptions,
  PaginatedResponse,
  Permission,
  PermissionResponse as PermissionWithRelations,
  PermissionSet,
  PermissionSetResponse as PermissionSetWithRelations,
  PermissionSource,
  ProtectedRoutes as AuthorizationRoute,
  QueryResponseOptions,
  RouteMiddlewareCallback,
} from "./types"

export type {
  BatchCreatePermissionSetsResponse,
  BatchCreatePermissionsResponse,
  BatchDeletePermissionSetsResponse,
  BatchDeletePermissionsResponse,
  CreatePermissionResponse,
  CreatePermissionSetResponse,
  DeletePermissionResponse,
  DeletePermissionSetResponse,
  GetPermissionResponse,
  GetPermissionSetResponse,
  ListPermissionSetsResponse,
  ListPermissionsResponse,
  PermissionResponse,
  PermissionSetResponse,
  UpdatePermissionResponse,
  UpdatePermissionSetResponse,
} from "./validation"

/**
 * Default configuration for the authorization plugin
 * - mode: "user" - Default to user-based permissions (no organization context required)
 * - pagination.defaultLimit: 100 - Default page size for list operations
 * - batch.chunkSize: 100 - Default chunk size for batch operations to prevent memory issues
 * - maxRelationLimit: 10_000 - Default number of related entities to retrieve
 */
const DEFAULT_CONFIG = {
  batch: { chunkSize: 100 },
  mode: "user" as const,
  pagination: { defaultLimit: 100 },
  maxRelationLimit: 10_000,
} satisfies AuthorizationOptions

/**
 * Creates the better-auth authorization plugin with CASL-based permissions
 *
 * This plugin provides comprehensive authorization functionality including:
 * - Permission and permission set management
 * - User and member-based authorization modes
 * - CASL integration for flexible rule-based permissions
 * - Batch operations with configurable chunking
 * - Secure template interpolation for dynamic conditions
 *
 * @param options Configuration options for the authorization plugin
 * @returns BetterAuthPlugin configured with authorization endpoints and schema
 */
export const authorization = (options: AuthorizationConfig) => {
  const defaultOptions: AuthorizationOptions = {
    ...DEFAULT_CONFIG,
    ...options,
    batch: {
      ...DEFAULT_CONFIG.batch,
      ...options.batch,
    },
    pagination: {
      ...DEFAULT_CONFIG.pagination,
      ...options.pagination,
    },
  }

  const endpoints = {
    ...permissionEndpoints(defaultOptions),
    ...permissionSetEndpoints(defaultOptions),
    ...genericEndpoints(defaultOptions),
  } as const

  return {
    endpoints,
    id: "authorization",
    options,
    schema: mergeSchema(createAuthorizationSchema(options), options?.schema),
  } satisfies BetterAuthPlugin
}
