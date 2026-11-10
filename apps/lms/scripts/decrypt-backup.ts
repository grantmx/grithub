// Decrypt an LMS backup file to JSON lines (for restore tests).
// Usage: BACKUP_ENCRYPTION_KEY=… yarn workspace lms backup:decrypt <file.lmsbak> > backup.jsonl
// Never commit decrypted output: it is the whole database.
import { readFileSync } from "node:fs";
import { decryptBackup, readBackupKey } from "@/lib/server/backup";

const file = process.argv[2];
const key = readBackupKey();
if (!file || !key) {
  console.error("Usage: BACKUP_ENCRYPTION_KEY=<base64 32-byte key> backup:decrypt <file.lmsbak>");
  process.exit(1);
}
process.stdout.write(decryptBackup(readFileSync(file), key));
