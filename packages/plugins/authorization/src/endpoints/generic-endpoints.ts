import { createAuthEndpoint, sessionMiddleware } from "better-auth/api"
import { ROUTES } from "../constants/routes"
import { checkPermissionHandler } from "../handlers/generic/check-permission"
import { getAbilityHandler } from "../handlers/generic/get-ability"
import { createAuthorizationMiddleware } from "../middleware"
import type { AuthorizationOptions } from "../types"
import { generateSchema } from "../utils"
import {
  checkPermissionRequestSchema,
  checkPermissionResponseSchema,
  getAbilityResponseSchema,
} from "../validation"

export const genericEndpoints = (options: AuthorizationOptions) => {
  const authorizationMiddleware = createAuthorizationMiddleware(options)

  return {
    /**
     * Permission checking endpoint using CASL authorization
     *
     * Validates if a user or member has permission to perform an action on a subject/resource
     * using CASL (Centralized Access Control Library). Supports field-level permissions and
     * complex conditions based on user context, member roles, and resource attributes.
     *
     * Business Logic:
     * 1. Retrieves all applicable permissions from multiple sources (user direct, user permission sets, member direct, member permission sets)
     * 2. Applies proper priority ordering: member permission set → member direct → user permission set → user direct
     * 3. Builds secure evaluation context with user, member, resource, and additional context data
     * 4. Creates CASL ability with template interpolation for dynamic conditions
     * 5. Evaluates permission against the requested action, subject, and optional fields
     * 6. Returns detailed result with permission metadata for debugging
     *
     * @param options - AuthorizationOptions containing mode, adapter, and other configuration
     * @returns Endpoint response containing permission check result with metadata
     *
     * @example
     * ```typescript
     * // Check if user can edit a specific document
     * const result = await checkPermission({
     *   userId: "user123",
     *   memberId: "member456",
     *   action: "update",
     *   subject: "Document",
     *   resource: { id: "doc789", ownerId: "user123" },
     *   fields: ["title", "content"]
     * });
     * ```
     */
    checkPermission: createAuthEndpoint(
      ROUTES.CHECK_PERMISSION,
      {
        body: checkPermissionRequestSchema,
        method: "POST",
        use: [authorizationMiddleware],
        metadata: {
          openapi: {
            requestBody: {
              content: generateSchema(checkPermissionRequestSchema),
            },
            responses: {
              200: {
                description: "Permission checked successfully",
                content: generateSchema(checkPermissionResponseSchema),
              },
            },
          },
        },
      },
      async (ctx) => checkPermissionHandler(ctx, options)
    ),
    /**
     * User ability retrieval endpoint
     *
     * Returns all applicable permissions for the authenticated user based on their
     * direct assignments, permission sets, member roles, and organization context.
     * Used to populate CASL ability instances for client-side authorization.
     *
     * Business Logic:
     * 1. Extracts user ID from session token authentication
     * 2. Fetches active organization membership if applicable
     * 3. Retrieves comprehensive permissions from multiple sources with proper priority
     * 4. Returns sorted, merged permission list for ability construction
     *
     * @param options - AuthorizationOptions containing mode, adapter, and other configuration
     * @returns Array of CaslPermission objects representing user's complete authorization ability
     *
     * @example
     * ```typescript
     * // Get all permissions for the current user
     * const permissions = await getAbility();
     * // Returns: [{ action: "read", subject: "Document", conditions: {...} }, ...]
     * ```
     */
    getAbility: createAuthEndpoint(
      ROUTES.GET_ABILITY,
      {
        method: "POST",
        use: [sessionMiddleware],
        metadata: {
          openapi: {
            responses: {
              200: {
                description: "User ability retrieved successfully",
                content: generateSchema(getAbilityResponseSchema),
              },
            },
          },
        },
      },
      async (ctx) => getAbilityHandler(ctx, options)
    ),
  }
}

export type GenericEndpoints = ReturnType<typeof genericEndpoints>
