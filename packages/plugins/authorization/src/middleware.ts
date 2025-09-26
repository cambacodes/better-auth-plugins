import type { Session } from "better-auth"
import {
  APIError,
  createAuthMiddleware,
  getSessionFromCtx,
  sessionMiddleware,
} from "better-auth/api"
import type { Member } from "better-auth/plugins"
import { getAuthorizationAdapter } from "./adapter"
import { MIDDLEWARE_MESSAGES } from "./constants/error-codes"
import { ROUTES } from "./constants/routes"
import type {
  AppAbility,
  AuthorizationContext,
  AuthorizationOptions,
  ProtectedRoutes,
} from "./types"
import { createAbilityFromPermissions, fetchSortedPermissions } from "./utils"

const routeValues = Object.values(ROUTES)

export const createAuthorizationMiddleware = (options: AuthorizationOptions) => {
  return createAuthMiddleware(
    {
      use: [sessionMiddleware],
    },
    async (ctx): Promise<AuthorizationContext> => {
      const session = (await getSessionFromCtx(ctx, { disableCookieCache: true })) as {
        session: Session & {
          activeOrganizationId?: string
        }
        user?: {
          id: string
          [key: string]: unknown
        }
      }

      if (!session?.session?.userId) {
        throw new APIError("UNAUTHORIZED", {
          message: MIDDLEWARE_MESSAGES.INVALID_SESSION,
        })
      }

      const requestUrl = ctx.request?.url as string
      const origin = ctx.context.baseURL
      const route = requestUrl.replace(origin, "")

      const isAuthRoute = routeValues.includes(route as ProtectedRoutes)

      let shouldProtectRoute = false
      let routeCallback: ((can: AppAbility["can"], route: ProtectedRoutes) => boolean) | null = null

      if (options.routeMiddleware && isAuthRoute) {
        if (
          typeof options.routeMiddleware === "object" &&
          "protectedRoutes" in options.routeMiddleware
        ) {
          shouldProtectRoute =
            options.routeMiddleware.protectedRoutes.includes(route as ProtectedRoutes) ??
            options.routeMiddleware.protectedRoutes === "all"
          routeCallback = options.routeMiddleware.callback as (
            can: AppAbility["can"],
            route: ProtectedRoutes
          ) => boolean
        }
      }

      if (!shouldProtectRoute || session.user?.isSuperAdmin) {
        return {
          ability: null,
          member: undefined,
          session,
        }
      }

      const member = session.session.activeOrganizationId
        ? await ctx.context.adapter.findOne<Member>({
            model: "member",
            where: [
              {
                field: "userId",
                value: session.session.userId,
              },
              {
                field: "organizationId",
                value: session.session.activeOrganizationId,
              },
            ],
          })
        : null

      if (options.mode === "member" && !member) {
        throw new APIError("FORBIDDEN", {
          message: MIDDLEWARE_MESSAGES.INVALID_ORGANIZATION_CONTEXT,
        })
      }

      const authorizationAdapter = getAuthorizationAdapter(ctx.context.adapter, options)
      const permissions = await fetchSortedPermissions(
        authorizationAdapter,
        options.mode,
        session.session.userId,
        member?.id
      )

      const evaluationContext = {
        member: member
          ? {
              id: member.id,
              organizationId: member.organizationId,
              role: member.role,
              userId: member.userId,
            }
          : undefined,
        organization: session.session.activeOrganizationId
          ? {
              id: session.session.activeOrganizationId,
            }
          : undefined,
        user: {
          id: session.session.userId,
          ...session.user,
        },
      }

      const ability = createAbilityFromPermissions(permissions, evaluationContext)

      if (routeCallback) {
        try {
          const can = ability.can.bind(ability)
          const authorized = routeCallback(can, route as ProtectedRoutes)

          if (typeof authorized !== "boolean") {
            ctx.context.logger?.warn("Route authorization callback returned non-boolean value", {
              returnType: typeof authorized,
              returnValue: authorized,
              route: route,
              userId: session.session.userId,
            })

            throw new APIError("FORBIDDEN", {
              message: MIDDLEWARE_MESSAGES.ACCESS_DENIED_ROUTE,
            })
          }

          if (!authorized) {
            ctx.context.logger?.warn("Route authorization failed", {
              reason: "callback_returned_false",
              route: route,
              userId: session.session.userId,
            })

            throw new APIError("FORBIDDEN", {
              message: MIDDLEWARE_MESSAGES.ACCESS_DENIED_ROUTE,
            })
          }

          ctx.context.logger?.info("Route authorization succeeded", {
            route: route,
            userId: session.session.userId,
          })
        } catch (error) {
          if (error instanceof APIError) {
            throw error
          }

          ctx.context.logger?.error("Route authorization error", {
            error: error instanceof Error ? error.message : "Unknown error",
            route: route,
            stack: error instanceof Error ? error.stack : undefined,
            userId: session.session.userId,
          })

          throw new APIError("FORBIDDEN", {
            message: MIDDLEWARE_MESSAGES.AUTHORIZATION_FAILED,
          })
        }
      }

      return {
        ability,
        member: member
          ? {
              id: member.id,
              organizationId: member.organizationId,
              role: member.role,
              userId: member.userId,
            }
          : undefined,
        session,
      }
    }
  )
}
