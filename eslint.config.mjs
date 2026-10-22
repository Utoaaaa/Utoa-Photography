import { globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = [
  globalIgnores([
    "**/node_modules/**",
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/next-env.d.ts",
    "**/.open-next/**",
  ]),
  ...nextVitals,
  ...nextTs,
  {
    // Match eslint-config-next's file globs; its plugins (e.g. react-hooks) only exist for these files.
    files: ["**/*.{js,jsx,mjs,ts,tsx,mts,cts}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "react-hooks/exhaustive-deps": "warn",
      // React Compiler rules added by eslint-plugin-react-hooks v7 (eslint-config-next 16); surface as warnings until components are refactored
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/error-boundaries": "warn",
      // 禁用可選呼叫與可選方法呼叫，避免被轉譯成 .call() 導致 RSC/SSR 問題
      "no-restricted-syntax": [
        "error",
        { selector: "CallExpression[optional=true]", message: "禁用可選呼叫 ?.()（會被轉成 .call()）" },
        { selector: "OptionalCallExpression", message: "禁用可選呼叫 ?.()" }
      ],
    },
  },
  {
    files: [
      "jest.setup.js",
      "jest.setup.pre-env.js",
      "prisma/seed.js",
      "scripts/**/*.js",
      "tools/**/*.js",
    ],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/no-unused-vars": ["off", { "argsIgnorePattern": "^_" }],
    },
  },
  {
    files: [
      "next.config.ts",
      "open-next.config.ts",
      "open-next.config.mjs",
      "playwright.config.ts",
      "jest.setup.contract.ts",
      "prisma/seed.ts",
    ],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "import/no-anonymous-default-export": "off",
    },
  },
  {
    files: ["next-env.d.ts"],
    rules: {
      "@typescript-eslint/triple-slash-reference": "off",
    },
  },
  {
    files: ["src/app/admin/**/*"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
];

export default eslintConfig;
