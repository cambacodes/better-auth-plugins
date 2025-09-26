import { createAuthEndpoint } from "better-auth/api"
import { ROUTES } from "../constants/routes"
import { assignMembersToPermissionHandler } from "../handlers/permission/assign-members-to-permission"
import { assignUsersToPermissionHandler } from "../handlers/permission/assign-users-to-permissions"
import { createPermissionHandler } from "../handlers/permission/create-permission"
import { batchCreatePermissionsHandler } from "../handlers/permission/create-permissions"
import { deletePermissionHandler } from "../handlers/permission/delete-permission"
import { batchDeletePermissionsHandler } from "../handlers/permission/delete-permissions"
import { getPermissionHandler } from "../handlers/permission/get-permission"
import { listPermissionsHandler } from "../handlers/permission/list-permissions"
import { removeMembersFromPermissionHandler } from "../handlers/permission/remove-members-from-permissions"
import { removeUsersFromPermissionHandler } from "../handlers/permission/remove-users-from-permissions"
import { updatePermissionHandler } from "../handlers/permission/update-permission"
import { createAuthorizationMiddleware } from "../middleware"
import type { AuthorizationOptions } from "../types"
import { generateSchema } from "../utils"
import {
  assignmentRemovalSchema,
  batchCreatePermissionsResponseSchema,
  batchDeletePermissionsResponseSchema,
  createPermissionRequestSchema,
  createPermissionsRequestSchema,
  getPermissionRequestSchema,
  idArraySchema,
  idSchema,
  listPermissionsRequestSchema,
  listPermissionsResponseSchema,
  messageResponseSchema,
  operationMembersToPermissionRequestSchema,
  operationUsersToPermissionRequestSchema,
  permissionResponseSchema,
  updatePermissionRequestSchema,
} from "../validation"

export const permissionEndpoints = (options: AuthorizationOptions) => {
  const authorizationMiddleware = createAuthorizationMiddleware(options)

  return {
    /**
     * Assign members to a permission
     *
     * Adds member access to a specific permission, granting them the ability to perform
     * the permission's action subject to role-based access control within the organization.
     *
     * @param options - AuthorizationOptions containing mode, adapter, and other configuration
     * @returns Collection response indicating successful assignment with optional count/message
     */
    addMembersToPermission: createAuthEndpoint(
      ROUTES.ASSIGN_MEMBERS_TO_PERMISSION,
      {
        body: operationMembersToPermissionRequestSchema,
        method: "POST",
        use: [authorizationMiddleware],
        metadata: {
          openapi: {
            requestBody: {
              content: generateSchema(operationMembersToPermissionRequestSchema),
            },
            responses: {
              200: {
                description: "Members assigned to permission successfully",
                content: generateSchema(assignmentRemovalSchema),
              },
            },
          },
        },
      },
      async (ctx) => assignMembersToPermissionHandler(ctx, options)
    ),

    /**
     * Assign users to a permission
     *
     * Grants users direct access to perform a specific permission's action. Users receive
     * the permission regardless of their organizational roles or member status.
     *
     * @param options - AuthorizationOptions containing mode, adapter, and other configuration
     * @returns Collection response indicating successful assignment with optional count/message
     */
    addUsersToPermission: createAuthEndpoint(
      ROUTES.ASSIGN_USERS_TO_PERMISSION,
      {
        body: operationUsersToPermissionRequestSchema,
        method: "POST",
        use: [authorizationMiddleware],
        metadata: {
          openapi: {
            requestBody: {
              content: generateSchema(operationUsersToPermissionRequestSchema),
            },
            responses: {
              200: {
                description: "Users assigned to permission successfully",
                content: generateSchema(assignmentRemovalSchema),
              },
            },
          },
        },
      },
      async (ctx) => assignUsersToPermissionHandler(ctx, options)
    ),
    /**
     * Batch create multiple permissions
     *
     * Creates multiple permissions in a single operation. Useful for bulk permission
     * setup during application initialization or when importing permission structures.
     * Supports organization-specific permissions in multi-tenant mode.
     *
     * @param options - AuthorizationOptions containing mode, adapter, and other configuration
     * @returns Batch operation response with count and array of created permissions
     */
    createPermissions: createAuthEndpoint(
      ROUTES.CREATE_PERMISSIONS,
      {
        body: createPermissionsRequestSchema(options),
        method: "POST",
        use: [authorizationMiddleware],
        metadata: {
          openapi: {
            requestBody: {
              content: generateSchema(createPermissionsRequestSchema(options)),
            },
            responses: {
              201: {
                description: "Permissions created successfully",
                content: generateSchema(batchCreatePermissionsResponseSchema),
              },
            },
          },
        },
      },
      async (ctx) => batchCreatePermissionsHandler(ctx, options)
    ),

    /**
     * Batch delete multiple permissions
     *
     * Removes multiple permissions in a single operation. Useful for cleanup operations
     * or when deprovisioning features. Provides detailed response with count of deleted
     * permissions and their IDs.
     *
     * @param options - AuthorizationOptions containing mode, adapter, and other configuration
     * @returns Batch deletion response with count and array of deleted permission IDs
     */
    batchDeletePermissions: createAuthEndpoint(
      ROUTES.DELETE_PERMISSIONS,
      {
        body: idArraySchema,
        method: "POST",
        use: [authorizationMiddleware],
        metadata: {
          openapi: {
            requestBody: {
              content: generateSchema(idArraySchema),
            },
            responses: {
              200: {
                description: "Permissions deleted successfully",
                content: generateSchema(batchDeletePermissionsResponseSchema),
              },
            },
          },
        },
      },
      async (ctx) => batchDeletePermissionsHandler(ctx, options)
    ),
    /**
     * Create a single permission
     *
     * Creates a new permission with specified action, subject, conditions, and metadata.
     * Supports organization-specific permissions in multi-tenant mode.
     *
     * @param options - AuthorizationOptions containing mode, adapter, and other configuration
     * @returns Single permission response with comprehensive permission details
     */
    createPermission: createAuthEndpoint(
      ROUTES.CREATE_PERMISSION,
      {
        body: createPermissionRequestSchema(options),
        method: "POST",
        use: [authorizationMiddleware],
        metadata: {
          openapi: {
            requestBody: {
              content: generateSchema(createPermissionRequestSchema(options)),
            },
            responses: {
              201: {
                description: "Permission created successfully",
                content: generateSchema(permissionResponseSchema),
              },
            },
          },
        },
      },
      async (ctx) => createPermissionHandler(ctx, options)
    ),
    /**
     * Delete a specific permission
     *
     * Removes a permission by ID. This will revoke the permission from all users
     * and members who were granted access to it.
     *
     * @param options - AuthorizationOptions containing mode, adapter, and other configuration
     * @returns Confirmation message indicating successful deletion
     */
    deletePermission: createAuthEndpoint(
      ROUTES.DELETE_PERMISSION,
      {
        body: idSchema,
        method: "POST",
        use: [authorizationMiddleware],
        metadata: {
          openapi: {
            requestBody: {
              content: generateSchema(idSchema),
            },
            responses: {
              200: {
                description: "Permission deleted successfully",
                content: generateSchema(messageResponseSchema),
              },
            },
          },
        },
      },
      async (ctx) => deletePermissionHandler(ctx, options)
    ),
    /**
     * Retrieve a specific permission
     *
     * Fetches detailed information about a single permission, including its current
     * user and member assignments. Supports optional inclusion of related data.
     *
     * @param options - AuthorizationOptions containing mode, adapter, and other configuration
     * @returns Comprehensive permission details with associated users and members
     */
    getPermission: createAuthEndpoint(
      ROUTES.GET_PERMISSION,
      {
        query: getPermissionRequestSchema,
        method: "GET",
        use: [authorizationMiddleware],
        metadata: {
          openapi: {
            responses: {
              200: {
                description: "Permission retrieved successfully",
                content: generateSchema(permissionResponseSchema),
              },
            },
          },
        },
      },
      async (ctx) => getPermissionHandler(ctx, options)
    ),
    /**
     * List permissions with pagination
     *
     * Retrieves a paginated list of permissions with optional filtering. Includes
     * associated user and member counts, and supports includes for related data.
     *
     * @param options - AuthorizationOptions containing mode, adapter, and other configuration
     * @returns Paginated list of permission objects with metadata
     */
    listPermissions: createAuthEndpoint(
      ROUTES.LIST_PERMISSIONS,
      {
        query: listPermissionsRequestSchema,
        method: "GET",
        use: [authorizationMiddleware],
        metadata: {
          openapi: {
            responses: {
              200: {
                description: "Permissions retrieved successfully",
                content: generateSchema(listPermissionsResponseSchema),
              },
            },
          },
        },
      },
      async (ctx) => listPermissionsHandler(ctx, options)
    ),
    /**
     * Remove members from a permission
     *
     * Revokes member access to a specific permission. Members will lose the ability
     * to perform the permission's action within the organization.
     *
     * @param options - AuthorizationOptions containing mode, adapter, and other configuration
     * @returns Collection response indicating successful removal with optional count/message
     */
    removeMembersFromPermission: createAuthEndpoint(
      ROUTES.REMOVE_MEMBERS_FROM_PERMISSION,
      {
        body: operationMembersToPermissionRequestSchema,
        method: "POST",
        use: [authorizationMiddleware],
        metadata: {
          openapi: {
            requestBody: {
              content: generateSchema(operationMembersToPermissionRequestSchema),
            },
            responses: {
              200: {
                description: "Members removed from permission successfully",
                content: generateSchema(assignmentRemovalSchema),
              },
            },
          },
        },
      },
      async (ctx) => removeMembersFromPermissionHandler(ctx, options)
    ),
    /**
     * Remove users from a permission
     *
     * Revokes direct user access to a specific permission. Users will lose the ability
     * to perform the permission's action, unless they have access through other means.
     *
     * @param options - AuthorizationOptions containing mode, adapter, and other configuration
     * @returns Collection response indicating successful removal with optional count/message
     */
    removeUsersFromPermission: createAuthEndpoint(
      ROUTES.REMOVE_USERS_FROM_PERMISSION,
      {
        body: operationUsersToPermissionRequestSchema,
        method: "POST",
        use: [authorizationMiddleware],
        metadata: {
          openapi: {
            requestBody: {
              content: generateSchema(operationUsersToPermissionRequestSchema),
            },
            responses: {
              200: {
                description: "Users removed from permission successfully",
                content: generateSchema(assignmentRemovalSchema),
              },
            },
          },
        },
      },
      async (ctx) => removeUsersFromPermissionHandler(ctx, options)
    ),
    /**
     * Update an existing permission
     *
     * Modifies permission properties such as action, subject, conditions, or metadata.
     * All associated user and member assignments remain unchanged.
     *
     * @param options - AuthorizationOptions containing mode, adapter, and other configuration
     * @returns Updated permission response with comprehensive permission details
     */
    updatePermission: createAuthEndpoint(
      ROUTES.UPDATE_PERMISSION,
      {
        body: updatePermissionRequestSchema(options),
        method: "POST",
        use: [authorizationMiddleware],
        metadata: {
          openapi: {
            requestBody: {
              content: generateSchema(updatePermissionRequestSchema(options)),
            },
            responses: {
              200: {
                description: "Permission updated successfully",
                content: generateSchema(permissionResponseSchema),
              },
            },
          },
        },
      },
      async (ctx) => updatePermissionHandler(ctx, options)
    ),
  }
}

export type PermissionEndpoints = ReturnType<typeof permissionEndpoints>
