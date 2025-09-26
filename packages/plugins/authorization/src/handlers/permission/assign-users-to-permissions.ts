import type { AuthContext, EndpointContext } from "better-auth"
import { getAuthorizationAdapter } from "../../adapter"
import { handleAuthorizationError } from "../../error-handler"
import type { AuthorizationOptions } from "../../types"
import type {
  AssignmentRemovalResponse,
  operationUsersToPermissionRequestSchema,
} from "../../validation"

export const assignUsersToPermissionHandler = async (
  ctx: EndpointContext<
    "/assign-users-to-permission",
    {
      method: "POST"
      body: typeof operationUsersToPermissionRequestSchema
    },
    AuthContext
  >,
  options: AuthorizationOptions
): Promise<AssignmentRemovalResponse> => {
  try {
    const adapter = getAuthorizationAdapter<AuthorizationOptions>(ctx.context.adapter, options)
    await adapter.batchAssignUsersToPermission(ctx.body.permissionId, ctx.body.userIds)

    return ctx.json({
      assignedCount: ctx.body.userIds.length,
      message: "Users assigned to permission successfully",
    })
  } catch (error) {
    return handleAuthorizationError(error, ctx, "assignUsersToPermission")
  }
}
