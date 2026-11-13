// Small key-value store for content we keep after its source moves on (news headlines,
// video and radio lists for each game). Uses Upstash Redis through its REST API when the
// Vercel Marketplace integration's environment variables are set; otherwise an in-memory
// map, which only lasts as long as the server process (fine for local development).
// Never throws: storage problems just mean nothing extra is kept.

const URL_ = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

export const storeEnabled = Boolean(URL_ && TOKEN);

const memory = new Map<string, string>();

async function command(args: string[]): Promise<unknown> {
  const res = await fetch(URL_ as string, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });
  if (!res.ok) throw new Error(`store ${res.status}`);
  const data = (await res.json()) as { result?: unknown };
  return data.result ?? null;
}

export async function getJson<T>(key: string): Promise<T | null> {
  try {
    const raw = storeEnabled ? ((await command(["GET", key])) as string | null) : (memory.get(key) ?? null);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function setJson(key: string, value: unknown): Promise<void> {
  try {
    const raw = JSON.stringify(value);
    if (storeEnabled) await command(["SET", key, raw]);
    else memory.set(key, raw);
  } catch {
    /* keep going without storing */
  }
}
