// Shared ESLint 9 flat config for the monorepo.
// Usage in a workspace's eslint.config.mjs:
//   import custom from "eslint-config-custom";
//   export default [...custom];
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import turbo from "eslint-config-turbo/flat";
import prettier from "eslint-config-prettier/flat";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  ...turbo,
  prettier,
  {
    name: "eslint-config-custom/overrides",
    rules: {
      "@next/next/no-html-link-for-pages": "off",
      "react/jsx-key": "off",
    },
  },
];

export default config;
