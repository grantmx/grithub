import type { ReactNode } from "react";

// Learner area: /, /learn, /schedule … AppShell (design.md §8) comes later.
export default function LearnLayout({ children }: { children: ReactNode }) {
  return <div data-area="learn">{children}</div>;
}
