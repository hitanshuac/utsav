/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**", "*.d.ts"]
  },
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    rules: {
      "no-console": "off",
      "no-debugger": "error",
      "no-var": "error",
      "prefer-const": "warn"
    }
  }
];
