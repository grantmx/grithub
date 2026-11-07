import type { Metadata } from "next";
import ui from "@/components/ui.module.css";
import {
  PERSON_FILTERS,
  type PersonFilter,
  type PersonStatus,
  listCohorts,
  listPeople,
} from "@/lib/server/onboarding";
import { requirePage } from "@/lib/server/page";
import { deactivateAction, resendInviteAction } from "../actions";

export const metadata: Metadata = { title: "People" };

const FILTER_LABELS: Record<PersonFilter, string> = {
  all: "All",
  invited: "Invited",
  active: "Active",
  expired: "Expired invite",
  deactivated: "Deactivated",
};

const STATUS: Record<
  PersonStatus,
  { label: string; className: string | undefined }
> = {
  active: { label: "✓ Active", className: ui.statusOk },
  invited: { label: "✉ Invited", className: "" },
  expired: { label: "! Invite expired", className: ui.statusWarn },
  deactivated: { label: "✗ Deactivated", className: ui.statusBad },
};

/**
 * People (design-gate decision: one table + status filter chips; row
 * actions in a "⋯" menu; Invite / Import buttons top right).
 */
export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{
    cohort?: string;
    filter?: string;
    done?: string;
    error?: string;
  }>;
}) {
  const { ctx, actor } = await requirePage("/admin/people");
  const sp = await searchParams;
  const cohorts = await listCohorts(ctx);
  const cohort = cohorts.find((c) => c.id === sp.cohort) ?? cohorts[0];
  const filter = (PERSON_FILTERS as readonly string[]).includes(sp.filter ?? "")
    ? (sp.filter as PersonFilter)
    : "all";

  if (!cohort) {
    return (
      <>
        <h1 className={ui.h1}>People</h1>
        <p className={ui.muted}>
          No cohorts yet. <a href="/admin/cohorts">Create a cohort</a> first.
        </p>
      </>
    );
  }

  const people = await listPeople(ctx, actor, cohort.id, filter);
  const href = (f: PersonFilter) =>
    `/admin/people?cohort=${cohort.id}&filter=${f}`;

  return (
    <>
      <div className={ui.spread}>
        <form method="get" className={ui.row}>
          <label htmlFor="cohort" className={ui.srOnly}>
            Cohort
          </label>
          <h1 className={ui.h1} style={{ margin: 0 }}>
            People ·
          </h1>
          <select
            id="cohort"
            name="cohort"
            className={ui.select}
            defaultValue={cohort.id}
            style={{ width: "auto" }}
          >
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button type="submit" className={ui.secondary}>
            Show
          </button>
        </form>
        <div className={ui.row}>
          <a
            className={ui.button}
            href={`/admin/people/invite?cohort=${cohort.id}`}
          >
            Invite learner
          </a>
          <a
            className={ui.secondary}
            href={`/admin/people/import?cohort=${cohort.id}`}
          >
            Import CSV
          </a>
        </div>
      </div>

      {sp.done === "resent" ? (
        <p role="status" className={ui.bannerSuccess}>
          Invitation re-sent.
        </p>
      ) : null}
      {sp.done === "deactivated" ? (
        <p role="status" className={ui.bannerSuccess}>
          Learner deactivated and signed out everywhere.
        </p>
      ) : null}
      {sp.error ? (
        <p role="alert" className={ui.bannerError}>
          That action couldn&apos;t be completed.
        </p>
      ) : null}

      <nav aria-label="Filter by status" className={ui.chips}>
        {PERSON_FILTERS.map((f) => (
          <a
            key={f}
            href={href(f)}
            className={f === filter ? ui.chipActive : ui.chip}
            aria-current={f === filter ? "true" : undefined}
          >
            {FILTER_LABELS[f]}
          </a>
        ))}
      </nav>

      <div className={ui.tableWrap}>
        <table className={ui.table}>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Email</th>
              <th scope="col">Status</th>
              <th scope="col">Passkeys</th>
              <th scope="col">
                <span className={ui.srOnly}>Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {people.length === 0 ? (
              <tr>
                <td colSpan={5} className={ui.muted}>
                  No learners match this filter.
                </td>
              </tr>
            ) : (
              people.map((p) => (
                <tr key={p.userId}>
                  <td>{p.name}</td>
                  <td>{p.email}</td>
                  <td className={STATUS[p.status].className}>
                    {STATUS[p.status].label}
                  </td>
                  <td>{p.passkeys}</td>
                  <td>
                    {p.status === "deactivated" ? null : (
                      <details className={ui.menu}>
                        <summary aria-label={`Actions for ${p.name}`}>
                          ⋯
                        </summary>
                        <div className={ui.menuPanel}>
                          {p.status === "invited" || p.status === "expired" ? (
                            <form action={resendInviteAction}>
                              <input
                                type="hidden"
                                name="userId"
                                value={p.userId}
                              />
                              <input
                                type="hidden"
                                name="cohortId"
                                value={cohort.id}
                              />
                              <button type="submit" className={ui.textButton}>
                                Resend invitation
                              </button>
                            </form>
                          ) : null}
                          <a
                            className={ui.textButton}
                            href={`/admin/people/${p.userId}/recovery?cohort=${cohort.id}`}
                          >
                            Start account recovery…
                          </a>
                          <form action={deactivateAction}>
                            <input
                              type="hidden"
                              name="userId"
                              value={p.userId}
                            />
                            <input
                              type="hidden"
                              name="cohortId"
                              value={cohort.id}
                            />
                            <button type="submit" className={ui.textButton}>
                              Deactivate (signs them out and blocks access)
                            </button>
                          </form>
                        </div>
                      </details>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
