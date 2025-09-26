const permissionRoutes = {
  ASSIGN_MEMBERS_TO_PERMISSION: "/assign-members-to-permission",
  ASSIGN_USERS_TO_PERMISSION: "/assign-users-to-permission",
  CREATE_PERMISSION: "/create-permission",
  CREATE_PERMISSIONS: "/create-permissions",
  DELETE_PERMISSION: "/delete-permission",
  DELETE_PERMISSIONS: "/delete-permissions",
  DOWNLOAD_PERMISSIONS_CSV: "/download-permissions-csv",
  GET_PERMISSION: "/get-permission",
  LIST_PERMISSIONS: "/list-permissions",
  REMOVE_MEMBERS_FROM_PERMISSION: "/remove-members-from-permission",
  REMOVE_USERS_FROM_PERMISSION: "/remove-users-from-permission",
  UPDATE_PERMISSION: "/update-permission",
  UPLOAD_PERMISSIONS_CSV: "/upload-permissions-csv",
} as const

const permissionSetRoutes = {
  ASSIGN_MEMBERS_TO_PERMISSION_SET: "/assign-members-to-permission-set",
  ASSIGN_PERMISSIONS_TO_PERMISSION_SET: "/assign-permissions-to-permission-set",
  ASSIGN_USERS_TO_PERMISSION_SET: "/assign-users-to-permission-set",
  CREATE_PERMISSION_SET: "/create-permission-set",
  CREATE_PERMISSION_SETS: "/create-permission-sets",
  DELETE_PERMISSION_SET: "/delete-permission-set",
  DELETE_PERMISSION_SETS: "/delete-permission-sets",
  DOWNLOAD_PERMISSION_SETS_CSV: "/download-permission-sets-csv",
  GET_PERMISSION_SET: "/get-permission-set",
  LIST_PERMISSION_SETS: "/list-permission-sets",
  REMOVE_MEMBERS_FROM_PERMISSION_SET: "/remove-members-from-permission-set",
  REMOVE_PERMISSIONS_FROM_PERMISSION_SET: "/remove-permissions-from-permission-set",
  REMOVE_USERS_FROM_PERMISSION_SET: "/remove-users-from-permission-set",
  UPDATE_PERMISSION_SET: "/update-permission-set",
  UPLOAD_PERMISSION_SETS_CSV: "/upload-permission-sets-csv",
} as const

const genericRoutes = {
  CHECK_PERMISSION: "/check-permission",
  GET_ABILITY: "/get-ability",
} as const

export const ROUTES = {
  ...permissionRoutes,
  ...permissionSetRoutes,
  ...genericRoutes,
}
