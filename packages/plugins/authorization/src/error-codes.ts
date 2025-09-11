export const AUTHORIZATION_ERROR_CODES = {
  PERMISSION_NOT_FOUND: "Permission not found",
  PERMISSION_SET_NOT_FOUND: "Permission set not found",
  PERMISSION_ALREADY_ASSIGNED_TO_PERMISSION_SET: "Permission is already assigned to permission set",
  USER_ALREADY_ASSIGNED_TO_PERMISSION_SET: "User is already assigned to permission set",
  MEMBER_ALREADY_ASSIGNED_TO_PERMISSION_SET: "Member is already assigned to permission set",
  USER_ALREADY_ASSIGNED_TO_PERMISSION: "User is already assigned to permission",
  MEMBER_ALREADY_ASSIGNED_TO_PERMISSION: "Member is already assigned to permission",
} as const

export const BASE_AUTHORIZATION_VALIDATION_ERRORS = {
  INVALID_USER_ID_FORMAT: "Invalid user ID format",
  INVALID_MEMBER_ID_FORMAT: "Invalid member ID format",
  INVALID_PERMISSION_ID_FORMAT: "Invalid permission ID format",
  INVALID_PERMISSION_SET_ID_FORMAT: "Invalid permission set ID format",
  INVALID_ORGANIZATION_ID_FORMAT: "Invalid organization ID format",
  INVALID_SUBJECT_FORMAT: "Invalid subject format",
  INVALID_ACTION_FORMAT: "Invalid action format",
  INVALID_FIELDS_FORMAT: "Invalid fields format",
  INVALID_CONDITIONS_FORMAT: "Invalid conditions format",
  INVALID_TEMPLATE_STRING: "Invalid template string - contains invalid placeholders",
  REQUIRED_FIELD_MISSING: "Required field is missing",
} as const
