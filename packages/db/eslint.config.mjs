import custom from "eslint-config-custom";

const config = [
  { ignores: ["migrations/**"] },
  ...custom,
  {
    name: "db/strict",
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
];

export default config;
