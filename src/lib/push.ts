// Web push: who's subscribed (Neon table push_subs) and sending to them. Delivery is the
// browsers' own push services (Apple, Google, Mozilla), free, signed with our VAPID keys
// (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY in Vercel). Never throws.
import { neon } from "@neondatabase/serverless";
import webpush from "web-push";
import type { Category, Prefs } from "./push-prefs";
import { QUIET_CATEGORIES, cleanPrefs } from "./push-prefs";

const URL_ = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
const sql = URL_ ? neon(URL_) : null;
const PUBLIC = process.env.VAPID_PUBLIC_KEY ?? "";
const PRIVATE = process.env.VAPID_PRIVATE_KEY ?? "";
export const pushEnabled = Boolean(sql && PUBLIC && PRIVATE);
export const vapidPublicKey = PUBLIC;

if (pushEnabled) webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "https://sicko-central.vercel.app", PUBLIC, PRIVATE);

export type Subscription = { endpoint: string; keys: { p256dh: string; auth: string } };
type Row = { endpoint: string; sub: string; prefs: string };

let ready: Promise<unknown> | null = null;
function ensureTable() {
  if (!sql) return Promise.resolve();
  ready ??= sql`
    CREATE TABLE IF NOT EXISTS push_subs (
      endpoint text PRIMARY KEY,
      sub text NOT NULL,
      prefs text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )`.catch((err) => {
    ready = null;
    throw err;
  });
  return ready;
}

export function validSubscription(s: unknown): s is Subscription {
  const x = s as Subscription;
  return !!x && typeof x.endpoint === "string" && /^https:\/\//.test(x.endpoint) && x.endpoint.length < 1000 && typeof x.keys?.p256dh === "string" && typeof x.keys?.auth === "string";
}

export async function saveSubscription(sub: Subscription, prefs: Prefs): Promise<boolean> {
  if (!sql) return false;
  try {
    await ensureTable();
    const s = JSON.stringify({ endpoint: sub.endpoint, keys: sub.keys });
    const p = JSON.stringify(prefs);
    await sql`
      INSERT INTO push_subs (endpoint, sub, prefs, updated_at) VALUES (${sub.endpoint}, ${s}, ${p}, now())
      ON CONFLICT (endpoint) DO UPDATE SET sub = EXCLUDED.sub, prefs = EXCLUDED.prefs, updated_at = now()`;
    return true;
  } catch {
    return false;
  }
}

export async function removeSubscription(endpoint: string): Promise<void> {
  if (!sql) return;
  try {
    await ensureTable();
    await sql`DELETE FROM push_subs WHERE endpoint = ${endpoint}`;
  } catch {
    /* ignore */
  }
}

export async function subscriberCount(): Promise<number> {
  if (!sql) return 0;
  try {
    await ensureTable();
    const r = await sql`SELECT count(*)::int AS n FROM push_subs`;
    return (r[0]?.n as number) ?? 0;
  } catch {
    return 0;
  }
}

export type Message = { title: string; body: string; url: string; tag: string };

// Ottawa hour, for quiet hours (11 p.m.–8 a.m.).
export function quietNow(): boolean {
  const h = Number(new Intl.DateTimeFormat("en-CA", { hour: "numeric", hourCycle: "h23", timeZone: "America/Toronto" }).format(new Date()));
  return h >= 23 || h < 8;
}

// Send to everyone who has this category on (and, with `who`, follows one of these players).
// Returns how many were sent. Expired subscriptions are removed.
export async function notify(category: Category, msg: Message, opts: { who?: number[]; extra?: (p: Prefs) => boolean } = {}): Promise<number> {
  if (!pushEnabled || !sql) return 0;
  let rows: Row[] = [];
  try {
    await ensureTable();
    rows = (await sql`SELECT endpoint, sub, prefs FROM push_subs`) as Row[];
  } catch {
    return 0;
  }
  const quiet = QUIET_CATEGORIES.has(category) && quietNow();
  const targets = rows.filter((r) => {
    let p: Prefs;
    try {
      p = cleanPrefs(JSON.parse(r.prefs));
    } catch {
      return false;
    }
    if (!p.on.includes(category)) return false;
    if (quiet && p.quiet) return false;
    if (opts.who && !opts.who.some((id) => p.favs.includes(id))) return false;
    if (opts.extra && !opts.extra(p)) return false;
    return true;
  });
  const payload = JSON.stringify(msg);
  let sent = 0;
  await Promise.all(
    targets.map(async (r) => {
      try {
        await webpush.sendNotification(JSON.parse(r.sub) as Subscription, payload, { TTL: 3600, urgency: "high", topic: msg.tag.slice(0, 32).replace(/[^A-Za-z0-9_-]/g, "") || undefined });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await removeSubscription(r.endpoint);
      }
    }),
  );
  return sent;
}

// One test notification to a single phone (the one asking), at most once a minute.
const lastTest = new Map<string, number>();
export async function sendTest(endpoint: string): Promise<"sent" | "not-found" | "too-soon" | "failed"> {
  if (!pushEnabled || !sql) return "failed";
  const last = lastTest.get(endpoint) ?? 0;
  if (Date.now() - last < 60_000) return "too-soon";
  let rows: Row[] = [];
  try {
    await ensureTable();
    rows = (await sql`SELECT endpoint, sub, prefs FROM push_subs WHERE endpoint = ${endpoint}`) as Row[];
  } catch {
    return "failed";
  }
  if (!rows[0]) return "not-found";
  lastTest.set(endpoint, Date.now());
  try {
    await webpush.sendNotification(
      JSON.parse(rows[0].sub) as Subscription,
      JSON.stringify({ title: "SENS GOAL! (test)", body: "Notifications are working on this phone. 🚨", url: "/notifications", tag: "test" }),
      { TTL: 300, urgency: "high" },
    );
    return "sent";
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode;
    if (code === 404 || code === 410) await removeSubscription(endpoint);
    return "failed";
  }
}
