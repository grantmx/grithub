import {
  type Address,
  type CodeLists,
  DISABILITY_NONE,
  PART_TITLES,
  type ProfilePart,
  type ProfileValues,
  labelFor,
  maskId,
} from "@/lib/qctoProfile";
import ui from "@/components/ui.module.css";
import styles from "./profile.module.css";

const LONG_DATE = new Intl.DateTimeFormat("en-ZA", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const addressText = (a: Address) =>
  [a.line1, a.line2, a.line3, a.postalCode].filter(Boolean).join(", ");

/**
 * Read-only profile, grouped by part. `maskIds` hides all but the last 4
 * characters of the ID/passport number (design gate: learner view).
 */
export function ProfileSummary({
  values: v,
  lists,
  areaLabel,
  email,
  maskIds,
  editHref,
}: {
  values: ProfileValues;
  lists: CodeLists;
  areaLabel: string;
  email: string;
  maskIds: boolean;
  /** Link per part (setup review), or none. */
  editHref?: (part: ProfilePart) => string;
}) {
  const label = (name: Parameters<typeof labelFor>[1], code: string) =>
    code ? labelFor(lists, name, code) || code : "—";
  const id = (s: string) => (maskIds ? maskId(s) : s);
  const groups: [ProfilePart, [string, string][]][] = [
    [
      "about",
      [
        [
          "Name",
          [label("titles", v.titleCode), v.firstName, v.middleName, v.lastName]
            .filter((s) => s && s !== "—")
            .join(" ") || "—",
        ],
        v.idKind === "alternate"
          ? [
              label("alternativeIdTypes", v.alternativeIdTypeCode),
              id(v.alternateId) || "—",
            ]
          : ["ID number", id(v.nationalId) || "—"],
        [
          "Date of birth",
          v.birthDate
            ? LONG_DATE.format(new Date(`${v.birthDate}T00:00:00Z`))
            : "—",
        ],
        ["Gender", label("genders", v.genderCode)],
      ],
    ],
    [
      "contact",
      [
        ["Home address", addressText(v.homeAddress) || "—"],
        [
          "Postal address",
          v.postalSameAsHome
            ? "Same as home address"
            : addressText(v.postalAddress) || "—",
        ],
        ["Province", label("provinces", v.provinceCode)],
        ["Area", areaLabel || "—"],
        ["Cellphone", v.cellPhone || "—"],
        ["Other phone", v.phone || "—"],
        ["Email for the QCTO", v.shareEmailWithQcto ? email : "Not shared"],
      ],
    ],
    [
      "background",
      [
        ["Nationality", label("nationalities", v.nationalityCode)],
        [
          "Citizenship",
          label("citizenResidentStatuses", v.citizenResidentStatusCode),
        ],
        [
          "Immigration status",
          label("immigrantStatuses", v.immigrantStatusCode),
        ],
        ["Home language", label("homeLanguages", v.homeLanguageCode)],
        [
          "What you do now",
          label("socioeconomicStatuses", v.socioeconomicStatusCode),
        ],
        [
          "Population group",
          v.equityCode === "U"
            ? "Unknown / prefer not to say"
            : label("equities", v.equityCode),
        ],
        [
          "Disability",
          v.disabilityStatusCode && v.disabilityStatusCode !== DISABILITY_NONE
            ? `${label("disabilityStatuses", v.disabilityStatusCode)} (${label("disabilityRatings", v.disabilityRatingCode)})`
            : label("disabilityStatuses", v.disabilityStatusCode),
        ],
      ],
    ],
  ];
  return (
    <>
      {groups.map(([part, rows]) => (
        <section key={part} aria-labelledby={`summary-${part}`}>
          <div className={styles.reviewHead}>
            <h3
              id={`summary-${part}`}
              className={styles.groupTitle}
              style={{ margin: 0 }}
            >
              {PART_TITLES[part]}
            </h3>
            {editHref ? (
              <a href={editHref(part)}>
                Change<span className={ui.srOnly}> {PART_TITLES[part]}</span>
              </a>
            ) : null}
          </div>
          <dl className={styles.review}>
            {rows.map(([k, val]) => (
              <div key={k} style={{ display: "contents" }}>
                <dt>{k}</dt>
                <dd>{val}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </>
  );
}
