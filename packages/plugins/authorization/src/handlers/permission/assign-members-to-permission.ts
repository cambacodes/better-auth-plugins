import type { AuthContext, EndpointContext } from "better-auth"
import { getAuthorizationAdapter } from "../../adapter"
import { handleAuthorizationError } from "../../error-handler"
import type { AuthorizationOptions } from "../../types"
import type {
  AssignmentRemovalResponse,
  operationMembersToPermissionRequestSchema,
} from "../../validation"

export const assignMembersToPermissionHandler = async (
  ctx: EndpointContext<
    "/assign-members-to-permission",
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
    await adapter.batchAssignMembersToPermission(ctx.body.permissionId, ctx.body.memberIds)

    return ctx.json({
      assignedCount: ctx.body.memberIds.length,
      message: "Members assigned to permission successfully",
    })
  } catch (error) {
    return handleAuthorizationError(error, ctx, "assignMembersToPermission")
  }
}
