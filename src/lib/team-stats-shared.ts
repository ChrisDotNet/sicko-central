// Types and pure helpers for the Sens-lens stats (server data in team-stats.ts). Safe to use
// in client components: no fetching here.
import type { LiveGame } from "./game";

export type Rec = { w: number; l: number; otl: number };
export const recOf = (w: number, l: number, otl: number): Rec => ({ w: Math.max(0, w), l: Math.max(0, l), otl: Math.max(0, otl) });
export const recStr = (r: Rec) => `${r.w}-${r.l}-${r.otl}`;

export type Ranked = { v: number; rank: number; avg: number } | null;

export type TeamLens = {
  abbrev: string;
  gp: number;
  rec: Rec;
  points: number;
  pointPct: Ranked;
  pp: Ranked;
  pk: Ranked;
  gf: Ranked;
  ga: Ranked;
  sf: Ranked;
  sa: Ranked;
  fo: Ranked;
  shotShare: Ranked; // 5-on-5 shot attempts share
  sv5: Ranked; // 5-on-5 save %
  pdo: Ranked; // 5-on-5 shooting % + save %
  ppGoals: number;
  ppOpps: number;
  after1: { lead: Rec; tied: Rec; trail: Rec };
  after2: { lead: Rec; tied: Rec; trail: Rec };
  periods: { label: string; f: number; a: number }[];
  outshooting: Rec;
  outshot: Rec;
};

export type GoalieLine = {
  id: number;
  name: string;
  lastName: string;
  team: string;
  starts: number;
  rec: Rec;
  svPct: number;
  gaa: number;
  rank: number | null; // save % rank among goalies with 6+ starts
  of: number;
};

export type SeasonLens = { ott: TeamLens; opp: TeamLens; goalies: GoalieLine[] };

export type LeaderLine = { label: string; names: string[]; value: string; rank: number; tied: boolean; pool: string };
export type EdgePlayer = { label: string; name: string; value: string; percentile: number };
export type ShotArea = { area: string; shots: number; rank: number };
export type StatsPage = {
  leaders: LeaderLine[];
  goalies: GoalieLine[];
  edgePlayers: EdgePlayer[];
  edgeTeam: {
    ozone: { pct: number; rank: number } | null;
    hardShots: { value: number; rank: number } | null;
    topSpeed: { kmh: number; rank: number } | null;
    highDanger: { shots: number; rank: number; pct: number; pctRank: number } | null;
    areas: ShotArea[];
  } | null;
};

export function ordinal(n: number): string {
  const t = n % 100;
  if (t >= 11 && t <= 13) return `${n}th`;
  return `${n}${n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th"}`;
}

// Top 10, middle, bottom 10 of 32.
export type Band = "top" | "mid" | "bottom";
export const band = (rank: number, of = 32): Band => (rank <= 10 ? "top" : rank > of - 10 ? "bottom" : "mid");

// Display formats.
export const pct1 = (v: number) => `${(v * 100).toFixed(1)}%`;
export const dec3 = (v: number) => v.toFixed(3).replace(/^0/, "");
export const dec2 = (v: number) => v.toFixed(2);
export const dec1 = (v: number) => v.toFixed(1);

export type TapeRow = { label: string; ott: string; ottRank: number; opp: string; oppRank: number };

// The goalie in a team's lens matched to a name from the NHL.com preview ("Linus Ullmark").
export function goalieByName(goalies: GoalieLine[], team: string, fullName: string | undefined): GoalieLine | null {
  if (!fullName) return null;
  const last = fullName.trim().split(" ").slice(-1)[0].toLowerCase();
  return goalies.find((g) => g.team === team && g.lastName.toLowerCase() === last) ?? null;
}

// Tale of the tape rows: Sens against tonight's opponent, each with its rank of 32.
export function tapeRows(lens: SeasonLens, goalies?: { ott?: string; opp?: string }): TapeRow[] {
  const { ott, opp } = lens;
  const rows: TapeRow[] = [];
  const add = (label: string, a: Ranked, b: Ranked, fmt: (v: number) => string) => {
    if (a && b) rows.push({ label, ott: fmt(a.v), ottRank: a.rank, opp: fmt(b.v), oppRank: b.rank });
  };
  add("Points %", ott.pointPct, opp.pointPct, dec3);
  add("Power play", ott.pp, opp.pp, pct1);
  add("Penalty kill", ott.pk, opp.pk, pct1);
  add("Goals for / game", ott.gf, opp.gf, dec2);
  add("Goals against / game", ott.ga, opp.ga, dec2);
  add("5-on-5 shot share", ott.shotShare, opp.shotShare, pct1);
  add("Faceoffs", ott.fo, opp.fo, pct1);
  const g1 = goalieByName(lens.goalies, ott.abbrev, goalies?.ott);
  const g2 = goalieByName(lens.goalies, opp.abbrev, goalies?.opp);
  if (g1?.rank && g2?.rank) {
    rows.push({ label: `Goalie sv% (${g1.lastName} · ${g2.lastName})`, ott: dec3(g1.svPct), ottRank: g1.rank, opp: dec3(g2.svPct), oppRank: g2.rank });
  }
  return rows;
}

// The one-line "Watch for": the Sens' biggest special-teams or goaltending mismatch, either way.
export function watchFor(lens: SeasonLens): string | null {
  const { ott, opp } = lens;
  const lines: { gap: number; text: string }[] = [];
  if (ott.pp && opp.pk) {
    const gap = opp.pk.rank - ott.pp.rank; // positive: Sens PP better ranked than their PK
    lines.push({ gap: Math.abs(gap), text: `Sens power play (${ordinal(ott.pp.rank)}) against a ${opp.abbrev} penalty kill that's ${ordinal(opp.pk.rank)}.` });
  }
  if (opp.pp && ott.pk) {
    const gap = ott.pk.rank - opp.pp.rank;
    lines.push({ gap: Math.abs(gap), text: `${opp.abbrev} power play (${ordinal(opp.pp.rank)}) against a Sens penalty kill that's ${ordinal(ott.pk.rank)}.` });
  }
  if (ott.sv5 && opp.sv5) {
    const gap = Math.abs(ott.sv5.rank - opp.sv5.rank);
    lines.push({ gap, text: `5-on-5 goaltending: Sens ${ordinal(ott.sv5.rank)}, ${opp.abbrev} ${ordinal(opp.sv5.rank)}.` });
  }
  if (ott.fo && opp.fo) {
    lines.push({ gap: Math.abs(ott.fo.rank - opp.fo.rank) * 0.6, text: `Faceoffs: Sens ${ordinal(ott.fo.rank)}, ${opp.abbrev} ${ordinal(opp.fo.rank)}.` });
  }
  const top = lines.filter((x) => x.gap >= 10).sort((a, b) => b.gap - a.gap).slice(0, 2);
  return top.length ? top.map((x) => x.text).join(" ") : null;
}

export type ContextLine = { tag: string; tone: "blue" | "plain"; text: string; strong?: string };

// Score after a period, from the goals list.
function scoreAfter(game: LiveGame, period: number) {
  const g = game.goals.filter((x) => x.period <= period);
  const ott = g.filter((x) => x.team === "OTT").length;
  return { ott, opp: g.length - ott };
}

// One-line season context for what's happening in the game right now. Each line shows only
// when it applies.
export function contextLines(game: LiveGame, lens: SeasonLens): ContextLine[] {
  if (!game.isLive || game.replay) return [];
  const { ott, opp } = lens;
  const out: ContextLine[] = [];
  // Score after the last finished period (1st or 2nd) against the season record from there.
  const done = game.intermission ? game.period : game.period - 1;
  if (done === 1 || done === 2) {
    const s = scoreAfter(game, done);
    const rec = done === 1 ? ott.after1 : ott.after2;
    const state = s.ott > s.opp ? "lead" : s.ott < s.opp ? "trail" : "tied";
    const r = rec[state];
    const when = state === "lead" ? "Leading" : state === "trail" ? "Trailing" : "Tied";
    const total = r.w + r.l + r.otl;
    const note =
      total === 0
        ? " First time this season."
        : state === "lead" && r.l === 0
          ? " They haven't lost one in regulation."
          : state === "trail" && r.w === 0
            ? " They haven't come back to win one yet."
            : "";
    out.push({ tag: "This season", tone: "blue", text: `${when} after ${done === 1 ? "one" : "two"}: `, strong: `${recStr(r)}.${note}` });
  } else if (game.period >= 4) {
    const o = ott.periods.find((p) => p.label === "OT");
    if (o) out.push({ tag: "This season", tone: "blue", text: "Overtime goals: ", strong: `${o.f} for, ${o.a} against.` });
  }
  // Power play: during one, and at intermissions.
  const pp = game.powerPlay;
  if (game.strength?.team === "OTT" || (game.intermission && pp.ottOpps > 0)) {
    if (ott.pp) out.push({ tag: "Power play", tone: "plain", text: `${pp.ottGoals} for ${pp.ottOpps} tonight · `, strong: `${pct1(ott.pp.v)} on the season (${ordinal(ott.pp.rank)})` });
  } else if (game.strength?.team === "OPP" && opp.pp && ott.pk) {
    out.push({ tag: "Penalty kill", tone: "plain", text: `${opp.abbrev} power play ${pct1(opp.pp.v)} (${ordinal(opp.pp.rank)}) · `, strong: `Sens kill ${pct1(ott.pk.v)} (${ordinal(ott.pk.rank)})` });
  }
  // The Sens goalie, from the 2nd period on: tonight against the season.
  if (game.period >= 2) {
    const lines = game.periodLines.filter((p) => p.goalie).sort((a, b) => a.period - b.period);
    const current = lines.at(-1)?.goalie;
    const season = current ? lens.goalies.find((g) => g.id === current.id) : null;
    if (current && season) {
      const mine = lines.filter((p) => p.goalie?.id === current.id).map((p) => p.goalie!);
      const saves = mine.reduce((s, g) => s + g.saves, 0);
      const shots = mine.reduce((s, g) => s + g.shots, 0);
      if (shots > 0) {
        out.push({
          tag: season.lastName,
          tone: "plain",
          text: `${saves} saves on ${shots} tonight (${dec3(saves / shots)}) · `,
          strong: `${dec3(season.svPct)} on the season${season.rank ? `, ${ordinal(season.rank)} of ${season.of}` : ""}`,
        });
      }
    }
  }
  // Shots, at intermissions.
  if (game.intermission && game.ott.sog !== game.opp.sog) {
    const ahead = game.ott.sog > game.opp.sog;
    out.push({
      tag: "Shots",
      tone: "plain",
      text: `${ahead ? "Outshooting" : "Outshot"} ${game.ott.sog}–${game.opp.sog}. ${ahead ? "When outshooting" : "When outshot"} this season: `,
      strong: recStr(ahead ? ott.outshooting : ott.outshot),
    });
  }
  return out;
}
