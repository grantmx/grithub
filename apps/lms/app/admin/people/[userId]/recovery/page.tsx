import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { users } from "db";
import ui from "@/components/ui.module.css";
import { requirePage } from "@/lib/server/page";
import { RecoveryForm } from "../../../AdminForms";

export const metadata: Metadata = { title: "Account recovery" };

const METHODS = [
  { value: "in_person", label: "In person, with ID" },
  { value: "video_call", label: "Video call, with ID shown" },
  {
    value: "phone_call_known_number",
    label: "Phone call to a number already on record",
  },
];

/** Admin-verified recovery (documented in apps/lms/README.md). */
export default async function RecoveryPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ cohort?: string }>;
}) {
  const { userId } = await params;
  const { cohort } = await searchParams;
  const { ctx } = await requirePage(`/admin/people/${userId}/recovery`);
  const [user] = await ctx.db
    .select({ name: users.displayName, status: users.status })
    .from(users)
    .where(eq(users.id, userId));
  if (!user) return <p className={ui.muted}>User not found.</p>;
  return (
    <>
      <a href={`/admin/people${cohort ? `?cohort=${cohort}` : ""}`}>← People</a>
      <h1 className={ui.h1}>Recover account: {user.name}</h1>
      <p className={ui.muted}>
        Only continue after you have verified this person&apos;s identity. Never
        use SMS codes, and never read a recovery link out to someone over the
        phone.
      </p>
      <RecoveryForm userId={userId} methods={METHODS} />
    </>
  );
}
