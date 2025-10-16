import type { BetterAuthPluginDBSchema } from "better-auth/db"
import type { AuthorizationConfig } from "./types"

export function createAuthorizationSchema({ mode = "user" }: AuthorizationConfig) {
  const isUserOrBoth = mode === "user" || mode === "both"
  const isMemberOrBoth = mode === "member" || mode === "both"

  return {
    permission: {
      fields: {
        id: { required: true, type: "string" },
        name: { required: true, type: "string" },
        ...(isMemberOrBoth && {
          organizationId: {
            references:
              mode === "member"
                ? {
                    field: "id",
                    model: "organization",
                  }
                : undefined,
            required: mode === "member",
            type: "string",
          },
        }),
        action: {
          required: true,
          type: "string",
        },
        conditions: { required: false, type: "string" },
        createdAt: { defaultValue: () => new Date(), required: true, type: "date" },
        expiresAt: { required: false, type: "date" },
        fields: { required: false, type: "string" },
        inverted: { defaultValue: false, required: true, type: "boolean" },
        reason: { required: false, type: "string" },
        subject: {
          required: true,
          type: "string",
        },
        updatedAt: { required: false, type: "date" },
      },
    },
    permissionPermissionSet: {
      fields: {
        permissionId: {
          references: {
            field: "id",
            model: "permission",
          },
          required: true,
          type: "string",
        },
        permissionSetId: {
          references: {
            field: "id",
            model: "permissionSet",
          },
          required: true,
          type: "string",
        },
      },
    },
    permissionSet: {
      fields: {
        description: { required: false, type: "string" },
        id: { required: true, type: "string" },
        name: { required: true, type: "string" },
        ...(isMemberOrBoth && {
          organizationId: {
            references:
              mode === "member"
                ? {
                    field: "id",
                    model: "organization",
                  }
                : undefined,
            required: mode === "member",
            type: "string",
          },
        }),
        createdAt: { defaultValue: () => new Date(), required: true, type: "date" },
        updatedAt: { required: false, type: "date" },
      },
    },
    ...(isMemberOrBoth && {
      memberPermission: {
        fields: {
          memberId: {
            references: {
              field: "id",
              model: "member",
            },
            required: true,
            type: "string",
          },
          permissionId: {
            references: {
              field: "id",
              model: "permission",
            },
            required: true,
            type: "string",
          },
        },
      },
      memberPermissionSet: {
        fields: {
          memberId: {
            references: {
              field: "id",
              model: "member",
            },
            required: true,
            type: "string",
          },
          permissionSetId: {
            references: {
              field: "id",
              model: "permissionSet",
            },
            required: true,
            type: "string",
          },
        },
      },
    }),
    ...(isUserOrBoth && {
      userPermission: {
        fields: {
          permissionId: {
            references: {
              field: "id",
              model: "permission",
            },
            required: true,
            type: "string",
          },
          userId: {
            references: {
              field: "id",
              model: "user",
            },
            required: true,
            type: "string",
          },
        },
      },
      userPermissionSet: {
        fields: {
          permissionSetId: {
            references: {
              field: "id",
              model: "permissionSet",
            },
            required: true,
            type: "string",
          },
          userId: {
            references: {
              field: "id",
              model: "user",
            },
            required: true,
            type: "string",
          },
        },
      },
    }),
  } satisfies BetterAuthPluginDBSchema
}

export type schema = ReturnType<typeof createAuthorizationSchema>
