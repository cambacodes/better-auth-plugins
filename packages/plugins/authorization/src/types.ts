import type { AbilityBuilder, AbilityTuple, MongoAbility, MongoQuery } from "@casl/ability"
import type { InferOptionSchema } from "better-auth/types"
import type z from "zod"
import type { ROUTES } from "./constants/routes"
import type { schema } from "./schema"
import type {
  caslPermissionSchema,
  permissionSetSchema,
  permissionSource,
  storedPermissionSchema,
} from "./validation"

/**
 * Authorization mode determines how permissions are assigned and managed
 *
 * - "user": Users have permissions and permission sets directly
 * - "member": Members have permissions and permission sets within organizations
 * - "both": Both user and member permissions are supported (requires organizationId to be optional)
 */
export type AuthorizationMode = "user" | "member" | "both"

/**
 * Configuration options for the authorization plugin
 *
 * @example
 * ```typescript
 * const authConfig: AuthorizationConfig = {
 *   mode: "both", // Support both user and member permissions
 *   pagination: { defaultLimit: 50 },
 *   batch: { chunkSize: 200 },
 *   routeMiddleware: {
 *     callback: (can, route) => {
 *       switch (route) {
 *         case "/create-permission":
 *           return can('create', 'permission');
 *         case "/list-permissions":
 *           return can('read', 'permission');
 *         default:
 *           return false;
 *       }
 *     },
 *     protectedRoutes: ["/create-permission", "/list-permissions"]
 *   }
 * }
 * ```
 */
export interface AuthorizationConfig {
  /**
   * Authorization mode determines how permissions are assigned and managed
   *
   * - "user": Users have permissions and permission sets directly (no organization context)
   * - "member": Members have permissions and permission sets within organizations (requires organizationId)
   * - "both": Both user and member permissions are supported (organizationId is optional)
   *
   * @default "user"
   */
  mode?: AuthorizationMode

  /**
   * Route middleware configuration for declarative route-based authorization
   *
   * @example
   * ```typescript
   * routeMiddleware: {
   *   callback: (can, route) => {
   *     switch (route) {
   *       case "/create-permission":
   *         return can('create', 'permission');
   *       case "/list-permissions":
   *         return can('read', 'permission');
   *       default:
   *         return false;
   *     }
   *   },
   *   protectedRoutes: ["/create-permission", "/list-permissions"]
   * }
   * ```
   */
  routeMiddleware?: RouteMiddlewareConfig

  /**
   * Pagination options for listing permissions and permission sets
   * Controls default behavior for paginated API responses
   */
  pagination?: {
    /**
     * Default number of items per page for list operations
     * @default 100
     */
    defaultLimit?: number
  }

  /**
   * Batch operation configuration for handling large datasets
   * Prevents memory issues and database timeouts with large operations
   */
  batch?: {
    /**
     * Number of items to process in each batch chunk
     * Larger values improve performance but use more memory
     * @default 100
     */
    chunkSize?: number
  }
  /**
   * Maximum number of related entities to retrieve in a single
   * request (applies to both list and get operations).
   *
   * This setting overrides the default adapter limit of 100,
   * @default 10_000
   */
  maxRelationLimit?: number

  /**
   * Custom database schema extensions for the authorization plugin
   * Allows customization of table structures and relationships
   */
  schema?: InferOptionSchema<schema>
}

export interface AuthorizationOptions
  extends Pick<AuthorizationConfig, "mode" | "routeMiddleware"> {
  batch: Required<NonNullable<AuthorizationConfig["batch"]>>
  maxRelationLimit: Required<NonNullable<AuthorizationConfig["maxRelationLimit"]>>
  pagination: Required<NonNullable<AuthorizationConfig["pagination"]>>
}

/**
 * Options for including related data in query responses
 * Used to control which related entities are fetched and included in API responses
 */
export type QueryResponseOptions = {
  /** Include member information in the response */
  includeMembers?: boolean
  /** Include permission set information in the response */
  includePermissionSets?: boolean
  /** Include user information in the response */
  includeUsers?: boolean
  /** Include permission information in the response */
  includePermissions?: boolean
  /** Include expired permission information in the response */
  includeExpired?: boolean
}

export type PaginationMetadata = {
  total: number
  currentPage: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export type PaginatedResponse<T> = {
  data: T[]
  pagination: PaginationMetadata
}
export type PermissionSource = (typeof permissionSource)[keyof typeof permissionSource]

/**
 * Base permission type with all common fields
 */
export type PermissionBase = z.infer<typeof storedPermissionSchema>

/**
 * Permission type with mode-specific organizationId requirements
 *
 * The organizationId field behavior depends on the authorization mode:
 * - "user" mode: organizationId is not required (user-level permissions)
 * - "member" mode: organizationId is required (organization-scoped permissions)
 * - "both" mode: organizationId is optional (supports both user and member permissions)
 *
 * @template O - Authorization options that determine the mode
 */
export type Permission<O extends AuthorizationOptions> = PermissionBase &
  (O["mode"] extends "user"
    ? Record<never, never>
    : O["mode"] extends "member"
      ? { organizationId: string }
      : { organizationId?: string })

export type CreatePermissionInput<O extends AuthorizationOptions> = Omit<
  Permission<O>,
  "id" | "createdAt" | "updatedAt"
>

export type CreatePermissionSetInput<O extends AuthorizationOptions> = Omit<
  PermissionSet<O>,
  "id" | "createdAt" | "updatedAt"
>
/**
 * Enhanced permission response type with optional related data
 *
 * Conditionally includes related entities based on query options:
 * - source: Always included - indicates where the permission comes from (user_direct, member_permission_set, etc.)
 * - members: Included if Q["includeMembers"] is true
 * - permissionSets: Included if Q["includePermissionSets"] is true
 * - users: Included if Q["includeUsers"] is true
 */
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

export type PermissionSetBase = z.infer<typeof permissionSetSchema>
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

export type TemplateValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | TemplateValue[]
  | { [key: string]: TemplateValue }

export type AppAbility = MongoAbility<AbilityTuple, MongoQuery>
export type AbilityCan = AbilityBuilder<AppAbility>["can"]
export type AbilityCannot = AbilityBuilder<AppAbility>["cannot"]
export type CaslPermission = z.infer<typeof caslPermissionSchema>

export type AuthorizationRoutes = (typeof ROUTES)[keyof typeof ROUTES]

export type UnprotectedRoutes = Extract<AuthorizationRoutes, "/get-ability" | "/check-permission">

export type ProtectedRoutes = Exclude<AuthorizationRoutes, "/get-ability" | "/check-permission">

/**
 * Type-safe route extraction utility that narrows allowed routes based on configuration
 *
 * When protectedRoutes is "all", allows all ProtectedRoutes
 * When protectedRoutes is an array, only allows routes from that array
 */
type AllowedRoutes<T extends RouteMiddlewareConfigBase> = T["protectedRoutes"] extends "all"
  ? ProtectedRoutes
  : T["protectedRoutes"] extends readonly (infer R)[]
    ? R extends ProtectedRoutes
      ? R
      : never
    : never

/**
 * Type-safe callback function that only accepts routes configured in protectedRoutes
 *
 * @template T - Route middleware configuration type
 * @param can - CASL ability can function bound to the user's ability object
 * @param route - Type-narrowed route parameter that only accepts configured protected routes
 * @returns boolean indicating whether access should be granted (true) or denied (false)
 */
export type RouteMiddlewareCallback<
  T extends RouteMiddlewareConfigBase = RouteMiddlewareConfigBase,
> = (can: AppAbility["can"], route: AllowedRoutes<T>) => boolean

/**
 * Base configuration for route middleware (used for type constraints)
 */
interface RouteMiddlewareConfigBase {
  protectedRoutes: ProtectedRoutes[] | "all"
}

/**
 * Type-safe route middleware configuration that enforces route constraints
 *
 * @template T - Array of protected routes or "all"
 *
 * @example
 * ```typescript
 * // Only specific routes allowed in callback
 * const config: RouteMiddlewareConfig<["/create-permission", "/list-permissions"]> = {
 *   callback: (can, route) => {
 *     switch (route) {
 *       case "/create-permission": return can('create', 'permission');
 *       case "/list-permissions": return can('read', 'permission');
 *       // route can only be "/create-permission" or "/list-permissions" here
 *       default: return false;
 *     }
 *   },
 *   protectedRoutes: ["/create-permission", "/list-permissions"]
 * };
 *
 * // All routes allowed
 * const allConfig: RouteMiddlewareConfig<"all"> = {
 *   callback: (can, route) => {
 *     // route can be any ProtectedRoutes value
 *     return can('read', 'permission') // Allow all reads
 *   },
 *   protectedRoutes: "all"
 * };
 * ```
 */
export interface RouteMiddlewareConfig<
  T extends ProtectedRoutes[] | "all" = ProtectedRoutes[] | "all",
> {
  /** The authorization callback function */
  readonly callback: RouteMiddlewareCallback<{ protectedRoutes: T }>
  /** Array of routes that should be protected (only these routes will have abilities created) */
  readonly protectedRoutes: T
}

/**
 * Enhanced context structure for authorization middleware
 * Contains all necessary data for route-based authorization
 */
export interface AuthorizationContext {
  /** Session information including user and organization context */
  session: {
    session: {
      userId: string
      activeOrganizationId?: string
      [key: string]: unknown
    }
    user?: {
      id: string
      [key: string]: unknown
    }
  }
  /** CASL ability object for permission checking */
  ability: AppAbility | null
  /** Member information if organization context exists */
  member?: {
    id: string
    userId: string
    organizationId: string
    role?: string
    [key: string]: unknown
  }
}
