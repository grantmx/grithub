import custom from "eslint-config-custom";

const config = [
  { ignores: [".next/**", "next-env.d.ts"] },
  ...custom,
  {
    name: "lms/strict",
    rules: {
      "react/jsx-key": "error",
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
];

export default config;
