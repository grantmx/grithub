import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  InputError,
  MAX_CSV,
  MAX_TEXT,
  checkForm,
  checkId,
  checkJsonObject,
  checkNumber,
  checkText,
  checkTexts,
  has,
  id,
  ids,
  isUuid,
  optionalId,
  optionalText,
  prefixed,
  text,
  texts,
} from "@/lib/server/input";

const UUID = "0b7c4f8e-3d2a-4c1b-9e5f-6a7b8c9d0e1f";
const UUID2 = "1c8d5a9f-4e3b-4d2c-8f6a-7b8c9d0e1f2a";

function fd(entries: Array<[string, string | Blob]>): FormData {
  const form = new FormData();
  for (const [k, v] of entries) form.append(k, v);
  return form;
}

const file = () => new File(["x"], "x.txt", { type: "text/plain" });

describe("isUuid / checkId", () => {
  it("accepts UUIDs in either case", () => {
    expect(isUuid(UUID)).toBe(true);
    expect(isUuid(UUID.toUpperCase())).toBe(true);
    expect(checkId(UUID)).toBe(UUID);
  });

  it("rejects anything else", () => {
    for (const bad of ["", "abc", `${UUID} `, `${UUID}x`, "' OR 1=1 --", 42, null, undefined, {}, [UUID]]) {
      expect(isUuid(bad)).toBe(false);
      expect(() => checkId(bad)).toThrow(InputError);
    }
  });
});

describe("checkText / checkTexts / checkNumber", () => {
  it("passes ordinary strings through unchanged", () => {
    expect(checkText("  hello, world  ")).toBe("  hello, world  ");
    expect(checkText("")).toBe("");
  });

  it("rejects non-strings, NUL bytes and over-long values", () => {
    expect(() => checkText(1)).toThrow(InputError);
    expect(() => checkText(file())).toThrow(InputError);
    expect(() => checkText("a\0b")).toThrow(InputError);
    expect(() => checkText("a".repeat(MAX_TEXT + 1))).toThrow(InputError);
    expect(checkText("a".repeat(MAX_TEXT))).toHaveLength(MAX_TEXT);
    expect(() => checkText("abcd", 3)).toThrow(InputError);
  });

  it("allows a CSV-sized value when asked", () => {
    expect(checkText("a".repeat(MAX_TEXT + 1), MAX_CSV)).toHaveLength(MAX_TEXT + 1);
  });

  it("checks arrays item by item with a cap", () => {
    expect(checkTexts(["a", "b"])).toEqual(["a", "b"]);
    expect(() => checkTexts("a")).toThrow(InputError);
    expect(() => checkTexts(["a", 1])).toThrow(InputError);
    expect(() => checkTexts(["a", "b", "c"], 2)).toThrow(InputError);
  });

  it("checks numbers", () => {
    expect(checkNumber(3)).toBe(3);
    expect(() => checkNumber("3")).toThrow(InputError);
    expect(() => checkNumber(Number.NaN)).toThrow(InputError);
    expect(() => checkNumber(Number.POSITIVE_INFINITY)).toThrow(InputError);
  });
});

describe("checkJsonObject", () => {
  it("accepts a small plain object", () => {
    const v = { id: "abc", response: { clientDataJSON: "xyz" } };
    expect(checkJsonObject(v)).toBe(v);
  });

  it("rejects non-objects, arrays and oversized payloads", () => {
    expect(() => checkJsonObject(null as unknown as object)).toThrow(InputError);
    expect(() => checkJsonObject("x" as unknown as object)).toThrow(InputError);
    expect(() => checkJsonObject([] as object)).toThrow(InputError);
    expect(() => checkJsonObject({ big: "a".repeat(200) }, 100)).toThrow(InputError);
  });

  it("rejects values that can't be serialised", () => {
    const loop: Record<string, unknown> = {};
    loop.self = loop;
    expect(() => checkJsonObject(loop)).toThrow(InputError);
  });
});

describe("FormData helpers", () => {
  it("text gives '' when missing and the value otherwise", () => {
    const form = fd([["name", "Thandi"]]);
    expect(text(form, "name")).toBe("Thandi");
    expect(text(form, "missing")).toBe("");
  });

  it("optionalText gives undefined when missing but keeps ''", () => {
    const form = fd([["theme", ""]]);
    expect(optionalText(form, "theme")).toBe("");
    expect(optionalText(form, "missing")).toBeUndefined();
  });

  it("text helpers reject files, NUL bytes and over-long values", () => {
    expect(() => text(fd([["x", file()]]), "x")).toThrow(InputError);
    expect(() => optionalText(fd([["x", file()]]), "x")).toThrow(InputError);
    expect(() => text(fd([["x", "a\0"]]), "x")).toThrow(InputError);
    expect(() => text(fd([["x", "abcdef"]]), "x", 5)).toThrow(InputError);
  });

  it("id requires a UUID", () => {
    expect(id(fd([["a", UUID]]), "a")).toBe(UUID);
    expect(() => id(fd([]), "a")).toThrow(InputError);
    expect(() => id(fd([["a", ""]]), "a")).toThrow(InputError);
    expect(() => id(fd([["a", "not-a-uuid"]]), "a")).toThrow(InputError);
    expect(() => id(fd([["a", file()]]), "a")).toThrow(InputError);
  });

  it("optionalId maps missing and '' to undefined, else requires a UUID", () => {
    expect(optionalId(fd([]), "a")).toBeUndefined();
    expect(optionalId(fd([["a", ""]]), "a")).toBeUndefined();
    expect(optionalId(fd([["a", UUID]]), "a")).toBe(UUID);
    expect(() => optionalId(fd([["a", "nope"]]), "a")).toThrow(InputError);
  });

  it("texts and ids read repeated fields with a cap", () => {
    const form = fd([
      ["t", "a"],
      ["t", "b"],
      ["i", UUID],
      ["i", UUID2],
    ]);
    expect(texts(form, "t")).toEqual(["a", "b"]);
    expect(texts(form, "missing")).toEqual([]);
    expect(ids(form, "i")).toEqual([UUID, UUID2]);
    expect(() => texts(form, "t", 1)).toThrow(InputError);
    expect(() => ids(form, "i", 1)).toThrow(InputError);
    expect(() => ids(fd([["i", UUID], ["i", "x"]]), "i")).toThrow(InputError);
    expect(() => texts(fd([["t", file()]]), "t")).toThrow(InputError);
  });

  it("has reports presence", () => {
    const form = fd([["notes", ""]]);
    expect(has(form, "notes")).toBe(true);
    expect(has(form, "other")).toBe(false);
  });

  it("prefixed returns [suffix, value] pairs for matching names only", () => {
    const form = fd([
      [`c:${UUID}`, "3"],
      ["back", "/staff"],
      [`c:${UUID2}`, ""],
    ]);
    expect(prefixed(form, "c:")).toEqual([
      [UUID, "3"],
      [UUID2, ""],
    ]);
    expect(() => prefixed(fd([["c:a", file()]]), "c:")).toThrow(InputError);
    expect(() => prefixed(fd([["c:a", "1"], ["c:b", "2"]]), "c:", 1)).toThrow(InputError);
  });

  it("checkForm accepts text-only forms and rejects files, NULs, long values and too many fields", () => {
    const ok = fd([["a", "1"], ["b", ""]]);
    expect(checkForm(ok)).toBe(ok);
    expect(() => checkForm(fd([["a", file()]]))).toThrow(InputError);
    expect(() => checkForm(fd([["a", "x\0"]]))).toThrow(InputError);
    expect(() => checkForm(fd([["a", "abcdef"]]), 5)).toThrow(InputError);
    expect(() => checkForm(fd([["a", "1"], ["b", "2"]]), 100, 1)).toThrow(InputError);
  });
});

describe("InputError", () => {
  it("has a user-safe default message", () => {
    const e = new InputError();
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe("InputError");
    expect(e.message).toMatch(/wasn't valid/);
  });
});

/**
 * Guard: every server-action file must read client input through
 * lib/server/input.ts, so FormData is never read directly.
 */
describe("server actions read input through lib/server/input.ts", () => {
  const appDir = fileURLToPath(new URL("../app", import.meta.url));

  function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return sourceFiles(path);
      return /\.(ts|tsx)$/.test(name) ? [path] : [];
    });
  }

  const actionFiles = sourceFiles(appDir).filter((f) => readFileSync(f, "utf8").includes('"use server"'));

  it("finds the server-action files", () => {
    expect(actionFiles.length).toBeGreaterThanOrEqual(14);
  });

  // `form`, `formData`, `fd`, ...: any FormData read other than through the helpers.
  const DIRECT_READ = /\b(?:form\w*|fd)\.(?:get|getAll|entries)\(/;

  it.each(actionFiles.map((f) => [relative(appDir, f), f]))("%s", (_name, f) => {
    const offending = readFileSync(f, "utf8")
      .split("\n")
      .map((line, i) => ({ line: line.trim(), n: i + 1 }))
      .filter(({ line }) => DIRECT_READ.test(line));
    expect(offending).toEqual([]);
  });
});
