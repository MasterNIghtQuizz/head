import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.spec.{js,ts}"],
    alias: {
      "@monorepo/api-gateway": new URL(
        "./packages/api-gateway/src",
        import.meta.url,
      ).pathname,
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      all: true,
      include: ["packages/**/*.js", "packages/**/*.ts"],
      exclude: [
        "**/*.d.ts",
        "**/*.config.{js,ts}",
        "**/index.{js,ts}",
        "**/main.{js,ts}",
        "**/app.{js,ts}",
        "**/config.{js,ts}",
        "**/database.{js,ts}",
        "**/run-migrations.{js,ts}",

        "**/*.spec.{js,ts}",
        "**/tests/**",
        "**/node_modules/**",
        "**/dist/**",
        "**/migrations/**",

        "packages/common/core/**",
        "packages/common/errors/**",
        "packages/common/logger/**",
        "packages/common/swagger/**",
        "packages/common/config/**",
        "packages/common/contracts/**",
        "packages/common/database/**",

        "packages/api-gateway/**/helpers/**",
        "packages/api-gateway/**/healthcheck/**",
        "packages/ms-*/**/helpers/**",
        "packages/ms-*/**/healthcheck/**",
      ],
    },
  },
});
