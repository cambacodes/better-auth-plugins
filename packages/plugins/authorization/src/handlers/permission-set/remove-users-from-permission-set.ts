import type { AuthContext, EndpointContext } from "better-auth"
import { getAuthorizationAdapter } from "../../adapter"
import { handleAuthorizationError } from "../../error-handler"
import type { AuthorizationOptions } from "../../types"
import type {
  AssignmentRemovalResponse,
  operationUsersToPermissionSetRequestSchema,
} from "../../validation"

export const removeUsersFromPermissionSetHandler = async (
  ctx: EndpointContext<
    "/remove-users-from-permission-set",
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
    await adapter.batchRemoveUsersFromPermissionSet(ctx.body.permissionSetId, ctx.body.userIds)

    return ctx.json({
      message: "Users removed from permission set successfully",
      removedCount: ctx.body.userIds.length,
    })
  } catch (error) {
    return handleAuthorizationError(error, ctx, "removeUsersFromPermissionSet")
  }
}
