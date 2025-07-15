import js from "@eslint/js";
import globals from "globals";

export default [
  {
    files: ["**/*.js"],
    ignores: ["**/node_modules/**"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.es2021,
        ...globals.serviceworker,
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-restricted-globals": ["error", "name", "length"],
      "prefer-arrow-callback": "error",
      "quotes": ["error", "double", { allowTemplateLiterals: true }],
      "max-len": ["error", { code: 200 }],
      "require-jsdoc": "off",
      "no-console": "warn",
      "semi": ["error", "always"],
      "indent": ["error", 2],
      "comma-dangle": ["error", "always-multiline"],
      "import/no-unresolved": "off",
      "import/extensions": "off",
    },
  },
  {
    files: ["functions/**/*.js"],
    rules: {
      "no-console": "off",
    },
  }
];
