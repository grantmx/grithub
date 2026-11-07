/**
 * Minimal RFC 4180 CSV parsing + learner-row validation for the admin import.
 * Pure functions: no I/O and NO logging (rows contain personal data).
 */

export const MAX_IMPORT_ROWS = 500;
export const MAX_IMPORT_BYTES = 200_000;

export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

export type ImportRowStatus = { ok: true } | { ok: false; error: string };

export type ImportRow = {
  /** Spreadsheet row number (header = row 1). */
  row: number;
  name: string;
  email: string;
  status: ImportRowStatus;
};

export type ExistingAccount = {
  status: "invited" | "active" | "suspended";
  enrolledInCohort: boolean;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_HEADERS = ["name", "full name", "display name", "display_name"];
const EMAIL_HEADERS = ["email", "email address", "e-mail"];

export type ValidationResult =
  | { ok: true; rows: ImportRow[] }
  | { ok: false; error: string };

/**
 * Validate a CSV of learners. `lookup` returns what we already know about an
 * email (case-insensitive) so duplicates and deactivated accounts are caught.
 */
export function validateLearnerCsv(
  input: string,
  lookup: (emailLower: string) => ExistingAccount | undefined,
): ValidationResult {
  if (input.length > MAX_IMPORT_BYTES) {
    return { ok: false, error: "The file is too large (maximum 200 KB)." };
  }
  const table = parseCsv(input);
  if (table.length < 2) {
    return {
      ok: false,
      error: "The file needs a header row and at least one learner.",
    };
  }
  const header = table[0]!.map((h) => h.trim().toLowerCase());
  const nameCol = header.findIndex((h) => NAME_HEADERS.includes(h));
  const emailCol = header.findIndex((h) => EMAIL_HEADERS.includes(h));
  if (nameCol === -1 || emailCol === -1) {
    return {
      ok: false,
      error: 'The header row must include "name" and "email" columns.',
    };
  }
  if (table.length - 1 > MAX_IMPORT_ROWS) {
    return {
      ok: false,
      error: `Too many rows (maximum ${MAX_IMPORT_ROWS} learners per file).`,
    };
  }

  const seen = new Map<string, number>();
  const rows: ImportRow[] = table.slice(1).map((cells, i) => {
    const rowNumber = i + 2;
    const name = (cells[nameCol] ?? "").trim();
    const email = (cells[emailCol] ?? "").trim();
    const lower = email.toLowerCase();
    const err = (error: string): ImportRow => ({
      row: rowNumber,
      name,
      email,
      status: { ok: false, error },
    });

    if (!name) return err("Name missing");
    if (name.length > 120) return err("Name too long");
    if (!email) return err("Email missing");
    if (email.length > 254 || !EMAIL_RE.test(email))
      return err("Email not valid");
    const firstRow = seen.get(lower);
    if (firstRow) return err(`Duplicate of row ${firstRow}`);
    seen.set(lower, rowNumber);

    const existing = lookup(lower);
    if (existing?.status === "suspended") return err("Account deactivated");
    if (existing?.enrolledInCohort)
      return err("Already enrolled in this cohort");
    return { row: rowNumber, name, email, status: { ok: true } };
  });
  return { ok: true, rows };
}
