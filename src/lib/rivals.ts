import type { Scores } from "./nhl";
import { FINAL_STATES, LIVE_STATES } from "./nhl-shared";
import { ATLANTIC } from "./teams";
import { formatTime, periodLabel } from "./format";

export type RivalGame = { id: number; away: string; home: string; awayScore?: number; homeScore?: number; status: string };

type ScoreGame = Scores["games"][number] & {
  clock?: { timeRemaining?: string; inIntermission?: boolean };
  period?: number;
};

// Other Atlantic division games on today's NHL slate.
export function atlanticGames(scores: Scores, excludeId?: number): RivalGame[] {
  return (scores.games as ScoreGame[])
    .filter((g) => g.id !== excludeId && g.awayTeam.abbrev !== "OTT" && g.homeTeam.abbrev !== "OTT")
    .filter((g) => ATLANTIC.includes(g.awayTeam.abbrev) || ATLANTIC.includes(g.homeTeam.abbrev))
    .map((g) => {
      let status = formatTime(g.startTimeUTC);
      const n = g.periodDescriptor?.number ?? g.period ?? 1;
      if (LIVE_STATES.includes(g.gameState)) {
        status = g.clock?.inIntermission
          ? `End of ${periodLabel(n)}`
          : `${periodLabel(n, g.periodDescriptor?.periodType)} · ${g.clock?.timeRemaining ?? ""}`;
      } else if (FINAL_STATES.includes(g.gameState)) {
        const t = g.gameOutcome?.lastPeriodType;
        status = t && t !== "REG" ? `Final/${t}` : "Final";
      }
      const started = !["FUT", "PRE"].includes(g.gameState);
      return {
        id: g.id,
        away: g.awayTeam.abbrev,
        home: g.homeTeam.abbrev,
        awayScore: started ? g.awayTeam.score : undefined,
        homeScore: started ? g.homeTeam.score : undefined,
        status,
      };
    });
}
