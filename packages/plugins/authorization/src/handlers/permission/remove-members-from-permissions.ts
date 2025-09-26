import type { AuthContext, EndpointContext } from "better-auth"
import { getAuthorizationAdapter } from "../../adapter"
import { handleAuthorizationError } from "../../error-handler"
import type { AuthorizationOptions } from "../../types"
import type {
  AssignmentRemovalResponse,
  operationMembersToPermissionRequestSchema,
} from "../../validation"

export const removeMembersFromPermissionHandler = async (
  ctx: EndpointContext<
    "/remove-members-from-permission",
    {
      method: "POST"
      body: typeof operationMembersToPermissionRequestSchema
    },
    AuthContext
  >,
  options: AuthorizationOptions
): Promise<AssignmentRemovalResponse> => {
  try {
    const adapter = getAuthorizationAdapter<AuthorizationOptions>(ctx.context.adapter, options)
    await adapter.batchRemoveMembersFromPermission(ctx.body.permissionId, ctx.body.memberIds)

    return ctx.json({
      message: "Members removed from permission successfully",
      removedCount: ctx.body.memberIds.length,
    })
  } catch (error) {
    return handleAuthorizationError(error, ctx, "removeMembersFromPermission")
  }
}
