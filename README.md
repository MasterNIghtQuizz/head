# Monorepo Project

This project is a Yarn workspace-based monorepo using **Yarn v4.11.0**.

## Prerequisites

This project uses Yarn 4.11.0 via Corepack. If you haven't set it up yet:

```bash
# Enable Corepack (ships with Node.js ≥16.10)
corepack enable

# Set Yarn version to 4.11.0
corepack prepare yarn@4.11.0 --activate
```

Or if you already have Yarn installed:

```bash
yarn set version 4.11.0
```

## Project Structure

This monorepo contains the following packages:

### `packages/common/logger`
- **Package name**: `common-logger`
- **Purpose**: Logging utility using Pino and Pino-pretty
- **Version**: 1.1.0

### `packages/core`
- **Package name**: `@monorepo/core`
- **Purpose**: Core application with Fastify server setup and MySQL integration
- **Version**: 1.0.0

### `packages/utils`
- **Package name**: `@monorepo/utils`
- **Purpose**: Utility functions and services that depend on core and logger
- **Version**: 1.0.0
- **Dependencies**: Uses workspace references to `@monorepo/core` and `common-logger`

## Getting Started

### Installation

Install all dependencies for the workspace:

```bash
yarn install
```

### Available Scripts

#### Root-level Scripts

From the project root:

- `yarn lint` - Run ESLint and TypeScript compiler checks
- `yarn tsc` - Run TypeScript compiler

#### Workspace-specific Scripts

Run scripts in specific packages:

- `yarn workspace @monorepo/core start` - Start the core application
- `yarn workspace @monorepo/utils start` - Start the utils application

Or navigate to a specific package and run:

```bash
cd packages/core
yarn start
```

### Working with Yarn Workspaces

To add a dependency to a specific package:

```bash
yarn workspace @monorepo/core add <package-name>
```

To add a dev dependency:

```bash
yarn workspace @monorepo/core add -D <package-name>
```

To run a command in all workspaces:

```bash
yarn workspaces foreach run <command>
```

## Learn More

- [Yarn Workspaces Documentation](https://yarnpkg.com/features/workspaces)
- [Fastify Documentation](https://fastify.dev/docs/latest/)
- [Pino Logger Documentation](https://getpino.io/)
