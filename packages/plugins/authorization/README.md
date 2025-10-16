# @cambacodes/casl-authorization

Plugin for Better Auth featuring CASL integration, multi-tenant support, and role-based access control.

## Overview

Built on the Centralized Access Control Library (CASL), this plugin provides sophisticated permission management with support for dynamic conditions, permission sets, and organization-scoped authorization across 26 REST endpoints.

## Features

- **🔐 CASL Integration**: Full-featured ability management with template interpolation
- **🏢 Multi-Tenant Architecture**: Organization-scoped permissions with flexible authorization modes
- **🎯 Field-Level Security**: Granular access control with complex condition evaluation
- **📦 Permission Sets**: Hierarchical permission grouping for scalable role management
- **⚡ Batch Operations**: High-performance bulk operations
- **🚦 Route Middleware**: Declarative route-based authorization with CASL rules
- **🔒 Type Safety**: Complete TypeScript coverage with Zod validation
- **📋 OpenAPI Specs**: Auto-generated API documentation with schema validation

## Installation

```bash
bun add @cambacodes/casl-authorization
```

## Prerequisites

- **Better Auth**: ^1.3.10-beta.1
- **Zod OpenAPI**: Auto-generated API documentation using zod-openapi

## Quick Start

### Basic Setup

```typescript
import { betterAuth } from "better-auth";
import { authorization } from "@cambacodes/casl-authorization";

const auth = betterAuth({
  plugins: [
    authorization({
      mode: "both",
      pagination: { defaultLimit: 50 },
      batch: { chunkSize: 100 },
      maxRelationLimit: 10000,
    }),
  ],
});
```

## Authorization Modes

Choose the appropriate mode based on your multi-tenant requirements:

### "user" Mode

Direct user permission assignment without organization context:

```typescript
authorization({ mode: "user" }); // organizationId not required
```

### "member" Mode

Organization-scoped permissions through member roles:

```typescript
authorization({ mode: "member" }); // organizationId required
```

### "both" Mode

Flexible support for both user-level and organization-scoped permissions:

```typescript
authorization({ mode: "both" }); // organizationId optional
```

## Client Integration

```typescript
import { createAuthClient } from "better-auth/client";
import { authorizationClient } from "@cambacodes/casl-authorization/client";

const client = createAuthClient({
  plugins: [authorizationClient],
});
```

## API Endpoints

### Generic Authorization (2 endpoints)

- **GET** `/check-permission` - CASL rule evaluation with context
- **POST** `/get-ability` - Retrieve user permission set for client-side CASL

### Permission Management (11 endpoints)

**Core Operations:**

- `POST /create-permission` - Single permission creation (returns 201)
- `POST /create-permissions` - Bulk permission creation (returns 201)
- `GET /get-permission` - Single permission with relationships
- `GET /list-permissions` - Paginated permission listing
- `POST /update-permission` - Permission modification (returns 200)
- `POST /delete-permission` - Single permission removal with cascading cleanup
- `POST /delete-permissions` - Bulk permission deletion with cascading cleanup

**Assignment Operations:**

- `POST /assign-users-to-permission` - Direct user permission grants
- `POST /assign-members-to-permission` - Organization member permission grants
- `POST /remove-users-from-permission` - Revoke user permissions
- `POST /remove-members-from-permission` - Revoke member permissions

### Permission Sets (13 endpoints)

**Core Operations:**

- `POST /create-permission-set` - Single set creation (returns 201)
- `POST /create-permission-sets` - Bulk set creation (returns 201)
- `GET /get-permission-set` - Single set with relationships
- `GET /list-permission-sets` - Paginated set listing
- `POST /update-permission-set` - Set modification (returns 200)
- `POST /delete-permission-set` - Single set removal with cascading cleanup
- `POST /delete-permission-sets` - Bulk set deletion with cascading cleanup

**Assignment Operations:**

- `POST /assign-users-to-permission-set` - User set grants
- `POST /assign-members-to-permission-set` - Member set grants
- `POST /assign-permissions-to-permission-set` - Add permissions to sets
- `POST /remove-users-from-permission-set` - Revoke user sets
- `POST /remove-members-from-permission-set` - Revoke member sets
- `POST /remove-permissions-from-permission-set` - Remove permissions from sets

## Advanced Configuration

### Route-Based Authorization

```typescript
authorization({
  mode: "both",
  routeMiddleware: {
    callback: (can, route) => {
      switch (route) {
        case "/create-permission":
          return can("create", "permission");
        case "/list-permissions":
          return can("read", "permission");
        default:
          return false;
      }
    },
    protectedRoutes: ["/create-permission", "/list-permissions"],
  },
});
```

### Batch Processing

```typescript
authorization({
  batch: { chunkSize: 50 }, // Process assignments in chunks
  maxRelationLimit: 5000, // Limit related entity fetches
});
```

## CASL Integration

Permission rules support dynamic conditions with template interpolation:

```typescript
// Example permission with dynamic conditions
{
  action: "read",
  subject: "Document",
  conditions: {
    "ownerId": "{{user.id}}", // Mustache template interpolated
    "status": ["published", "draft"]
  }
}
```

## Data Model

### Core Entities

- **Permissions**: Action-subject-condition tuples
- **Permission Sets**: Collections of permissions
- **User Permissions**: Direct user assignments
- **Member Permissions**: Organization member assignments
- **permission_permission_set**: Many-to-many permission relationships
- **user_permission_set**: User permission set assignments
- **member_permission_set**: Member permission set assignments

### Cascading Deletion

All delete operations automatically cascade:

- Permission deletion removes user/member assignments and set memberships
- Permission set deletion removes user/member assignments and permission memberships

## TypeScript Support

Full type safety with exported interfaces:

```typescript
import type {
  AuthorizationOptions,
  Permission,
  PermissionSet,
  PermissionResponse,
  CaslPermission,
} from "@cambacodes/casl-authorization/types";
```

## Error Handling

Comprehensive error responses with status codes:

- `400` - Bad request validation errors
- `401/403` - Authentication/authorization failures
- `404` - Resource not found
- `409` - Constraint violations
- `500` - Internal server errors

## Performance Considerations

- **Batch Operations**: Efficient bulk processing
- **Transaction Support**: Atomic operations with rollback capabilities
- **Pagination**: Configurable limits to prevent memory issues
- **Relation Limits**: Controlled eager loading of related entities

## License

MIT
