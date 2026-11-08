"use client";

import { useEffect } from "react";

/** j / k (and [ / ]) move to the next / previous item in a queue, unless typing. */
export function KeyNav({ prev, next }: { prev: string | null; next: string | null }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.key === "j" || e.key === "]") && next) window.location.assign(next);
      if ((e.key === "k" || e.key === "[") && prev) window.location.assign(prev);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next]);
  return null;
}
