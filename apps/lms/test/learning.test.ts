import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { modules, sectionProgress, sections, users } from "db";
import { seedDemo } from "db/seed";
import { SectionBody } from "@/components/learn/SectionBody";
import {
  LearningError,
  completeSection,
  continueTarget,
  getProgramme,
  getSectionPage,
  listLibrary,
  listProgrammes,
  saveScrollPosition,
} from "@/lib/server/learning";
import { getCheckView, submitCheckAnswer } from "@/lib/server/sectionCheck";
import {
  actorFor,
  createTestDb,
  makeCtx,
  makeUser,
  type TestDb,
} from "./helpers";

let t: TestDb;
let qualificationId: string;
let sectionIds: string[]; // knowledge module sections, in order

beforeAll(async () => {
  t = await createTestDb();
  qualificationId = (await seedDemo(t.db)).qualificationId;
  const rows = await t.db
    .select({ id: sections.id, moduleType: modules.type })
    .from(sections)
    .innerJoin(modules, eq(modules.id, sections.moduleId))
    .where(eq(modules.qualificationId, qualificationId))
    .orderBy(modules.sortOrder, sections.sortOrder);
  sectionIds = rows
    .filter((r) => r.moduleType === "knowledge")
    .map((r) => r.id);
});
afterAll(async () => {
  await t?.teardown();
});

async function learner(n: 1 | 2 | 3) {
  const [u] = await t.db
    .select()
    .from(users)
    .where(eq(users.email, `demo.learner${n}@example.invalid`));
  const ctx = makeCtx(t.db);
  return { ctx, actor: (await actorFor(ctx, u!.id)).actor };
}

/** Answer the section's check (any option) so it can be marked complete. */
async function answerCheck(
  ctx: ReturnType<typeof makeCtx>,
  actor: Awaited<ReturnType<typeof learner>>["actor"],
  sectionId: string,
) {
  const view = await getCheckView(ctx, actor, sectionId);
  if (view.state !== "question") return;
  await submitCheckAnswer(ctx, actor, view.attemptId, view.options[0]!.token);
}

describe("dashboard", () => {
  it("shows one card per programme with progress and a Start target", async () => {
    const { ctx, actor } = await learner(1);
    const [p] = await listProgrammes(ctx, actor);
    expect(p).toMatchObject({
      qualificationId,
      status: "not_started",
      completedSections: 0,
      modulesTotal: 2,
      continueTo: { sectionId: sectionIds[0], resume: false },
    });
    expect(p!.totalSections).toBe(4); // 3 knowledge + 1 practical
  });

  it("shows nothing for someone who isn't enrolled", async () => {
    const outsider = await makeUser(t.db);
    const ctx = makeCtx(t.db);
    const { actor } = await actorFor(ctx, outsider.id);
    expect(await listProgrammes(ctx, actor)).toEqual([]);
    await expect(
      getSectionPage(ctx, actor, sectionIds[0]!),
    ).rejects.toBeInstanceOf(LearningError);
    await expect(
      getProgramme(ctx, actor, qualificationId),
    ).rejects.toMatchObject({ code: "not_enrolled" });
  });
});

describe("progress and resume", () => {
  it("records views and resumes the last viewed section at its scroll position", async () => {
    const { ctx, actor } = await learner(2);
    await getSectionPage(ctx, actor, sectionIds[0]!);
    await getSectionPage(
      makeCtx(t.db, { now: () => new Date(Date.now() + 1000) }),
      actor,
      sectionIds[1]!,
    );
    await saveScrollPosition(ctx, actor, sectionIds[1]!, 62.4);

    const [p] = await listProgrammes(ctx, actor);
    expect(p!.status).toBe("in_progress");
    expect(p!.continueTo).toEqual({ sectionId: sectionIds[1], resume: true });
    const page = await getSectionPage(ctx, actor, sectionIds[1]!);
    expect(page.scrollPercent).toBe(62);
  });

  it("requires the check to be answered (right or wrong) before completing", async () => {
    const { ctx, actor } = await learner(2);
    await expect(
      completeSection(ctx, actor, sectionIds[0]!),
    ).rejects.toMatchObject({ code: "check_required" });
    await answerCheck(ctx, actor, sectionIds[0]!);
    await completeSection(ctx, actor, sectionIds[0]!);
    const [row] = await t.db
      .select()
      .from(sectionProgress)
      .where(and(eq(sectionProgress.sectionId, sectionIds[0]!)));
    expect(row?.completedAt).toBeInstanceOf(Date);
  });

  it("completing is idempotent (keeps the first completion time)", async () => {
    const { ctx, actor } = await learner(2);
    const before = (await getSectionPage(ctx, actor, sectionIds[0]!))
      .completedAt;
    await completeSection(
      makeCtx(t.db, { now: () => new Date(Date.now() + 60_000) }),
      actor,
      sectionIds[0]!,
    );
    expect(
      (await getSectionPage(ctx, actor, sectionIds[0]!)).completedAt,
    ).toEqual(before);
  });

  it("after completing the last viewed section, Continue moves to the next incomplete one", async () => {
    const { ctx, actor } = await learner(3);
    await getSectionPage(ctx, actor, sectionIds[0]!);
    await answerCheck(ctx, actor, sectionIds[0]!);
    await completeSection(ctx, actor, sectionIds[0]!);
    const [p] = await listProgrammes(ctx, actor);
    expect(p!.continueTo).toEqual({ sectionId: sectionIds[1], resume: false });
    expect(p!.completedSections).toBe(1);
  });

  it("continueTarget handles wrap-around and full completion", () => {
    const outline = [
      {
        id: "m",
        code: "M",
        title: "M",
        type: "knowledge" as const,
        completed: 2,
        sections: [
          { id: "a", title: "A", state: "not_started" as const },
          { id: "b", title: "B", state: "complete" as const },
          { id: "c", title: "C", state: "complete" as const },
        ],
      },
    ];
    const progress = [
      {
        sectionId: "c",
        lastViewedAt: new Date(),
        completedAt: new Date(),
        scrollPercent: 0,
      },
    ];
    expect(continueTarget(outline, progress)).toEqual({
      sectionId: "a",
      resume: false,
    });
    const allDone = [
      {
        ...outline[0]!,
        sections: outline[0]!.sections.map((s) => ({
          ...s,
          state: "complete" as const,
        })),
      },
    ];
    expect(continueTarget(allDone, progress)).toEqual({
      sectionId: "c",
      resume: false,
    });
  });
});

describe("text is the core: sections work with no media", () => {
  it("a section without media has no media block and renders its full text", async () => {
    const { ctx, actor } = await learner(1);
    const page = await getSectionPage(ctx, actor, sectionIds[2]!); // "Staying safe online": text only
    expect(page.media).toEqual([]);
    expect(page.texts.length).toBeGreaterThan(0);
    const html = renderToStaticMarkup(
      createElement(SectionBody, { media: page.media, texts: page.texts }),
    );
    expect(html).toContain("Strong passwords");
    expect(html).not.toMatch(/Watch|Listen|mux-player|<video|<audio/);
  });

  it("media is shown as an optional extra: label with duration and size, nothing loaded until pressed", async () => {
    const { ctx, actor } = await learner(1);
    const page = await getSectionPage(ctx, actor, sectionIds[1]!); // audio section
    const html = renderToStaticMarkup(
      createElement(SectionBody, { media: page.media, texts: page.texts }),
    );
    expect(html).toContain("Listen");
    expect(html).toContain("4 min · ~4 MB");
    expect(html).not.toMatch(/mux-player|<audio|<video|autoplay/i);
    expect(html).toContain("the text on this page is the transcript");
  });

  it("video shows its own transcript (collapsed) when it differs from the text", async () => {
    const { ctx, actor } = await learner(1);
    const page = await getSectionPage(ctx, actor, sectionIds[0]!);
    // Seeded video is a draft until captions exist? No: the seed publishes it with captions.
    const video = page.media.find((m) => m.kind === "video");
    expect(video?.captionsLanguage).toBe("en");
    const html = renderToStaticMarkup(
      createElement(SectionBody, { media: page.media, texts: page.texts }),
    );
    expect(html).toMatch(/<details[^>]*><summary>Transcript/);
    expect(html).toContain("[DEMO TRANSCRIPT]");
  });
});

describe("library", () => {
  it("lists published resources for the learner's programmes only", async () => {
    const { ctx, actor } = await learner(1);
    const lib = await listLibrary(ctx, actor);
    expect(lib).toHaveLength(1);
    expect(lib[0]!.resources.length).toBeGreaterThanOrEqual(2);
    const outsider = await makeUser(t.db);
    const o = await actorFor(makeCtx(t.db), outsider.id);
    expect(await listLibrary(makeCtx(t.db), o.actor)).toEqual([]);
  });
});
