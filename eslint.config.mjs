import nextConfig from "eslint-config-next";

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "contracts/**",
      "functions/**",
    ],
  },
  ...nextConfig,
  {
    rules: {
      // React Compiler auto-tracks dependencies and memoizes — these rules are redundant
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/refs": "off",
      "react-hooks/incompatible-library": "off",
      // React Compiler specific rules
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },
  {
    // FileMessage uses raw <img> for blob URLs and pinch-to-zoom gesture transforms
    files: ["app/ecosystem/chat/*/FileMessage.tsx"],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
];

export default eslintConfig;
