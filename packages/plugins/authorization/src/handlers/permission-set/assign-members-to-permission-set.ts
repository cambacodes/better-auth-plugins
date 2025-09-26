import type { AuthContext, EndpointContext } from "better-auth"
import { getAuthorizationAdapter } from "../../adapter"
import { handleAuthorizationError } from "../../error-handler"
import type { AuthorizationOptions } from "../../types"
import type {
  AssignmentRemovalResponse,
  operationMembersToPermissionSetRequestSchema,
} from "../../validation"

export const assignMembersToPermissionSetHandler = async (
  ctx: EndpointContext<
    "/assign-members-to-permission-set",
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
    await adapter.batchAssignMembersToPermissionSet(ctx.body.permissionSetId, ctx.body.memberIds)

    return ctx.json({
      assignedCount: ctx.body.memberIds.length,
      message: "Members assigned to permission set successfully",
    })
  } catch (error) {
    return handleAuthorizationError(error, ctx, "assignMembersToPermissionSet")
  }
}
