import type { AuthContext, EndpointContext } from "better-auth"
import { getAuthorizationAdapter } from "../../adapter"
import { handleAuthorizationError } from "../../error-handler"
import type { AuthorizationOptions } from "../../types"
import type {
  AssignmentRemovalResponse,
  operationPermissionsToPermissionSetRequestSchema,
} from "../../validation"

export const removePermissionsFromPermissionSetHandler = async (
  ctx: EndpointContext<
    "/remove-permissions-from-permission-set",
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
    await adapter.batchRemovePermissionsFromPermissionSet(
      ctx.body.permissionSetId,
      ctx.body.permissionIds
    )

    return ctx.json({
      message: "Permissions removed from permission set successfully",
      removedCount: ctx.body.permissionIds.length,
    })
  } catch (error) {
    return handleAuthorizationError(error, ctx, "removePermissionsFromPermissionSet")
  }
}
