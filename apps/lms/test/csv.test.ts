import { describe, expect, it } from "vitest";
import { MAX_IMPORT_ROWS, parseCsv, validateLearnerCsv } from "@/lib/csv";

describe("parseCsv", () => {
  it("handles quotes, embedded commas, escaped quotes, CRLF and a BOM", () => {
    const input =
      '﻿name,email\r\n"Fake, Person","a@example.invalid"\r\n"Say ""hi""",b@example.invalid\r\n';
    expect(parseCsv(input)).toEqual([
      ["name", "email"],
      ["Fake, Person", "a@example.invalid"],
      ['Say "hi"', "b@example.invalid"],
    ]);
  });

  it("skips blank lines", () => {
    expect(parseCsv("a,b\n\n1,2\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("validateLearnerCsv", () => {
  const none = () => undefined;

  it("requires name and email headers (case-insensitive, common variants)", () => {
    expect(
      validateLearnerCsv("Full Name,E-mail\nA (fake),a@example.invalid", none)
        .ok,
    ).toBe(true);
    expect(validateLearnerCsv("first,last\nA,B", none)).toMatchObject({
      ok: false,
    });
  });

  it("rejects empty files and too many rows", () => {
    expect(validateLearnerCsv("name,email", none)).toMatchObject({ ok: false });
    const big = [
      "name,email",
      ...Array.from(
        { length: MAX_IMPORT_ROWS + 1 },
        (_, i) => `P${i},p${i}@example.invalid`,
      ),
    ].join("\n");
    expect(validateLearnerCsv(big, none)).toMatchObject({ ok: false });
  });

  it("numbers rows like a spreadsheet (header = row 1)", () => {
    const result = validateLearnerCsv(
      "name,email\nA (fake),a@example.invalid\nB (fake),b@example.invalid",
      none,
    );
    expect(result.ok && result.rows.map((r) => r.row)).toEqual([2, 3]);
  });
});
