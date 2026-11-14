// Season numbers seen through a Sens lens: every figure comes with its rank of 32 and the
// league average, so the app can say "11.8%, 31st" instead of a bare number.
// Sources: the NHL's stats API (api.nhle.com/stats/rest, the one NHL.com's stats pages use)
// and NHL EDGE (api-web.nhle.com/v1/edge). Free and keyless, like the rest of the NHL feeds.
// Shared types and the pure helpers live in team-stats-shared.ts so client components can use
// them. Cached functions never throw: no data means null and the sections hide.
import { cacheLife } from "next/cache";
import { getClubStats, getSchedule, getStandings, name } from "./nhl";
import { OTT } from "./teams";
import type { EdgePlayer, GoalieLine, LeaderLine, SeasonLens, ShotArea, StatsPage, TeamLens } from "./team-stats-shared";
import { recOf } from "./team-stats-shared";

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

// 20262027 for the season that starts in the fall of 2026.
export function seasonId(now = new Date()): number {
  const y = now.getUTCFullYear();
  const start = now.getUTCMonth() >= 6 ? y : y - 1;
  return start * 10000 + start + 1;
}

type Row = Record<string, number | string | null> & { teamId: number };

// One stats-API report for every team this regular season.
async function report(kind: string): Promise<Row[]> {
  const exp = encodeURIComponent(`seasonId=${seasonId()} and gameTypeId=2`);
  const r = await getJson<{ data?: Row[] }>(`${STATS}/team/${kind}?limit=-1&cayenneExp=${exp}`);
  return r?.data ?? [];
}

const num = (r: Row | undefined, k: string): number => {
  const v = r?.[k];
  return typeof v === "number" ? v : 0;
};

// Rank of a team's value among all teams (1 = best); ties share a rank.
function rankOf(rows: Row[], teamId: number, key: string, higherIsBetter: boolean) {
  const me = rows.find((r) => r.teamId === teamId);
  if (!me) return null;
  const v = num(me, key);
  const better = rows.filter((r) => (higherIsBetter ? num(r, key) > v : num(r, key) < v)).length;
  const avg = rows.reduce((s, r) => s + num(r, key), 0) / (rows.length || 1);
  return { v, rank: better + 1, avg };
}

// Every team's lens, keyed by tricode. Refreshed every half hour (the NHL updates these
// reports a little after each final).
export async function getTeamLenses(): Promise<Record<string, TeamLens> | null> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 1800, expire: 86400 });
  const [teams, summary, pct, lt, byPeriod, shots, pp] = await Promise.all([
    getJson<{ data?: { id: number; triCode: string }[] }>(`${STATS}/team`),
    report("summary"),
    report("percentages"),
    report("leadingtrailing"),
    report("goalsbyperiod"),
    report("outshootoutshotby"),
    report("powerplay"),
  ]);
  if (!teams?.data || summary.length < 20) return null;
  const tri = new Map(teams.data.map((t) => [t.id, t.triCode]));
  const out: Record<string, TeamLens> = {};
  for (const s of summary) {
    const id = s.teamId;
    const abbrev = tri.get(id);
    if (!abbrev) continue;
    const r = (rows: Row[], key: string, hi = true) => rankOf(rows, id, key, hi);
    const L = lt.find((x) => x.teamId === id);
    const P = byPeriod.find((x) => x.teamId === id);
    const O = shots.find((x) => x.teamId === id);
    const PP = pp.find((x) => x.teamId === id);
    const w = num(s, "wins"), l = num(s, "losses"), o = num(s, "otLosses");
    // Tied after a period isn't reported: it's everything that wasn't leading or trailing.
    const after = (n: 1 | 2) => {
      const lead = recOf(num(L, `winsLeadPeriod${n}`), num(L, `lossLeadPeriod${n}`), num(L, `otLossLeadPeriod${n}`));
      const trail = recOf(num(L, `winsTrailPeriod${n}`), num(L, `lossTrailPeriod${n}`), num(L, `otLossTrailPeriod${n}`));
      const tied = recOf(w - lead.w - trail.w, l - lead.l - trail.l, o - lead.otl - trail.otl);
      return { lead, tied, trail };
    };
    out[abbrev] = {
      abbrev,
      gp: num(s, "gamesPlayed"),
      rec: recOf(w, l, o),
      points: num(s, "points"),
      pointPct: r(summary, "pointPct"),
      pp: r(summary, "powerPlayPct"),
      pk: r(summary, "penaltyKillPct"),
      gf: r(summary, "goalsForPerGame"),
      ga: r(summary, "goalsAgainstPerGame", false),
      sf: r(summary, "shotsForPerGame"),
      sa: r(summary, "shotsAgainstPerGame", false),
      fo: r(summary, "faceoffWinPct"),
      shotShare: r(pct, "satPct"),
      sv5: r(pct, "savePct5v5"),
      pdo: r(pct, "shootingPlusSavePct5v5"),
      ppGoals: num(PP, "powerPlayGoalsFor"),
      ppOpps: num(PP, "ppOpportunities"),
      after1: after(1),
      after2: after(2),
      periods: [
        { label: "1st", f: num(P, "period1GoalsFor"), a: num(P, "period1GoalsAgainst") },
        { label: "2nd", f: num(P, "period2GoalsFor"), a: num(P, "period2GoalsAgainst") },
        { label: "3rd", f: num(P, "period3GoalsFor"), a: num(P, "period3GoalsAgainst") },
        { label: "OT", f: num(P, "periodOtGoalsFor"), a: num(P, "periodOtGoalsAgainst") },
      ],
      outshooting: recOf(num(O, "winsOutshootOpponent"), num(O, "lossesOutshootOpponent"), num(O, "otLossesOutshootOpponent")),
      outshot: recOf(num(O, "winsOutshotByOpponent"), num(O, "lossesOutshotByOpponent"), num(O, "otLossesOutshotByOpponent")),
    };
  }
  return Object.keys(out).length ? out : null;
}

type GoalieRow = {
  playerId: number;
  goalieFullName: string;
  lastName: string;
  teamAbbrevs: string;
  gamesStarted: number;
  wins: number;
  losses: number;
  otLosses: number;
  savePct: number | null;
  goalsAgainstAverage: number | null;
};

// Every goalie this season, with save-percentage rank among goalies with 6 or more starts.
export async function getGoalieLines(): Promise<GoalieLine[]> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 1800, expire: 86400 });
  const exp = encodeURIComponent(`seasonId=${seasonId()} and gameTypeId=2`);
  const r = await getJson<{ data?: GoalieRow[] }>(`${STATS}/goalie/summary?limit=-1&cayenneExp=${exp}`);
  const rows = r?.data ?? [];
  const qualified = rows.filter((g) => g.gamesStarted >= 6);
  return rows.map((g) => {
    const sv = g.savePct ?? 0;
    const ok = g.gamesStarted >= 6;
    return {
      id: g.playerId,
      name: g.goalieFullName,
      lastName: g.lastName,
      team: g.teamAbbrevs.split(",").pop() ?? g.teamAbbrevs,
      starts: g.gamesStarted,
      rec: recOf(g.wins, g.losses, g.otLosses),
      svPct: sv,
      gaa: g.goalsAgainstAverage ?? 0,
      rank: ok ? qualified.filter((x) => (x.savePct ?? 0) > sv).length + 1 : null,
      of: qualified.length,
    };
  });
}

// What the Game page needs: the two teams' lenses and their goalies.
export async function getSeasonLens(oppAbbrev: string): Promise<SeasonLens | null> {
  const [lenses, goalies] = await Promise.all([getTeamLenses(), getGoalieLines()]);
  const ott = lenses?.[OTT];
  const opp = lenses?.[oppAbbrev];
  if (!ott || !opp) return null;
  return { ott, opp, goalies: goalies.filter((g) => g.team === OTT || g.team === oppAbbrev) };
}

type SkaterRow = { playerId: number; skaterFullName: string; teamAbbrevs: string; positionCode: string; points: number; goals: number; assists: number; plusMinus: number };

function leaderLines(rows: SkaterRow[]): LeaderLine[] {
  const ott = rows.filter((r) => r.teamAbbrevs.split(",").pop() === OTT);
  const line = (label: string, key: "points" | "goals" | "assists" | "plusMinus", pool: SkaterRow[], poolLabel = ""): LeaderLine | null => {
    const mine = ott.filter((r) => pool.includes(r));
    if (!mine.length) return null;
    const best = Math.max(...mine.map((r) => r[key]));
    const who = mine.filter((r) => r[key] === best);
    const rank = pool.filter((r) => r[key] > best).length + 1;
    const tied = pool.filter((r) => r[key] === best).length > 1;
    return {
      label,
      names: who.slice(0, 2).map((r) => r.skaterFullName.split(" ").slice(1).join(" ") || r.skaterFullName),
      ids: who.slice(0, 2).map((r) => r.playerId),
      value: key === "plusMinus" && best > 0 ? `+${best}` : String(best),
      rank,
      tied,
      pool: poolLabel,
    };
  };
  const d = rows.filter((r) => r.positionCode === "D");
  return [
    line("Points", "points", rows),
    line("Goals", "goals", rows),
    line("Assists", "assists", rows),
    line("D points", "points", d, "D"),
    line("Plus/minus", "plusMinus", rows),
  ].filter((x): x is LeaderLine => x !== null);
}

type EdgeTeam = {
  shotSpeed?: { topShotSpeed?: { metric: number; rank: number; overlay?: { player?: { lastName?: { default: string } } } }; shotAttemptsOver90?: { value: number; rank: number } };
  skatingSpeed?: { speedMax?: { metric: number; rank: number; overlay?: { player?: { lastName?: { default: string } } } } };
  zoneTimeDetails?: { offensiveZonePctg: number; offensiveZoneRank: number };
  sogSummary?: { locationCode: string; shots: number; shotsRank: number; shootingPctg: number; shootingPctgRank: number }[];
  sogDetails?: { area: string; shots: number; shotsRank: number }[];
};
type EdgeSkater = {
  player?: { id?: number; firstName?: { default: string }; lastName?: { default: string }; gamesPlayed?: number };
  skatingSpeed?: { speedMax?: { metric: number; percentile: number } };
  topShotSpeed?: { metric: number; percentile: number };
  totalDistanceSkated?: { metric: number; percentile: number };
};

// The Stats tab: Sens leaders in league context, goalies, NHL EDGE tracking, last 10.
// EDGE needs one call per skater (about 25), so it's cached for a few hours.
export async function getStatsPage(): Promise<StatsPage | null> {
  "use cache";
  cacheLife({ stale: 900, revalidate: 10800, expire: 86400 });
  const season = seasonId();
  const exp = encodeURIComponent(`seasonId=${season} and gameTypeId=2`);
  const [skaters, club, edge, goalies] = await Promise.all([
    getJson<{ data?: SkaterRow[] }>(`${STATS}/skater/summary?limit=-1&cayenneExp=${exp}`),
    getClubStats(),
    getJson<EdgeTeam>(`${WEB}/edge/team-detail/9/${season}/2`),
    getGoalieLines(),
  ]);
  const ids = (club?.skaters ?? []).map((s) => s.playerId);
  const players = (await Promise.all(ids.map((id) => getJson<EdgeSkater>(`${WEB}/edge/skater-detail/${id}/${season}/2`)))).filter(
    (p): p is EdgeSkater => !!p?.player && (p.player.gamesPlayed ?? 0) >= 5,
  );
  const top = (pick: (p: EdgeSkater) => { metric: number; percentile: number } | undefined, label: string, unit: string): EdgePlayer | null => {
    const best = players
      .map((p) => ({ p, m: pick(p) }))
      .filter((x) => x.m)
      .sort((a, b) => b.m!.metric - a.m!.metric)[0];
    if (!best?.m) return null;
    return { label, name: best.p.player?.lastName?.default ?? "", id: best.p.player?.id, value: `${best.m.metric.toFixed(1)} ${unit}`, percentile: Math.round(best.m.percentile * 1000) / 10 };
  };
  const high = edge?.sogSummary?.find((s) => s.locationCode === "high");
  const area = (name: string): ShotArea | null => {
    const a = edge?.sogDetails?.find((x) => x.area === name);
    return a ? { area: name, shots: a.shots, rank: a.shotsRank } : null;
  };
  return {
    leaders: skaters?.data ? leaderLines(skaters.data) : [],
    goalies: goalies.filter((g) => g.team === OTT && g.starts > 0).sort((a, b) => b.starts - a.starts),
    edgePlayers: [
      top((p) => p.skatingSpeed?.speedMax, "Fastest skater", "km/h"),
      top((p) => p.topShotSpeed, "Hardest shot", "km/h"),
      top((p) => p.totalDistanceSkated, "Most distance skated", "km"),
    ].filter((x): x is EdgePlayer => x !== null),
    edgeTeam: edge
      ? {
          ozone: edge.zoneTimeDetails ? { pct: edge.zoneTimeDetails.offensiveZonePctg, rank: edge.zoneTimeDetails.offensiveZoneRank } : null,
          hardShots: edge.shotSpeed?.shotAttemptsOver90 ? { value: edge.shotSpeed.shotAttemptsOver90.value, rank: edge.shotSpeed.shotAttemptsOver90.rank } : null,
          topSpeed: edge.skatingSpeed?.speedMax ? { kmh: edge.skatingSpeed.speedMax.metric, rank: edge.skatingSpeed.speedMax.rank } : null,
          highDanger: high ? { shots: high.shots, rank: high.shotsRank, pct: high.shootingPctg, pctRank: high.shootingPctgRank } : null,
          areas: ["Crease", "L Net Side", "R Net Side", "Low Slot", "High Slot", "L Circle", "R Circle", "L Point", "R Point", "Center Point"]
            .map(area)
            .filter((x): x is ShotArea => x !== null),
        }
      : null,
  };
}

// Record, streak and last 10 from the Sens schedule (finals only).
export async function getSensForm() {
  const s = await getSchedule();
  if (!s) return null;
  const done = s.games.filter((g) => g.gameType === 2 && (g.gameState === "OFF" || g.gameState === "FINAL"));
  const games = done.map((g) => {
    const home = g.homeTeam.abbrev === OTT;
    const us = home ? g.homeTeam : g.awayTeam;
    const them = home ? g.awayTeam : g.homeTeam;
    const f = us.score ?? 0;
    const a = them.score ?? 0;
    const extra = g.gameOutcome?.lastPeriodType && g.gameOutcome.lastPeriodType !== "REG";
    const res: "W" | "L" | "OT" = f > a ? "W" : extra ? "OT" : "L";
    return { id: g.id, opp: them.abbrev, f, a, home, res, extra: !!extra };
  });
  const rec = recOf(games.filter((g) => g.res === "W").length, games.filter((g) => g.res === "L").length, games.filter((g) => g.res === "OT").length);
  const last = games.at(-1);
  let n = 0;
  for (let i = games.length - 1; i >= 0 && games[i].res === last?.res; i--) n++;
  const rec2 = (list: typeof games) => recOf(list.filter((g) => g.res === "W").length, list.filter((g) => g.res === "L").length, list.filter((g) => g.res === "OT").length);
  const splits = {
    oneGoal: rec2(games.filter((g) => Math.abs(g.f - g.a) === 1)),
    extra: rec2(games.filter((g) => g.extra)),
    home: rec2(games.filter((g) => g.home)),
    road: rec2(games.filter((g) => !g.home)),
  };
  return { rec, splits, streak: last ? `${last.res}${n}` : "", lastId: last?.id ?? null, last10: games.slice(-10).map(({ opp, f, a, home }) => ({ opp, f, a, home })) };
}

// The Atlantic place, points and the Leafs' points, for the playoff race and "what tonight changed".
export async function getRace() {
  const rows = await getStandings();
  const ott = rows.find((r) => name(r.teamAbbrev) === OTT);
  if (!ott) return null;
  const div = rows.filter((r) => r.divisionAbbrev === ott.divisionAbbrev).sort((a, b) => a.divisionSequence - b.divisionSequence);
  const conf = rows.filter((r) => r.conferenceAbbrev === ott.conferenceAbbrev);
  const third = div[2];
  // The first team outside a playoff spot: the third wild card.
  const firstOut = conf.filter((r) => r.wildcardSequence > 0).sort((a, b) => a.wildcardSequence - b.wildcardSequence)[2];
  const tor = rows.find((r) => name(r.teamAbbrev) === "TOR");
  return {
    gp: ott.gamesPlayed,
    points: ott.points,
    pointPct: ott.pointPctg,
    place: ott.divisionSequence,
    division: ott.divisionName,
    wildcard: ott.wildcardSequence,
    pace: Math.round(ott.pointPctg * 164),
    third: third && name(third.teamAbbrev) !== OTT ? { abbrev: name(third.teamAbbrev), gap: ott.points - third.points, inHand: ott.gamesPlayed - third.gamesPlayed } : null,
    firstOut: firstOut ? { abbrev: name(firstOut.teamAbbrev), gap: ott.points - firstOut.points, inHand: ott.gamesPlayed - firstOut.gamesPlayed } : null,
    leafs: tor ? { points: tor.points, gap: ott.points - tor.points, streak: tor.streakCode === "L" ? tor.streakCount ?? 0 : 0 } : null,
    table: div.map((r) => ({
      abbrev: name(r.teamAbbrev),
      gp: r.gamesPlayed,
      points: r.points,
      pct: r.pointPctg,
      l10: `${r.l10Wins ?? 0}-${r.l10Losses ?? 0}-${r.l10OtLosses ?? 0}`,
      wildcard: r.wildcardSequence,
    })),
  };
}
export type Race = NonNullable<Awaited<ReturnType<typeof getRace>>>;
export type SensForm = NonNullable<Awaited<ReturnType<typeof getSensForm>>>;
