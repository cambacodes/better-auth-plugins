import type { AuthContext, EndpointContext } from "better-auth"

import { getAuthorizationAdapter } from "../../adapter"
import { handleAuthorizationError } from "../../error-handler"
import type { AuthorizationOptions, CreatePermissionSetInput } from "../../types"
import type {
  CreatePermissionSetResponse,
  createPermissionSetRequestSchema,
} from "../../validation"

export const createPermissionSetHandler = async (
  ctx: EndpointContext<
    "/create-permission-set",
    {
      method: "POST"
      body: ReturnType<typeof createPermissionSetRequestSchema>
    },
    AuthContext
  >,
  options: AuthorizationOptions
): Promise<CreatePermissionSetResponse> => {
  try {
    const adapter = getAuthorizationAdapter<AuthorizationOptions>(ctx.context.adapter, options)

    const data = ctx.body

    const result = await adapter.createPermissionSet(
      data as CreatePermissionSetInput<AuthorizationOptions>
    )

    return ctx.json(result, { status: 201 })
  } catch (error) {
    return handleAuthorizationError(error, ctx, "createPermissionSet")
  }
}
