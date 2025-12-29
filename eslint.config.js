// ESLint configuration file for the SalesPulse application
// Configures linting rules for TypeScript and React code
// Uses recommended configurations and custom rules for code quality

import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

// Export the ESLint configuration
export default tseslint.config(
  // Ignore patterns for files that should not be linted
  { ignores: ["dist"] },
  {
    // Extend recommended configurations
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    // File patterns to apply these rules to
    files: ["**/*.{ts,tsx}"],
    // Language options for the linter
    languageOptions: {
      // ECMAScript version
      ecmaVersion: 2020,
      // Global variables available in the browser environment
      globals: globals.browser,
    },
    // Plugins to use
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    // Custom rules configuration
    rules: {
      // React Hooks recommended rules
      ...reactHooks.configs.recommended.rules,
      // React Refresh rule to ensure only components are exported
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      // Disable unused variables rule (handled by TypeScript)
      "@typescript-eslint/no-unused-vars": "off",
    },
  }
);