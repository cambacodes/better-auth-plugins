import { createAuthEndpoint } from "better-auth/api"
import { ROUTES } from "../constants/routes"
import { assignMembersToPermissionSetHandler } from "../handlers/permission-set/assign-members-to-permission-set"
import { assignPermissionsToPermissionSetHandler } from "../handlers/permission-set/assign-permissions-to-permission-set"
import { assignUsersToPermissionSetHandler } from "../handlers/permission-set/assign-users-to-permission-set"
import { createPermissionSetHandler } from "../handlers/permission-set/create-permission-set"
import { batchCreatePermissionSetsHandler } from "../handlers/permission-set/create-permission-sets"
import { deletePermissionSetHandler } from "../handlers/permission-set/delete-permission-set"
import { batchDeletePermissionSetsHandler } from "../handlers/permission-set/delete-permission-sets"
import { getPermissionSetHandler } from "../handlers/permission-set/get-permission-set"
import { listPermissionSetsHandler } from "../handlers/permission-set/list-permission-sets"
import { removeMembersFromPermissionSetHandler } from "../handlers/permission-set/remove-members-from-permission-set"
import { removePermissionsFromPermissionSetHandler } from "../handlers/permission-set/remove-permissions-from-permission-set"
import { removeUsersFromPermissionSetHandler } from "../handlers/permission-set/remove-users-from-permission-set"
import { updatePermissionSetHandler } from "../handlers/permission-set/update-permission-set"
import { createAuthorizationMiddleware } from "../middleware"
import type { AuthorizationOptions } from "../types"
import { generateSchema } from "../utils"
import {
  assignmentRemovalSchema,
  batchCreatePermissionSetsResponseSchema,
  batchDeletePermissionSetsResponseSchema,
  createPermissionSetRequestSchema,
  createPermissionSetsRequestSchema,
  getPermissionSetRequestSchema,
  idArraySchema,
  idSchema,
  listPermissionSetsRequestSchema,
  listPermissionSetsResponseSchema,
  messageResponseSchema,
  operationMembersToPermissionSetRequestSchema,
  operationPermissionsToPermissionSetRequestSchema,
  operationUsersToPermissionSetRequestSchema,
  permissionSetResponseSchema,
  updatePermissionSetRequestSchema,
} from "../validation"

export const permissionSetEndpoints = (options: AuthorizationOptions) => {
  const authorizationMiddleware = createAuthorizationMiddleware(options)

  return {
    /**
     * Assign members to a permission set
     *
     * Grants organization members access to all permissions within a permission set.
     * Members receive permissions through their organizational role assignments.
     *
     * @param options - AuthorizationOptions containing mode, adapter, and other configuration
     * @returns Collection response indicating successful assignment with optional count/message
     */
    assignMembersToPermissionSet: createAuthEndpoint(
      ROUTES.ASSIGN_MEMBERS_TO_PERMISSION_SET,
      {
        body: operationMembersToPermissionSetRequestSchema,
        method: "POST",
        use: [authorizationMiddleware],
        metadata: {
          openapi: {
            requestBody: {
              content: generateSchema(operationMembersToPermissionSetRequestSchema),
            },
            responses: {
              200: {
                description: "Members assigned successfully",
                content: generateSchema(assignmentRemovalSchema),
              },
            },
          },
        },
      },
      async (ctx) => assignMembersToPermissionSetHandler(ctx, options)
    ),

    /**
     * Assign permissions to a permission set
     *
     * Adds individual permissions to an existing permission set, expanding the set's
     * scope. All users assigned to the permission set will gain access to the newly added permissions.
     *
     * @param options - AuthorizationOptions containing mode, adapter, and other configuration
     * @returns Collection response indicating successful assignment with optional count/message
     */
    assignPermissionsToPermissionSet: createAuthEndpoint(
      ROUTES.ASSIGN_PERMISSIONS_TO_PERMISSION_SET,
      {
        body: operationPermissionsToPermissionSetRequestSchema,
        method: "POST",
        use: [authorizationMiddleware],
        metadata: {
          openapi: {
            requestBody: {
              content: generateSchema(operationPermissionsToPermissionSetRequestSchema),
            },
            responses: {
              200: {
                description: "Permissions assigned successfully",
                content: generateSchema(assignmentRemovalSchema),
              },
            },
          },
        },
      },
      async (ctx) => assignPermissionsToPermissionSetHandler(ctx, options)
    ),

    /**
     * Assign users to a permission set
     *
     * Grants users direct access to all permissions within a permission set. Users receive
     * comprehensive access rights to perform any action covered by the permission set.
     *
     * @param options - AuthorizationOptions containing mode, adapter, and other configuration
     * @returns Collection response indicating successful assignment with optional count/message
     */
    assignUsersToPermissionSet: createAuthEndpoint(
      ROUTES.ASSIGN_USERS_TO_PERMISSION_SET,
      {
        body: operationUsersToPermissionSetRequestSchema,
        method: "POST",
        use: [authorizationMiddleware],
        metadata: {
          openapi: {
            requestBody: {
              content: generateSchema(operationUsersToPermissionSetRequestSchema),
            },
            responses: {
              200: {
                description: "Users assigned successfully",
                content: generateSchema(assignmentRemovalSchema),
              },
            },
          },
        },
      },
      async (ctx) => assignUsersToPermissionSetHandler(ctx, options)
    ),

    /**
     * Create a single permission set
     *
     * Creates a new permission set with specified name, description, and configuration.
     * Permission sets group related permissions for easier role-based access management.
     *
     * @param options - AuthorizationOptions containing mode, adapter, and other configuration
     * @returns Comprehensive permission set details with associated permissions and assignments
     */
    createPermissionSet: createAuthEndpoint(
      ROUTES.CREATE_PERMISSION_SET,
      {
        body: createPermissionSetRequestSchema(options),
        method: "POST",
        use: [authorizationMiddleware],
        metadata: {
          openapi: {
            requestBody: {
              content: generateSchema(createPermissionSetRequestSchema(options)),
            },
            responses: {
              201: {
                description: "Permission set created successfully",
                content: generateSchema(permissionSetResponseSchema),
              },
            },
          },
        },
      },
      async (ctx) => createPermissionSetHandler(ctx, options)
    ),

    /**
     * Batch create multiple permission sets
     *
     * Creates multiple permission sets in a single operation for bulk setup.
     * Useful for system initialization or when deploying predefined role structures.
     *
     * @param options - AuthorizationOptions containing mode, adapter, and other configuration
     * @returns Batch operation response with count and array of created permission sets
     */
    createPermissionSets: createAuthEndpoint(
      ROUTES.CREATE_PERMISSION_SETS,
      {
        body: createPermissionSetsRequestSchema(options),
        method: "POST",
        use: [authorizationMiddleware],
        metadata: {
          openapi: {
            requestBody: {
              content: generateSchema(createPermissionSetsRequestSchema(options)),
            },
            responses: {
              201: {
                description: "Permission sets created successfully",
                content: generateSchema(batchCreatePermissionSetsResponseSchema),
              },
            },
          },
        },
      },
      async (ctx) => batchCreatePermissionSetsHandler(ctx, options)
    ),

    /**
     * Delete a specific permission set
     *
     * Removes a permission set by ID. This will revoke all permissions granted through
     * the set from all assigned users and members.
     *
     * @param options - AuthorizationOptions containing mode, adapter, and other configuration
     * @returns Confirmation message indicating successful deletion
     */
    deletePermissionSet: createAuthEndpoint(
      ROUTES.DELETE_PERMISSION_SET,
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
                description: "Permission set deleted successfully",
                content: generateSchema(messageResponseSchema),
              },
            },
          },
        },
      },
      async (ctx) => deletePermissionSetHandler(ctx, options)
    ),

    /**
     * Batch delete multiple permission sets
     *
     * Removes multiple permission sets in a single operation. This is useful for
     * cleanup operations or when restructuring access control systems.
     *
     * @param options - AuthorizationOptions containing mode, adapter, and other configuration
     * @returns Batch deletion response with count and array of deleted permission set IDs
     */
    deletePermissionSets: createAuthEndpoint(
      ROUTES.DELETE_PERMISSION_SETS,
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
                description: "Permission sets deleted successfully",
                content: generateSchema(batchDeletePermissionSetsResponseSchema),
              },
            },
          },
        },
      },
      async (ctx) => batchDeletePermissionSetsHandler(ctx, options)
    ),

    /**
     * Retrieve a specific permission set
     *
     * Fetches detailed information about a single permission set, including its
     * associated permissions, assigned users, and member assignments.
     *
     * @param options - AuthorizationOptions containing mode, adapter, and other configuration
     * @returns Comprehensive permission set details with all related entities and associations
     */
    getPermissionSet: createAuthEndpoint(
      ROUTES.GET_PERMISSION_SET,
      {
        query: getPermissionSetRequestSchema,
        method: "GET",
        use: [authorizationMiddleware],
        metadata: {
          openapi: {
            responses: {
              200: {
                description: "Permission set retrieved successfully",
                content: generateSchema(permissionSetResponseSchema),
              },
            },
          },
        },
      },
      async (ctx) => getPermissionSetHandler(ctx, options)
    ),
    /**
     * List permission sets with pagination
     *
     * Retrieves a paginated list of permission sets with optional filtering.
     * Includes assignment counts for users and members, and supports includes for related data.
     *
     * @param options - AuthorizationOptions containing mode, adapter, and other configuration
     * @returns Paginated list of permission sets with metadata and assignment counts
     */
    listPermissionSets: createAuthEndpoint(
      ROUTES.LIST_PERMISSION_SETS,
      {
        query: listPermissionSetsRequestSchema,
        method: "GET",
        use: [authorizationMiddleware],
        metadata: {
          openapi: {
            responses: {
              200: {
                description: "Permission sets retrieved successfully",
                content: generateSchema(listPermissionSetsResponseSchema),
              },
            },
          },
        },
      },
      async (ctx) => listPermissionSetsHandler(ctx, options)
    ),

    /**
     * Remove members from a permission set
     *
     * Revokes organization members' access to all permissions within a permission set.
     * Members will lose permissions granted through their organizational roles.
     *
     * @param options - AuthorizationOptions containing mode, adapter, and other configuration
     * @returns Collection response indicating successful removal with optional count/message
     */
    removeMembersFromPermissionSet: createAuthEndpoint(
      ROUTES.REMOVE_MEMBERS_FROM_PERMISSION_SET,
      {
        body: operationMembersToPermissionSetRequestSchema,
        method: "POST",
        use: [authorizationMiddleware],
        metadata: {
          openapi: {
            requestBody: {
              content: generateSchema(operationMembersToPermissionSetRequestSchema),
            },
            responses: {
              200: {
                description: "Members removed successfully",
                content: generateSchema(assignmentRemovalSchema),
              },
            },
          },
        },
      },
      async (ctx) => removeMembersFromPermissionSetHandler(ctx, options)
    ),

    /**
     * Remove permissions from a permission set
     *
     * Removes individual permissions from an existing permission set, contracting the set's
     * scope. All users assigned to the permission set will lose access to the removed permissions.
     *
     * @param options - AuthorizationOptions containing mode, adapter, and other configuration
     * @returns Collection response indicating successful removal with optional count/message
     */
    removePermissionsFromPermissionSet: createAuthEndpoint(
      ROUTES.REMOVE_PERMISSIONS_FROM_PERMISSION_SET,
      {
        body: operationPermissionsToPermissionSetRequestSchema,
        method: "POST",
        use: [authorizationMiddleware],
        metadata: {
          openapi: {
            requestBody: {
              content: generateSchema(operationPermissionsToPermissionSetRequestSchema),
            },
            responses: {
              200: {
                description: "Permissions removed successfully",
                content: generateSchema(assignmentRemovalSchema),
              },
            },
          },
        },
      },
      async (ctx) => removePermissionsFromPermissionSetHandler(ctx, options)
    ),

    /**
     * Remove users from a permission set
     *
     * Revokes users' direct access to all permissions within a permission set.
     * Users will lose comprehensive access rights granted through this set.
     *
     * @param options - AuthorizationOptions containing mode, adapter, and other configuration
     * @returns Collection response indicating successful removal with optional count/message
     */
    removeUsersFromPermissionSet: createAuthEndpoint(
      ROUTES.REMOVE_USERS_FROM_PERMISSION_SET,
      {
        body: operationUsersToPermissionSetRequestSchema,
        method: "POST",
        use: [authorizationMiddleware],
        metadata: {
          openapi: {
            requestBody: {
              content: generateSchema(operationUsersToPermissionSetRequestSchema),
            },
            responses: {
              200: {
                description: "Users removed successfully",
                content: generateSchema(assignmentRemovalSchema),
              },
            },
          },
        },
      },
      async (ctx) => removeUsersFromPermissionSetHandler(ctx, options)
    ),

    /**
     * Update an existing permission set
     *
     * Modifies permission set properties such as name, description, or metadata.
     * All associated permission mappings and user assignments remain unchanged.
     *
     * @param options - AuthorizationOptions containing mode, adapter, and other configuration
     * @returns Updated permission set response with comprehensive permission set details
     */
    updatePermissionSet: createAuthEndpoint(
      ROUTES.UPDATE_PERMISSION_SET,
      {
        body: updatePermissionSetRequestSchema(options),
        method: "POST",
        use: [authorizationMiddleware],
        metadata: {
          openapi: {
            requestBody: {
              content: generateSchema(updatePermissionSetRequestSchema(options)),
            },
            responses: {
              200: {
                description: "Permission set updated successfully",
                content: generateSchema(permissionSetResponseSchema),
              },
            },
          },
        },
      },
      async (ctx) => updatePermissionSetHandler(ctx, options)
    ),
  }
}

export type PermissionSetEndpoints = ReturnType<typeof permissionSetEndpoints>
