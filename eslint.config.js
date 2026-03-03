import js from "@eslint/js";
import globals from "globals";
import prettier from "eslint-plugin-prettier";
import jsdoc from "eslint-plugin-jsdoc";
import unicorn from "eslint-plugin-unicorn";

const nodeGlobals =
  globals && globals.node
    ? globals.node
    : globals && globals.default && globals.default.node
      ? globals.default.node
      : {};

export default [
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2025,
      sourceType: "module",
      globals: {
        ...nodeGlobals,
      },
    },
    plugins: {
      prettier,
      jsdoc,
      unicorn,
    },
    rules: {
      "prettier/prettier": "warn",
      "no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-console": "warn",
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "always"],
      curly: ["error", "all"],
      "jsdoc/require-param-type": "off",
      "jsdoc/require-returns-type": "off",
      "unicorn/prefer-node-protocol": "warn",
      "unicorn/no-process-exit": "warn",
    },
  },
  {
    files: ["**/run-migrations.js", "**/run-*.js"],
    rules: {
      "unicorn/no-process-exit": "off",
    },
  },
  {
    ignores: [
      "**/node_modules/**",
      "**/.yarn/**",
      "**/dist/**",
      "**/coverage/**",
      "**/.pnp.*",
    ],
  },
];
