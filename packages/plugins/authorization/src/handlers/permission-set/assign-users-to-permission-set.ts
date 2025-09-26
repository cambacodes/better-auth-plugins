import type { AuthContext, EndpointContext } from "better-auth"
import { getAuthorizationAdapter } from "../../adapter"
import { handleAuthorizationError } from "../../error-handler"
import type { AuthorizationOptions } from "../../types"
import type {
  AssignmentRemovalResponse,
  operationUsersToPermissionSetRequestSchema,
} from "../../validation"

export const assignUsersToPermissionSetHandler = async (
  ctx: EndpointContext<
    "/assign-users-to-permission-set",
    {
      method: "POST"
      body: typeof operationUsersToPermissionSetRequestSchema
    },
    AuthContext
  >,
  options: AuthorizationOptions
): Promise<AssignmentRemovalResponse> => {
  try {
    const adapter = getAuthorizationAdapter<AuthorizationOptions>(ctx.context.adapter, options)
    await adapter.batchAssignUsersToPermissionSet(ctx.body.permissionSetId, ctx.body.userIds)

    return ctx.json({
      assignedCount: ctx.body.userIds.length,
      message: "Users assigned to permission set successfully",
    })
  } catch (error) {
    return handleAuthorizationError(error, ctx, "assignUsersToPermissionSet")
  }
}
