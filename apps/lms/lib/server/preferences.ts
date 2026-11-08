import { eq } from "drizzle-orm";
import { users } from "db";
import type { ServerCtx } from "./context";

export const TEXT_SIZES = ["s", "m", "l", "xl"] as const;
export const THEMES = ["system", "light", "dark"] as const;
export type TextSize = (typeof TEXT_SIZES)[number];
export type Theme = (typeof THEMES)[number];
export type Preferences = { textSize: TextSize; theme: Theme };

export const DEFAULT_PREFERENCES: Preferences = {
  textSize: "m",
  theme: "system",
};

/** Display menu preferences, saved per user (design.md: remembered per user). */
export async function getPreferences(
  ctx: Pick<ServerCtx, "db">,
  userId: string,
): Promise<Preferences> {
  const [row] = await ctx.db
    .select({ textSize: users.textSize, theme: users.theme })
    .from(users)
    .where(eq(users.id, userId));
  return row ?? DEFAULT_PREFERENCES;
}

export async function savePreferences(
  ctx: Pick<ServerCtx, "db">,
  userId: string,
  input: Partial<Record<keyof Preferences, string>>,
): Promise<void> {
  const update: Partial<Preferences> = {};
  if (
    input.textSize &&
    (TEXT_SIZES as readonly string[]).includes(input.textSize)
  )
    update.textSize = input.textSize as TextSize;
  if (input.theme && (THEMES as readonly string[]).includes(input.theme))
    update.theme = input.theme as Theme;
  if (Object.keys(update).length === 0) return;
  await ctx.db.update(users).set(update).where(eq(users.id, userId));
}
