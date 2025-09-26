import type { AuthContext, EndpointContext } from "better-auth"
import { getAuthorizationAdapter } from "../../adapter"
import { handleAuthorizationError } from "../../error-handler"
import type { AuthorizationOptions } from "../../types"
import type {
  AssignmentRemovalResponse,
  operationMembersToPermissionSetRequestSchema,
} from "../../validation"

export const removeMembersFromPermissionSetHandler = async (
  ctx: EndpointContext<
    "/remove-members-from-permission-set",
    {
      method: "POST"
      body: typeof operationMembersToPermissionSetRequestSchema
    },
    AuthContext
  >,
  options: AuthorizationOptions
): Promise<AssignmentRemovalResponse> => {
  try {
    const adapter = getAuthorizationAdapter<AuthorizationOptions>(ctx.context.adapter, options)
    await adapter.batchRemoveMembersFromPermissionSet(ctx.body.permissionSetId, ctx.body.memberIds)

    return ctx.json({
      message: "Members removed from permission set successfully",
      removedCount: ctx.body.memberIds.length,
    })
  } catch (error) {
    return handleAuthorizationError(error, ctx, "removeMembersFromPermissionSet")
  }
}
