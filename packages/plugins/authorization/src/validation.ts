import { generateId } from "better-auth"
import z from "zod"

export const permissionSource = {
  USER_DIRECT: "user_direct",
  USER_PERMISSION_SET: "user_permission_set",
  MEMBER_DIRECT: "member_direct",
  MEMBER_PERMISSION_SET: "member_permission_set",
} as const

export const permissionBaseSchema = z.object({
  id: z.string().default(generateId),
  name: z.string(),
  action: z.string(),
  subject: z.string(),
  fields: z.array(z.string().min(1)).min(1).optional(),
  conditions: z.record(z.string(), z.unknown()).optional(),
  inverted: z.boolean().default(false),
  reason: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().optional(),
  expiresAt: z.date().optional(),
})

export const permissionSetBaseSchema = z.object({
  id: z.string().default(generateId),
  name: z.string(),
  description: z.string(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().optional(),
})
