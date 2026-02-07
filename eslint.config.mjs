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
];

export default eslintConfig;
