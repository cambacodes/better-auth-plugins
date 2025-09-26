import type { AuthContext, EndpointContext } from "better-auth"
import { getAuthorizationAdapter } from "../../adapter"
import { handleAuthorizationError } from "../../error-handler"
import type { AuthorizationOptions } from "../../types"
import type {
  AssignmentRemovalResponse,
  operationPermissionsToPermissionSetRequestSchema,
} from "../../validation"

export const assignPermissionsToPermissionSetHandler = async (
  ctx: EndpointContext<
    "/assign-permissions-to-permission-set",
    {
      method: "POST"
      body: typeof operationPermissionsToPermissionSetRequestSchema
    },
    AuthContext
  >,
  options: AuthorizationOptions
): Promise<AssignmentRemovalResponse> => {
  try {
    const adapter = getAuthorizationAdapter<AuthorizationOptions>(ctx.context.adapter, options)
    await adapter.batchAssignPermissionsToPermissionSet(
      ctx.body.permissionSetId,
      ctx.body.permissionIds
    )

    return ctx.json({
      assignedCount: ctx.body.permissionIds.length,
      message: "Permissions assigned to permission set successfully",
    })
  } catch (error) {
    return handleAuthorizationError(error, ctx, "assignPermissionsToPermissionSet")
  }
}
