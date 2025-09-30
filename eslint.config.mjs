import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "react-hooks/exhaustive-deps": "warn",
      // 禁用可選呼叫與可選方法呼叫，避免被轉譯成 .call() 導致 RSC/SSR 問題
      "no-restricted-syntax": [
        "error",
        { selector: "CallExpression[optional=true]", message: "禁用可選呼叫 ?.()（會被轉成 .call()）" },
        { selector: "OptionalCallExpression", message: "禁用可選呼叫 ?.()" }
      ],
    },
  },
];

export default eslintConfig;
