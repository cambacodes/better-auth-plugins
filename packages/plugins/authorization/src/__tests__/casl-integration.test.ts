import { describe, expect, it } from "bun:test"
import type { MongoQuery } from "@casl/ability"
import type { CaslPermission } from "../types"
import {
  createAbilityFromPermissions,
  interpolateConditions,
  sortPermissionsByPriority,
  validateAndSanitizeContext,
} from "../utils"
import { permissionSource } from "../validation"

describe("CASL Integration Improvements", () => {
  describe("Permission Priority Ordering", () => {
    it("should order permissions by source priority (member permission set → member direct → user permission set → user direct)", () => {
      const permissions: CaslPermission[] = [
        {
          action: "read",
          createdAt: new Date("2024-01-01"),
          id: "4",
          inverted: false,
          name: "user-direct",
          reason: "",
          source: permissionSource.USER_DIRECT,
          subject: "post",
        },
        {
          action: "read",
          createdAt: new Date("2024-01-01"),
          id: "1",
          inverted: false,
          name: "member-permission-set",
          reason: "",
          source: permissionSource.MEMBER_PERMISSION_SET,
          subject: "post",
        },
        {
          action: "read",
          createdAt: new Date("2024-01-01"),
          id: "3",
          inverted: false,
          name: "user-permission-set",
          reason: "",
          source: permissionSource.USER_PERMISSION_SET,
          subject: "post",
        },
        {
          action: "read",
          createdAt: new Date("2024-01-01"),
          id: "2",
          inverted: false,
          name: "member-direct",
          reason: "",
          source: permissionSource.MEMBER_DIRECT,
          subject: "post",
        },
      ]

      const sorted = sortPermissionsByPriority(permissions)

      expect(sorted[0].source).toBe(permissionSource.MEMBER_PERMISSION_SET)
      expect(sorted[1].source).toBe(permissionSource.MEMBER_DIRECT)
      expect(sorted[2].source).toBe(permissionSource.USER_PERMISSION_SET)
      expect(sorted[3].source).toBe(permissionSource.USER_DIRECT)
    })

    it("should order allow rules before deny rules within same source", () => {
      const permissions: CaslPermission[] = [
        {
          action: "read",
          createdAt: new Date("2024-01-01"),
          id: "2",
          inverted: true, // deny rule
          name: "deny-rule",
          reason: "Access denied",
          source: permissionSource.USER_DIRECT,
          subject: "post",
        },
        {
          action: "read",
          createdAt: new Date("2024-01-01"),
          id: "1",
          inverted: false, // allow rule
          name: "allow-rule",
          reason: "",
          source: permissionSource.USER_DIRECT,
          subject: "post",
        },
      ]

      const sorted = sortPermissionsByPriority(permissions)

      expect(sorted[0].inverted).toBe(false) // allow rule first
      expect(sorted[1].inverted).toBe(true) // deny rule second
    })

    it("should order general rules before specific rules", () => {
      const permissions: CaslPermission[] = [
        {
          action: "read",
          conditions: { authorId: "{{user.id}}" } as MongoQuery<unknown>,
          createdAt: new Date("2024-01-01"),
          id: "2",
          inverted: false,
          name: "specific-with-conditions",
          reason: "",
          source: permissionSource.USER_DIRECT,
          subject: "post",
        },
        {
          action: "read",
          createdAt: new Date("2024-01-01"),
          fields: ["title", "content"], // somewhat specific
          id: "3",
          inverted: false,
          name: "specific-with-fields",
          reason: "",
          source: permissionSource.USER_DIRECT,
          subject: "post",
        },
        {
          action: "read",
          createdAt: new Date("2024-01-01"),
          id: "1",
          inverted: false,
          name: "general-rule",
          reason: "",
          source: permissionSource.USER_DIRECT,
          subject: "post", // general rule
        },
      ]

      const sorted = sortPermissionsByPriority(permissions)

      expect(sorted[0].name).toBe("general-rule")
      expect(sorted[1].name).toBe("specific-with-fields")
      expect(sorted[2].name).toBe("specific-with-conditions")
    })

    it("should provide deterministic ordering by timestamp and ID", () => {
      const permissions: CaslPermission[] = [
        {
          action: "read",
          createdAt: new Date("2024-01-02"), // newer
          id: "b",
          inverted: false,
          name: "newer",
          reason: "",
          source: permissionSource.USER_DIRECT,
          subject: "post",
        },
        {
          action: "read",
          createdAt: new Date("2024-01-01"), // older
          id: "a",
          inverted: false,
          name: "older",
          reason: "",
          source: permissionSource.USER_DIRECT,
          subject: "post",
        },
      ]

      const sorted = sortPermissionsByPriority(permissions)

      expect(sorted[0].name).toBe("older") // older timestamp first
      expect(sorted[1].name).toBe("newer") // newer timestamp second
    })
  })

  describe("Secure Template Interpolation", () => {
    it("should allow template variables", () => {
      const permission: CaslPermission = {
        action: "read",
        conditions: { authorId: "{{user.id}}" } as MongoQuery<unknown>,
        createdAt: new Date(),
        id: "1",
        inverted: false,
        name: "test",
        reason: "",
        source: permissionSource.USER_DIRECT,
        subject: "post",
      }

      const context = { user: { id: "123" } }
      const result = interpolateConditions(permission, context)

      expect(result.conditions).toEqual({ authorId: "123" } as MongoQuery<unknown>)
    })

    it("should reject unauthorized template variables", () => {
      const permission: CaslPermission = {
        action: "read",
        conditions: { malicious: "{{process.env}}" } as MongoQuery<unknown>, // unauthorized variable
        createdAt: new Date(),
        id: "1",
        inverted: false,
        name: "test",
        reason: "",
        source: permissionSource.USER_DIRECT,
        subject: "post",
      }

      const context = { process: { env: "secret" } }
      const result = interpolateConditions(permission, context)

      // Should return original conditions without interpolation
      expect(result.conditions).toEqual({ malicious: "{{process.env}}" } as MongoQuery<unknown>)
    })

    it("should handle template interpolation errors gracefully", () => {
      const permission: CaslPermission = {
        action: "read",
        conditions: { authorId: "{{user.id}}" } as MongoQuery<unknown>,
        createdAt: new Date(),
        id: "1",
        inverted: false,
        name: "test",
        reason: "",
        source: permissionSource.USER_DIRECT,
        subject: "post",
      }

      // Context without required user object
      const context = {}
      const result = interpolateConditions(permission, context)

      // Should handle gracefully and return interpolated result (empty string in this case)
      expect(result.conditions).toEqual({ authorId: "" } as MongoQuery<unknown>)
    })

    it("should validate and sanitize context objects", () => {
      const unsafeContext = {
        maliciousKey: { dangerous: true },
        unauthorized: "should be removed",
        user: { id: "123", name: "John" },
      }

      const validation = validateAndSanitizeContext(unsafeContext)

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain("Unauthorized context key: maliciousKey")
      expect(validation.errors).toContain("Unauthorized context key: unauthorized")
      expect(validation.sanitizedContext).toHaveProperty("user")
      expect(validation.sanitizedContext).not.toHaveProperty("maliciousKey")
      expect(validation.sanitizedContext).not.toHaveProperty("unauthorized")
    })
  })

  describe("CASL Ability Creation", () => {
    it("should create ability with proper rule ordering", () => {
      const permissions: CaslPermission[] = [
        {
          action: "read",
          createdAt: new Date(),
          id: "1",
          inverted: false,
          name: "allow-read",
          reason: "",
          source: permissionSource.USER_PERMISSION_SET,
          subject: "post",
        },
        {
          action: "read",
          conditions: { status: "draft" } as MongoQuery<unknown>,
          createdAt: new Date(),
          id: "2",
          inverted: true,
          name: "deny-specific",
          reason: "Cannot read drafts",
          source: permissionSource.USER_DIRECT, // higher priority
          subject: "post",
        },
      ]

      const context = { user: { id: "123" } }
      const ability = createAbilityFromPermissions(permissions, context)

      // Should be able to read posts in general
      expect(ability.can("read", "post")).toBe(true)

      // Should not be able to read draft posts (deny rule with higher priority)
      expect(ability.can("read", { __type: "post", status: "draft" })).toBe(false)
    })

    it("should handle context validation in ability creation", () => {
      const permissions: CaslPermission[] = [
        {
          action: "read",
          conditions: { authorId: "{{user.id}}" } as MongoQuery<unknown>,
          createdAt: new Date(),
          id: "1",
          inverted: false,
          name: "test",
          reason: "",
          source: permissionSource.USER_DIRECT,
          subject: "post",
        },
      ]

      const unsafeContext = {
        __proto__: { malicious: true },
        user: { id: "123" },
      }

      // Should not throw and should create ability with sanitized context
      const ability = createAbilityFromPermissions(permissions, unsafeContext)
      expect(ability).toBeDefined()
    })
  })
})
