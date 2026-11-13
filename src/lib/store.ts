// Small key-value store for content we keep after its source moves on (news headlines,
// video and radio lists for each game). Uses Neon Postgres (connected through the Vercel
// Marketplace, which sets DATABASE_URL): one table of key → JSON text (kept as
// text so it reads back exactly as written), created on first use.
// Without a database it falls back to an in-memory map that only lasts as long as the
// server process (fine for local development).
// Never throws: storage problems just mean nothing extra is kept.
import { neon } from "@neondatabase/serverless";

const URL_ = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
const sql = URL_ ? neon(URL_) : null;

export const storeEnabled = Boolean(sql);

const memory = new Map<string, unknown>();

let ready: Promise<unknown> | null = null;
function ensureTable() {
  if (!sql) return Promise.resolve();
  ready ??= sql`
    CREATE TABLE IF NOT EXISTS kv_store (
      key text PRIMARY KEY,
      value text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )`.catch((err) => {
    ready = null; // try again next time
    throw err;
  });
  return ready;
}

export async function getJson<T>(key: string): Promise<T | null> {
  try {
    if (!sql) return (memory.get(key) as T) ?? null;
    await ensureTable();
    const rows = await sql`SELECT value FROM kv_store WHERE key = ${key}`;
    const raw = rows[0]?.value as string | undefined;
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function setJson(key: string, value: unknown): Promise<void> {
  try {
    if (!sql) {
      memory.set(key, value);
      return;
    }
    await ensureTable();
    const json = JSON.stringify(value);
    await sql`
      INSERT INTO kv_store (key, value, updated_at) VALUES (${key}, ${json}, now())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`;
  } catch {
    /* keep going without storing */
  }
}
