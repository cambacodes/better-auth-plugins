/** biome-ignore-all lint/suspicious/noExplicitAny: <required> */
import { generateId } from "better-auth"
import type { AuthPluginSchema } from "better-auth/types"
import z from "zod"
import type { AuthorizationOptions } from "./types"

export const permissionSetSchema = z.object({
  id: z.string().default(generateId),
  name: z.string(),
  description: z.string().nullable().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().nullable().optional(),
})

export const permissionSchema = z.object({
  id: z.string().default(generateId),
  name: z.string(),
  subject: z.string(),
  action: z.string(),
  fields: z.string().nullable().optional(),
  conditions: z.string().nullable().optional(),
  inverted: z.boolean().default(false),
  reason: z.string().nullable().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().nullable().optional(),
  expiresAt: z.date().nullable().optional(),
})

export type PermissionSet = z.infer<typeof permissionSetSchema>
export type Permission = z.infer<typeof permissionSchema>
export type PermissionSetInput = z.input<typeof permissionSetSchema>
export type PermissionInput = z.input<typeof permissionSchema>

export function createAuthorizationSchema({ mode = "user" }: AuthorizationOptions) {
  const isUserOrBoth = mode === "user" || mode === "both"
  const isMemberOrBoth = mode === "member" || mode === "both"

  return {
    permissionSet: {
      fields: {
        id: { type: "string", required: true },
        name: { type: "string", required: true },
        description: { type: "string", required: false },
        ...(isMemberOrBoth && {
          organizationId: {
            type: "string",
            required: true,
            references: {
              model: "organization",
              field: "id",
            },
          },
        }),
        createdAt: { type: "date", required: true, defaultValue: () => new Date() },
        updatedAt: { type: "date", required: false },
      },
    },
    permission: {
      fields: {
        id: { type: "string", required: true },
        name: { type: "string", required: true },
        ...(isMemberOrBoth && {
          organizationId: {
            type: "string",
            required: true,
            references: {
              model: "organization",
              field: "id",
            },
          },
        }),
        subject: {
          type: "string",
          required: true,
        },
        action: {
          type: "string",
          required: true,
        },
        fields: { type: "string", required: false },
        conditions: { type: "string", required: false },
        inverted: { type: "boolean", required: true, defaultValue: false },
        reason: { type: "string", required: false },
        createdAt: { type: "date", required: true, defaultValue: () => new Date() },
        updatedAt: { type: "date", required: false },
        expiresAt: { type: "date", required: false },
      },
    },
    permissionPermissionSet: {
      fields: {
        permissionId: {
          type: "string",
          required: true,
          references: {
            model: "permission",
            field: "id",
          },
        },
        permissionSetId: {
          type: "string",
          required: true,
          references: {
            model: "permissionSet",
            field: "id",
          },
        },
      },
    },
    ...(isMemberOrBoth && {
      memberPermission: {
        fields: {
          memberId: {
            type: "string",
            required: true,
            references: {
              model: "member",
              field: "id",
            },
          },
          permissionId: {
            type: "string",
            required: true,
            references: {
              model: "permission",
              field: "id",
            },
          },
        },
      },
      memberPermissionSet: {
        fields: {
          memberId: {
            type: "string",
            required: true,
            references: {
              model: "member",
              field: "id",
            },
          },
          permissionSetId: {
            type: "string",
            required: true,
            references: {
              model: "permissionSet",
              field: "id",
            },
          },
        },
      },
    }),
    ...(isUserOrBoth && {
      userPermission: {
        fields: {
          userId: {
            type: "string",
            required: true,
            references: {
              model: "user",
              field: "id",
            },
          },
          permissionId: {
            type: "string",
            required: true,
            references: {
              model: "permission",
              field: "id",
            },
          },
        },
      },
      userPermissionSet: {
        fields: {
          userId: {
            type: "string",
            required: true,
            references: {
              model: "user",
              field: "id",
            },
          },
          permissionSetId: {
            type: "string",
            required: true,
            references: {
              model: "permissionSet",
              field: "id",
            },
          },
        },
      },
    }),
  } satisfies AuthPluginSchema
}

export type schema = ReturnType<typeof createAuthorizationSchema>
