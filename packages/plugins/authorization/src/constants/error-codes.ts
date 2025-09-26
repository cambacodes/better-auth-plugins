/**
 * Centralized error codes with consistent messages for the authorization plugin
 *
 * This provides a single source of truth for all error messages, ensuring consistency
 * across the entire plugin and making it easier to maintain and localize error messages.
 *
 * Error categories:
 * - Resource not found: When requested entities don't exist
 * - Duplicate assignments: When trying to create relationships that already exist
 * - Validation errors: When input data doesn't meet requirements
 * - Database constraints: When database operations fail due to constraints
 * - Permission errors: When authorization checks fail
 * - System errors: When internal operations fail
 */
export const AUTHORIZATION_ERROR_CODES = {
  // Database constraint errors
  CONSTRAINT_VIOLATION: "Database constraint violation",
  DATABASE_ERROR: "Database operation failed",
  DUPLICATE_ENTRY: "Duplicate entry",

  // System errors
  INTERNAL_SERVER_ERROR: "Internal server error",
  INVALID_JSON_FORMAT: "Invalid JSON format",
  INVALID_TEMPLATE_STRING: "Invalid template string - contains invalid placeholders",

  // Duplicate assignment errors
  PERMISSION_ALREADY_ASSIGNED_TO_PERMISSION_SET: "Permission is already assigned to permission set",

  // Resource not found errors
  PERMISSION_NOT_FOUND: "Permission not found",
  PERMISSION_SET_NOT_FOUND: "Permission set not found",

  // Validation errors
  VALIDATION_FAILED: "Validation failed",
} as const

/**
 * Field-specific validation error messages with actionable guidance
 *
 * These messages provide clear, specific feedback about what went wrong
 * and how to fix validation errors. Each message is designed to help
 * developers quickly identify and resolve input validation issues.
 */
export const VALIDATION_ERROR_MESSAGES = {
  INVALID_ACTION_FORMAT: "Invalid action format - must be a non-empty string",
  INVALID_ARRAY_FORMAT: "Invalid array format - must be an array",
  INVALID_BOOLEAN_FORMAT: "Invalid boolean format - must be true or false",
  INVALID_CONDITIONS_FORMAT: "Invalid conditions format - must be a valid JSON object",
  INVALID_DATE_FORMAT: "Invalid date format - must be a valid ISO date string",
  INVALID_DESCRIPTION_FORMAT: "Invalid description format - must be a non-empty string",
  INVALID_FIELDS_FORMAT: "Invalid fields format - must be an array of strings",
  INVALID_MEMBER_ID_FORMAT: "Invalid member ID format - must be a non-empty string",
  INVALID_NAME_FORMAT: "Invalid name format - must be a non-empty string",
  INVALID_OBJECT_FORMAT: "Invalid object format - must be a valid object",
  INVALID_ORGANIZATION_ID_FORMAT: "Invalid organization ID format - must be a non-empty string",
  INVALID_PERMISSION_ID_FORMAT: "Invalid permission ID format - must be a non-empty string",
  INVALID_PERMISSION_SET_ID_FORMAT: "Invalid permission set ID format - must be a non-empty string",
  INVALID_SUBJECT_FORMAT: "Invalid subject format - must be a non-empty string",
  INVALID_USER_ID_FORMAT: "Invalid user ID format - must be a non-empty string",
  REQUIRED_FIELD_MISSING: "Required field is missing",
} as const

/**
 * Middleware and authorization user-facing messages
 *
 * These messages are displayed to users when authorization checks fail or
 * when session/organization context requirements are not met.
 */
export const MIDDLEWARE_MESSAGES = {
  INVALID_SESSION: "Valid session required for authorization",
  INVALID_ORGANIZATION_CONTEXT:
    "Active Organization context required for member-only authorization mode",
  ACCESS_DENIED_ROUTE: "Access denied for this route",
  AUTHORIZATION_FAILED: "Authorization failed",
} as const

/**
 * Permission checking result messages
 *
 * These messages provide detailed feedback when permission checks fail,
 * allowing developers to understand why access was denied.
 */
export const PERMISSION_RESULT_MESSAGES = {
  ACCESS_DENIED_ACTION: "Access denied for action '{{action}}' on '{{subject}}'",
} as const
