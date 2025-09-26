import { logger } from "better-auth"
import { APIError } from "better-auth/api"
import type { Adapter } from "better-auth/types"
import { AUTHORIZATION_ERROR_CODES } from "../constants/error-codes"
import type { AuthorizationOptions, CaslPermission, Permission } from "../types"
import { convertDbPermissionToRule } from "../utils"

export const createGenericAdapter = <const O extends AuthorizationOptions>(
  adapter: Adapter | Omit<Adapter, "transaction">,
  _options: O
) => {
  const caslAdapter = {
    getMemberPermissionSets: async (
      memberId: string
    ): Promise<{ memberId: string; permissionSetId: string }[]> => {
      try {
        return await adapter.findMany<{ memberId: string; permissionSetId: string }>({
          model: "memberPermissionSet",
          where: [{ field: "memberId", value: memberId }],
        })
      } catch (error) {
        logger.error("Failed to get member permission sets", { memberId, error })
        throw new APIError("INTERNAL_SERVER_ERROR", {
          message: AUTHORIZATION_ERROR_CODES.DATABASE_ERROR,
        })
      }
    },

    getMemberPermissions: async (memberId: string): Promise<CaslPermission[]> => {
      try {
        const memberPermissions = await adapter.findMany<{ permissionId: string }>({
          model: "memberPermission",
          where: [{ field: "memberId", value: memberId }],
        })

        if (memberPermissions.length === 0) return []

        const permissionIds = memberPermissions.map((up) => up.permissionId)

        const permissions = await adapter.findMany<Permission<O>>({
          model: "permission",
          where: [
            {
              field: "id",
              operator: "in",
              value: permissionIds,
            },
            {
              connector: "OR",
              field: "expiresAt",
              value: null,
            },
            {
              connector: "OR",
              field: "expiresAt",
              operator: "gt",
              value: new Date(),
            },
          ],
        })
        return permissions.map((permission) =>
          convertDbPermissionToRule(permission, "member_direct")
        )
      } catch (error) {
        logger.error("Failed to get member permissions", { memberId, error })
        throw new APIError("INTERNAL_SERVER_ERROR", {
          message: AUTHORIZATION_ERROR_CODES.DATABASE_ERROR,
        })
      }
    },

    getUserPermissionSets: async (
      userId: string
    ): Promise<{ userId: string; permissionSetId: string }[]> => {
      try {
        return await adapter.findMany<{ userId: string; permissionSetId: string }>({
          model: "userPermissionSet",
          where: [{ field: "userId", value: userId }],
        })
      } catch (error) {
        logger.error("Failed to get user permission sets", { userId, error })
        throw new APIError("INTERNAL_SERVER_ERROR", {
          message: AUTHORIZATION_ERROR_CODES.DATABASE_ERROR,
        })
      }
    },

    getUserPermissions: async (userId: string): Promise<CaslPermission[]> => {
      try {
        const userPermissions = await adapter.findMany<{ permissionId: string }>({
          model: "userPermission",
          where: [{ field: "userId", value: userId }],
        })

        if (userPermissions.length === 0) return []

        const permissionIds = userPermissions.map((up) => up.permissionId)

        const permissions = await adapter.findMany<Permission<O>>({
          model: "permission",
          where: [
            {
              field: "id",
              operator: "in",
              value: permissionIds,
            },
            {
              connector: "OR",
              field: "expiresAt",
              value: null,
            },
            {
              connector: "OR",
              field: "expiresAt",
              operator: "gt",
              value: new Date(),
            },
          ],
        })
        return permissions.map((permission) => convertDbPermissionToRule(permission, "user_direct"))
      } catch (error) {
        logger.error("Failed to get user permissions", { userId, error })
        throw new APIError("INTERNAL_SERVER_ERROR", {
          message: AUTHORIZATION_ERROR_CODES.DATABASE_ERROR,
        })
      }
    },
  }
  return caslAdapter
}
