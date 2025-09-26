import type { AuthContext, EndpointContext } from "better-auth"
import { getAuthorizationAdapter } from "../../adapter"
import { handleAuthorizationError } from "../../error-handler"
import type { AuthorizationOptions, CreatePermissionSetInput } from "../../types"
import type {
  BatchCreatePermissionSetsResponse,
  createPermissionSetsRequestSchema,
} from "../../validation"

export const batchCreatePermissionSetsHandler = async (
  ctx: EndpointContext<
    "/create-permission-sets",
    {
      method: "POST"
      body: ReturnType<typeof createPermissionSetsRequestSchema>
    },
    AuthContext
  >,
  options: AuthorizationOptions
): Promise<BatchCreatePermissionSetsResponse> => {
  try {
    const adapter = getAuthorizationAdapter<AuthorizationOptions>(ctx.context.adapter, options)
    const data = ctx.body

    const result = await adapter.batchCreatePermissionSets(
      data as CreatePermissionSetInput<AuthorizationOptions>[]
    )

    return ctx.json(
      {
        count: result.length,
        results: result,
      },
      { status: 201 }
    )
  } catch (error) {
    return handleAuthorizationError(error, ctx, "batchCreatePermissionSet")
  }
}
