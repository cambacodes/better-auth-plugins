import { APIError, type AuthContext, type EndpointContext } from "better-auth"
import { getAuthorizationAdapter } from "../../adapter"
import { AUTHORIZATION_ERROR_CODES } from "../../constants/error-codes"
import { handleAuthorizationError } from "../../error-handler"
import type { AuthorizationOptions } from "../../types"
import { transformPermissionForStorage, transformPermissionFromStorage } from "../../utils"
import type { UpdatePermissionResponse, updatePermissionRequestSchema } from "../../validation"

export const updatePermissionHandler = async (
  ctx: EndpointContext<
    "/update-permission",
    {
      method: "POST"
      body: ReturnType<typeof updatePermissionRequestSchema>
    },
    AuthContext
  >,
  options: AuthorizationOptions
): Promise<UpdatePermissionResponse> => {
  try {
    const adapter = getAuthorizationAdapter<AuthorizationOptions>(ctx.context.adapter, options)

    const data = transformPermissionForStorage(ctx.body)
    const result = await adapter.updatePermission(data)

    if (!result) {
      throw new APIError("NOT_FOUND", { message: AUTHORIZATION_ERROR_CODES.PERMISSION_NOT_FOUND })
    }

    const responseData = transformPermissionFromStorage(result)

    return ctx.json(responseData)
  } catch (error) {
    return handleAuthorizationError(error, ctx, "updatePermission")
  }
}
