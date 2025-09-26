import type { AuthContext, EndpointContext } from "better-auth"
import { getAuthorizationAdapter } from "../../adapter"
import { handleAuthorizationError } from "../../error-handler"
import type { AuthorizationOptions } from "../../types"
import { transformPermissionFromStorage } from "../../utils"
import type { ListPermissionsResponse, listPermissionsRequestSchema } from "../../validation"

export const listPermissionsHandler = async (
  ctx: EndpointContext<
    "/list-permissions",
    {
      method: "GET"
      query: typeof listPermissionsRequestSchema
    },
    AuthContext
  >,
  options: AuthorizationOptions
): Promise<ListPermissionsResponse> => {
  try {
    const adapter = getAuthorizationAdapter<AuthorizationOptions>(ctx.context.adapter, options)
    const { limit, page: currentPage, organizationId, search, ...include } = ctx.query

    const result = await adapter.getPermissionsWith(
      {
        currentPage,
        include,
        limit,
        search,
      },
      organizationId
    )

    const transformedPermissions = result.data.map((permission) =>
      transformPermissionFromStorage(permission)
    )

    return ctx.json({
      data: transformedPermissions,
      pagination: result.pagination,
    })
  } catch (error) {
    return handleAuthorizationError(error, ctx, "listPermissions")
  }
}
