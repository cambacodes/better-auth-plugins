import type { BetterAuthClientPlugin } from "better-auth"
import type { authorization } from "./index"
import type { AuthorizationMode } from "./types"

export interface AuthorizationClientOptions {
  mode: AuthorizationMode
}

export const authorizationClient = <TOptions extends AuthorizationClientOptions>(
  _options: TOptions
) => {
  type Authorization = ReturnType<typeof authorization>
  return {
    id: "authorization",
    $InferServerPlugin: {} as Authorization & {
      endpoints: {
        createPermission: ModifyEndpointBody<
          Authorization["endpoints"]["createPermission"],
          TOptions["mode"]
        >
        createPermissions: ModifyEndpointBody<
          Authorization["endpoints"]["createPermissions"],
          TOptions["mode"]
        >
        createPermissionSet: ModifyEndpointBody<
          Authorization["endpoints"]["createPermissionSet"],
          TOptions["mode"]
        >
        createPermissionSets: ModifyEndpointBody<
          Authorization["endpoints"]["createPermissionSets"],
          TOptions["mode"]
        >
        updatePermission: ModifyEndpointBody<
          Authorization["endpoints"]["updatePermission"],
          TOptions["mode"]
        >
        updatePermissionSet: ModifyEndpointBody<
          Authorization["endpoints"]["updatePermissionSet"],
          TOptions["mode"]
        >
      }
    },
  } satisfies BetterAuthClientPlugin
}

type ModifyEndpointBody<T, TMode extends AuthorizationMode> = T extends {
  (...args: infer A): infer R
  options: infer O
}
  ? O extends { body?: infer B }
    ? Omit<T, "options"> & {
        (...args: A): R
        options: Omit<O, "body"> & {
          body:
            | B
            | WithModeOrganizationId<
                B extends Record<string, unknown> ? B : Record<string, unknown>,
                TMode
              >
        }
      }
    : Omit<T, "options"> & {
        (...args: A): R
        options: O & {
          body: WithModeOrganizationId<Record<string, unknown>, TMode>
        }
      }
  : never

type WithModeOrganizationId<
  TBaseBody extends Record<string, unknown>,
  TMode extends AuthorizationMode,
> = TBaseBody &
  (TMode extends "user"
    ? TBaseBody
    : { organizationId: TMode extends "member" ? string : string | undefined })
