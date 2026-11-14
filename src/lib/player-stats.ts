// One player's season through a Sens lens: ice time, usage, on-ice results, NHL ranks, the
// game log and NHL EDGE tracking (skaters), or save numbers, starts and shot types (goalies).
// Sources: the NHL stats API (api.nhle.com/stats/rest), the game log and EDGE
// (api-web.nhle.com). Cached functions never throw: missing pieces come back null.
import { cacheLife } from "next/cache";
import { seasonId } from "./team-stats";
import { OTT } from "./teams";

const STATS = "https://api.nhle.com/stats/rest/en";
const WEB = "https://api-web.nhle.com/v1";
const UA = { "User-Agent": "SickoCentral/0.1 (hobby fan site)" };

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store", headers: UA, signal: AbortSignal.timeout(12_000) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

type Row = Record<string, number | string | null>;
const n = (r: Row | null | undefined, k: string): number | null => {
  const v = r?.[k];
  return typeof v === "number" ? v : null;
};

async function report(kind: string, extra = ""): Promise<Row[]> {
  const exp = encodeURIComponent(`seasonId=${seasonId()} and gameTypeId=2${extra}`);
  const r = await getJson<{ data?: Row[] }>(`${STATS}/${kind}?limit=-1&cayenneExp=${exp}`);
  return r?.data ?? [];
}

// Every skater's summary this season, for NHL ranks.
async function allSkaters(): Promise<Row[]> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
  return report("skater/summary");
}

async function allSkaterToi(): Promise<Row[]> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
  return report("skater/timeonice");
}

export type GameLogLine = {
  gameId: number;
  gameDate: string;
  opponentAbbrev: string;
  homeRoadFlag: string;
  goals?: number;
  assists?: number;
  points?: number;
  plusMinus?: number;
  shots?: number;
  toi?: string;
  decision?: string;
  shotsAgainst?: number;
  goalsAgainst?: number;
  savePctg?: number;
  gamesStarted?: number;
};

async function gameLog(id: number): Promise<GameLogLine[]> {
  const r = await getJson<{ gameLog?: GameLogLine[] }>(`${WEB}/player/${id}/game-log/${seasonId()}/2`);
  return r?.gameLog ?? [];
}

type Pctl = { metric: number; percentile: number } | undefined;
export type SkaterEdge = {
  speed: Pctl;
  bursts: { value: number; percentile: number } | undefined;
  distance: Pctl;
  shot: Pctl;
  ozone: { pct: number; percentile: number } | null;
  high: { shots: number; goals: number; pct: number; league: number } | null;
  areas: { area: string; shots: number; percentile: number }[];
};

export type Rank = { value: number; rank: number; tied: boolean } | null;

export type SkaterDetail = {
  gp: number;
  goals: number;
  assists: number;
  points: number;
  shots: number;
  shPct: number | null;
  toi: number | null; // seconds a game
  evToi: number | null;
  ppToi: number | null;
  shToi: number | null;
  ppShare: number | null; // share of the team's power-play time
  ozStarts: number | null;
  dzStarts: number | null;
  faceoffPct: number | null;
  onIceGoalsPct: number | null; // 5-on-5
  onIceShotPct: number | null; // 5-on-5 shot attempts
  pdo: number | null; // 5-on-5 on-ice shooting + save %
  ranks: { points: Rank; goals: Rank; assists: Rank; poolLabel: string };
  teamToiRank: number | null; // among Sens forwards or defencemen
  log: GameLogLine[];
  edge: SkaterEdge | null;
};

function rankIn(rows: Row[], id: number, key: string): Rank {
  const me = rows.find((r) => r.playerId === id);
  const v = n(me, key);
  if (v == null) return null;
  return { value: v, rank: rows.filter((r) => (n(r, key) ?? 0) > v).length + 1, tied: rows.filter((r) => n(r, key) === v).length > 1 };
}

export async function getSkaterDetail(id: number): Promise<SkaterDetail | null> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 1800, expire: 86400 });
  const one = ` and playerId=${id}`;
  const [sum, toi, poss, pct, pp, fo, skaters, toiAll, log, edge] = await Promise.all([
    report("skater/summary", one),
    report("skater/timeonice", one),
    report("skater/puckPossessions", one),
    report("skater/percentages", one),
    report("skater/powerplay", one),
    report("skater/faceoffpercentages", one),
    allSkaters(),
    allSkaterToi(),
    gameLog(id),
    getJson<Record<string, unknown>>(`${WEB}/edge/skater-detail/${id}/${seasonId()}/2`),
  ]);
  const s = sum[0];
  if (!s) return null;
  const isD = s.positionCode === "D";
  const pool = skaters.filter((r) => (r.positionCode === "D") === isD);
  const sens = toiAll.filter((r) => String(r.teamAbbrevs ?? "").split(",").pop() === OTT && (r.positionCode === "D") === isD);
  const myToi = n(toi[0], "timeOnIcePerGame");
  const e = edge as {
    skatingSpeed?: { speedMax?: Pctl; burstsOver20?: { value: number; percentile: number } };
    totalDistanceSkated?: Pctl;
    topShotSpeed?: Pctl;
    zoneTimeDetails?: { offensiveZonePctg: number; offensiveZonePercentile: number };
    sogSummary?: { locationCode: string; shots: number; goals: number; shootingPctg: number; shootingPctgLeagueAvg: number }[];
    sogDetails?: { area: string; shots: number; shotsPercentile: number }[];
  } | null;
  const high = e?.sogSummary?.find((x) => x.locationCode === "high");
  return {
    gp: n(s, "gamesPlayed") ?? 0,
    goals: n(s, "goals") ?? 0,
    assists: n(s, "assists") ?? 0,
    points: n(s, "points") ?? 0,
    shots: n(s, "shots") ?? 0,
    shPct: n(s, "shootingPct"),
    toi: myToi,
    evToi: n(toi[0], "evTimeOnIcePerGame"),
    ppToi: n(toi[0], "ppTimeOnIcePerGame"),
    shToi: n(toi[0], "shTimeOnIcePerGame"),
    ppShare: n(pp[0], "ppTimeOnIcePctPerGame"),
    ozStarts: n(poss[0], "offensiveZoneStartPct"),
    dzStarts: n(poss[0], "defensiveZoneStartPct"),
    faceoffPct: (n(fo[0], "totalFaceoffs") ?? n(fo[0], "evFaceoffs") ?? 0) >= 50 ? n(fo[0], "faceoffWinPct") : null,
    onIceGoalsPct: n(poss[0], "goalsPct"),
    onIceShotPct: n(poss[0], "satPct"),
    pdo: n(pct[0], "skaterShootingPlusSavePct5v5"),
    ranks: { points: rankIn(pool, id, "points"), goals: rankIn(pool, id, "goals"), assists: rankIn(pool, id, "assists"), poolLabel: isD ? "defencemen" : "forwards" },
    teamToiRank: myToi != null && sens.length ? sens.filter((r) => (n(r, "timeOnIcePerGame") ?? 0) > myToi).length + 1 : null,
    log,
    edge: e
      ? {
          speed: e.skatingSpeed?.speedMax,
          bursts: e.skatingSpeed?.burstsOver20,
          distance: e.totalDistanceSkated,
          shot: e.topShotSpeed,
          ozone: e.zoneTimeDetails ? { pct: e.zoneTimeDetails.offensiveZonePctg, percentile: e.zoneTimeDetails.offensiveZonePercentile } : null,
          high: high ? { shots: high.shots, goals: high.goals, pct: high.shootingPctg, league: high.shootingPctgLeagueAvg } : null,
          areas: (e.sogDetails ?? []).map((a) => ({ area: a.area, shots: a.shots, percentile: a.shotsPercentile })),
        }
      : null,
  };
}

export type GoalieDetail = {
  starts: number;
  wins: number;
  losses: number;
  otLosses: number;
  shotsAgainst: number;
  saves: number;
  svPct: number | null;
  gaa: number | null;
  shutouts: number;
  leagueSv: number | null;
  gsaa: number | null; // goals saved above an average goalie on the same shots
  svRank: { rank: number; of: number } | null;
  gaaRank: { rank: number; of: number } | null;
  qualityStarts: number | null;
  log: GameLogLine[];
  byType: { label: string; sv: number; league: number; percentile: number }[];
  goalSupport: { value: number; percentile: number } | null;
};

export async function getGoalieDetail(id: number): Promise<GoalieDetail | null> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 1800, expire: 86400 });
  const [all, log, edge] = await Promise.all([
    report("goalie/summary"),
    gameLog(id),
    getJson<{
      stats?: { goalSupportAvg?: { value: number; percentile: number } };
      shotLocationSummary?: { locationCode: string; savePctg: number; savePctgLeagueAvg: number; savePctgPercentile: number }[];
    }>(`${WEB}/edge/goalie-detail/${id}/${seasonId()}/2`),
  ]);
  const me = all.find((r) => r.playerId === id);
  if (!me) return null;
  const shots = all.reduce((t, r) => t + (n(r, "shotsAgainst") ?? 0), 0);
  const saved = all.reduce((t, r) => t + (n(r, "saves") ?? 0), 0);
  const leagueSv = shots ? saved / shots : null;
  const sa = n(me, "shotsAgainst") ?? 0;
  const sv = n(me, "saves") ?? 0;
  const q = all.filter((r) => (n(r, "gamesStarted") ?? 0) >= 6);
  const mySv = n(me, "savePct");
  const myGaa = n(me, "goalsAgainstAverage");
  const ok = (n(me, "gamesStarted") ?? 0) >= 6;
  // Quality start: save % at or above the league's, or .885+ on 20 shots or fewer.
  const starts = log.filter((g) => g.gamesStarted === 1 && (g.shotsAgainst ?? 0) > 0);
  const qs = leagueSv == null ? null : starts.filter((g) => (g.savePctg ?? 0) >= leagueSv || ((g.shotsAgainst ?? 0) <= 20 && (g.savePctg ?? 0) >= 0.885)).length;
  const LABEL: Record<string, string> = { high: "In close (high danger)", mid: "Mid range", long: "Long range" };
  return {
    starts: n(me, "gamesStarted") ?? 0,
    wins: n(me, "wins") ?? 0,
    losses: n(me, "losses") ?? 0,
    otLosses: n(me, "otLosses") ?? 0,
    shotsAgainst: sa,
    saves: sv,
    svPct: mySv,
    gaa: myGaa,
    shutouts: n(me, "shutouts") ?? 0,
    leagueSv,
    gsaa: leagueSv == null ? null : sv - sa * leagueSv,
    svRank: ok && mySv != null ? { rank: q.filter((r) => (n(r, "savePct") ?? 0) > mySv).length + 1, of: q.length } : null,
    gaaRank: ok && myGaa != null ? { rank: q.filter((r) => (n(r, "goalsAgainstAverage") ?? 99) < myGaa).length + 1, of: q.length } : null,
    qualityStarts: starts.length ? qs : null,
    log,
    byType: (edge?.shotLocationSummary ?? [])
      .filter((x) => LABEL[x.locationCode])
      .sort((a, b) => ["high", "mid", "long"].indexOf(a.locationCode) - ["high", "mid", "long"].indexOf(b.locationCode))
      .map((x) => ({ label: LABEL[x.locationCode], sv: x.savePctg, league: x.savePctgLeagueAvg, percentile: x.savePctgPercentile })),
    goalSupport: edge?.stats?.goalSupportAvg ?? null,
  };
}
