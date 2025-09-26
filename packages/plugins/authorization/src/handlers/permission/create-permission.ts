import type { AuthContext, EndpointContext } from "better-auth"
import { getAuthorizationAdapter } from "../../adapter"
import { handleAuthorizationError } from "../../error-handler"
import type { AuthorizationOptions } from "../../types"
import { transformPermissionForStorage, transformPermissionFromStorage } from "../../utils"
import type { CreatePermissionResponse, createPermissionRequestSchema } from "../../validation"

export const createPermissionHandler = async (
  ctx: EndpointContext<
    "/create-permission",
    {
      method: "POST"
      body: ReturnType<typeof createPermissionRequestSchema>
    },
    AuthContext
  >,
  options: AuthorizationOptions
): Promise<CreatePermissionResponse> => {
  try {
    const adapter = getAuthorizationAdapter<AuthorizationOptions>(ctx.context.adapter, options)
    const adapterData = transformPermissionForStorage(ctx.body)
    const result = await adapter.createPermission(adapterData)
    const responseData = transformPermissionFromStorage(result)

    return ctx.json(responseData, { status: 201 })
  } catch (error) {
    return handleAuthorizationError(error, ctx, "createPermission")
  }
}
