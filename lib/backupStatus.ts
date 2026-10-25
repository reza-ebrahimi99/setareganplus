import "server-only";
import { readFile } from "node:fs/promises";

/** Written by deploy/lean/backup.sh (nightly systemd timer). Read-only here. */
const STATUS_FILE = "/var/backups/setareganplus-lean/status.json";

export type BackupStatus =
  | { state: "none" }
  | { state: "ok" | "stale" | "failed"; lastOk: Date | null; bytes: number | null; message: string | null; at: Date | null };

export async function getBackupStatus(): Promise<BackupStatus> {
  let raw: string;
  try {
    raw = await readFile(STATUS_FILE, "utf8");
  } catch {
    return { state: "none" };
  }
  try {
    const j = JSON.parse(raw) as Record<string, unknown>;
    const date = (v: unknown) => (typeof v === "string" && !Number.isNaN(Date.parse(v.replace(/([+-]\d{2})(\d{2})$/, "$1:$2"))) ? new Date(v.replace(/([+-]\d{2})(\d{2})$/, "$1:$2")) : null);
    const lastOk = date(j.lastOk);
    const at = date(j.at);
    const bytes = typeof j.lastOkBytes === "number" ? j.lastOkBytes : null;
    const message = typeof j.message === "string" ? j.message.slice(0, 300) : null;
    if (j.status === "failed") return { state: "failed", lastOk, bytes, message, at };
    const stale = !lastOk || Date.now() - lastOk.getTime() > 36 * 3600e3;
    return { state: stale ? "stale" : "ok", lastOk, bytes, message, at };
  } catch {
    return { state: "none" };
  }
}
