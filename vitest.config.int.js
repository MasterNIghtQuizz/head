import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.int.spec.{js,ts}"],
    exclude: ["**/node_modules/**"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
