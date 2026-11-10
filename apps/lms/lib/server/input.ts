/**
 * Shape checks for client input at the server-action boundary.
 *
 * Server actions read FormData and plain arguments through these helpers so
 * that tampered requests are refused before they reach the domain layer:
 * File values or NUL bytes where text is expected, over-long values, and ids
 * that are not UUIDs (which Postgres would reject with a 500). Domain rules
 * (lengths shown to users, enums, dates, authorisation) stay in lib/server/*.
 *
 * Pure: no Next.js imports, so it is unit-testable.
 */

/** Generous per-field cap for ordinary text fields. */
export const MAX_TEXT = 50_000;
/** Cap for a pasted CSV import. */
export const MAX_CSV = 1_000_000;
/** Cap on the number of values read from one repeated field. */
export const MAX_ITEMS = 500;
/** Cap on serialised JSON payloads (WebAuthn responses). */
export const MAX_JSON = 64_000;

const INPUT_MESSAGE = "Something in that form wasn't valid. Reload the page and try again.";

/** Raised for malformed input. The message is safe to show to the user. */
export class InputError extends Error {
  constructor(message: string = INPUT_MESSAGE) {
    super(message);
    this.name = "InputError";
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

// --- Plain arguments -------------------------------------------------------------

/** A string with no NUL bytes and at most `max` characters. */
export function checkText(value: unknown, max: number = MAX_TEXT): string {
  if (typeof value !== "string" || value.length > max || value.includes("\0")) throw new InputError();
  return value;
}

/** A UUID. */
export function checkId(value: unknown): string {
  if (!isUuid(value)) throw new InputError();
  return value;
}

/** An array of at most `maxItems` strings, each checked with `checkText`. */
export function checkTexts(value: unknown, maxItems: number = MAX_ITEMS, max: number = MAX_TEXT): string[] {
  if (!Array.isArray(value) || value.length > maxItems) throw new InputError();
  return value.map((v) => checkText(v, max));
}

/** A finite number. */
export function checkNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new InputError();
  return value;
}

/** A plain JSON object (e.g. a WebAuthn response) whose serialised size is at most `maxChars`. */
export function checkJsonObject<T extends object>(value: T, maxChars: number = MAX_JSON): T {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new InputError();
  let size: number;
  try {
    size = JSON.stringify(value).length;
  } catch {
    throw new InputError();
  }
  if (size > maxChars) throw new InputError();
  return value;
}

// --- FormData ----------------------------------------------------------------------

function entryText(value: FormDataEntryValue, max: number): string {
  return checkText(value, max);
}

/** Text field; "" when missing. */
export function text(form: FormData, key: string, max: number = MAX_TEXT): string {
  const v = form.get(key);
  return v === null ? "" : entryText(v, max);
}

/** Text field; undefined when missing (an empty string is kept). */
export function optionalText(form: FormData, key: string, max: number = MAX_TEXT): string | undefined {
  const v = form.get(key);
  return v === null ? undefined : entryText(v, max);
}

/** Required UUID field. */
export function id(form: FormData, key: string): string {
  return checkId(form.get(key));
}

/** Optional UUID field: missing or "" gives undefined, anything else must be a UUID. */
export function optionalId(form: FormData, key: string): string | undefined {
  const v = form.get(key);
  if (v === null || v === "") return undefined;
  return checkId(v);
}

/** All values of a repeated text field (at most `maxItems`). */
export function texts(form: FormData, key: string, maxItems: number = MAX_ITEMS, max: number = MAX_TEXT): string[] {
  return checkTexts(form.getAll(key), maxItems, max);
}

/** All values of a repeated UUID field (at most `maxItems`). */
export function ids(form: FormData, key: string, maxItems: number = MAX_ITEMS): string[] {
  const all = form.getAll(key);
  if (all.length > maxItems) throw new InputError();
  return all.map(checkId);
}

/** True when the field is present (any value). */
export function has(form: FormData, key: string): boolean {
  return form.has(key);
}

/**
 * Fields whose name starts with `prefix`, as [rest of name, text value] pairs
 * (at most `maxItems`). Used for per-criterion inputs like `c:<id>`.
 */
export function prefixed(
  form: FormData,
  prefix: string,
  maxItems: number = MAX_ITEMS,
  max: number = MAX_TEXT,
): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const [k, v] of form.entries()) {
    if (!k.startsWith(prefix)) continue;
    if (out.length >= maxItems) throw new InputError();
    out.push([checkText(k.slice(prefix.length), 200), entryText(v, max)]);
  }
  return out;
}

/**
 * Check every field of a form that is handed whole to a domain function:
 * text only, no NUL bytes, each at most `max`, at most `maxFields` fields.
 */
export function checkForm(form: FormData, max: number = MAX_TEXT, maxFields: number = MAX_ITEMS): FormData {
  let n = 0;
  for (const [k, v] of form.entries()) {
    if (++n > maxFields) throw new InputError();
    checkText(k, 200);
    entryText(v, max);
  }
  return form;
}
