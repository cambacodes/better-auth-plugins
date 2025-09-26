import type { AuthContext, EndpointContext } from "better-auth"
import type { sessionMiddleware } from "better-auth/api"
import type { Member } from "better-auth/plugins"
import { getAuthorizationAdapter } from "../../adapter"
import { handleAuthorizationError } from "../../error-handler"
import type { AuthorizationOptions } from "../../types"
import { fetchSortedPermissions } from "../../utils"
import type { GetAbilityResponse } from "../../validation"

export const getAbilityHandler = async (
  ctx: EndpointContext<
    "/get-ability",
    {
      method: "POST"
      use: [typeof sessionMiddleware]
    },
    AuthContext
  >,
  options: AuthorizationOptions
): Promise<GetAbilityResponse> => {
  try {
    const userId = ctx.context.session.user.id
    const organizationId = ctx.context.session.session.activeOrganizationId
    const member = organizationId
      ? await ctx.context.adapter.findOne<Member>({
          model: "member",
          where: [
            {
              field: "userId",
              value: userId,
            },
            {
              field: "organizationId",
              value: organizationId,
            },
          ],
        })
      : null

    const adapter = getAuthorizationAdapter(ctx.context.adapter, options)

    const sortedPermissions = await fetchSortedPermissions(
      adapter,
      options.mode,
      userId,
      member?.id
    )
    return ctx.json(sortedPermissions)
  } catch (error) {
    return handleAuthorizationError(error, ctx, "checkPermission")
  }
}
