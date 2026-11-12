import type { ScheduleGame } from "./nhl";
import { FINAL_STATES, LIVE_STATES } from "./nhl-shared";
import { OTT } from "./teams";

export type GameSummary = {
  id: number;
  gameDate: string;
  startTimeUTC: string;
  gameType: number;
  home: boolean;
  opp: string;
  state: "upcoming" | "live" | "final";
  ottScore?: number;
  oppScore?: number;
  result?: "W" | "L" | "OTL";
  lastPeriodType?: string;
  broadcasts: string[];
  venue: string;
};

export function summarize(g: ScheduleGame): GameSummary {
  const home = g.homeTeam.abbrev === OTT;
  const ott = home ? g.homeTeam : g.awayTeam;
  const opp = home ? g.awayTeam : g.homeTeam;
  const state = LIVE_STATES.includes(g.gameState)
    ? "live"
    : FINAL_STATES.includes(g.gameState)
      ? "final"
      : "upcoming";
  let result: GameSummary["result"];
  if (state === "final" && ott.score != null && opp.score != null) {
    const extra = g.gameOutcome?.lastPeriodType && g.gameOutcome.lastPeriodType !== "REG";
    result = ott.score > opp.score ? "W" : extra && g.gameType !== 3 ? "OTL" : "L";
  }
  return {
    id: g.id,
    gameDate: g.gameDate,
    startTimeUTC: g.startTimeUTC,
    gameType: g.gameType,
    home,
    opp: opp.abbrev,
    state,
    ottScore: ott.score,
    oppScore: opp.score,
    result,
    lastPeriodType: g.gameOutcome?.lastPeriodType,
    broadcasts: [...new Set((g.tvBroadcasts ?? []).filter((b) => b.countryCode === "CA").map((b) => b.network))],
    venue: g.venue?.default ?? "",
  };
}

export function splitSchedule(games: ScheduleGame[]) {
  const all = games.filter((g) => g.gameType === 2 || g.gameType === 3).map(summarize);
  const live = all.find((g) => g.state === "live") ?? null;
  const finals = all.filter((g) => g.state === "final");
  const upcoming = all.filter((g) => g.state === "upcoming");
  return { all, live, last: finals[finals.length - 1] ?? null, next: upcoming[0] ?? null };
}

export function scoreLine(g: GameSummary): string {
  if (g.ottScore == null || g.oppScore == null) return "";
  const extra = g.lastPeriodType && g.lastPeriodType !== "REG" ? ` ${g.lastPeriodType}` : "";
  return `${g.ottScore}–${g.oppScore}${extra}`;
}
