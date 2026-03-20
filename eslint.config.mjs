import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Scripts and migrations are not production code
    "src/scripts/**",
    "scripts/**",
    "prisma/**",
  ]),
  // Project-specific rule overrides
  {
    rules: {
      // Prisma + Next.js dynamic data frequently requires `any` for flexibility.
      // Downgrade from error to warn so the build doesn't break, but keep visibility.
      "@typescript-eslint/no-explicit-any": "warn",
      // Unused vars in catch blocks (catch (e)) are idiomatic in TS
      "@typescript-eslint/no-unused-vars": ["warn", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_|^e$|^err$|^error$"
      }],
      // Unescaped HTML entities (' ") are common in French text — easier to manage via warn
      "react/no-unescaped-entities": "warn",
      // Allow require() in scripts and dynamic imports (common in Next.js config files)
      "@typescript-eslint/no-require-imports": "warn",

      // Intentional pattern: setState on mount in hooks and route-change handlers
      "react-hooks/set-state-in-effect": "warn",

      "@next/next/no-img-element": "warn",
      // Allow missing display names in arrow function components
      "react/display-name": "off",
    }
  }
]);

export default eslintConfig;
