import { defineConfig } from "drizzle-kit";

// The connection comes from the environment only. `generate` does not connect,
// so an empty URL is fine there; `migrate` and `studio` need DATABASE_URL.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./migrations",
  casing: "snake_case",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
