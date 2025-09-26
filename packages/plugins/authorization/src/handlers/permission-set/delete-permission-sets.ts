import type { AuthContext, EndpointContext } from "better-auth"
import { getAuthorizationAdapter } from "../../adapter"
import { handleAuthorizationError } from "../../error-handler"
import type { AuthorizationOptions } from "../../types"
import type { BatchDeletePermissionSetsResponse, idArraySchema } from "../../validation"

export const batchDeletePermissionSetsHandler = async (
  ctx: EndpointContext<
    "/delete-permission-sets",
    {
      method: "POST"
      body: typeof idArraySchema
    },
    AuthContext
  >,
  options: AuthorizationOptions
): Promise<BatchDeletePermissionSetsResponse> => {
  try {
    const adapter = getAuthorizationAdapter<AuthorizationOptions>(ctx.context.adapter, options)

    const result = await adapter.batchDeletePermissionSets(ctx.body.ids)

    return ctx.json({
      count: result,
      deletedIds: ctx.body.ids,
    })
  } catch (error) {
    return handleAuthorizationError(error, ctx, "batchDeletePermissionSet")
  }
}
