import type { Adapter } from "better-auth/types"
import type { AuthorizationOptions } from "../types"
import { createGenericAdapter } from "./generic-adapter"
import { createPermissionsAdapter } from "./permission-adapter"
import { createPermissionSetsAdapter } from "./permission-set-adapter"

export const getAuthorizationAdapter = <const O extends AuthorizationOptions>(
  adapter: Adapter,
  options: O
) => {
  const permissionSetsAdapter = createPermissionSetsAdapter(adapter, options)
  const permissionsAdapter = createPermissionsAdapter(adapter, options)
  const genericAdapter = createGenericAdapter(adapter, options)

  type BaseAdapter = typeof permissionSetsAdapter &
    typeof permissionsAdapter &
    typeof genericAdapter
  type TransactionMethod = <T>(callback: (txAuthAdapter: BaseAdapter) => Promise<T>) => Promise<T>

  type AuthorizationAdapterType = BaseAdapter & {
    transaction: TransactionMethod
  }

  const authorizationAdapter: AuthorizationAdapterType = {
    ...permissionSetsAdapter,
    ...permissionsAdapter,
    ...genericAdapter,
    transaction: <T>(callback: (txAuthAdapter: BaseAdapter) => Promise<T>): Promise<T> => {
      return adapter.transaction(async (tx: Omit<Adapter, "transaction">): Promise<T> => {
        const permissionSetsAdapterTx = createPermissionSetsAdapter(tx as Adapter, options)
        const permissionsAdapterTx = createPermissionsAdapter(tx as Adapter, options)
        const genericAdapterTx = createGenericAdapter(tx as Adapter, options)

        const txAuthAdapter: BaseAdapter = {
          ...permissionSetsAdapterTx,
          ...permissionsAdapterTx,
          ...genericAdapterTx,
        }

        return callback(txAuthAdapter)
      })
    },
  }

  return authorizationAdapter
}

export type AuthorizationAdapter<O extends AuthorizationOptions = AuthorizationOptions> =
  ReturnType<typeof createPermissionSetsAdapter<O>> &
    ReturnType<typeof createPermissionsAdapter<O>> &
    ReturnType<typeof createGenericAdapter<O>> & {
      transaction: <T>(
        callback: (
          txAuthAdapter: ReturnType<typeof createPermissionSetsAdapter<O>> &
            ReturnType<typeof createPermissionsAdapter<O>> &
            ReturnType<typeof createGenericAdapter<O>>
        ) => Promise<T>
      ) => Promise<T>
    }
