import { APIError, type AuthContext, type EndpointContext } from "better-auth"
import { getAuthorizationAdapter } from "../../adapter"
import { AUTHORIZATION_ERROR_CODES } from "../../constants/error-codes"
import { handleAuthorizationError } from "../../error-handler"
import type { AuthorizationOptions } from "../../types"
import type {
  UpdatePermissionSetResponse,
  updatePermissionSetRequestSchema,
} from "../../validation"

export const updatePermissionSetHandler = async (
  ctx: EndpointContext<
    "/update-permission-set",
    {
      method: "POST"
      body: ReturnType<typeof updatePermissionSetRequestSchema>
    },
    AuthContext
  >,
  options: AuthorizationOptions
): Promise<UpdatePermissionSetResponse> => {
  try {
    const adapter = getAuthorizationAdapter<AuthorizationOptions>(ctx.context.adapter, options)

    const result = await adapter.updatePermissionSet(ctx.body)

    if (!result) {
      throw new APIError("NOT_FOUND", {
        message: AUTHORIZATION_ERROR_CODES.PERMISSION_SET_NOT_FOUND,
      })
    }

    return ctx.json(result)
  } catch (error) {
    return handleAuthorizationError(error, ctx, "updatePermissionSet")
  }
}
