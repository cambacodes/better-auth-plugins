import type { AuthContext, EndpointContext } from "better-auth"
import { getAuthorizationAdapter } from "../../adapter"
import { handleAuthorizationError } from "../../error-handler"
import type { AuthorizationOptions } from "../../types"
import type { BatchDeletePermissionsResponse, idArraySchema } from "../../validation"

export const batchDeletePermissionsHandler = async (
  ctx: EndpointContext<
    "/delete-permissions",
    {
      method: "POST"
      body: typeof idArraySchema
    },
    AuthContext
  >,
  options: AuthorizationOptions
): Promise<BatchDeletePermissionsResponse> => {
  try {
    const adapter = getAuthorizationAdapter<AuthorizationOptions>(ctx.context.adapter, options)
    const deletedCount = await adapter.batchDeletePermissions(ctx.body.ids)

    return ctx.json({
      count: deletedCount,
      deletedIds: ctx.body.ids,
    })
  } catch (error) {
    return handleAuthorizationError(error, ctx, "batchDeletePermissions")
  }
}
