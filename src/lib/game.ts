// Turns NHL play-by-play and box score payloads into the shape the live page and
// recap page draw from. Pure functions: safe to run on the server or in tests.
import type { BoxScore, BoxSkater, Play, PlayByPlay } from "./nhl";
import { FINAL_STATES, LIVE_STATES, name } from "./nhl-shared";
import { OTT } from "./teams";

export type Side = "OTT" | "OPP";

export type Shot = {
  x: number; // 0..200, Ottawa always attacks toward x = 200
  y: number; // 0..85
  period: number;
  team: Side;
  goal: boolean;
  hd: boolean;
};

export type Goal = {
  id: number;
  period: number;
  periodType: string;
  time: string;
  elapsed: number;
  team: Side;
  teamAbbrev: string;
  scorer: string;
  scorerId?: number;
  scorerTotal?: number;
  assists: string[];
  assistIds: number[];
  strength: "PP" | "SH" | "EN" | "EV";
  shotType?: string;
  distance?: number;
  clipId?: number;
  clipUrl?: string;
  scoreAfter: string;
};

export type Penalty = {
  period: number;
  time: string;
  elapsed: number;
  team: Side;
  player: string;
  desc: string;
  minutes: number;
};

export type PeriodStats = {
  period: number;
  ottSog: number;
  oppSog: number;
  ottHd: number;
  oppHd: number;
  ottAtt: number; // shot attempts: on goal, missed and blocked
  oppAtt: number;
  ottFo: number; // faceoffs won by Ottawa, out of `fo`
  fo: number;
};

// What each Sens player did in one period (for the intermission card), and the Sens goalie's saves.
export type PeriodSkater = { id: number; name: string; g: number; a: number; sog: number; hits: number; blocks: number };
export type PeriodLines = { period: number; skaters: PeriodSkater[]; goalie: { id: number; name: string; saves: number; shots: number } | null };

// hits, blocks and plus-minus are null in replay mode (only final totals exist).
export type Skater = {
  id: number;
  name: string;
  g: number;
  a: number;
  sog: number;
  toi: string;
  hits: number | null;
  blocks: number | null;
  plusMinus: number | null;
};

export type LiveGame = {
  id: number;
  state: string;
  isLive: boolean;
  isFinal: boolean;
  isPre: boolean;
  startTimeUTC: string;
  gameDate: string;
  venue: string;
  broadcasts: string[];
  ott: { abbrev: string; score: number; sog: number; isHome: boolean };
  opp: { abbrev: string; score: number; sog: number; isHome: boolean; name: string };
  period: number;
  periodType: string;
  clock: string;
  intermission: boolean;
  elapsed: number;
  strength: { team: Side; label: string; secondsLeft: number | null } | null;
  shots: Shot[];
  flow: { ott: Array<[number, number]>; opp: Array<[number, number]>; length: number };
  goals: Goal[];
  penalties: Penalty[];
  periods: PeriodStats[];
  periodLines: PeriodLines[];
  powerPlay: { ottGoals: number; ottOpps: number; oppGoals: number; oppOpps: number };
  faceoffs: { ottWon: number; total: number };
  skaters: Skater[];
  replay: boolean;
};

const REG_PERIOD = 1200;

function secs(mmss: string): number {
  const [m, s] = mmss.split(":").map(Number);
  return (m || 0) * 60 + (s || 0);
}

function periodLength(n: number, gameType: number): number {
  // Regular-season overtime is 5 minutes; playoff overtime is 20.
  if (n <= 3) return REG_PERIOD;
  return gameType === 3 ? REG_PERIOD : 300;
}

export function elapsedAt(p: Play, gameType: number): number {
  const n = p.periodDescriptor.number;
  let start = 0;
  for (let i = 1; i < n; i++) start += periodLength(i, gameType);
  return start + secs(p.timeInPeriod);
}

function mmss(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// Is a normalized shot (Ottawa attacking right) in the high-danger slot?
// Matches the dashed zone drawn on the rink: x 58..89 ft from centre, widening toward the net.
function isHighDanger(xFt: number, yFt: number): boolean {
  if (xFt < 58 || xFt > 89) return false;
  return Math.abs(yFt) <= 7.5 + ((xFt - 58) * 4) / 31;
}

type Options = { untilElapsed?: number };

export function buildGame(pbp: PlayByPlay, box: BoxScore, opts: Options = {}): LiveGame {
  const ottIsHome = pbp.homeTeam.abbrev === OTT;
  const ottTeam = ottIsHome ? pbp.homeTeam : pbp.awayTeam;
  const oppTeam = ottIsHome ? pbp.awayTeam : pbp.homeTeam;
  const gameType = pbp.gameType;
  const replay = opts.untilElapsed != null;

  const players = new Map<number, { name: string; teamId: number }>();
  for (const r of pbp.rosterSpots ?? []) {
    players.set(r.playerId, { name: `${name(r.firstName)} ${name(r.lastName)}`.trim(), teamId: r.teamId });
  }
  const last = (id?: number) => {
    const full = id ? players.get(id)?.name : undefined;
    return full ? full.split(" ").slice(1).join(" ") || full : "Unknown";
  };
  const sideOf = (teamId?: number): Side => (teamId === ottTeam.id ? "OTT" : "OPP");

  const plays = [...(pbp.plays ?? [])]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((p) => opts.untilElapsed == null || elapsedAt(p, gameType) <= opts.untilElapsed);

  const shots: Shot[] = [];
  const goals: Goal[] = [];
  const penalties: Penalty[] = [];
  const flowOtt: Array<[number, number]> = [[0, 0]];
  const flowOpp: Array<[number, number]> = [[0, 0]];
  const periodMap = new Map<number, PeriodStats>();
  let ottScore = 0;
  let oppScore = 0;
  let ottSog = 0;
  let oppSog = 0;
  let ottFo = 0;
  let totalFo = 0;
  const pp = { ottGoals: 0, ottOpps: 0, oppGoals: 0, oppOpps: 0 };
  // Per-player counts built from events; used in replay mode, where the box score shows final totals.
  const counts = new Map<number, { g: number; a: number; sog: number }>();
  const tally = (id: number) => {
    let c = counts.get(id);
    if (!c) {
      c = { g: 0, a: 0, sog: 0 };
      counts.set(id, c);
    }
    return c;
  };

  const periodStats = (n: number) => {
    let s = periodMap.get(n);
    if (!s) {
      s = { period: n, ottSog: 0, oppSog: 0, ottHd: 0, oppHd: 0, ottAtt: 0, oppAtt: 0, ottFo: 0, fo: 0 };
      periodMap.set(n, s);
    }
    return s;
  };

  // Sens players by period.
  const lineMap = new Map<number, { skaters: Map<number, PeriodSkater>; goalie: Map<number, { saves: number; shots: number }> }>();
  const lines = (n: number) => {
    let l = lineMap.get(n);
    if (!l) {
      l = { skaters: new Map(), goalie: new Map() };
      lineMap.set(n, l);
    }
    return l;
  };
  const isOtt = (id?: number) => id != null && players.get(id)?.teamId === ottTeam.id;
  const skaterIn = (n: number, id: number) => {
    const m = lines(n).skaters;
    let s = m.get(id);
    if (!s) {
      s = { id, name: players.get(id)?.name ?? last(id), g: 0, a: 0, sog: 0, hits: 0, blocks: 0 };
      m.set(id, s);
    }
    return s;
  };

  for (const p of plays) {
    const d = p.details ?? {};
    const t = elapsedAt(p, gameType);
    const type = p.typeDescKey;
    const n = p.periodDescriptor.number;

    if (type === "faceoff") {
      totalFo++;
      periodStats(n).fo++;
      if (sideOf(d.eventOwnerTeamId) === "OTT") {
        ottFo++;
        periodStats(n).ottFo++;
      }
      continue;
    }

    if (type === "hit") {
      if (isOtt(d.hittingPlayerId)) skaterIn(n, d.hittingPlayerId!).hits++;
      continue;
    }

    if (type === "blocked-shot" && isOtt(d.blockingPlayerId)) skaterIn(n, d.blockingPlayerId!).blocks++;

    if (type === "penalty") {
      const team = sideOf(d.eventOwnerTeamId);
      const minutes = d.duration ?? 2;
      penalties.push({
        period: n,
        time: p.timeInPeriod,
        elapsed: t,
        team,
        player: last(d.committedByPlayerId ?? d.servedByPlayerId),
        desc: (d.descKey ?? "penalty").replace(/-/g, " "),
        minutes,
      });
      if (d.typeCode === "MIN" || d.typeCode === "MAJ" || minutes === 2 || minutes === 5) {
        if (team === "OTT") pp.oppOpps++;
        else pp.ottOpps++;
      }
      continue;
    }

    const isShot = type === "shot-on-goal" || type === "goal" || type === "missed-shot" || type === "blocked-shot";
    if (!isShot) continue;

    // Attempting team: from the shooter's roster spot (blocked shots are owned by the blocking team).
    const shooterId = d.shootingPlayerId ?? d.scoringPlayerId;
    const shooterTeam = shooterId ? players.get(shooterId)?.teamId : undefined;
    const team: Side = shooterTeam != null ? sideOf(shooterTeam) : sideOf(d.eventOwnerTeamId);

    const flow = team === "OTT" ? flowOtt : flowOpp;
    flow.push([t, flow[flow.length - 1][1] + 1]);
    if (team === "OTT") periodStats(n).ottAtt++;
    else periodStats(n).oppAtt++;

    if (type !== "shot-on-goal" && type !== "goal") continue;

    if (team === "OTT" && shooterId) {
      const c = tally(shooterId);
      c.sog++;
      skaterIn(n, shooterId).sog++;
      if (type === "goal") {
        c.g++;
        skaterIn(n, shooterId).g++;
        for (const aid of [d.assist1PlayerId, d.assist2PlayerId]) {
          if (!aid) continue;
          tally(aid).a++;
          skaterIn(n, aid).a++;
        }
      }
    }
    // Shots faced by the Sens goalie in net.
    if (team === "OPP" && d.goalieInNetId && isOtt(d.goalieInNetId)) {
      const gm = lines(n).goalie;
      const g = gm.get(d.goalieInNetId) ?? { saves: 0, shots: 0 };
      g.shots++;
      if (type !== "goal") g.saves++;
      gm.set(d.goalieInNetId, g);
    }

    if (team === "OTT") ottSog++;
    else oppSog++;

    // Normalize coordinates so Ottawa always attacks right (+x) and the opponent left.
    let x = d.xCoord;
    let y = d.yCoord;
    let distance: number | undefined;
    let hd = false;
    if (x != null && y != null) {
      const homeDefLeft = p.homeTeamDefendingSide !== "right";
      const ottDefendsLeft = ottIsHome ? homeDefLeft : !homeDefLeft;
      if (!ottDefendsLeft) {
        x = -x;
        y = -y;
      }
      // Distance and danger are measured toward the net the shooting team attacks.
      const ax = team === "OTT" ? x : -x;
      const ay = team === "OTT" ? y : -y;
      distance = Math.round(Math.hypot(89 - ax, ay));
      hd = isHighDanger(ax, ay);
      shots.push({ x: x + 100, y: 42.5 - y, period: n, team, goal: type === "goal", hd });
    }

    const ps = periodStats(n);
    if (team === "OTT") {
      ps.ottSog++;
      if (hd) ps.ottHd++;
    } else {
      ps.oppSog++;
      if (hd) ps.oppHd++;
    }

    if (type === "goal") {
      if (team === "OTT") ottScore++;
      else oppScore++;
      const code = p.situationCode ?? "1551";
      const awaySk = Number(code[1]);
      const homeSk = Number(code[2]);
      const awayG = Number(code[0]);
      const homeG = Number(code[3]);
      const scorerHome = (team === "OTT") === ottIsHome;
      const mine = scorerHome ? homeSk : awaySk;
      const theirs = scorerHome ? awaySk : homeSk;
      const theirGoalie = scorerHome ? awayG : homeG;
      let strength: Goal["strength"] = "EV";
      if (theirGoalie === 0) strength = "EN";
      else if (mine > theirs) strength = "PP";
      else if (mine < theirs) strength = "SH";
      if (strength === "PP") {
        if (team === "OTT") pp.ottGoals++;
        else pp.oppGoals++;
      }
      const assists = [d.assist1PlayerId, d.assist2PlayerId].filter(Boolean).map((id) => last(id));
      goals.push({
        id: p.eventId,
        period: n,
        periodType: p.periodDescriptor.periodType,
        time: p.timeInPeriod,
        elapsed: t,
        team,
        teamAbbrev: team === "OTT" ? OTT : oppTeam.abbrev,
        scorer: last(d.scoringPlayerId),
        scorerId: d.scoringPlayerId,
        scorerTotal: d.scoringPlayerTotal,
        assists,
        assistIds: [d.assist1PlayerId, d.assist2PlayerId].filter((x): x is number => Boolean(x)),
        strength,
        shotType: d.shotType,
        distance,
        // In replay mode, pretend clips take three game minutes to post.
        clipId: !replay || (opts.untilElapsed ?? 0) - t >= 180 ? d.highlightClip : undefined,
        clipUrl: !replay || (opts.untilElapsed ?? 0) - t >= 180 ? d.highlightClipSharingUrl : undefined,
        scoreAfter: `${ottScore}–${oppScore}`,
      });
    }
  }

  // Game clock and state.
  const lastPlay = plays[plays.length - 1];
  let state = pbp.gameState;
  let period = pbp.periodDescriptor?.number ?? lastPlay?.periodDescriptor.number ?? 1;
  let periodType = pbp.periodDescriptor?.periodType ?? "REG";
  let clock = pbp.clock?.timeRemaining ?? "20:00";
  let intermission = pbp.clock?.inIntermission ?? false;
  let elapsed = lastPlay ? elapsedAt(lastPlay, gameType) : 0;

  if (replay) {
    const until = opts.untilElapsed ?? 0;
    elapsed = until;
    let start = 0;
    period = 1;
    while (period < 5 && until >= start + periodLength(period, gameType)) {
      start += periodLength(period, gameType);
      period++;
    }
    const endedGame = plays.some((p) => p.typeDescKey === "game-end");
    const periodEnd = plays.find((p) => p.typeDescKey === "period-end" && elapsedAt(p, gameType) === until);
    if (endedGame) {
      state = "OFF";
    } else {
      state = "LIVE";
      if (periodEnd) {
        intermission = true;
        period = periodEnd.periodDescriptor.number;
        clock = "0:00";
      } else {
        intermission = false;
        clock = mmss(periodLength(period, gameType) - (until - start));
      }
    }
    periodType = period > 3 ? "OT" : "REG";
    ottSog = shots.filter((s) => s.team === "OTT").length;
    oppSog = shots.filter((s) => s.team === "OPP").length;
  } else {
    ottScore = ottTeam.score ?? ottScore;
    oppScore = oppTeam.score ?? oppScore;
    ottSog = ottTeam.sog ?? ottSog;
    oppSog = oppTeam.sog ?? oppSog;
  }

  // Current strength from the latest event's skater counts; time left from active penalties.
  let strength: LiveGame["strength"] = null;
  if (lastPlay?.situationCode && LIVE_STATES.includes(state) && !intermission) {
    const c = lastPlay.situationCode;
    const awaySk = Number(c[1]);
    const homeSk = Number(c[2]);
    const ottSk = ottIsHome ? homeSk : awaySk;
    const oppSk = ottIsHome ? awaySk : homeSk;
    if (ottSk !== oppSk) {
      const team: Side = ottSk > oppSk ? "OTT" : "OPP";
      const shorthanded: Side = team === "OTT" ? "OPP" : "OTT";
      const ends = penalties
        .filter((pen) => pen.team === shorthanded && pen.minutes < 10)
        .map((pen) => pen.elapsed + pen.minutes * 60)
        .filter((end) => end > elapsed);
      const secondsLeft = ends.length ? Math.max(...ends) - elapsed : null;
      const label = Math.abs(ottSk - oppSk) >= 2 ? `${team} 5-on-3` : `${team} power play`;
      strength = { team, label, secondsLeft };
    }
  }

  // Ottawa skaters tonight from the box score (absent in replay mode, which uses final totals).
  const side = ottIsHome ? box.playerByGameStats?.homeTeam : box.playerByGameStats?.awayTeam;
  const skaters: Skater[] = [...(side?.forwards ?? []), ...(side?.defense ?? [])]
    .map((s: BoxSkater) => {
      const c = counts.get(s.playerId) ?? { g: 0, a: 0, sog: 0 };
      return {
        id: s.playerId,
        name: players.get(s.playerId)?.name.split(" ").slice(1).join(" ") || name(s.name),
        g: replay ? c.g : (s.goals ?? 0),
        a: replay ? c.a : (s.assists ?? 0),
        sog: replay ? c.sog : (s.sog ?? 0),
        toi: replay ? "–" : (s.toi ?? ""),
        hits: replay ? null : (s.hits ?? 0),
        blocks: replay ? null : (s.blockedShots ?? 0),
        plusMinus: replay ? null : (s.plusMinus ?? 0),
      };
    })
    .sort((a, b) => b.g + b.a - (a.g + a.a) || b.g - a.g || b.sog - a.sog);

  const flowLength = Math.max(3 * REG_PERIOD, elapsed);
  flowOtt.push([elapsed, flowOtt[flowOtt.length - 1][1]]);
  flowOpp.push([elapsed, flowOpp[flowOpp.length - 1][1]]);

  const broadcasts = (pbp.tvBroadcasts ?? [])
    .filter((b) => b.countryCode === "CA")
    .map((b) => b.network);

  return {
    id: pbp.id,
    state,
    isLive: LIVE_STATES.includes(state),
    isFinal: FINAL_STATES.includes(state),
    isPre: state === "FUT" || state === "PRE",
    startTimeUTC: pbp.startTimeUTC,
    gameDate: pbp.gameDate,
    venue: name(pbp.venue),
    broadcasts: [...new Set(broadcasts)],
    ott: { abbrev: OTT, score: ottScore, sog: ottSog, isHome: ottIsHome },
    opp: {
      abbrev: oppTeam.abbrev,
      score: oppScore,
      sog: oppSog,
      isHome: !ottIsHome,
      name: name(oppTeam.commonName) || oppTeam.abbrev,
    },
    period,
    periodType,
    clock,
    intermission,
    elapsed,
    strength,
    shots,
    flow: { ott: flowOtt, opp: flowOpp, length: flowLength },
    goals,
    penalties,
    periods: [...periodMap.values()].sort((a, b) => a.period - b.period),
    periodLines: [...lineMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([period, l]) => {
        // The goalie who faced the most shots that period.
        const g = [...l.goalie.entries()].sort((a, b) => b[1].shots - a[1].shots)[0];
        return {
          period,
          skaters: [...l.skaters.values()],
          goalie: g ? { id: g[0], name: players.get(g[0])?.name ?? last(g[0]), ...g[1] } : null,
        };
      }),
    powerPlay: pp,
    faceoffs: { ottWon: ottFo, total: totalFo },
    skaters,
    replay,
  };
}
