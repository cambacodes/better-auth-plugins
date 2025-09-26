import type { AuthContext, EndpointContext } from "better-auth"
import { getAuthorizationAdapter } from "../../adapter"
import { AuthorizationError, handleAuthorizationError } from "../../error-handler"
import type { AuthorizationOptions } from "../../types"
import type { getPermissionRequestSchema, PermissionSetResponse } from "../../validation"

export const getPermissionSetHandler = async (
  ctx: EndpointContext<
    "/get-permission-set",
    {
      method: "GET"
      query: typeof getPermissionRequestSchema
    },
    AuthContext
  >,
  options: AuthorizationOptions
): Promise<PermissionSetResponse> => {
  try {
    const adapter = getAuthorizationAdapter<AuthorizationOptions>(ctx.context.adapter, options)

    const { id, ...include } = ctx.query

    const result = await adapter.getPermissionSetWith(id, include)

    if (!result) {
      throw new AuthorizationError("PERMISSION_SET_NOT_FOUND")
    }

    return ctx.json(result)
  } catch (error) {
    return handleAuthorizationError(error, ctx, "getPermissionSet")
  }
}
