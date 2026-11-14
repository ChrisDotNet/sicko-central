// Upstash QStash: calls our /api/notify/tick at set times, so notifications go out while the
// app is closed (Vercel's free plan only runs our own scheduled job once a day).
// Keys come from the Upstash integration in Vercel: QSTASH_TOKEN, QSTASH_URL and the two
// signing keys. No schedules are created on the account: every call is a one-off message,
// and each game tick books the next one.
//
// Budget guards (the free plan allows 1,000 messages a day and 10 schedules):
// - A daily counter in Neon; publishing stops at DAILY_BUDGET (well under 1,000, leaving
//   room for QStash's retries and anything sent by hand).
// - Each message is retried at most once.
// - Every message carries a deduplication id, so a repeat of the same plan is dropped by QStash.
// - NOTIFY_PAUSED=1 in Vercel stops all publishing at once.
// Never throws.
import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { getJson, setJson } from "./store";

export const DAILY_BUDGET = 600;
const BASE = process.env.QSTASH_URL ?? "https://qstash.upstash.io";
const TOKEN = process.env.QSTASH_TOKEN ?? "";
export const qstashEnabled = Boolean(TOKEN) && process.env.NOTIFY_PAUSED !== "1";

const dayKey = () => `qstash:used:${new Date().toISOString().slice(0, 10)}`; // QStash counts by UTC day

export async function usedToday(): Promise<number> {
  return (await getJson<number>(dayKey())) ?? 0;
}

export type Publish = {
  url: string; // our endpoint
  body: unknown;
  at?: number; // ms timestamp to deliver at (default now)
  dedupe: string; // same id twice = sent once
};

// Book one call. Returns false if publishing is off, over budget or failed.
export async function publish(p: Publish): Promise<boolean> {
  if (!qstashEnabled) return false;
  const used = await usedToday();
  if (used >= DAILY_BUDGET) return false;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
    "Upstash-Retries": "1",
    "Upstash-Deduplication-Id": p.dedupe.replace(/[^A-Za-z0-9_.:-]/g, "-").slice(0, 100),
  };
  if (p.at && p.at > Date.now() + 1000) headers["Upstash-Not-Before"] = String(Math.floor(p.at / 1000));
  try {
    const res = await fetch(`${BASE.replace(/\/$/, "")}/v2/publish/${p.url}`, {
      method: "POST",
      headers,
      body: JSON.stringify(p.body),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return false;
    await setJson(dayKey(), used + 1);
    return true;
  } catch {
    return false;
  }
}

const b64url = (b: Buffer) => b.toString("base64url");

// Check QStash's signature (a JWT signed with either signing key) on a call to us.
export function verifySignature(signature: string | null, body: string, url: string): boolean {
  if (!signature) return false;
  const keys = [process.env.QSTASH_CURRENT_SIGNING_KEY, process.env.QSTASH_NEXT_SIGNING_KEY].filter((k): k is string => !!k);
  const [h, p, s] = signature.split(".");
  if (!h || !p || !s) return false;
  const ok = keys.some((k) => {
    const expected = Buffer.from(b64url(createHmac("sha256", k).update(`${h}.${p}`).digest()));
    const got = Buffer.from(s);
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
  if (!ok) return false;
  try {
    const claims = JSON.parse(Buffer.from(p, "base64url").toString()) as { iss?: string; sub?: string; exp?: number; nbf?: number; body?: string };
    const now = Math.floor(Date.now() / 1000);
    if (claims.iss !== "Upstash") return false;
    if (claims.exp && now > claims.exp + 5) return false;
    if (claims.nbf && now < claims.nbf - 5) return false;
    if (claims.sub && claims.sub.replace(/\/$/, "") !== url.replace(/\/$/, "")) return false;
    const hash = b64url(createHash("sha256").update(body).digest()).replace(/=+$/, "");
    return (claims.body ?? "").replace(/=+$/, "") === hash;
  } catch {
    return false;
  }
}
