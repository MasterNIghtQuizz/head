# CI documentation

This repository uses the GitHub Actions workflow defined in `.github/workflows/main.yml`.

## How the CI works

The workflow is triggered in two cases:

- `push` on `feat/CI-1.0` and `main`
- `pull_request` targeting `main`

The workflow has two jobs.

### 1. `detect-changes`

This job decides which packages must be checked.

On a regular `push`, it uses `dorny/paths-filter@v2` to build a list of changed packages from the configured path rules. Each filter key is the workspace name that will later be used in the matrix.

Current filters:

- `@monorepo/api-gateway` -> `packages/api-gateway/src/**`
- `@monorepo/ms-quizz-management` -> `packages/ms-quizz-management/src/**`
- `@monorepo/ms-user` -> `packages/ms-user/src/**`
- `common-auth` -> `packages/common/auth/src/**`
- `common-axios` -> `packages/common/axios/src/**`
- `common-config` -> `packages/common/config/src/**`
- `common-contracts` -> `packages/common/contracts/src/**`
- `common-core` -> `packages/common/core/src/**`
- `common-crypto` -> `packages/common/crypto/src/**`
- `common-kafka` -> `packages/common/kafka/src/**`

On a `pull_request` to `main`, the path filter is bypassed by the `all` step. In that case, the workflow outputs the full package list so the whole CI runs.

The final output of this job is the `packages` JSON array.

### 2. `quality`

This job runs only if the `packages` output is not empty.

It creates a matrix from the `packages` JSON array and, for each package:

- checks out the repository
- enables Corepack
- installs Node.js `24.14.0`
- installs dependencies with `yarn install --frozen-lockfile`
- runs `yarn workspace <package> lint`
- runs tests only if the workspace exposes a `test` script

The current test check is:

```sh
yarn workspace <package> run | grep -q 'test'
```

If the string `test` is found, the workflow runs:

```sh
yarn workspace <package> run test
```

Otherwise, the workflow skips tests for that package.

## How to add a new package to the CI

When you add a new workspace package, update the workflow in two places.

### 1. Add it to the path filters

In the `Detect changes in packages` step, add a new filter entry.

Example for a new package named `common-logger` located in `packages/common/logger`:

```yaml
common-logger:
	- 'packages/common/logger/src/**'
```

Example for a scoped package such as `@monorepo/new-service` located in `packages/new-service`:

```yaml
"@monorepo/new-service":
	- 'packages/new-service/src/**'
```

Important:

- if the package name starts with `@`, quote the YAML key
- the filter key must match the real workspace name from that package's `package.json`

### 2. Add it to the full PR package list

In the `Set all packages for a PR to main` step, add the workspace name to the JSON array that is written to `$GITHUB_OUTPUT`.

Example:

```json
"common-logger"
```

or

```json
"@monorepo/new-service"
```

## Checklist for a new package

Before expecting CI to work for a new package, make sure:

- the package is a Yarn workspace
- the `name` field in its `package.json` matches the name used in the workflow
- the package has a `lint` script, because lint is always executed
- the package has a `test` script if you want tests to run for it
- the filter path points to the correct source directory

## Common pitfalls

- forgetting to quote package names that start with `@`
- adding a filter entry but forgetting the full PR list
- using a name in the workflow that does not match the workspace `package.json`
- forgetting to add a `lint` script to the package
