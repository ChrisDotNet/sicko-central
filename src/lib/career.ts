// A player's whole career from the NHL player feed, which lists every league back to minor
// hockey (for many players from about age 13): the path, points a game by level, every season,
// international events, and a career read. Pure functions over PlayerLanding.
import type { PlayerLanding, SeasonLine } from "./nhl";
import type { ReadLine } from "./player-read";
import { seasonLabel } from "./format";

export type Level = "nhl" | "pro" | "junior" | "intl";

const PRO = new Set(["NHL", "AHL", "ECHL", "DEL", "SHL", "Liiga", "KHL", "NL", "Czechia", "Slovakia", "ICEHL", "Allsvenskan", "Champions HL", "SL", "Extraliga", "Mestis", "DEL2", "VHL", "Swiss", "EBEL", "Sweden", "Sweden-2", "Finland", "Finland-2", "Russia", "Czech", "Germany", "Switzerland", "Austria", "Norway", "Denmark", "HockeyAllsvenskan"]);
const INTL = /^(WJC|WC|OG|WHC|Hlinka|WCup|World Cup|4 Nations|Spengler|U18|U17|IIHF|Olympics|WJAC)/i;

export function levelOf(league: string): Level {
  if (league === "NHL") return "nhl";
  if (INTL.test(league)) return "intl";
  if (PRO.has(league)) return "pro";
  return "junior";
}

const EVENT: Array<[RegExp, string]> = [
  [/^OG/, "Olympics"],
  [/^WC$/, "World Championship"],
  [/^WJC-20/, "World Juniors"],
  [/^WJC-18 D1/, "U18 Worlds (Division I)"],
  [/^WJC-18/, "U18 Worlds"],
  [/^WHC-17/, "U17 World Challenge"],
  [/^Hlinka/, "Hlinka Gretzky Cup"],
  [/^4 Nations/, "4 Nations Face-Off"],
  [/^Spengler/, "Spengler Cup"],
];
const eventName = (league: string) => EVENT.find(([r]) => r.test(league))?.[1] ?? league;

// Age on December 31 of the season's first year (mid-season).
function ageIn(season: number, birthDate?: string): number | null {
  if (!birthDate) return null;
  const y = Number(birthDate.slice(0, 4));
  return Math.floor(season / 10000) - y;
}

export type CareerRow = { season: number; label: string; team: string; league: string; level: Level; gp: number; g: number | null; a: number | null; p: number | null; pm: number | null; pim: number | null; sh: number | null; w: number | null; sv: number | null; gaa: number | null; best: boolean };
export type PathStop = { ages: string; team: string; detail: string; stat: string; kind: "stop" | "draft" | "now" };
export type Career = {
  goalie: boolean;
  regular: CareerRow[];
  playoffs: CareerRow[];
  ppg: Array<{ season: string; v: number; level: Level }>;
  path: PathStop[];
  intl: Array<{ year: string; event: string; team: string; gp: number; stat: string }>;
  draft: PlayerLanding["draftDetails"] | null;
  lines: ReadLine[];
};

const row = (s: SeasonLine, goalie: boolean): CareerRow => ({
  season: s.season,
  label: seasonLabel(s.season),
  team: s.teamName?.default ?? s.teamCommonName?.default ?? "",
  league: s.leagueAbbrev,
  level: levelOf(s.leagueAbbrev),
  gp: s.gamesPlayed ?? 0,
  g: goalie ? null : (s.goals ?? null),
  a: goalie ? null : (s.assists ?? null),
  p: goalie ? null : (s.points ?? null),
  pm: goalie ? null : (s.plusMinus ?? null),
  pim: s.pim ?? null,
  sh: goalie || !s.shots ? null : (s.shootingPctg ?? null),
  w: goalie ? (s.wins ?? null) : null,
  sv: goalie ? (s.savePctg ?? null) : null,
  gaa: goalie ? (s.goalsAgainstAvg ?? null) : null,
  best: false,
});

const LEAGUE_LABEL: Record<string, string> = { DEL: "Germany's top league", SHL: "Sweden's top league", Liiga: "Finland's top league", KHL: "the KHL", NL: "Switzerland's top league", Czechia: "Czechia's top league", AHL: "the AHL" };

export function buildCareer(p: PlayerLanding): Career {
  const goalie = p.position === "G";
  const all = [...(p.seasonTotals ?? [])].sort((a, b) => a.season - b.season || (a.sequence ?? 0) - (b.sequence ?? 0));
  const reg = all.filter((s) => s.gameTypeId === 2);
  const regular = reg.filter((s) => levelOf(s.leagueAbbrev) !== "intl").map((s) => row(s, goalie));
  const playoffs = all.filter((s) => s.gameTypeId === 3 && levelOf(s.leagueAbbrev) !== "intl").map((s) => row(s, goalie));
  const nhl = regular.filter((r) => r.level === "nhl");
  if (!goalie) {
    const best = nhl.reduce<CareerRow | null>((b, r) => ((r.p ?? 0) > (b?.p ?? -1) ? r : b), null);
    if (best && nhl.length > 1) best.best = true;
  } else {
    const best = nhl.filter((r) => r.gp >= 25).reduce<CareerRow | null>((b, r) => ((r.sv ?? 0) > (b?.sv ?? -1) ? r : b), null);
    if (best && nhl.length > 1) best.best = true;
  }

  // Points a game: each season's main league (the NHL if he played there, else the most games).
  const bySeason = new Map<number, CareerRow[]>();
  for (const r of regular) bySeason.set(r.season, [...(bySeason.get(r.season) ?? []), r]);
  const ppg = goalie
    ? []
    : [...bySeason.entries()]
        .map(([season, rows]) => {
          const main = rows.find((r) => r.level === "nhl") ?? [...rows].filter((r) => r.league !== "Champions HL").sort((a, b) => b.gp - a.gp)[0];
          return main && main.gp >= 5 && main.p != null ? { season: seasonLabel(season).slice(2), v: main.p / main.gp, level: main.level } : null;
        })
        .filter((x): x is { season: string; v: number; level: Level } => x !== null);

  // The path: consecutive seasons with the same team merged; tiny stints left out.
  const path: PathStop[] = [];
  const merged: Array<{ team: string; league: string; level: Level; from: number; to: number; gp: number; p: number; w: number }> = [];
  // Side competitions (Champions League, cups) aren't steps on the path.
  const SIDE = new Set(["Champions HL", "Spengler Cup", "Memorial Cup"]);
  for (const r of regular) {
    if (r.gp < 5 || SIDE.has(r.league)) continue;
    const last = merged.at(-1);
    if (last && last.team === r.team && last.league === r.league) {
      last.to = r.season;
      last.gp += r.gp;
      last.p += r.p ?? 0;
      last.w += r.w ?? 0;
    } else merged.push({ team: r.team, league: r.league, level: r.level, from: r.season, to: r.season, gp: r.gp, p: r.p ?? 0, w: r.w ?? 0 });
  }
  // Same-team stints in different leagues in a row (U19 then U20) read better as one stop.
  const stops: typeof merged = [];
  for (const m of merged) {
    const last = stops.at(-1);
    if (last && last.level === "junior" && m.level === "junior" && last.team.split(" ")[0] === m.team.split(" ")[0]) {
      last.to = m.to;
      last.gp += m.gp;
      last.p += m.p;
      last.w += m.w;
    } else stops.push({ ...m });
  }
  const draftYear = p.draftDetails?.year;
  let drafted = false;
  stops.forEach((s, i) => {
    if (draftYear && !drafted && Math.floor(s.from / 10000) >= draftYear) {
      path.push({ ages: String(draftYear), team: `Drafted ${ordinal(p.draftDetails!.overallPick)} overall`, detail: `${p.draftDetails!.teamAbbrev} · round ${p.draftDetails!.round}, ${draftYear}`, stat: "", kind: "draft" });
      drafted = true;
    }
    const a1 = ageIn(s.from, p.birthDate);
    const a2 = ageIn(s.to, p.birthDate);
    const now = i === stops.length - 1 && p.isActive !== false;
    path.push({
      ages: a1 == null ? "" : a1 === a2 ? `Age ${a1}` : now && s.level === "nhl" ? `Age ${a1} on` : `Age ${a1}–${a2}`,
      team: s.team,
      detail: `${s.level === "nhl" ? "NHL" : (LEAGUE_LABEL[s.league] ?? s.league)} · ${now ? `${seasonLabel(s.from)} to now` : s.to !== s.from ? `${seasonLabel(s.from).slice(0, 4)}–${seasonLabel(s.to).slice(-2)}` : seasonLabel(s.from)}`,
      stat: goalie ? `${s.gp} games, ${s.w} win${s.w === 1 ? "" : "s"}` : `${s.p} points in ${s.gp} games`,
      kind: now ? "now" : "stop",
    });
  });

  const intl = reg
    .filter((s) => levelOf(s.leagueAbbrev) === "intl" && (s.gamesPlayed ?? 0) > 0)
    .reverse()
    .map((s) => ({
      // Events in the fall (Hlinka, U17 Challenge) fall in the season's first year; the rest in its second.
      year: String(Math.floor(s.season / 10000) + (/^(Hlinka|WHC)/.test(s.leagueAbbrev) ? 0 : 1)),
      event: eventName(s.leagueAbbrev),
      team: s.teamName?.default ?? "",
      gp: s.gamesPlayed ?? 0,
      stat: goalie ? (s.savePctg != null ? `${s.savePctg.toFixed(3).replace(/^0/, "")} SV%` : "") : `${s.points ?? 0} P`,
    }));

  // The career read.
  const lines: ReadLine[] = [];
  if (!goalie) {
    const firstPro = regular.find((r) => (r.level === "pro" || r.level === "nhl") && r.gp >= 20);
    const age = firstPro ? ageIn(firstPro.season, p.birthDate) : null;
    if (firstPro && age != null && age <= 18 && firstPro.p != null) {
      lines.push({ tone: "strength", html: [`Pro at ${age}: `, { b: `${firstPro.p} points in ${firstPro.gp} games` }, firstPro.level === "nhl" ? " in the NHL." : ` in ${LEAGUE_LABEL[firstPro.league] ?? firstPro.league}, against men.`] });
    }
    const jr = regular.filter((r) => r.level === "junior" && r.gp >= 15 && r.p != null);
    if (jr.length >= 2) {
      const lo = Math.min(...jr.map((r) => r.p! / r.gp));
      if (lo >= 1) lines.push({ tone: "strength", html: ["At least ", { b: `${(Math.floor(lo * 10) / 10).toFixed(1)} points a game` }, " in every minor and junior season of 15 games or more."] });
    }
    const best = nhl.find((r) => r.best);
    if (best) lines.push({ tone: "pace", html: [`Career best in ${best.label}: `, { b: `${best.g} goals, ${best.p} points` }, "."] });
    const top = reg
      .filter((s) => /^(OG|WC$|4 Nations|WCup)/.test(s.leagueAbbrev) && (s.gamesPlayed ?? 0) >= 3)
      .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))[0];
    if (top && (top.points ?? 0) >= 3) {
      lines.push({ tone: "strength", html: [`${Math.floor(top.season / 10000) + 1} ${eventName(top.leagueAbbrev)}: `, { b: `${top.goals ?? 0} goals, ${top.points} points` }, ` in ${top.gamesPlayed} games for ${top.teamName?.default ?? "his country"}.`] });
    }
    const po = playoffs.filter((r) => r.level === "nhl");
    const poGp = po.reduce((t, r) => t + r.gp, 0);
    if (poGp >= 5) lines.push({ tone: "role", html: ["NHL playoffs: ", { b: `${po.reduce((t, r) => t + (r.p ?? 0), 0)} points in ${poGp} games` }, "."] });
  } else {
    const best = nhl.find((r) => r.best);
    if (best && best.sv != null) lines.push({ tone: "pace", html: [`Best NHL season: `, { b: `${best.sv.toFixed(3).replace(/^0/, "")} in ${best.label}` }, ` (${best.gp} games).`] });
    const wins = Number(p.careerTotals?.regularSeason?.wins) || 0;
    if (wins) lines.push({ tone: "role", html: ["NHL career: ", { b: `${wins} wins` }, ` in ${p.careerTotals?.regularSeason?.gamesPlayed ?? "–"} games.`] });
    const po = playoffs.filter((r) => r.level === "nhl");
    const poGp = po.reduce((t, r) => t + r.gp, 0);
    if (poGp >= 3) lines.push({ tone: "role", html: ["NHL playoffs: ", { b: `${poGp} games` }, `, ${po.reduce((t, r) => t + (r.w ?? 0), 0)} wins.`] });
  }

  return { goalie, regular, playoffs, ppg, path, intl, draft: p.draftDetails ?? null, lines };
}

function ordinal(n: number) {
  const t = n % 100;
  if (t >= 11 && t <= 13) return `${n}th`;
  return `${n}${n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th"}`;
}
