import { APIError, type AuthContext, type EndpointContext } from "better-auth"
import { getAuthorizationAdapter } from "../../adapter"
import { AUTHORIZATION_ERROR_CODES } from "../../constants/error-codes"
import { handleAuthorizationError } from "../../error-handler"
import type { AuthorizationOptions } from "../../types"
import type { DeletePermissionResponse, idSchema } from "../../validation"

export const deletePermissionHandler = async (
  ctx: EndpointContext<
    "/delete-permission",
    {
      method: "POST"
      body: typeof idSchema
    },
    AuthContext
  >,
  options: AuthorizationOptions
): Promise<DeletePermissionResponse> => {
  const adapter = getAuthorizationAdapter<AuthorizationOptions>(ctx.context.adapter, options)

  try {
    const existingPermission = await adapter.getPermissionById(ctx.body.id)

    if (!existingPermission) {
      throw new APIError("NOT_FOUND", {
        message: AUTHORIZATION_ERROR_CODES.PERMISSION_NOT_FOUND,
      })
    }
    await adapter.deletePermission(ctx.body.id)

    return ctx.json({
      message: "Permission deleted successfully",
    })
  } catch (error) {
    return handleAuthorizationError(error, ctx, "deletePermission")
  }
}
