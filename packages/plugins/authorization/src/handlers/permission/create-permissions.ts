import type { AuthContext, EndpointContext } from "better-auth"
import { getAuthorizationAdapter } from "../../adapter"
import { handleAuthorizationError } from "../../error-handler"
import type { AuthorizationOptions } from "../../types"
import { transformPermissionForStorage, transformPermissionFromStorage } from "../../utils"
import type {
  BatchCreatePermissionsResponse,
  createPermissionsRequestSchema,
} from "../../validation"

export const batchCreatePermissionsHandler = async (
  ctx: EndpointContext<
    "/create-permissions",
    {
      method: "POST"
      body: ReturnType<typeof createPermissionsRequestSchema>
    },
    AuthContext
  >,
  options: AuthorizationOptions
): Promise<BatchCreatePermissionsResponse> => {
  try {
    const adapter = getAuthorizationAdapter<AuthorizationOptions>(ctx.context.adapter, options)

    const permissions = ctx.body.map((permission) =>
      transformPermissionForStorage({
        ...permission,
        createdAt: new Date(),
      })
    )

    const result = await adapter.batchCreatePermissions(permissions)
    const responseData = result.map((permission) => transformPermissionFromStorage(permission))

    return ctx.json(
      {
        count: responseData.length,
        results: responseData,
      },
      { status: 201 }
    )
  } catch (error) {
    return handleAuthorizationError(error, ctx, "batchCreatePermissions")
  }
}
