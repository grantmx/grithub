import ui from "@/components/ui.module.css";

/**
 * Success / error banner from ?done= and ?error= after a form post.
 * TODO(copy): wording to be supplied by GRIT Hub (design.md §13).
 */
const DONE: Record<string, string> = {
  posted: "Your reply is posted.",
  edited: "Your change is saved.",
  reported: "Thanks for telling us. A staff member will look at it.",
  sent: "Your message is sent.",
  raised: "Your question is sent. We reply within 1 working day.",
  replied: "Your reply is sent.",
  reopened: "We've reopened your ticket. Someone will get back to you.",
  read: "All notifications are marked as read.",
  saved: "Your email settings are saved.",
};

export function Notice({ done, error }: { done?: string; error?: string }) {
  return (
    <>
      {done && DONE[done] ? (
        <p role="status" className={ui.bannerSuccess}>
          {DONE[done]}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className={ui.bannerError}>
          {error}
        </p>
      ) : null}
    </>
  );
}
