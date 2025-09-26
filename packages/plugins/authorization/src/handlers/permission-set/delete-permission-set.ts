import type { AuthContext, EndpointContext } from "better-auth"
import { getAuthorizationAdapter } from "../../adapter"
import { handleAuthorizationError } from "../../error-handler"
import type { AuthorizationOptions } from "../../types"
import type { DeletePermissionSetResponse, idSchema } from "../../validation"

export const deletePermissionSetHandler = async (
  ctx: EndpointContext<
    "/delete-permission-set",
    {
      method: "POST"
      body: typeof idSchema
    },
    AuthContext
  >,
  options: AuthorizationOptions
): Promise<DeletePermissionSetResponse> => {
  try {
    const adapter = getAuthorizationAdapter<AuthorizationOptions>(ctx.context.adapter, options)

    await adapter.deletePermissionSet(ctx.body.id)

    return ctx.json({
      message: "Permission set deleted successfully",
    })
  } catch (error) {
    return handleAuthorizationError(error, ctx, "deletePermissionSet")
  }
}
