import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
  sql,
} from "drizzle-orm";
import {
  consentRecords,
  enrolments,
  learnerQctoProfiles,
  qctoAlternativeIdTypes,
  qctoCitizenResidentStatusCodes,
  qctoDisabilityRatingCodes,
  qctoDisabilityStatusCodes,
  qctoEquityCodes,
  qctoGenderCodes,
  qctoHomeLanguageCodes,
  qctoImmigrantStatusCodes,
  qctoLearnerTitles,
  qctoNationalityCodes,
  qctoProvinceCodes,
  qctoSocioeconomicStatusCodes,
  statssaAreaCodes,
  users,
} from "db";
import {
  type PiiKeyring,
  decryptPii,
  encryptPii,
  piiBlindIndex,
  readPiiKeyring,
} from "db/pii";
import type { AccessContext, Requirement } from "@/lib/access";
import {
  ALT_ID_NONE,
  type Address,
  type CodeListName,
  type CodeLists,
  type FieldErrors,
  PART_FIELDS,
  PART_TITLES,
  PROFILE_PARTS,
  type ProfilePart,
  type ProfileValues,
  changedFields,
  digitsOnly,
  emptyAddress,
  emptyProfile,
  firstIncompletePart,
  isComplete,
  readPartFromForm,
  validateProfile,
} from "@/lib/qctoProfile";
import type { ServerCtx } from "./context";
import { writeAudit } from "./audit";
import { authorize } from "./auth";
import { ADMIN } from "./onboarding";
import { RATE_LIMITS, enforceRateLimit } from "./ratelimit";

/**
 * QCTO learner profile (learner_qcto_profiles): read with decryption, save
 * one setup part at a time, confirm, and admin corrections.
 * NEVER log or audit values: audit payloads carry field NAMES only.
 */

export class ProfileError extends Error {
  constructor(
    message: string,
    public readonly fieldErrors: FieldErrors = {},
  ) {
    super(message);
    this.name = "ProfileError";
  }
}

/** A learner during setup (setup isn't complete, so plain "user"). */
const SETUP_USER: Requirement = { kind: "user", allowDuringSetup: true };

let keyring: PiiKeyring | undefined;
function pii(): PiiKeyring {
  keyring ??= readPiiKeyring(process.env);
  return keyring;
}

// ---------------------------------------------------------------------------
// Code lists (GLOBAL reference data; cached per process)
// ---------------------------------------------------------------------------

const CODE_TABLES = {
  titles: qctoLearnerTitles,
  alternativeIdTypes: qctoAlternativeIdTypes,
  genders: qctoGenderCodes,
  provinces: qctoProvinceCodes,
  nationalities: qctoNationalityCodes,
  citizenResidentStatuses: qctoCitizenResidentStatusCodes,
  immigrantStatuses: qctoImmigrantStatusCodes,
  homeLanguages: qctoHomeLanguageCodes,
  equities: qctoEquityCodes,
  socioeconomicStatuses: qctoSocioeconomicStatusCodes,
  disabilityStatuses: qctoDisabilityStatusCodes,
  disabilityRatings: qctoDisabilityRatingCodes,
} as const satisfies Record<CodeListName, unknown>;

let codeListCache: Promise<CodeLists> | undefined;

export function loadCodeLists(ctx: Pick<ServerCtx, "db">): Promise<CodeLists> {
  codeListCache ??= (async () => {
    const entries = await Promise.all(
      (Object.keys(CODE_TABLES) as CodeListName[]).map(async (name) => {
        const t = CODE_TABLES[name];
        const rows = await ctx.db
          .select({ code: t.code, label: t.label })
          .from(t)
          .where(isNull(t.retiredAt))
          .orderBy(asc(t.sortOrder));
        return [name, rows] as const;
      }),
    );
    return Object.fromEntries(entries) as CodeLists;
  })().catch((e) => {
    codeListCache = undefined;
    throw e;
  });
  return codeListCache;
}

// ---------------------------------------------------------------------------
// Stats SA areas
// ---------------------------------------------------------------------------

export type AreaOption = { code: string; label: string };

const areaLabel = (r: {
  label: string;
  town: string;
  localMunicipality: string;
}) =>
  r.town && r.town !== r.label
    ? `${r.label}, ${r.town} (${r.localMunicipality})`
    : `${r.label} (${r.localMunicipality})`;

/** Up to 20 areas in a province whose name or town starts with / contains `q`. */
export async function searchAreas(
  ctx: Pick<ServerCtx, "db">,
  provinceCode: string,
  q: string,
): Promise<AreaOption[]> {
  const query = q.trim().slice(0, 60);
  if (query.length < 2 || !/^[1-9]$/.test(provinceCode)) return [];
  const like = `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const rows = await ctx.db
    .select({
      code: statssaAreaCodes.code,
      label: statssaAreaCodes.label,
      town: statssaAreaCodes.town,
      localMunicipality: statssaAreaCodes.localMunicipality,
    })
    .from(statssaAreaCodes)
    .where(
      and(
        eq(statssaAreaCodes.provinceCode, provinceCode),
        isNull(statssaAreaCodes.retiredAt),
        or(
          ilike(statssaAreaCodes.label, like),
          ilike(statssaAreaCodes.town, like),
        ),
      ),
    )
    // Names starting with the query first, then alphabetical.
    .orderBy(
      sql`(${statssaAreaCodes.label} ilike ${`${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`}) desc`,
      asc(statssaAreaCodes.label),
    )
    .limit(20);
  return rows.map((r) => ({ code: r.code, label: areaLabel(r) }));
}

export async function areaById(
  ctx: Pick<ServerCtx, "db">,
  code: string,
): Promise<(AreaOption & { provinceCode: string }) | undefined> {
  if (!code) return undefined;
  const [r] = await ctx.db
    .select({
      code: statssaAreaCodes.code,
      label: statssaAreaCodes.label,
      town: statssaAreaCodes.town,
      localMunicipality: statssaAreaCodes.localMunicipality,
      provinceCode: statssaAreaCodes.provinceCode,
    })
    .from(statssaAreaCodes)
    .where(
      and(eq(statssaAreaCodes.code, code), isNull(statssaAreaCodes.retiredAt)),
    );
  return r
    ? { code: r.code, label: areaLabel(r), provinceCode: r.provinceCode }
    : undefined;
}

async function isLearner(ctx: Pick<ServerCtx, "db">, userId: string) {
  const [row] = await ctx.db
    .select({ id: enrolments.id })
    .from(enrolments)
    .where(eq(enrolments.userId, userId))
    .limit(1);
  return Boolean(row);
}

// ---------------------------------------------------------------------------
// Reading (decrypting) a profile
// ---------------------------------------------------------------------------

type ProfileRow = typeof learnerQctoProfiles.$inferSelect;
const TABLE = "learner_qcto_profiles";

const ENCRYPTED = {
  nationalId: "national_id_enc",
  alternateId: "alternate_id_enc",
  birthDate: "birth_date_enc",
  equityCode: "equity_code_enc",
  disabilityStatusCode: "disability_status_enc",
  disabilityRatingCode: "disability_rating_enc",
  homeAddress: "home_address_enc",
  postalAddress: "postal_address_enc",
  phone: "phone_enc",
  cellPhone: "cell_phone_enc",
} as const;

function open(
  row: ProfileRow,
  column: (typeof ENCRYPTED)[keyof typeof ENCRYPTED],
  blob: Uint8Array | null,
): string {
  if (!blob) return "";
  return decryptPii(pii(), blob, { table: TABLE, column, rowId: row.id });
}

function openAddress(
  row: ProfileRow,
  column: "home_address_enc" | "postal_address_enc",
  blob: Uint8Array | null,
): Address {
  const raw = open(row, column, blob);
  if (!raw) return emptyAddress();
  const a = JSON.parse(raw) as Partial<Address>;
  return {
    line1: a.line1 ?? "",
    line2: a.line2 ?? "",
    line3: a.line3 ?? "",
    postalCode: a.postalCode ?? "",
  };
}

function toValues(row: ProfileRow): ProfileValues {
  const nationalId = open(row, ENCRYPTED.nationalId, row.nationalIdEnc);
  const alternateId = open(row, ENCRYPTED.alternateId, row.alternateIdEnc);
  const birth = open(row, ENCRYPTED.birthDate, row.birthDateEnc);
  const homeAddress = openAddress(
    row,
    ENCRYPTED.homeAddress,
    row.homeAddressEnc,
  );
  const postalAddress = openAddress(
    row,
    ENCRYPTED.postalAddress,
    row.postalAddressEnc,
  );
  return {
    titleCode: row.titleCode ?? "",
    firstName: row.firstName ?? "",
    middleName: row.middleName ?? "",
    lastName: row.lastName ?? "",
    idKind: nationalId ? "national" : alternateId ? "alternate" : "",
    nationalId,
    alternateId,
    alternativeIdTypeCode:
      row.alternativeIdTypeCode === ALT_ID_NONE
        ? ""
        : (row.alternativeIdTypeCode ?? ""),
    birthDate: /^\d{8}$/.test(birth)
      ? `${birth.slice(0, 4)}-${birth.slice(4, 6)}-${birth.slice(6)}`
      : "",
    genderCode: row.genderCode ?? "",
    homeAddress,
    postalSameAsHome:
      !row.postalAddressEnc ||
      JSON.stringify(homeAddress) === JSON.stringify(postalAddress),
    postalAddress,
    cellPhone: open(row, ENCRYPTED.cellPhone, row.cellPhoneEnc),
    phone: open(row, ENCRYPTED.phone, row.phoneEnc),
    shareEmailWithQcto: row.shareEmailWithQcto,
    provinceCode: row.provinceCode ?? "",
    statssaAreaCode: row.statssaAreaCode ?? "",
    nationalityCode: row.nationalityCode ?? "",
    citizenResidentStatusCode: row.citizenResidentStatusCode ?? "",
    immigrantStatusCode: row.immigrantStatusCode ?? "",
    homeLanguageCode: row.homeLanguageCode ?? "",
    equityCode: open(row, ENCRYPTED.equityCode, row.equityCodeEnc),
    socioeconomicStatusCode: row.socioeconomicStatusCode ?? "",
    disabilityStatusCode: open(
      row,
      ENCRYPTED.disabilityStatusCode,
      row.disabilityStatusEnc,
    ),
    disabilityRatingCode: open(
      row,
      ENCRYPTED.disabilityRatingCode,
      row.disabilityRatingEnc,
    ),
  };
}

export type LoadedProfile = {
  values: ProfileValues;
  exists: boolean;
  confirmedAt: Date | null;
  updatedAt: Date | null;
};

async function loadRow(ctx: Pick<ServerCtx, "db">, userId: string) {
  const [row] = await ctx.db
    .select()
    .from(learnerQctoProfiles)
    .where(eq(learnerQctoProfiles.userId, userId));
  return row;
}

/** Decrypted profile (or an empty one). Callers must have checked access. */
async function readProfileUnchecked(
  ctx: Pick<ServerCtx, "db">,
  userId: string,
): Promise<LoadedProfile> {
  const row = await loadRow(ctx, userId);
  if (!row) {
    return {
      values: emptyProfile(),
      exists: false,
      confirmedAt: null,
      updatedAt: null,
    };
  }
  return {
    values: toValues(row),
    exists: true,
    confirmedAt: row.confirmedAt,
    updatedAt: row.updatedAt,
  };
}

/** The signed-in learner's own profile. */
export async function readOwnProfile(
  ctx: ServerCtx,
  actor: AccessContext | null,
): Promise<LoadedProfile> {
  const me = await authorize(ctx, actor, SETUP_USER, "qctoProfile.readOwn");
  return readProfileUnchecked(ctx, me.userId);
}

/** Any learner's profile, for an SDP admin. */
export async function readProfileAsAdmin(
  ctx: ServerCtx,
  actor: AccessContext | null,
  userId: string,
): Promise<LoadedProfile & { name: string; email: string }> {
  await authorize(ctx, actor, ADMIN, "admin.qctoProfile.read");
  const [user] = await ctx.db
    .select({ name: users.displayName, email: users.email })
    .from(users)
    .where(eq(users.id, userId));
  if (!user) throw new ProfileError("Learner not found.");
  return { ...(await readProfileUnchecked(ctx, userId)), ...user };
}

// ---------------------------------------------------------------------------
// Writing (encrypting) a profile
// ---------------------------------------------------------------------------

async function areaCheck(ctx: Pick<ServerCtx, "db">, v: ProfileValues) {
  const area = await areaById(ctx, v.statssaAreaCode);
  return (code: string, province: string) =>
    Boolean(area && area.code === code && area.provinceCode === province);
}

const isUniqueViolation = (e: unknown) =>
  String((e as { cause?: { code?: string } }).cause?.code) === "23505" ||
  String((e as { code?: string }).code) === "23505";

/** Upsert every column from `v`. Encryption binds each value to the row id. */
async function writeValues(
  ctx: Pick<ServerCtx, "db" | "now">,
  userId: string,
  v: ProfileValues,
  extra: { confirmedAt?: Date } = {},
): Promise<void> {
  let row = await loadRow(ctx, userId);
  if (!row) {
    [row] = await ctx.db
      .insert(learnerQctoProfiles)
      .values({ userId })
      .onConflictDoNothing()
      .returning();
    row ??= await loadRow(ctx, userId);
    if (!row) throw new Error("profile row could not be created");
  }
  const rowId = row.id;
  const seal = (
    column: (typeof ENCRYPTED)[keyof typeof ENCRYPTED],
    value: string,
  ) =>
    value ? encryptPii(pii(), value, { table: TABLE, column, rowId }) : null;
  const address = (a: Address) =>
    a.line1 || a.line2 || a.line3 || a.postalCode ? JSON.stringify(a) : "";
  const nationalId = v.idKind === "national" ? v.nationalId : "";
  const alternateId = v.idKind === "alternate" ? v.alternateId : "";

  try {
    await ctx.db
      .update(learnerQctoProfiles)
      .set({
        titleCode: v.titleCode || null,
        firstName: v.firstName || null,
        middleName: v.middleName || null,
        lastName: v.lastName || null,
        nationalIdEnc: seal(ENCRYPTED.nationalId, nationalId),
        nationalIdHash: nationalId
          ? piiBlindIndex(pii(), "national_id", nationalId)
          : null,
        alternateIdEnc: seal(ENCRYPTED.alternateId, alternateId),
        // Per the spec an alternate ID is unique together with the surname.
        alternateIdHash: alternateId
          ? piiBlindIndex(pii(), "alternate_id", alternateId, v.lastName)
          : null,
        alternativeIdTypeCode: nationalId
          ? ALT_ID_NONE
          : alternateId
            ? v.alternativeIdTypeCode || null
            : null,
        birthDateEnc: seal(ENCRYPTED.birthDate, v.birthDate.replace(/-/g, "")),
        genderCode: v.genderCode || null,
        homeAddressEnc: seal(ENCRYPTED.homeAddress, address(v.homeAddress)),
        postalAddressEnc: seal(
          ENCRYPTED.postalAddress,
          address(v.postalSameAsHome ? v.homeAddress : v.postalAddress),
        ),
        cellPhoneEnc: seal(ENCRYPTED.cellPhone, digitsOnly(v.cellPhone)),
        phoneEnc: seal(ENCRYPTED.phone, digitsOnly(v.phone)),
        shareEmailWithQcto: v.shareEmailWithQcto,
        provinceCode: v.provinceCode || null,
        statssaAreaCode: v.statssaAreaCode || null,
        nationalityCode: v.nationalityCode || null,
        citizenResidentStatusCode: v.citizenResidentStatusCode || null,
        immigrantStatusCode: v.immigrantStatusCode || null,
        homeLanguageCode: v.homeLanguageCode || null,
        equityCodeEnc: seal(ENCRYPTED.equityCode, v.equityCode),
        socioeconomicStatusCode: v.socioeconomicStatusCode || null,
        disabilityStatusEnc: seal(
          ENCRYPTED.disabilityStatusCode,
          v.disabilityStatusCode,
        ),
        disabilityRatingEnc: seal(
          ENCRYPTED.disabilityRatingCode,
          v.disabilityRatingCode,
        ),
        ...(extra.confirmedAt ? { confirmedAt: extra.confirmedAt } : {}),
        updatedAt: ctx.now(),
      })
      .where(eq(learnerQctoProfiles.id, rowId));
  } catch (e) {
    if (isUniqueViolation(e)) {
      const field = nationalId ? "nationalId" : "alternateId";
      throw new ProfileError("Please correct the highlighted fields.", {
        [field]:
          "This ID number is already registered to another learner. Contact your facilitator.",
      });
    }
    throw e;
  }
}

/** Setup: save one part of the learner's own profile. Returns the next part. */
export async function saveOwnProfilePart(
  ctx: ServerCtx,
  actor: AccessContext | null,
  part: ProfilePart,
  form: FormData,
): Promise<{ values: ProfileValues; next: ProfilePart | "review" }> {
  const me = await authorize(ctx, actor, SETUP_USER, "qctoProfile.savePart");
  await enforceRateLimit(ctx, RATE_LIMITS.setup, me.userId);
  if (!(await isLearner(ctx, me.userId))) {
    throw new ProfileError("Only learners have QCTO details.");
  }
  const current = await readProfileUnchecked(ctx, me.userId);
  if (current.confirmedAt) {
    throw new ProfileError(
      "You've already confirmed your details. Ask your facilitator to change anything.",
    );
  }
  const lists = await loadCodeLists(ctx);
  const next = readPartFromForm(form, part, current.values);
  const errors = validateProfile(next, lists, [part], {
    areaInProvince: await areaCheck(ctx, next),
    today: ctx.now(),
  });
  if (Object.keys(errors).length > 0) {
    throw new ProfileError("Please correct the highlighted fields.", errors);
  }
  await writeValues(ctx, me.userId, next);
  await writeAudit(ctx, {
    action: "qcto_profile.part_saved",
    actorId: me.userId,
    entityType: "user",
    entityId: me.userId,
    after: { part, fields: changedFields(current.values, next) },
  });
  const i = PROFILE_PARTS.indexOf(part);
  return {
    values: next,
    next: i < PROFILE_PARTS.length - 1 ? PROFILE_PARTS[i + 1]! : "review",
  };
}

/** Setup: the learner ticks "These details are correct". */
export async function confirmOwnProfile(
  ctx: ServerCtx,
  actor: AccessContext | null,
  confirmed: boolean,
): Promise<void> {
  const me = await authorize(ctx, actor, SETUP_USER, "qctoProfile.confirm");
  await enforceRateLimit(ctx, RATE_LIMITS.setup, me.userId);
  if (!confirmed) {
    throw new ProfileError("Please tick the box to confirm your details.");
  }
  const current = await readProfileUnchecked(ctx, me.userId);
  if (current.confirmedAt) return;
  const lists = await loadCodeLists(ctx);
  const opts = {
    areaInProvince: await areaCheck(ctx, current.values),
    today: ctx.now(),
  };
  if (!current.exists || !isComplete(current.values, lists, opts)) {
    const part = firstIncompletePart(current.values, lists, opts);
    throw new ProfileError(
      `Some details are missing. Please complete "${PART_TITLES[part]}" first.`,
    );
  }
  const now = ctx.now();
  await ctx.db
    .update(learnerQctoProfiles)
    .set({ confirmedAt: now, updatedAt: now })
    .where(eq(learnerQctoProfiles.userId, me.userId));
  await writeAudit(ctx, {
    action: "qcto_profile.confirmed",
    actorId: me.userId,
    entityType: "user",
    entityId: me.userId,
  });
}

/**
 * SDP admin fills in or corrects a learner's profile (all parts at once).
 * Missing values are allowed; present values must be valid. Doesn't change
 * confirmed_at (the learner's own confirmation).
 */
export async function adminSaveProfile(
  ctx: ServerCtx,
  actor: AccessContext | null,
  userId: string,
  form: FormData,
): Promise<ProfileValues> {
  const admin = await authorize(ctx, actor, ADMIN, "admin.qctoProfile.save");
  if (!(await isLearner(ctx, userId))) {
    throw new ProfileError("Only learners have QCTO details.");
  }
  const current = await readProfileUnchecked(ctx, userId);
  let next = current.values;
  for (const part of PROFILE_PARTS) next = readPartFromForm(form, part, next);
  const lists = await loadCodeLists(ctx);
  const errors = validateProfile(next, lists, PROFILE_PARTS, {
    partial: true,
    areaInProvince: await areaCheck(ctx, next),
    today: ctx.now(),
  });
  if (Object.keys(errors).length > 0) {
    throw new ProfileError("Please correct the highlighted fields.", errors);
  }
  const fields = changedFields(current.values, next);
  if (fields.length === 0) return next;
  await writeValues(ctx, userId, next);
  await writeAudit(ctx, {
    action: "admin.qcto_profile.updated",
    actorId: admin.userId,
    entityType: "user",
    entityId: userId,
    after: { fields },
  });
  return next;
}

// ---------------------------------------------------------------------------
// Status for the People table
// ---------------------------------------------------------------------------

export type ProfileStatus = "not_started" | "in_progress" | "confirmed";

/** Profile status per user id (no decryption needed). */
export async function profileStatuses(
  ctx: Pick<ServerCtx, "db">,
  userIds: string[],
): Promise<Map<string, ProfileStatus>> {
  const result = new Map<string, ProfileStatus>();
  if (userIds.length === 0) return result;
  const rows = await ctx.db
    .select({
      userId: learnerQctoProfiles.userId,
      confirmedAt: learnerQctoProfiles.confirmedAt,
    })
    .from(learnerQctoProfiles)
    .where(inArray(learnerQctoProfiles.userId, userIds));
  for (const id of userIds) result.set(id, "not_started");
  for (const r of rows) {
    result.set(r.userId, r.confirmedAt ? "confirmed" : "in_progress");
  }
  return result;
}

// ---------------------------------------------------------------------------
// QCTO sharing consent (LEISA AH/AI)
// ---------------------------------------------------------------------------

/** Calendar date in South Africa (QCTO dates are local dates). */
const saDate = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(
    d,
  );

/** Latest QCTO sharing consent: POPI Act Agree (Yes/No) and Date (YYYYMMDD). */
export async function qctoSharingConsent(
  ctx: Pick<ServerCtx, "db">,
  userId: string,
): Promise<{ agree: "Yes" | "No"; date: string } | undefined> {
  const [row] = await ctx.db
    .select({ granted: consentRecords.granted, at: consentRecords.acceptedAt })
    .from(consentRecords)
    .where(
      and(
        eq(consentRecords.userId, userId),
        eq(consentRecords.kind, "qcto_sharing"),
      ),
    )
    .orderBy(desc(consentRecords.acceptedAt), desc(consentRecords.id))
    .limit(1);
  if (!row) return undefined;
  return row.granted
    ? { agree: "Yes", date: saDate(row.at).replace(/-/g, "") }
    : { agree: "No", date: "" };
}

/**
 * QCTO submission panel (design.md §14, 2026-11-09): for each learner, the
 * profile status and the names of fields that fail validation (never the
 * values). Callers must already have authorised an SDP admin.
 */
export async function profileProblems(
  ctx: ServerCtx,
  userIds: string[],
): Promise<Map<string, { status: ProfileStatus; invalid: { part: string; field: string }[] }>> {
  const out = new Map<string, { status: ProfileStatus; invalid: { part: string; field: string }[] }>();
  if (userIds.length === 0) return out;
  const statuses = await profileStatuses(ctx, userIds);
  const lists = await loadCodeLists(ctx);
  const partOf = (field: string) =>
    PROFILE_PARTS.find((p) => (PART_FIELDS[p] as readonly string[]).includes(field.split(".")[0]!)) ?? "review";
  const words = (field: string) =>
    field
      .split(".")
      .map((f) => f.replace(/([A-Z])/g, " $1").toLowerCase())
      .join(" ")
      .replace(/\bid\b/g, "ID")
      .trim();
  for (const id of userIds) {
    const status = statuses.get(id) ?? "not_started";
    if (status === "not_started") {
      out.set(id, { status, invalid: [] });
      continue;
    }
    const p = await readProfileUnchecked(ctx, id);
    const errors = validateProfile(p.values, lists, PROFILE_PARTS, {
      partial: status !== "confirmed",
      areaInProvince: await areaCheck(ctx, p.values),
      today: ctx.now(),
    });
    out.set(id, {
      status,
      invalid: Object.keys(errors).map((f) => ({ part: PART_TITLES[partOf(f)], field: words(f) })),
    });
  }
  return out;
}
