import { describe, expect, it } from "vitest";
import { isLocalUrl, readDbConfig } from "../src/env";

describe("readDbConfig (env vars only)", () => {
  it("requires DATABASE_URL", () => {
    expect(() => readDbConfig({})).toThrow(/DATABASE_URL is not set/);
  });

  it("defaults to TLS for non-local hosts and no TLS for localhost", () => {
    expect(
      readDbConfig({ DATABASE_URL: "postgres://u@db.example.invalid/x" }).ssl,
    ).toBe("require");
    expect(
      readDbConfig({ DATABASE_URL: "postgres://u@localhost:5433/x" }).ssl,
    ).toBe(false);
  });

  it("honours DATABASE_SSL and DATABASE_POOL_MAX", () => {
    const c = readDbConfig({
      DATABASE_URL: "postgres://u@localhost/x",
      DATABASE_SSL: "require",
      DATABASE_POOL_MAX: "3",
    });
    expect(c).toMatchObject({ ssl: "require", poolMax: 3 });
  });

  it("rejects invalid values", () => {
    expect(() =>
      readDbConfig({ DATABASE_URL: "postgres://u@h/x", DATABASE_SSL: "maybe" }),
    ).toThrow();
    expect(() =>
      readDbConfig({
        DATABASE_URL: "postgres://u@h/x",
        DATABASE_POOL_MAX: "0",
      }),
    ).toThrow();
  });

  it("reads an alternative variable name (used by tests)", () => {
    expect(
      readDbConfig(
        { TEST_DATABASE_URL: "postgres://u@localhost/t" },
        "TEST_DATABASE_URL",
      ).url,
    ).toBe("postgres://u@localhost/t");
  });

  it("detects local hosts", () => {
    expect(isLocalUrl("postgres://u@127.0.0.1/x")).toBe(true);
    expect(isLocalUrl("postgres://u@[::1]/x")).toBe(true);
    expect(isLocalUrl("postgres://u@db.example.invalid/x")).toBe(false);
    expect(isLocalUrl("not a url")).toBe(false);
  });
});
