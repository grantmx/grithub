/**
 * Virus-scan hook (design-gate decision 2026-11-08: placeholder that passes
 * but records). Until a real scanner is connected every file is recorded as
 * "not_scanned" and staff can open it with that label shown. When a scanner
 * is configured, files stay hidden from staff until "clean", and "infected"
 * files are rejected and removed.
 */

export type ScanResult = "not_scanned" | "clean" | "infected";

export interface VirusScanner {
  /** True when a real scanner is connected (changes who may open unscanned files). */
  readonly configured: boolean;
  scan(bytes: Uint8Array, meta: { fileName: string; mimeType: string }): Promise<ScanResult>;
}

const placeholder: VirusScanner = {
  configured: false,
  async scan() {
    return "not_scanned";
  },
};

let scanner: VirusScanner = placeholder;

export function virusScanner(): VirusScanner {
  return scanner;
}

/** Connect a real scanner (e.g. a ClamAV or cloud scanning service). Also used by tests. */
export function setVirusScanner(next: VirusScanner | null) {
  scanner = next ?? placeholder;
}

/** Can staff open a file with this scan status? */
export function staffMayOpen(status: "not_scanned" | "pending" | "clean" | "infected"): boolean {
  if (status === "infected") return false;
  if (scanner.configured) return status === "clean";
  return status === "not_scanned" || status === "clean";
}
