import { logger } from "better-auth"
import { APIError } from "better-auth/api"
import type { Member } from "better-auth/plugins"
import type { Adapter, User, Where } from "better-auth/types"
import { AUTHORIZATION_ERROR_CODES } from "../constants/error-codes"
import type {
  AuthorizationOptions,
  CreatePermissionInput,
  PaginatedResponse,
  Permission,
  PermissionResponse,
  PermissionSet,
  QueryResponseOptions,
} from "../types"
import { chunkArray, handleIdempotentJunctionAssignment, isDuplicateKeyError } from "../utils"

export const createPermissionsAdapter = <const O extends AuthorizationOptions>(
  adapter: Adapter | Omit<Adapter, "transaction">,
  options: O
) => {
  const chunkArrayWithOptions = <T>(array: T[]): T[][] => chunkArray(array, options.batch.chunkSize)
  const permissionsAdapter = {
    batchAssignMembersToPermission: async (
      permissionId: string,
      memberIds: string[]
    ): Promise<void> => {
      if (memberIds.length === 0) return

      try {
        const chunks = chunkArrayWithOptions(memberIds)

        for (const chunk of chunks) {
          const operations = chunk.map((memberId) =>
            handleIdempotentJunctionAssignment(adapter, "memberPermission", {
              memberId,
              permissionId,
            })
          )
          await Promise.all(operations)
        }
      } catch (error) {
        if (error instanceof APIError) {
          throw error
        }

        throw new APIError("INTERNAL_SERVER_ERROR", {
          message: AUTHORIZATION_ERROR_CODES.DATABASE_ERROR,
        })
      }
    },

    batchAssignUsersToPermission: async (
      permissionId: string,
      userIds: string[]
    ): Promise<void> => {
      if (userIds.length === 0) return

      try {
        const chunks = chunkArrayWithOptions(userIds)

        for (const chunk of chunks) {
          const operations = chunk.map((userId) =>
            handleIdempotentJunctionAssignment(adapter, "userPermission", { permissionId, userId })
          )
          await Promise.all(operations)
        }
      } catch (error) {
        if (error instanceof APIError) {
          throw error
        }

        throw new APIError("INTERNAL_SERVER_ERROR", {
          message: AUTHORIZATION_ERROR_CODES.DATABASE_ERROR,
        })
      }
    },
    batchCreatePermissions: async (
      permissions: Omit<Permission<O>, "id">[]
    ): Promise<Permission<O>[]> => {
      if (permissions.length === 0) return []

      try {
        if ("transaction" in adapter) {
          return await adapter.transaction(async (tx) => {
            return Promise.all(
              permissions.map((permission) =>
                tx.create<Permission<O>>({
                  data: permission,
                  model: "permission",
                })
              )
            )
          })
        }
        return Promise.all(
          permissions.map((permission) =>
            adapter.create<Permission<O>>({
              data: permission,
              model: "permission",
            })
          )
        )
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          throw new APIError("CONFLICT", {
            message: AUTHORIZATION_ERROR_CODES.DUPLICATE_ENTRY,
          })
        }

        throw new APIError("INTERNAL_SERVER_ERROR", {
          message: AUTHORIZATION_ERROR_CODES.DATABASE_ERROR,
        })
      }
    },

    batchDeletePermissions: async (ids: string[]): Promise<number> => {
      if (ids.length === 0) return 0

      try {
        if ("transaction" in adapter) {
          return await adapter.transaction(async (tx) => {
            await tx.deleteMany({
              model: "userPermission",
              where: [{ field: "permissionId", operator: "in", value: ids }],
            })

            await tx.deleteMany({
              model: "memberPermission",
              where: [{ field: "permissionId", operator: "in", value: ids }],
            })

            await tx.deleteMany({
              model: "permissionPermissionSet",
              where: [{ field: "permissionId", operator: "in", value: ids }],
            })

            const result = await tx.deleteMany({
              model: "permission",
              where: [{ field: "id", operator: "in", value: ids }],
            })
            return typeof result === "number" ? result : 0
          })
        } else {
          await adapter.deleteMany({
            model: "userPermission",
            where: [{ field: "permissionId", operator: "in", value: ids }],
          })

          await adapter.deleteMany({
            model: "memberPermission",
            where: [{ field: "permissionId", operator: "in", value: ids }],
          })

          await adapter.deleteMany({
            model: "permissionPermissionSet",
            where: [{ field: "permissionId", operator: "in", value: ids }],
          })

          const result = await adapter.deleteMany({
            model: "permission",
            where: [{ field: "id", operator: "in", value: ids }],
          })
          return typeof result === "number" ? result : 0
        }
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          throw new APIError("CONFLICT", {
            message: AUTHORIZATION_ERROR_CODES.CONSTRAINT_VIOLATION,
          })
        }

        throw new APIError("INTERNAL_SERVER_ERROR", {
          message: AUTHORIZATION_ERROR_CODES.DATABASE_ERROR,
        })
      }
    },

    batchGetMembersForPermissions: async (
      permissionIds: string[]
    ): Promise<Record<string, Member[]>> => {
      if (permissionIds.length === 0) return {}

      try {
        const chunks = chunkArrayWithOptions(permissionIds)
        const result: Record<string, Member[]> = {}

        for (const chunk of chunks) {
          const memberPermission = await adapter.findMany<{
            permissionId: string
            memberId: string
          }>({
            model: "memberPermission",
            where: [{ field: "permissionId", operator: "in", value: chunk }],
            limit: options.maxRelationLimit,
          })

          if (memberPermission.length === 0) continue

          const memberIds = [...new Set(memberPermission.map((mp) => mp.memberId))]

          const memberChunks = chunkArrayWithOptions(memberIds)
          const allMembers: Member[] = []

          for (const memberChunk of memberChunks) {
            const members = await adapter.findMany<Member>({
              model: "member",
              where: [{ field: "id", operator: "in", value: memberChunk }],
              limit: options.maxRelationLimit,
            })
            allMembers.push(...members)
          }

          const memberMap = new Map(allMembers.map((u) => [u.id, { ...u }]))

          memberPermission.forEach((link) => {
            const member = memberMap.get(link.memberId)
            if (member) {
              if (!result[link.permissionId]) {
                result[link.permissionId] = []
              }
              result[link.permissionId].push(member)
            }
          })
        }

        return result
      } catch (error) {
        logger.error("Failed to get members for permissions", { permissionIds, error })
        throw new APIError("INTERNAL_SERVER_ERROR", {
          message: AUTHORIZATION_ERROR_CODES.DATABASE_ERROR,
        })
      }
    },

    batchGetPermissionSetsForPermissions: async (
      permissionIds: string[]
    ): Promise<Record<string, PermissionSet<O>[]>> => {
      if (permissionIds.length === 0) return {}

      try {
        const chunks = chunkArrayWithOptions(permissionIds)
        const result: Record<string, PermissionSet<O>[]> = {}

        for (const chunk of chunks) {
          const permissionPermissionSet = await adapter.findMany<{
            permissionId: string
            permissionSetId: string
          }>({
            model: "permissionPermissionSet",
            where: [{ field: "permissionId", operator: "in", value: chunk }],
            limit: options.maxRelationLimit,
          })

          if (permissionPermissionSet.length === 0) continue

          const permissionSetIds = [
            ...new Set(permissionPermissionSet.map((pps) => pps.permissionSetId)),
          ]

          const permissionSetChunks = chunkArrayWithOptions(permissionSetIds)
          const allPermissionSets: PermissionSet<O>[] = []

          for (const permissionSetChunk of permissionSetChunks) {
            const permissionSets = await adapter.findMany<PermissionSet<O>>({
              model: "permissionSet",
              sortBy: { direction: "desc", field: "createdAt" },
              where: [{ field: "id", operator: "in", value: permissionSetChunk }],
              limit: options.maxRelationLimit,
            })
            allPermissionSets.push(...permissionSets)
          }

          const permissionSetMap = new Map(allPermissionSets.map((ps) => [ps.id, { ...ps }]))

          permissionPermissionSet.forEach((link) => {
            const permissionSet = permissionSetMap.get(link.permissionSetId)
            if (permissionSet) {
              if (!result[link.permissionId]) {
                result[link.permissionId] = []
              }
              result[link.permissionId].push(permissionSet)
            }
          })
        }

        return result
      } catch (error) {
        logger.error("Failed to get permission sets for permissions", { permissionIds, error })
        throw new APIError("INTERNAL_SERVER_ERROR", {
          message: AUTHORIZATION_ERROR_CODES.DATABASE_ERROR,
        })
      }
    },

    batchGetUsersForPermissions: async (
      permissionIds: string[]
    ): Promise<Record<string, User[]>> => {
      if (permissionIds.length === 0) return {}

      try {
        const chunks = chunkArrayWithOptions(permissionIds)
        const result: Record<string, User[]> = {}

        for (const chunk of chunks) {
          const userPermission = await adapter.findMany<{
            permissionId: string
            userId: string
          }>({
            model: "userPermission",
            where: [{ field: "permissionId", operator: "in", value: chunk }],
            limit: options.maxRelationLimit,
          })

          if (userPermission.length === 0) continue

          const userIds = [...new Set(userPermission.map((up) => up.userId))]

          const userChunks = chunkArrayWithOptions(userIds)
          const allUsers: User[] = []

          for (const userChunk of userChunks) {
            const users = await adapter.findMany<User>({
              model: "user",
              where: [{ field: "id", operator: "in", value: userChunk }],
              limit: options.maxRelationLimit,
            })
            allUsers.push(...users)
          }

          const userMap = new Map(allUsers.map((u) => [u.id, { ...u }]))

          userPermission.forEach((link) => {
            const user = userMap.get(link.userId)
            if (user) {
              if (!result[link.permissionId]) {
                result[link.permissionId] = []
              }
              result[link.permissionId].push(user)
            }
          })
        }

        return result
      } catch (error) {
        logger.error("Failed to get users for permissions", { permissionIds, error })
        throw new APIError("INTERNAL_SERVER_ERROR", {
          message: AUTHORIZATION_ERROR_CODES.DATABASE_ERROR,
        })
      }
    },

    batchRemoveMembersFromPermission: async (
      permissionId: string,
      memberIds: string[]
    ): Promise<void> => {
      if (memberIds.length === 0) return

      try {
        if ("transaction" in adapter) {
          await adapter.transaction(async (tx) => {
            await Promise.all(
              memberIds.map((memberId) =>
                tx.deleteMany({
                  model: "memberPermission",
                  where: [
                    { field: "permissionId", value: permissionId },
                    { field: "memberId", value: memberId },
                  ],
                })
              )
            )
          })
        } else {
          await Promise.all(
            memberIds.map((memberId) =>
              adapter.deleteMany({
                model: "memberPermission",
                where: [
                  { field: "permissionId", value: permissionId },
                  { field: "memberId", value: memberId },
                ],
              })
            )
          )
        }
      } catch (error) {
        logger.error("Failed to batch remove members from permission", {
          permissionId,
          memberIds,
          error,
        })
        throw new APIError("INTERNAL_SERVER_ERROR", {
          message: AUTHORIZATION_ERROR_CODES.DATABASE_ERROR,
        })
      }
    },

    batchRemoveUsersFromPermission: async (
      permissionId: string,
      userIds: string[]
    ): Promise<void> => {
      if (userIds.length === 0) return

      try {
        if ("transaction" in adapter) {
          await adapter.transaction(async (tx) => {
            await Promise.all(
              userIds.map((userId) =>
                tx.deleteMany({
                  model: "userPermission",
                  where: [
                    { field: "permissionId", value: permissionId },
                    { field: "userId", value: userId },
                  ],
                })
              )
            )
          })
        } else {
          await Promise.all(
            userIds.map((userId) =>
              adapter.deleteMany({
                model: "userPermission",
                where: [
                  { field: "permissionId", value: permissionId },
                  { field: "userId", value: userId },
                ],
              })
            )
          )
        }
      } catch (error) {
        logger.error("Failed to batch remove users from permission", {
          permissionId,
          userIds,
          error,
        })
        throw new APIError("INTERNAL_SERVER_ERROR", {
          message: AUTHORIZATION_ERROR_CODES.DATABASE_ERROR,
        })
      }
    },

    createPermission: async (data: CreatePermissionInput<O>): Promise<Permission<O>> => {
      try {
        const [result] = await permissionsAdapter.batchCreatePermissions([data as Permission<O>])
        return result as Permission<O>
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          throw new APIError("CONFLICT", {
            message: AUTHORIZATION_ERROR_CODES.DUPLICATE_ENTRY,
          })
        }

        throw new APIError("INTERNAL_SERVER_ERROR", {
          message: AUTHORIZATION_ERROR_CODES.DATABASE_ERROR,
        })
      }
    },

    deletePermission: async (id: string): Promise<boolean> => {
      try {
        if ("transaction" in adapter) {
          return await adapter.transaction(async (tx) => {
            // Delete associated assignment records first
            await tx.deleteMany({
              model: "userPermission",
              where: [{ field: "permissionId", value: id }],
            })

            await tx.deleteMany({
              model: "memberPermission",
              where: [{ field: "permissionId", value: id }],
            })

            await tx.deleteMany({
              model: "permissionPermissionSet",
              where: [{ field: "permissionId", value: id }],
            })

            const result = await tx.delete({
              model: "permission",
              where: [{ field: "id", value: id }],
            })
            return result !== null && result !== undefined
          })
        } else {
          await adapter.deleteMany({
            model: "userPermission",
            where: [{ field: "permissionId", value: id }],
          })

          await adapter.deleteMany({
            model: "memberPermission",
            where: [{ field: "permissionId", value: id }],
          })

          await adapter.deleteMany({
            model: "permissionPermissionSet",
            where: [{ field: "permissionId", value: id }],
          })

          const result = await adapter.delete({
            model: "permission",
            where: [{ field: "id", value: id }],
          })
          return result !== null && result !== undefined
        }
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          throw new APIError("CONFLICT", {
            message: AUTHORIZATION_ERROR_CODES.CONSTRAINT_VIOLATION,
          })
        }

        throw new APIError("INTERNAL_SERVER_ERROR", {
          message: AUTHORIZATION_ERROR_CODES.DATABASE_ERROR,
        })
      }
    },

    findPermissionByName: async (
      name: string,
      organizationId?: string
    ): Promise<Permission<O> | null> => {
      try {
        const where: Where[] = [{ field: "name", value: name }]

        if (organizationId) {
          where.push({ field: "organizationId", value: organizationId })
        }

        const permission = await adapter.findOne<Permission<O>>({
          model: "permission",
          where,
        })

        return permission
      } catch (error) {
        logger.error("Failed to find permission by name", { name, organizationId, error })
        throw new APIError("INTERNAL_SERVER_ERROR", {
          message: AUTHORIZATION_ERROR_CODES.DATABASE_ERROR,
        })
      }
    },

    getPermissionById: async (id: string): Promise<Permission<O> | null> => {
      try {
        const permission = await adapter.findOne<Permission<O>>({
          model: "permission",
          where: [{ field: "id", value: id }],
        })
        return permission
      } catch (error) {
        logger.error("Failed to get permission by ID", { id, error })
        throw new APIError("INTERNAL_SERVER_ERROR", {
          message: AUTHORIZATION_ERROR_CODES.DATABASE_ERROR,
        })
      }
    },

    getPermissionsByOrganizationId: async (
      id: string,
      limit = options.pagination?.defaultLimit,
      search?: string,
      currentPage = 1,
      includeExpired = false
    ): Promise<PaginatedResponse<Permission<O>>> => {
      const where: Where[] = [{ field: "organizationId", value: id }]

      if (search?.trim()) {
        where.push({
          field: "name",
          operator: "contains",
          value: search.trim(),
        })
      }

      if (!includeExpired) {
        where.push(
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
          }
        )
      }

      const offset = (currentPage - 1) * limit

      const [permissions, total] = await Promise.all([
        adapter.findMany<Permission<O>>({
          limit,
          model: "permission",
          offset,
          sortBy: { direction: "desc", field: "createdAt" },
          where,
        }),
        adapter.count({
          model: "permission",
          where,
        }),
      ])

      const totalPages = Math.ceil(total / limit)

      return {
        data: permissions,
        pagination: {
          currentPage,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1,
          total,
          totalPages,
        },
      }
    },

    getPermissionsWith: async <Q extends Omit<QueryResponseOptions, "includePermissions">>(
      config: {
        limit?: number
        currentPage?: number
        search?: string
        include?: Q
      },
      organizationId?: string
    ): Promise<PaginatedResponse<PermissionResponse<O, Q> | Permission<O>>> => {
      const limit = config.limit ?? options.pagination?.defaultLimit
      const currentPage = config.currentPage ?? 1

      let data: Permission<O>[]
      let total: number
      let totalPages: number

      if (organizationId) {
        const paginatedResult = await permissionsAdapter.getPermissionsByOrganizationId(
          organizationId,
          limit,
          config.search,
          currentPage
        )

        data = paginatedResult.data
        total = paginatedResult.pagination.total
        totalPages = paginatedResult.pagination.totalPages
      } else {
        const where: Where[] = config.search
          ? [{ field: "name", operator: "contains", value: config.search }]
          : []

        if (!config.include?.includeExpired) {
          where.push(
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
            }
          )
        }

        const offset = (currentPage - 1) * limit

        const [permissionsResult, count] = await Promise.all([
          adapter.findMany<Permission<O>>({
            limit,
            model: "permission",
            offset,
            sortBy: { direction: "desc", field: "createdAt" },
            where,
          }),
          adapter.count({
            model: "permission",
            where,
          }),
        ])

        data = permissionsResult
        total = count
      }

      totalPages = Math.ceil(total / limit)

      if (data.length === 0) {
        return {
          data: [],
          pagination: {
            currentPage,
            hasNext: currentPage < totalPages,
            hasPrev: currentPage > 1,
            total,
            totalPages,
          },
        }
      }

      const permissionIds = data.map((p) => p.id)

      const [permissionSetsData, usersData, membersData] = await Promise.all([
        config.include?.includePermissionSets
          ? permissionsAdapter.batchGetPermissionSetsForPermissions(permissionIds)
          : Promise.resolve({} as Record<string, PermissionSet<O>[]>),
        config.include?.includeUsers
          ? permissionsAdapter.batchGetUsersForPermissions(permissionIds)
          : Promise.resolve({} as Record<string, User[]>),
        config.include?.includeMembers
          ? permissionsAdapter.batchGetMembersForPermissions(permissionIds)
          : Promise.resolve({} as Record<string, Member[]>),
      ])

      const processedData = data.map((permission) => {
        const result = {
          ...permission,
          ...(config.include?.includePermissionSets && {
            permissionSets: permissionSetsData[permission.id]?.map((ps) => ({ ...ps })) ?? [],
          }),
          ...(config.include?.includeUsers && {
            users: usersData[permission.id]?.map((u) => ({ ...u })) ?? [],
          }),
          ...(config.include?.includeMembers && {
            members: membersData[permission.id]?.map((m) => ({ ...m })) ?? [],
          }),
        }

        return result
      })

      return {
        data: processedData,
        pagination: {
          currentPage,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1,
          total,
          totalPages,
        },
      }
    },

    getPermissionWith: async <Q extends QueryResponseOptions>(
      id: string,
      include?: Q
    ): Promise<PermissionResponse<O, Q> | Permission<O> | null> => {
      const permission = await permissionsAdapter.getPermissionById(id)

      if (!permission) {
        return null
      }

      if (!include) {
        return permission
      }

      const [permissionSetsData, usersData, membersData] = await Promise.all([
        include.includePermissionSets
          ? permissionsAdapter.batchGetPermissionSetsForPermissions([id])
          : Promise.resolve({} as Record<string, PermissionSet<O>[]>),
        include.includeUsers
          ? permissionsAdapter.batchGetUsersForPermissions([id])
          : Promise.resolve({} as Record<string, User[]>),
        include.includeMembers
          ? permissionsAdapter.batchGetMembersForPermissions([id])
          : Promise.resolve({} as Record<string, Member[]>),
      ])

      const result = {
        ...permission,
        ...(include.includePermissionSets && {
          permissionSets: permissionSetsData[id]?.map((ps) => ({ ...ps })) ?? [],
        }),
        ...(include.includeUsers && {
          users: usersData[id]?.map((u) => ({ ...u })) ?? [],
        }),
        ...(include.includeMembers && {
          members: membersData[id]?.map((m) => ({ ...m })) ?? [],
        }),
      }

      return result
    },

    removeMemberFromPermission: async (permissionId: string, memberId: string): Promise<void> => {
      try {
        await permissionsAdapter.batchRemoveMembersFromPermission(permissionId, [memberId])
      } catch (error) {
        logger.error("Failed to remove member from permission", { permissionId, memberId, error })
        throw new APIError("INTERNAL_SERVER_ERROR", {
          message: AUTHORIZATION_ERROR_CODES.DATABASE_ERROR,
        })
      }
    },

    removeUserFromPermission: async (permissionId: string, userId: string): Promise<void> => {
      try {
        await permissionsAdapter.batchRemoveUsersFromPermission(permissionId, [userId])
      } catch (error) {
        logger.error("Failed to remove user from permission", { permissionId, userId, error })
        throw new APIError("INTERNAL_SERVER_ERROR", {
          message: AUTHORIZATION_ERROR_CODES.DATABASE_ERROR,
        })
      }
    },

    updatePermission: async (
      data: Partial<Permission<O>> & { id: string }
    ): Promise<Permission<O>> => {
      try {
        const { id, ...update } = data
        const result = await adapter.update<Permission<O>>({
          model: "permission",
          update,
          where: [{ field: "id", value: id }],
        })

        if (!result) {
          throw new APIError("NOT_FOUND", {
            message: AUTHORIZATION_ERROR_CODES.PERMISSION_NOT_FOUND,
          })
        }

        return result
      } catch (error) {
        if (error instanceof APIError) {
          throw error
        }

        if (isDuplicateKeyError(error)) {
          throw new APIError("CONFLICT", {
            message: AUTHORIZATION_ERROR_CODES.CONSTRAINT_VIOLATION,
          })
        }

        throw new APIError("INTERNAL_SERVER_ERROR", {
          message: AUTHORIZATION_ERROR_CODES.DATABASE_ERROR,
        })
      }
    },
  }

  return permissionsAdapter
}
