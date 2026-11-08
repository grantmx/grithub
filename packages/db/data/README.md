# Reference data files

GLOBAL reference data (shared by every tenant; see `src/tenancy.ts`). Each file is loaded by a migration, so every database gets the same rows. Don't edit the CSV by hand: update it from the source file and add a **new** migration (codes Stats SA or the QCTO withdraw are retired with `retired_at`, never deleted).

## statssa_area_codes.csv

- **Used for:** LEISA column AG (STATSSA Area Code), chosen by the learner in the profile step and checked against their province.
- **Source:** the Stats SA area code list the QCTO publishes with the LEISA data load specification (`STATSSA_AreaCodes` sheet, last saved 19 May 2022), supplied by GRIT Hub on 2026-11-08. 22,108 rows.
- **Columns:** `code` (e.g. `2011-160001001`), `area` (Stats SA main/sub-place; stored as `label`), `town`, `local_municipality`, `province_code` (the QCTO province code, 1–9). The source's district municipality column isn't kept.
- **Province mapping:** the source's province names map to QCTO codes 1 Western Cape … 9 Limpopo. The digit after `2011-` in every code equals that province code, which is how the correction below was found.
- **Loaded by:** `migrations/0015_statssa_area_codes.sql` (generated from this CSV in chunks of 1,000 rows).

### Corrections made to the source

| Source row | Issue                                                                                                                                                                                 | Action                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| 16946      | Code `2011-199041015` is used twice: Kensington, Cape Town (Western Cape, row 1280) and Lone Hill, Sandton (Gauteng). The code's province digit (1) matches only the Western Cape row | Lone Hill row left out (22,107 rows kept) |
| 58         | `SteenbergÆs Cove`: mis-encoded apostrophe                                                                                                                                            | Stored as `Steenberg's Cove`              |

Lone Hill learners can still pick a nearby Sandton area. Ask the QCTO for the correct code and add it in a new migration when they reply.
