# Better Auth Plugins

A monorepo containing plugins for the Better Auth framework.

## Packages

- **[@cambacodes/authorization](/packages/plugins/authorization)**: Comprehensive CASL-based authorization with role-based access control

## Getting Started

```bash
# Install dependencies
bun install

# Development workflow
bun run dev          # Start development servers
bun run build        # Build all packages
bun run test         # Run test suites
bun run lint         # Code quality checks
bun run check-types  # TypeScript validation
```

## Development

This workspace uses:
- **Turbo**: Monorepo build orchestration
- **Biome**: Fast formatting and linting
- **TypeScript**: Type safety across packages
- **Bun**: Fast package management and runtime

## Requirements

- **Bun**: >=1.2.4
- **Better Auth**: See individual package requirements
