import type { AuthContext, EndpointContext } from "better-auth"
import { getAuthorizationAdapter } from "../../adapter"
import { handleAuthorizationError } from "../../error-handler"
import type { AuthorizationOptions } from "../../types"
import type {
  AssignmentRemovalResponse,
  operationUsersToPermissionRequestSchema,
} from "../../validation"

export const removeUsersFromPermissionHandler = async (
  ctx: EndpointContext<
    "/remove-users-from-permission",
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
    await adapter.batchRemoveUsersFromPermission(ctx.body.permissionId, ctx.body.userIds)

    return ctx.json({
      message: "Users removed from permission successfully",
      removedCount: ctx.body.userIds.length,
    })
  } catch (error) {
    return handleAuthorizationError(error, ctx, "removeUsersFromPermission")
  }
}
