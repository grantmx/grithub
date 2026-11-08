"use client";

import { useEffect } from "react";

/**
 * Remembers the reading position for "Continue": restores it when opened
 * with ?resume=1, and saves it (sendBeacon) when the learner leaves the page,
 * switches tabs, or pauses scrolling for a while.
 */
export function ScrollMemory({
  sectionId,
  resumePercent,
}: {
  sectionId: string;
  resumePercent: number | null;
}) {
  useEffect(() => {
    const doc = document.documentElement;
    const maxScroll = () => Math.max(1, doc.scrollHeight - window.innerHeight);

    if (resumePercent && resumePercent > 0 && !window.location.hash) {
      window.scrollTo({ top: (maxScroll() * resumePercent) / 100 });
    }

    let lastSent = -1;
    const send = () => {
      const percent = Math.round((window.scrollY / maxScroll()) * 100);
      if (percent === lastSent) return;
      lastSent = percent;
      const body = JSON.stringify({ sectionId, percent });
      if (
        !navigator.sendBeacon?.(
          "/api/progress/scroll",
          new Blob([body], { type: "application/json" }),
        )
      ) {
        void fetch("/api/progress/scroll", {
          method: "POST",
          body,
          keepalive: true,
          headers: { "Content-Type": "application/json" },
        });
      }
    };
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(send, 4000);
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") send();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", send);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", send);
    };
  }, [sectionId, resumePercent]);
  return null;
}
