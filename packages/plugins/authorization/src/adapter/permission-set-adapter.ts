import { logger } from "better-auth"
import { APIError } from "better-auth/api"
import type { Member } from "better-auth/plugins"
import type { Adapter, User, Where } from "better-auth/types"
import { AUTHORIZATION_ERROR_CODES } from "../constants/error-codes"
import type {
  AuthorizationOptions,
  CreatePermissionSetInput,
  PaginatedResponse,
  Permission,
  PermissionSet,
  PermissionSetResponse,
  QueryResponseOptions,
} from "../types"
import { chunkArray, handleIdempotentJunctionAssignment, isDuplicateKeyError } from "../utils"

export const createPermissionSetsAdapter = <const O extends AuthorizationOptions>(
  adapter: Adapter | Omit<Adapter, "transaction">,
  options: O
) => {
  const chunkArrayWithOptions = <T>(array: T[]): T[][] => chunkArray(array, options.batch.chunkSize)
  const permissionSetsAdapter = {
    batchAssignMembersToPermissionSet: async (
      permissionSetId: string,
      memberIds: string[]
    ): Promise<void> => {
      if (memberIds.length === 0) return

      try {
        const chunks = chunkArrayWithOptions(memberIds)

        for (const chunk of chunks) {
          const operations = chunk.map((memberId) =>
            handleIdempotentJunctionAssignment(adapter, "memberPermissionSet", {
              memberId,
              permissionSetId,
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

    batchAssignPermissionsToPermissionSet: async (
      permissionSetId: string,
      permissionIds: string[]
    ): Promise<void> => {
      if (permissionIds.length === 0) return

      try {
        const chunks = chunkArrayWithOptions(permissionIds)

        for (const chunk of chunks) {
          const operations = chunk.map((permissionId: string) =>
            handleIdempotentJunctionAssignment(adapter, "permissionPermissionSet", {
              permissionId,
              permissionSetId,
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

    batchAssignUsersToPermissionSet: async (
      permissionSetId: string,
      userIds: string[]
    ): Promise<void> => {
      if (userIds.length === 0) return

      try {
        const chunks = chunkArrayWithOptions(userIds)

        for (const chunk of chunks) {
          const operations = chunk.map((userId) =>
            handleIdempotentJunctionAssignment(adapter, "userPermissionSet", {
              permissionSetId,
              userId,
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

    batchCreatePermissionSets: async (
      permissionSets: CreatePermissionSetInput<O>[]
    ): Promise<PermissionSet<O>[]> => {
      if (permissionSets.length === 0) return []

      try {
        if ("transaction" in adapter) {
          return await adapter.transaction(async (tx) => {
            return Promise.all(
              permissionSets.map((permissionSet) =>
                tx.create<PermissionSet<O>>({
                  data: {
                    ...permissionSet,
                    createdAt: new Date(),
                  } as Omit<PermissionSet<O>, "id">,
                  model: "permissionSet",
                })
              )
            ) as Promise<PermissionSet<O>[]>
          })
        }
        return Promise.all(
          permissionSets.map((permissionSet) =>
            adapter.create<PermissionSet<O>>({
              data: {
                ...permissionSet,
                createdAt: new Date(),
              } as Omit<PermissionSet<O>, "id">,
              model: "permissionSet",
            })
          )
        ) as Promise<PermissionSet<O>[]>
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

    batchDeletePermissionSets: async (ids: string[]): Promise<number> => {
      if (ids.length === 0) return 0

      try {
        if ("transaction" in adapter) {
          return await adapter.transaction(async (tx) => {
            await tx.deleteMany({
              model: "userPermissionSet",
              where: [{ field: "permissionSetId", operator: "in", value: ids }],
            })

            await tx.deleteMany({
              model: "memberPermissionSet",
              where: [{ field: "permissionSetId", operator: "in", value: ids }],
            })

            await tx.deleteMany({
              model: "permissionPermissionSet",
              where: [{ field: "permissionSetId", operator: "in", value: ids }],
            })

            const result = await tx.deleteMany({
              model: "permissionSet",
              where: [{ field: "id", operator: "in", value: ids }],
            })
            return typeof result === "number" ? result : 0
          })
        } else {
          await adapter.deleteMany({
            model: "userPermissionSet",
            where: [{ field: "permissionSetId", operator: "in", value: ids }],
          })

          await adapter.deleteMany({
            model: "memberPermissionSet",
            where: [{ field: "permissionSetId", operator: "in", value: ids }],
          })

          await adapter.deleteMany({
            model: "permissionPermissionSet",
            where: [{ field: "permissionSetId", operator: "in", value: ids }],
          })

          const result = await adapter.deleteMany({
            model: "permissionSet",
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

    batchGetMembersForPermissionSets: async (
      permissionSetIds: string[]
    ): Promise<Record<string, Member[]>> => {
      if (permissionSetIds.length === 0) return {}

      try {
        const chunks = chunkArrayWithOptions(permissionSetIds)
        const result: Record<string, Member[]> = {}

        for (const chunk of chunks) {
          const memberPermissionSet = await adapter.findMany<{
            permissionSetId: string
            memberId: string
          }>({
            model: "memberPermissionSet",
            where: [{ field: "permissionSetId", operator: "in", value: chunk }],
            limit: options.maxRelationLimit,
          })

          if (memberPermissionSet.length === 0) continue

          const memberIds = [...new Set(memberPermissionSet.map((mps) => mps.memberId))]

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

          memberPermissionSet.forEach((link) => {
            const member = memberMap.get(link.memberId)
            if (member) {
              if (!result[link.permissionSetId]) {
                result[link.permissionSetId] = []
              }
              result[link.permissionSetId].push(member)
            }
          })
        }

        return result
      } catch (error) {
        logger.error("Failed to get members for permission sets", { permissionSetIds, error })
        throw new APIError("INTERNAL_SERVER_ERROR", {
          message: AUTHORIZATION_ERROR_CODES.DATABASE_ERROR,
        })
      }
    },

    batchGetPermissionsForPermissionSets: async (
      permissionSetIds: string[]
    ): Promise<Record<string, Permission<O>[]>> => {
      if (permissionSetIds.length === 0) return {}

      try {
        const chunks = chunkArrayWithOptions(permissionSetIds)
        const result: Record<string, Permission<O>[]> = {}

        for (const chunk of chunks) {
          const permissionPermissionSet = await adapter.findMany<{
            permissionSetId: string
            permissionId: string
          }>({
            model: "permissionPermissionSet",
            where: [{ field: "permissionSetId", operator: "in", value: chunk }],
            limit: options.maxRelationLimit,
          })

          if (permissionPermissionSet.length === 0) continue

          const permissionIds = [...new Set(permissionPermissionSet.map((pps) => pps.permissionId))]

          const permissionChunks = chunkArrayWithOptions(permissionIds)
          const allPermissions: Permission<O>[] = []

          for (const permissionChunk of permissionChunks) {
            const permissions = await adapter.findMany<Permission<O>>({
              model: "permission",
              sortBy: { direction: "desc", field: "createdAt" },
              where: [{ field: "id", operator: "in", value: permissionChunk }],
              limit: options.maxRelationLimit,
            })
            allPermissions.push(...permissions)
          }

          const permissionMap = new Map(allPermissions.map((p) => [p.id, { ...p }]))

          permissionPermissionSet.forEach((link) => {
            const permission = permissionMap.get(link.permissionId)
            if (permission) {
              if (!result[link.permissionSetId]) {
                result[link.permissionSetId] = []
              }
              result[link.permissionSetId].push(permission)
            }
          })
        }

        return result
      } catch (error) {
        logger.error("Failed to get permissions for permission sets", { permissionSetIds, error })
        throw new APIError("INTERNAL_SERVER_ERROR", {
          message: AUTHORIZATION_ERROR_CODES.DATABASE_ERROR,
        })
      }
    },

    batchGetUsersForPermissionSets: async (permissionSetIds: string[]) => {
      if (permissionSetIds.length === 0) return {}

      try {
        const chunks = chunkArrayWithOptions(permissionSetIds)
        const result: Record<string, User[]> = {}

        for (const chunk of chunks) {
          const userPermissionSet = await adapter.findMany<{
            permissionSetId: string
            userId: string
          }>({
            model: "userPermissionSet",
            where: [{ field: "permissionSetId", operator: "in", value: chunk }],
            limit: options.maxRelationLimit,
          })

          if (userPermissionSet.length === 0) continue

          const userIds = [...new Set(userPermissionSet.map((ups) => ups.userId))]

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

          userPermissionSet.forEach((link) => {
            const user = userMap.get(link.userId)
            if (user) {
              if (!result[link.permissionSetId]) {
                result[link.permissionSetId] = []
              }
              result[link.permissionSetId].push(user)
            }
          })
        }

        return result
      } catch (error) {
        logger.error("Failed to get users for permission sets", { permissionSetIds, error })
        throw new APIError("INTERNAL_SERVER_ERROR", {
          message: AUTHORIZATION_ERROR_CODES.DATABASE_ERROR,
        })
      }
    },

    batchRemoveMembersFromPermissionSet: async (
      permissionSetId: string,
      memberIds: string[]
    ): Promise<void> => {
      if (memberIds.length === 0) return

      try {
        if ("transaction" in adapter) {
          await adapter.transaction(async (tx) => {
            await Promise.all(
              memberIds.map((memberId) =>
                tx.deleteMany({
                  model: "memberPermissionSet",
                  where: [
                    { field: "permissionSetId", value: permissionSetId },
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
                model: "memberPermissionSet",
                where: [
                  { field: "permissionSetId", value: permissionSetId },
                  { field: "memberId", value: memberId },
                ],
              })
            )
          )
        }
      } catch (error) {
        logger.error("Failed to batch remove members from permission set", {
          permissionSetId,
          memberIds,
          error,
        })
        throw new APIError("INTERNAL_SERVER_ERROR", {
          message: AUTHORIZATION_ERROR_CODES.DATABASE_ERROR,
        })
      }
    },

    batchRemovePermissionsFromPermissionSet: async (
      permissionSetId: string,
      permissionIds: string[]
    ): Promise<void> => {
      if (permissionIds.length === 0) return

      try {
        if ("transaction" in adapter) {
          await adapter.transaction(async (tx) => {
            await Promise.all(
              permissionIds.map((permissionId) =>
                tx.deleteMany({
                  model: "permissionPermissionSet",
                  where: [
                    { field: "permissionSetId", value: permissionSetId },
                    { field: "permissionId", value: permissionId },
                  ],
                })
              )
            )
          })
        } else {
          await Promise.all(
            permissionIds.map((permissionId) =>
              adapter.deleteMany({
                model: "permissionPermissionSet",
                where: [
                  { field: "permissionSetId", value: permissionSetId },
                  { field: "permissionId", value: permissionId },
                ],
              })
            )
          )
        }
      } catch (error) {
        logger.error("Failed to batch remove permissions from permission set", {
          permissionSetId,
          permissionIds,
          error,
        })
        throw new APIError("INTERNAL_SERVER_ERROR", {
          message: AUTHORIZATION_ERROR_CODES.DATABASE_ERROR,
        })
      }
    },

    batchRemoveUsersFromPermissionSet: async (
      permissionSetId: string,
      userIds: string[]
    ): Promise<void> => {
      if (userIds.length === 0) return

      try {
        if ("transaction" in adapter) {
          await adapter.transaction(async (tx) => {
            await Promise.all(
              userIds.map((userId) =>
                tx.deleteMany({
                  model: "userPermissionSet",
                  where: [
                    { field: "permissionSetId", value: permissionSetId },
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
                model: "userPermissionSet",
                where: [
                  { field: "permissionSetId", value: permissionSetId },
                  { field: "userId", value: userId },
                ],
              })
            )
          )
        }
      } catch (error) {
        logger.error("Failed to batch remove users from permission set", {
          permissionSetId,
          userIds,
          error,
        })
        throw new APIError("INTERNAL_SERVER_ERROR", {
          message: AUTHORIZATION_ERROR_CODES.DATABASE_ERROR,
        })
      }
    },

    createPermissionSet: async (data: CreatePermissionSetInput<O>): Promise<PermissionSet<O>> => {
      try {
        const [result] = await permissionSetsAdapter.batchCreatePermissionSets([data])
        return result
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

    deletePermissionSet: async (id: string): Promise<number> => {
      try {
        if ("transaction" in adapter) {
          return await adapter.transaction(async (tx) => {
            await tx.deleteMany({
              model: "userPermissionSet",
              where: [{ field: "permissionSetId", value: id }],
            })

            await tx.deleteMany({
              model: "memberPermissionSet",
              where: [{ field: "permissionSetId", value: id }],
            })

            await tx.deleteMany({
              model: "permissionPermissionSet",
              where: [{ field: "permissionSetId", value: id }],
            })

            const result = await tx.deleteMany({
              model: "permissionSet",
              where: [{ field: "id", value: id }],
            })
            return typeof result === "number" ? result : 0
          })
        } else {
          await adapter.deleteMany({
            model: "userPermissionSet",
            where: [{ field: "permissionSetId", value: id }],
          })

          await adapter.deleteMany({
            model: "memberPermissionSet",
            where: [{ field: "permissionSetId", value: id }],
          })

          await adapter.deleteMany({
            model: "permissionPermissionSet",
            where: [{ field: "permissionSetId", value: id }],
          })

          const result = await adapter.deleteMany({
            model: "permissionSet",
            where: [{ field: "id", value: id }],
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

    findPermissionSetByName: async (
      name: string,
      organizationId?: string
    ): Promise<PermissionSet<O> | null> => {
      try {
        const where: Where[] = [{ field: "name", value: name }]

        if (organizationId) {
          where.push({ field: "organizationId", value: organizationId })
        }

        const permissionSet = await adapter.findOne<PermissionSet<O>>({
          model: "permissionSet",
          where,
        })

        return permissionSet
      } catch (error) {
        logger.error("Failed to find permission set by name", { name, organizationId, error })
        throw new APIError("INTERNAL_SERVER_ERROR", {
          message: AUTHORIZATION_ERROR_CODES.DATABASE_ERROR,
        })
      }
    },
    getPermissionSetById: async (id: string): Promise<PermissionSet<O> | null> => {
      try {
        const permissionSet = await adapter.findOne<PermissionSet<O>>({
          model: "permissionSet",
          where: [{ field: "id", value: id }],
        })
        return permissionSet
      } catch (error) {
        logger.error("Failed to get permission set by id", {
          id,
          error,
        })
        throw new APIError("INTERNAL_SERVER_ERROR", {
          message: AUTHORIZATION_ERROR_CODES.DATABASE_ERROR,
        })
      }
    },

    getPermissionSetsByOrganizationId: async (
      id: string,
      limit = options.pagination?.defaultLimit,
      search?: string,
      currentPage = 1
    ): Promise<PaginatedResponse<PermissionSet<O>>> => {
      const where: Where[] = [{ field: "organizationId", value: id }]

      if (search?.trim()) {
        where.push({
          field: "name",
          operator: "contains",
          value: search.trim(),
        })
      }

      const offset = (currentPage - 1) * limit

      const [permissionSets, total] = await Promise.all([
        adapter.findMany<PermissionSet<O>>({
          limit,
          model: "permissionSet",
          offset,
          sortBy: { direction: "desc", field: "createdAt" },
          where,
        }),
        adapter.count({
          model: "permissionSet",
          where,
        }),
      ])

      const totalPages = Math.ceil(total / limit)

      return {
        data: permissionSets,
        pagination: {
          currentPage,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1,
          total,
          totalPages,
        },
      }
    },

    getPermissionSetsWith: async <Q extends Omit<QueryResponseOptions, "includePermissionSets">>(
      config: {
        limit?: number
        currentPage?: number
        search?: string
        include?: Q
      },
      organizationId?: string
    ): Promise<PaginatedResponse<PermissionSetResponse<O, Q> | PermissionSet<O>>> => {
      const limit = config.limit ?? options.pagination?.defaultLimit
      const currentPage = config.currentPage ?? 1

      let data: PermissionSet<O>[]
      let total: number
      let totalPages: number

      if (organizationId) {
        const paginatedResult = await permissionSetsAdapter.getPermissionSetsByOrganizationId(
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

        const offset = (currentPage - 1) * limit

        const [permissionSetsResult, count] = await Promise.all([
          adapter.findMany<PermissionSet<O>>({
            limit,
            model: "permissionSet",
            offset,
            sortBy: { direction: "desc", field: "createdAt" },
            where,
          }),
          adapter.count({
            model: "permissionSet",
            where,
          }),
        ])

        data = permissionSetsResult
        total = count
        totalPages = Math.ceil(total / limit)
      }

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

      const permissionSetIds = data.map((ps) => ps.id)

      const [permissionsData, usersData, membersData] = await Promise.all([
        config.include?.includePermissions
          ? permissionSetsAdapter.batchGetPermissionsForPermissionSets(permissionSetIds)
          : Promise.resolve({} as Record<string, Permission<O>[]>),
        config.include?.includeUsers
          ? permissionSetsAdapter.batchGetUsersForPermissionSets(permissionSetIds)
          : Promise.resolve({} as Record<string, User[]>),
        config.include?.includeMembers
          ? permissionSetsAdapter.batchGetMembersForPermissionSets(permissionSetIds)
          : Promise.resolve({} as Record<string, Member[]>),
      ])

      const processedData = data.map((permissionSet) => {
        const result = {
          ...permissionSet,
          ...(config.include?.includePermissions && {
            permissions: permissionsData[permissionSet.id]?.map((p) => ({ ...p })) ?? [],
          }),
          ...(config.include?.includeUsers && {
            users: usersData[permissionSet.id]?.map((u) => ({ ...u })) ?? [],
          }),
          ...(config.include?.includeMembers && {
            members: membersData[permissionSet.id]?.map((m) => ({ ...m })) ?? [],
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

    getPermissionSetWith: async <Q extends Omit<QueryResponseOptions, "includePermissionSets">>(
      id: string,
      include?: Q
    ): Promise<PermissionSetResponse<O, Q> | PermissionSet<O> | null> => {
      const permissionSet = await permissionSetsAdapter.getPermissionSetById(id)

      if (!permissionSet) {
        return null
      }

      if (!include) {
        return permissionSet
      }

      const [permissionsData, usersData, membersData] = await Promise.all([
        include.includePermissions
          ? permissionSetsAdapter.batchGetPermissionsForPermissionSets([id])
          : Promise.resolve({} as Record<string, Permission<O>[]>),
        include.includeUsers
          ? permissionSetsAdapter.batchGetUsersForPermissionSets([id])
          : Promise.resolve({} as Record<string, User[]>),
        include.includeMembers
          ? permissionSetsAdapter.batchGetMembersForPermissionSets([id])
          : Promise.resolve({} as Record<string, Member[]>),
      ])

      const result = {
        ...permissionSet,
        ...(include.includePermissions && {
          permissions: permissionsData[id]?.map((p) => ({ ...p })) ?? [],
        }),
        ...(include.includeUsers && {
          users: usersData[id]?.map((u) => ({ ...u })) ?? [],
        }),
        ...(include.includeMembers && {
          members: membersData[id]?.map((m) => ({ ...m })) ?? [],
        }),
      } as PermissionSetResponse<O, Q>

      return result
    },

    getPermissionsForPermissionSet: async (permissionSetId: string): Promise<Permission<O>[]> => {
      try {
        const batchResult = await permissionSetsAdapter.batchGetPermissionsForPermissionSets([
          permissionSetId,
        ])
        return batchResult[permissionSetId] ?? []
      } catch (error) {
        logger.error("Failed to get permissions for permission set", {
          permissionSetId,
          error,
        })
        throw new APIError("INTERNAL_SERVER_ERROR", {
          message: AUTHORIZATION_ERROR_CODES.DATABASE_ERROR,
        })
      }
    },

    removeMemberFromPermissionSet: async (
      permissionSetId: string,
      memberId: string
    ): Promise<void> => {
      try {
        await permissionSetsAdapter.batchRemoveMembersFromPermissionSet(permissionSetId, [memberId])
      } catch (error) {
        logger.error("Failed to remove member from permission set", {
          permissionSetId,
          memberId,
          error,
        })
        throw new APIError("INTERNAL_SERVER_ERROR", {
          message: AUTHORIZATION_ERROR_CODES.DATABASE_ERROR,
        })
      }
    },

    removePermissionFromPermissionSet: async (
      permissionSetId: string,
      permissionId: string
    ): Promise<void> => {
      try {
        await permissionSetsAdapter.batchRemovePermissionsFromPermissionSet(permissionSetId, [
          permissionId,
        ])
      } catch (error) {
        logger.error("Failed to remove permission from permission set", {
          permissionSetId,
          permissionId,
          error,
        })
        throw new APIError("INTERNAL_SERVER_ERROR", {
          message: AUTHORIZATION_ERROR_CODES.DATABASE_ERROR,
        })
      }
    },

    removeUserFromPermissionSet: async (permissionSetId: string, userId: string): Promise<void> => {
      try {
        await permissionSetsAdapter.batchRemoveUsersFromPermissionSet(permissionSetId, [userId])
      } catch (error) {
        logger.error("Failed to remove user from permission set", {
          permissionSetId,
          userId,
          error,
        })
        throw new APIError("INTERNAL_SERVER_ERROR", {
          message: AUTHORIZATION_ERROR_CODES.DATABASE_ERROR,
        })
      }
    },

    updatePermissionSet: async (
      data: Partial<PermissionSet<O>> & { id: string }
    ): Promise<PermissionSet<O>> => {
      try {
        const { id, ...update } = data
        const result = await adapter.update<PermissionSet<O>>({
          model: "permissionSet",
          update,
          where: [{ field: "id", value: id }],
        })

        if (!result) {
          throw new APIError("NOT_FOUND", {
            message: AUTHORIZATION_ERROR_CODES.PERMISSION_SET_NOT_FOUND,
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

  return permissionSetsAdapter
}
