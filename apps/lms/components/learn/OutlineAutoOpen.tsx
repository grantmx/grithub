"use client";

import { useEffect } from "react";

/** Opens the outline <details> on wide screens (≥900px); phones keep it collapsed. */
export function OutlineAutoOpen({ targetId }: { targetId: string }) {
  useEffect(() => {
    const el = document.getElementById(targetId);
    if (
      el instanceof HTMLDetailsElement &&
      window.matchMedia("(min-width: 900px)").matches
    )
      el.open = true;
  }, [targetId]);
  return null;
}
