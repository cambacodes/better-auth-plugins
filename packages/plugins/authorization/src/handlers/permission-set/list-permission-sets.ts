import type { AuthContext, EndpointContext } from "better-auth"
import { getAuthorizationAdapter } from "../../adapter"
import { handleAuthorizationError } from "../../error-handler"
import type { AuthorizationOptions } from "../../types"
import type { ListPermissionSetsResponse, listPermissionSetsRequestSchema } from "../../validation"

export const listPermissionSetsHandler = async (
  ctx: EndpointContext<
    "/list-permission-sets",
    {
      method: "GET"
      query: typeof listPermissionSetsRequestSchema
    },
    AuthContext
  >,
  options: AuthorizationOptions
): Promise<ListPermissionSetsResponse> => {
  try {
    const adapter = getAuthorizationAdapter<AuthorizationOptions>(ctx.context.adapter, options)
    const { page: currentPage, limit, search, organizationId, ...include } = ctx.query

    const result = await adapter.getPermissionSetsWith(
      {
        currentPage,
        include,
        limit,
        search,
      },
      organizationId
    )

    return ctx.json({
      data: result.data,
      pagination: result.pagination,
    })
  } catch (error) {
    return handleAuthorizationError(error, ctx, "listPermissionSets")
  }
}
