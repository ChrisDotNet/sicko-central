// Push notifications: what to send and when. QStash (src/lib/qstash.ts) calls
// /api/notify/tick with one of these jobs:
// - "remind": the pre-game reminder (booked 60 and 30 minutes before puck drop; each phone
//   gets the one it chose).
// - "goalie": checks NHL.com's preview for the starting goalie (a few times before the game).
// - "game": watches the game. Every minute from just before puck drop to the final, every
//   two minutes in intermissions, then every five minutes for three hours after the final
//   for the recap, pressers, radio and news. Each tick books the next.
// The daily job (/api/cron/collect, 9–10 a.m. Ottawa) plans the day and sends the morning
// digest and birthday alerts itself.
//
// What's been sent is kept per game in Neon, so nothing goes out twice.
// Budget (beyond the daily cap in qstash.ts): a game chain stops after MAX_TICKS, after
// 8 hours from puck drop, or if a newer chain has replaced it (each tick carries a token).
import { buildGame } from "./game";
import type { LiveGame } from "./game";
import { getStartingGoalies } from "./goalies";
import { collectGameMedia } from "./media";
import { getBoxScore, getGameSummary, getPlayByPlay, getRoster, getSchedule, getTeamSchedule, name } from "./nhl";
import type { ScheduleGame } from "./nhl";
import { notify, quietNow } from "./push";
import { publish } from "./qstash";
import { getSensNews } from "./sens-news";
import { getJson, setJson } from "./store";
import { OTT } from "./teams";
import { formatTime, periodLabel } from "./format";

const SITE = process.env.SITE_URL ?? "https://sicko-central.vercel.app";
const TICK = `${SITE}/api/notify/tick`;
const MAX_TICKS = 260; // about 3 h at one a minute plus 3 h at one every five
const MAX_AFTER_START_MS = 8 * 3600_000;
const POST_FINAL_MS = 3 * 3600_000;

export type Job =
  | { kind: "remind"; gameId: number; mins: 30 | 60 }
  | { kind: "goalie"; gameId: number }
  | { kind: "game"; gameId: number; token: string; n: number }
  | { kind: "leafs"; gameId: number; n: number };

type GameState = {
  token: string;
  ticks: number;
  goals: number[]; // goal event ids sent
  replays: number[]; // goal ids whose replay alert went out
  periods: number[]; // period ends sent
  final: boolean;
  finalAt?: number;
  recap: boolean;
  senstv: string[];
  partner: string[]; // TSN / Sportsnet video ids
  radio: string[];
  news: number; // stories seen at the last news alert
  newsAlerts: number;
  goalie: boolean;
  preview?: boolean; // "Preview is up" sent
  reminded: number[]; // reminder minutes sent
};

const stateKey = (gameId: number) => `notify:game:${gameId}`;
const empty = (token: string): GameState => ({ token, ticks: 0, goals: [], replays: [], periods: [], final: false, recap: false, senstv: [], partner: [], radio: [], news: 0, newsAlerts: 0, goalie: false, reminded: [] });

async function loadState(gameId: number): Promise<GameState | null> {
  return getJson<GameState>(stateKey(gameId));
}
async function saveState(gameId: number, s: GameState) {
  await setJson(stateKey(gameId), s);
}

const ottawaDate = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto" }).format(d);

function oppOf(g: ScheduleGame) {
  return g.homeTeam.abbrev === OTT ? g.awayTeam : g.homeTeam;
}
function vsAt(g: ScheduleGame) {
  return g.homeTeam.abbrev === OTT ? "vs" : "at";
}

// ---- Planning (daily job) ----

// Leafs Watch: on a Leafs game day, check for the final from about 2 h 15 min after their
// puck drop, every 10 minutes, at most 12 times (a handful of QStash messages a game).
const LEAFS_FIRST_CHECK_MS = 2.25 * 3600_000;
const LEAFS_MAX_CHECKS = 12;

async function planLeafs(today: string, now: number): Promise<number> {
  const tor = await getTeamSchedule("TOR");
  const g = (tor?.games ?? []).find((x) => x.gameDate === today && x.gameType >= 2);
  if (!g) return 0;
  const at = Math.max(now, Date.parse(g.startTimeUTC) + LEAFS_FIRST_CHECK_MS);
  return (await publish({ url: TICK, body: { kind: "leafs", gameId: g.id, n: 0 } satisfies Job, at, dedupe: `leafs-${g.id}-0` })) ? 1 : 0;
}

export async function planToday(): Promise<{ game: number | null; booked: number }> {
  const schedule = await getSchedule();
  const today = ottawaDate();
  const leafsBooked = await planLeafs(today, Date.now()).catch(() => 0);
  const g = (schedule?.games ?? []).find((x) => x.gameDate === today && x.gameType >= 2);
  if (!g) return { game: null, booked: leafsBooked };
  const start = Date.parse(g.startTimeUTC);
  const now = Date.now();
  let booked = leafsBooked;
  const book = async (job: Job, at: number, dedupe: string) => {
    if (at < now - 60_000) return;
    if (await publish({ url: TICK, body: job, at, dedupe })) booked++;
  };
  // Goalie checks: 5, 3, 1.5 and 0.75 hours before puck drop (NHL.com posts its preview midday).
  for (const h of [5, 3, 1.5, 0.75]) await book({ kind: "goalie", gameId: g.id }, start - h * 3600_000, `goalie-${g.id}-${h}`);
  for (const mins of [60, 30] as const) await book({ kind: "remind", gameId: g.id, mins }, start - mins * 60_000, `remind-${g.id}-${mins}`);
  // The game chain, starting five minutes before puck drop, under a fresh token.
  const existing = await loadState(g.id);
  const token = existing?.token ?? `${g.id}-${now.toString(36)}`;
  if (!existing) await saveState(g.id, empty(token));
  await book({ kind: "game", gameId: g.id, token, n: 0 }, start - 5 * 60_000, `game-${g.id}-${token}-0`);
  return { game: g.id, booked };
}

// ---- Jobs ----

export async function runJob(job: Job): Promise<string> {
  if (job.kind === "remind") return remind(job.gameId, job.mins);
  if (job.kind === "goalie") return goalieCheck(job.gameId);
  if (job.kind === "leafs") return leafsCheck(job);
  return gameTick(job);
}

async function scheduled(gameId: number): Promise<ScheduleGame | null> {
  const schedule = await getSchedule();
  return schedule?.games.find((g) => g.id === gameId) ?? null;
}

async function remind(gameId: number, mins: 30 | 60): Promise<string> {
  const g = await scheduled(gameId);
  if (!g) return "no game";
  const s = (await loadState(gameId)) ?? empty(`${gameId}-r`);
  if (s.reminded.includes(mins)) return "already";
  // Puck drop moved? Only remind if it's still roughly when we booked it.
  const left = (Date.parse(g.startTimeUTC) - Date.now()) / 60_000;
  if (left < mins - 15 || left > mins + 15) return "time changed";
  const goalies = await getStartingGoalies(String(gameId), oppOf(g).abbrev);
  const nets = [...new Set((g.tvBroadcasts ?? []).filter((b) => b.countryCode === "CA").map((b) => b.network))];
  const bits = [`${formatTime(g.startTimeUTC)}${nets.length ? ` on ${nets.join(", ")}` : ""}`, goalies?.ott ? `${goalies.ott.name} in goal` : null].filter(Boolean);
  const sent = await notify(
    "pre",
    { title: `Puck drop in ${mins} min: ${vsAt(g)} ${oppOf(g).abbrev}`, body: `${bits.join(" · ")}. Tap for the Game page.`, url: "/live", tag: `remind-${gameId}` },
    { extra: (p) => p.remind === mins },
  );
  s.reminded.push(mins);
  await saveState(gameId, s);
  return `reminded ${sent}`;
}

async function goalieCheck(gameId: number): Promise<string> {
  const g = await scheduled(gameId);
  if (!g) return "no game";
  const s = (await loadState(gameId)) ?? empty(`${gameId}-g`);
  if (s.goalie) return "already";
  const goalies = await getStartingGoalies(String(gameId), oppOf(g).abbrev);
  const confirmed = goalies?.ott?.status === "Confirmed";
  // The game-day preview, once: projected lines and goalies (unless the starter's already
  // confirmed, in which case the goalie alert below says it all).
  if (goalies && !s.preview && !confirmed) {
    s.preview = true;
    const word = (st: string) => (st === "Likely" ? "likely" : "projected");
    const bits = [
      goalies.ott ? `${goalies.ott.name} ${word(goalies.ott.status)} in goal` : null,
      goalies.opp ? `${goalies.opp.name} ${word(goalies.opp.status)} for ${oppOf(g).abbrev}` : null,
    ].filter(Boolean);
    const sent = await notify("goalie", { title: "Game-day preview is up", body: `${goalies.headline}${bits.length ? ` · ${bits.join(" · ")}` : ""}`, url: "/live", tag: `preview-${gameId}` });
    await saveState(gameId, s);
    return `preview ${sent}`;
  }
  if (!goalies?.ott || !confirmed) return "not confirmed";
  s.preview = true;
  const opp = goalies.opp ? ` ${goalies.opp.name} ${goalies.opp.status === "Confirmed" ? "starts" : "projected"} for ${oppOf(g).abbrev}.` : "";
  const sent = await notify("goalie", { title: `${goalies.ott.name} starts tonight`, body: `Per NHL.com's game preview.${opp}`, url: "/live", tag: `goalie-${gameId}` });
  s.goalie = true;
  await saveState(gameId, s);
  return `goalie ${sent}`;
}

async function loadGame(gameId: number): Promise<LiveGame | null> {
  const [pbp, box] = await Promise.all([getPlayByPlay(String(gameId)).catch(() => null), getBoxScore(String(gameId)).catch(() => null)]);
  if (!pbp || !box) return null;
  try {
    return buildGame(pbp, box);
  } catch {
    return null;
  }
}

async function gameTick(job: Extract<Job, { kind: "game" }>): Promise<string> {
  const g = await scheduled(job.gameId);
  const s = await loadState(job.gameId);
  if (!g || !s) return "no game";
  if (s.token !== job.token) return "stale chain"; // replaced by a newer plan: stop
  if (s.ticks >= MAX_TICKS) return "tick limit";
  // A Sens game's first tick also books the Leafs check if the Leafs play tonight (in case the
  // morning plan missed it; the dedupe id keeps it to one).
  if (job.n === 0) await planLeafs(ottawaDate(), Date.now()).catch(() => 0);
  s.ticks++;
  const start = Date.parse(g.startTimeUTC);
  const now = Date.now();
  if (now - start > MAX_AFTER_START_MS) {
    await saveState(job.gameId, s);
    return "time limit";
  }

  const game = await loadGame(job.gameId);
  const log: string[] = [];
  if (game) {
    await gameEvents(game, s, log);
    if (game.isFinal && !s.final) {
      s.final = true;
      s.finalAt = now;
      const ot = game.periodType && game.periodType !== "REG" ? ` (${game.periodType})` : "";
      const winner = game.goals.length ? game.goals[game.goals.length - 1] : null;
      const won = game.ott.score > game.opp.score;
      log.push(
        `final ${await notify("final", {
          title: `FINAL${ot}: OTT ${game.ott.score}–${game.opp.score} ${game.opp.abbrev}`,
          body: won && winner?.team === "OTT" && ot ? `${winner.scorer} wins it.` : `Shots ${game.ott.sog}–${game.opp.sog}. Recap and pressers to follow.`,
          url: "/live",
          tag: `final-${job.gameId}`,
        })}`,
      );
    }
  }
  if (s.final) await contentEvents(job.gameId, g, s, log);
  await saveState(job.gameId, s);

  // Book the next tick.
  const after = s.finalAt ? now - s.finalAt : 0;
  if (s.final && after > POST_FINAL_MS) return `done · ${log.join(", ")}`;
  const gap = s.final ? 5 * 60_000 : game?.intermission ? 2 * 60_000 : now < start - 2 * 60_000 ? Math.min(start - now, 5 * 60_000) : 60_000;
  const n = job.n + 1;
  await publish({ url: TICK, body: { ...job, n }, at: now + gap, dedupe: `game-${job.gameId}-${job.token}-${n}` });
  return log.join(", ") || "quiet";
}

async function gameEvents(game: LiveGame, s: GameState, log: string[]) {
  for (const goal of game.goals) {
    if (s.goals.includes(goal.id)) continue;
    s.goals.push(goal.id);
    const when = `${periodLabel(goal.period, goal.periodType)} ${goal.time}`;
    const str = goal.strength === "EV" ? "" : ` · ${goal.strength === "PP" ? "PPG" : goal.strength === "SH" ? "SHG" : "EN"}`;
    const line = `${when}${str} · OTT ${goal.scoreAfter} ${game.opp.abbrev}`; // scoreAfter is Ottawa first
    if (goal.team === "OTT") {
      log.push(`goal ${await notify("sens", { title: `SENS GOAL! ${goal.scorer}${goal.scorerTotal ? ` (${goal.scorerTotal})` : ""}`, body: line, url: "/live", tag: `goal-${goal.id}` })}`);
      const who = [goal.scorerId, ...goal.assistIds].filter((x): x is number => !!x);
      if (who.length) {
        const assists = goal.assists.length ? ` · assists: ${goal.assists.join(", ")}` : "";
        await notify("fav", { title: `Your player: ${goal.scorer} scores`, body: `${line}${assists}`, url: "/live", tag: `fav-${goal.id}` }, {
          who,
          // Phones that already got "SENS GOAL! <scorer>" for a player they follow don't need a second alert.
          extra: (p) => !(p.on.includes("sens") && goal.scorerId != null && p.favs.includes(goal.scorerId)),
        });
      }
    } else {
      log.push(`against ${await notify("against", { title: `${goal.teamAbbrev} goal · ${goal.scorer}${goal.scorerTotal ? ` (${goal.scorerTotal})` : ""}`, body: line, url: "/live", tag: `goal-${goal.id}` })}`);
    }
  }
  for (const goal of game.goals) {
    if (goal.team !== "OTT" || !goal.clipId || s.replays.includes(goal.id)) continue;
    s.replays.push(goal.id);
    await notify("replay", { title: `Replay ready: ${goal.scorer}`, body: "Watch the goal", url: `/live?tab=media&show=video`, tag: `replay-${goal.id}` });
  }
  if (game.intermission && !game.isFinal && !s.periods.includes(game.period)) {
    s.periods.push(game.period);
    log.push(
      `period ${await notify("period", {
        title: `End of ${periodLabel(game.period, game.periodType)} · OTT ${game.ott.score}–${game.opp.score} ${game.opp.abbrev}`,
        body: `Shots ${game.ott.sog}–${game.opp.sog}. Intermission card on the Game page.`,
        url: "/live",
        tag: `period-${game.period}`,
      })}`,
    );
  }
}

async function contentEvents(gameId: number, g: ScheduleGame, s: GameState, log: string[]) {
  const media = await collectGameMedia(String(gameId), g.startTimeUTC).catch(() => null);
  if (!media) return;
  const opp = oppOf(g).abbrev;
  const mediaUrl = (show: string) => `/game/${gameId}?tab=media&show=${show}`;
  const recap = media.video.recaps[0] ?? media.video.condensed[0];
  if (recap && !s.recap) {
    s.recap = true;
    const extra = media.video.condensed.length && media.video.recaps.length ? " · plus the condensed game" : "";
    log.push(`recap ${await notify("recap", { title: "Recap is up", body: `${recap.title}${extra}`, url: mediaUrl("video"), tag: `recap-${gameId}` })}`);
  }
  const start = Date.parse(g.startTimeUTC);
  const tvNew = (media.video.senstv ?? []).filter((v) => Date.parse(v.published) > start && !s.senstv.includes(v.id));
  if (tvNew.length) {
    s.senstv.push(...tvNew.map((v) => v.id));
    log.push(`senstv ${await notify("pressers", { title: "Postgame media on Sens TV", body: tvNew[0].title, url: mediaUrl("video"), tag: `senstv-${gameId}-${s.senstv.length}` })}`);
  }
  const partner = [...(media.video.tsn ?? []), ...(media.video.sportsnet ?? [])].filter((v) => Date.parse(v.published) > start && !s.partner.includes(v.id));
  if (partner.length) {
    s.partner.push(...partner.map((v) => v.id));
    // One alert per batch, not per video.
    await notify("pressers", { title: partner.length === 1 ? "New video about tonight" : `${partner.length} new videos about tonight`, body: partner[0].title, url: mediaUrl("video"), tag: `partner-${gameId}-${s.partner.length}` });
  }
  // Radio: the period segments aired during the game, so only the postgame show is news.
  const radioNew = media.radio.filter((e) => e.kind === "postgame" && !s.radio.includes(e.id));
  if (radioNew.length) {
    s.radio.push(...radioNew.map((e) => e.id));
    await notify("radio", { title: "TSN 1200 postgame show", body: `${radioNew[0].label || radioNew[0].title} is ready to play`, url: mediaUrl("audio"), tag: `radio-${gameId}-${s.radio.length}` });
  }
  const post = media.news.filter((n) => Date.parse(n.published) > start).length;
  // At most two news alerts a game, at least three new stories each time (or the first one 90 min after the final).
  if (s.newsAlerts < 2 && post > s.news && (post - s.news >= 3 || (s.newsAlerts === 0 && s.finalAt && Date.now() - s.finalAt > 90 * 60_000))) {
    const n = post - s.news;
    s.news = post;
    s.newsAlerts++;
    log.push(`news ${await notify("news", { title: `${n} new ${n === 1 ? "story" : "stories"} about tonight`, body: `Coverage of ${vsAt(g)} ${opp} from NHL.com, TSN and Sportsnet`, url: mediaUrl("news"), tag: `news-${gameId}-${s.newsAlerts}` })}`);
  }
}

type LeafsState = { sent: boolean; held?: { title: string; body: string } };

async function leafsCheck(job: Extract<Job, { kind: "leafs" }>): Promise<string> {
  const key = `notify:leafs:${job.gameId}`;
  const s = (await getJson<LeafsState>(key)) ?? { sent: false };
  if (s.sent) return "already";
  const g = await getGameSummary(job.gameId);
  const final = g && ["FINAL", "OFF"].includes(g.gameState);
  if (!g || !final) {
    if (job.n + 1 >= LEAFS_MAX_CHECKS) return "gave up";
    const n = job.n + 1;
    await publish({ url: TICK, body: { ...job, n }, at: Date.now() + 10 * 60_000, dedupe: `leafs-${job.gameId}-${n}` });
    return "not final";
  }
  const torHome = g.homeTeam.abbrev === "TOR";
  const tor = (torHome ? g.homeTeam.score : g.awayTeam.score) ?? 0;
  const opp = (torHome ? g.awayTeam.score : g.homeTeam.score) ?? 0;
  const oppAbbrev = torHome ? g.awayTeam.abbrev : g.homeTeam.abbrev;
  s.sent = true;
  if (tor >= opp) {
    await setJson(key, s);
    return "leafs won";
  }
  const last = g.gameOutcome?.lastPeriodType ?? g.periodDescriptor?.periodType;
  const ot = last && last !== "REG" ? ` (${last})` : "";
  const title = "The Leafs lose! 😈";
  const body = `TOR ${tor}–${opp} ${oppAbbrev}${ot}${torHome ? " at home" : ""}.`;
  const sent = await notify("leafs", { title, body, url: "/live", tag: `leafs-${job.gameId}` });
  // Phones in quiet hours get it with the morning alerts instead.
  if (quietNow()) s.held = { title, body };
  await setJson(key, s);
  return `leafs lost ${sent}`;
}

// ---- Morning (daily job) ----

export async function morning(): Promise<string> {
  const out: string[] = [];
  // Birthdays.
  const roster = await getRoster().catch(() => null);
  const today = ottawaDate().slice(5);
  const bdays = [...(roster?.forwards ?? []), ...(roster?.defensemen ?? []), ...(roster?.goalies ?? [])].filter((p) => p.birthDate?.slice(5) === today);
  const sentKey = `notify:morning:${ottawaDate()}`;
  if (await getJson<boolean>(sentKey)) return "already";
  for (const p of bdays) {
    const age = Number(ottawaDate().slice(0, 4)) - Number(p.birthDate!.slice(0, 4));
    out.push(`bday ${await notify("bday", { title: `Happy birthday, ${name(p.firstName)} ${name(p.lastName)}!`, body: `${p.sweaterNumber != null ? `#${p.sweaterNumber} ` : ""}turns ${age} today`, url: `/player/${p.id}`, tag: `bday-${p.id}` })}`);
  }
  // Leafs losses that finished in quiet hours, for phones that had quiet hours on.
  const tor = await getTeamSchedule("TOR").catch(() => null);
  const yesterday = ottawaDate(new Date(Date.now() - 86400_000));
  for (const g of (tor?.games ?? []).filter((x) => x.gameDate === yesterday || x.gameDate === ottawaDate())) {
    const st = await getJson<LeafsState>(`notify:leafs:${g.id}`);
    if (!st?.held) continue;
    out.push(`leafs ${await notify("leafs", { title: `Overnight: ${st.held.title}`, body: st.held.body, url: "/", tag: `leafs-${g.id}-am` }, { extra: (p) => p.quiet })}`);
    await setJson(`notify:leafs:${g.id}`, { ...st, held: undefined });
  }
  // Digest: Sens stories in the last 24 hours.
  const news = await getSensNews().catch(() => []);
  const fresh = news.filter((n) => Date.now() - Date.parse(n.published) < 24 * 3600_000);
  if (fresh.length) {
    out.push(`digest ${await notify("digest", { title: "Sens news this morning", body: `${fresh.length} new ${fresh.length === 1 ? "story" : "stories"} since yesterday · ${fresh[0].title}`, url: "/news", tag: `digest-${ottawaDate()}` })}`);
  }
  await setJson(sentKey, true);
  return out.join(", ") || "nothing";
}
