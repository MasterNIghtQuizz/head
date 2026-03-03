module.exports = {
  root: true,
  env: {
    node: true,
    es2024: true,
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["unicorn", "import", "jsdoc", "prettier"],
  extends: [
    "eslint:recommended",
    "plugin:jsdoc/recommended",
    "plugin:prettier/recommended",
  ],
  rules: {
    "prettier/prettier": "error",
    "unicorn/filename-case": [
      "error",
      {
        case: "kebabCase",
      },
    ],
    "import/order": [
      "error",
      {
        groups: [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index",
        ],
        "newlines-between": "always",
        alphabetize: { order: "asc", case: "insensitive" },
      },
    ],
    "no-console": "warn",
    "jsdoc/require-returns-description": "off",
    "jsdoc/require-param-description": "off",
    "jsdoc/no-undefined-types": "off", // Helpful when using .d.ts files
    "padding-line-between-statements": [
      "error",
      { blankLine: "always", prev: "*", next: "return" },
      { blankLine: "always", prev: ["const", "let", "var"], next: "*" },
      {
        blankLine: "any",
        prev: ["const", "let", "var"],
        next: ["const", "let", "var"],
      },
    ],
  },
};
