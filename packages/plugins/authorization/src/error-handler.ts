/** biome-ignore-all lint/suspicious/noExplicitAny: We don't reallly care about the context here */
import type { EndpointContext } from "better-auth"
import { APIError } from "better-auth/api"
import { ZodError } from "zod"
import { AUTHORIZATION_ERROR_CODES, VALIDATION_ERROR_MESSAGES } from "./constants/error-codes"

export interface ErrorResponse {
  success: false
  error: {
    code: keyof typeof AUTHORIZATION_ERROR_CODES
    message: string
    field?: string
    details?: Record<string, unknown>
  }
}

export class AuthorizationError extends Error {
  public readonly code: keyof typeof AUTHORIZATION_ERROR_CODES
  public readonly field?: string
  public readonly details?: Record<string, unknown>

  constructor(
    code: keyof typeof AUTHORIZATION_ERROR_CODES,
    field?: string,
    details?: Record<string, unknown>
  ) {
    super(AUTHORIZATION_ERROR_CODES[code])
    this.name = "AuthorizationError"
    this.code = code
    this.field = field
    this.details = details
  }
}

export const createErrorResponse = (
  code: keyof typeof AUTHORIZATION_ERROR_CODES,
  field?: string,
  details?: Record<string, unknown>
): ErrorResponse => ({
  error: {
    code,
    details,
    field,
    message: AUTHORIZATION_ERROR_CODES[code],
  },
  success: false,
})

export const createValidationErrorResponse = (
  field: string,
  validationCode: keyof typeof VALIDATION_ERROR_MESSAGES,
  details?: Record<string, unknown>
): ErrorResponse => ({
  error: {
    code: "VALIDATION_FAILED",
    details,
    field,
    message: VALIDATION_ERROR_MESSAGES[validationCode],
  },
  success: false,
})

export const handleAuthorizationError = (
  error: unknown,
  context: EndpointContext<any, any, any>,
  operationContext?: string
): never => {
  let errorResponse: ErrorResponse

  if (error instanceof ZodError) {
    const firstError = error.issues[0]
    const field = firstError?.path?.join(".") ?? "unknown"

    errorResponse = createValidationErrorResponse(field, "REQUIRED_FIELD_MISSING", {
      operationContext,
      zodErrors: error.issues,
    })
  } else if (error instanceof APIError) {
    context.context.logger?.error(
      `Authorization plugin API error${operationContext ? ` in ${operationContext}` : ""}:`,
      error
    )
    throw error
  } else if (error instanceof Error) {
    context.context.logger?.error(
      `Authorization plugin error${operationContext ? ` in ${operationContext}` : ""}:`,
      error
    )

    errorResponse = createErrorResponse("INTERNAL_SERVER_ERROR", undefined, {
      operationContext,
      originalMessage: error.message,
    })
  } else {
    context.context.logger?.error(
      `Unknown authorization plugin error${operationContext ? ` in ${operationContext}` : ""}:`,
      error
    )

    errorResponse = createErrorResponse("INTERNAL_SERVER_ERROR", undefined, {
      operationContext,
    })
  }

  throw new APIError("BAD_REQUEST", {
    details: {
      code: errorResponse.error.code,
      field: errorResponse.error.field,
      ...errorResponse.error.details,
    },
    message: errorResponse.error.message,
  })
}
