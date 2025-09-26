import { subject as subjectHelper } from "@casl/ability"
import type { AuthContext, EndpointContext } from "better-auth"
import { getAuthorizationAdapter } from "../../adapter"
import { PERMISSION_RESULT_MESSAGES } from "../../constants/error-codes"
import { handleAuthorizationError } from "../../error-handler"
import type { AuthorizationOptions } from "../../types"
import { createAbilityFromPermissions, fetchSortedPermissions } from "../../utils"
import type { CheckPermissionResponse, checkPermissionRequestSchema } from "../../validation"

/**
 * Handles permission checking requests using CASL-based authorization
 *
 * Business Logic Flow:
 * 1. Collect all applicable permissions from multiple sources (user direct, user permission sets, member direct, member permission sets)
 * 2. Apply proper priority ordering according to CASL best practices (member permission set → member direct → user permission set → user direct)
 * 3. Build secure evaluation context with user, member, resource, and additional context data
 * 4. Create CASL ability with template interpolation for dynamic conditions
 * 5. Evaluate permission against the requested action, subject, and optional fields
 * 6. Return detailed result with permission metadata for debugging
 *
 * Security Considerations:
 * - Template interpolation uses whitelisted variables only
 * - Context validation prevents injection attacks
 * - Field-level permissions are evaluated individually
 * - Proper error handling prevents information leakage
 */
export const checkPermissionHandler = async (
  ctx: EndpointContext<
    "/check-permission",
    {
      method: "POST"
      body: typeof checkPermissionRequestSchema
    },
    AuthContext
  >,
  options: AuthorizationOptions
): Promise<CheckPermissionResponse> => {
  try {
    const { userId, memberId, action, subject, resource, fields, context } = ctx.body

    const adapter = getAuthorizationAdapter(ctx.context.adapter, options)
    const sortedPermissions = await fetchSortedPermissions(adapter, options.mode, userId, memberId)

    const evaluationContext = {
      member: memberId ? { id: memberId } : undefined,
      resource: resource,
      user: ctx.context.session?.user ?? { id: userId },
      ...context,
    }

    const ability = createAbilityFromPermissions(sortedPermissions, evaluationContext)
    const subjectToCheck = subject ?? "all"
    const subjectInstance = resource ? subjectHelper(subjectToCheck, resource) : subjectToCheck

    let allowed: boolean
    if (fields && fields.length > 0) {
      allowed = fields.every((field: string) => ability.can(action, subjectInstance, field))
    } else {
      allowed = ability.can(action, subjectInstance)
    }

    return {
      allowed,
      meta: {
        hasPermissions: sortedPermissions.length > 0,
        source: "ability",
        totalPermissions: sortedPermissions.length,
      },
      reason: allowed
        ? undefined
        : PERMISSION_RESULT_MESSAGES.ACCESS_DENIED_ACTION.replace("{{action}}", action).replace(
            "{{subject}}",
            subjectToCheck
          ),
    }
  } catch (error) {
    return handleAuthorizationError(error, ctx, "checkPermission")
  }
}
