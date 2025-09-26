import type { AuthContext, EndpointContext } from "better-auth"
import { getAuthorizationAdapter } from "../../adapter"
import { AuthorizationError, handleAuthorizationError } from "../../error-handler"
import type { AuthorizationOptions } from "../../types"
import { transformPermissionFromStorage } from "../../utils"
import type { GetPermissionResponse, getPermissionRequestSchema } from "../../validation"

export const getPermissionHandler = async (
  ctx: EndpointContext<
    "/get-permission",
    {
      method: "GET"
      query: typeof getPermissionRequestSchema
    },
    AuthContext
  >,
  options: AuthorizationOptions
): Promise<GetPermissionResponse> => {
  try {
    const adapter = getAuthorizationAdapter<AuthorizationOptions>(ctx.context.adapter, options)
    const { id, ...include } = ctx.query

    const result = await adapter.getPermissionWith(id, include)

    if (!result) {
      throw new AuthorizationError("PERMISSION_NOT_FOUND")
    }

    const responseData = transformPermissionFromStorage(result)

    return ctx.json(responseData)
  } catch (error) {
    return handleAuthorizationError(error, ctx, "getPermission")
  }
}
