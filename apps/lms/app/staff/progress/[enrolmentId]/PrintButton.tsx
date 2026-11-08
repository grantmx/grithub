"use client";

import ui from "@/components/ui.module.css";

export function PrintButton() {
  return (
    <button type="button" className={ui.button} onClick={() => window.print()}>
      Print or save as PDF
    </button>
  );
}
