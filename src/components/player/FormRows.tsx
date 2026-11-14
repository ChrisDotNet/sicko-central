"use client";

import Link from "next/link";
import { useState } from "react";
import type { GameLogLine } from "@/lib/player-stats";
import { formatGameDate } from "@/lib/format";

// Game-by-game rows under the Form chart: the last 5, with a button for 10 (or every start).
export function FormRows({ log, goalie, max }: { log: GameLogLine[]; goalie: boolean; max: number }) {
  const [open, setOpen] = useState(false);
  const rows = log.slice(0, open ? max : 5);
  const cols = goalie ? "grid-cols-[minmax(0,1fr)_40px_44px_48px]" : "grid-cols-[minmax(0,1fr)_22px_22px_30px_32px_46px]";
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className={`grid ${cols} gap-1.5 px-3.5 py-2 text-[11px] font-semibold text-muted`}>
        <span>{goalie ? "Start" : "Game"}</span>
        {goalie ? (
          <>
            <span className="text-right">Shots</span>
            <span className="text-right">Saves</span>
            <span className="text-right">SV%</span>
          </>
        ) : (
          <>
            <span className="text-right">G</span>
            <span className="text-right">A</span>
            <span className="text-right">+/-</span>
            <span className="text-right">SOG</span>
            <span className="text-right">TOI</span>
          </>
        )}
      </div>
      {rows.map((g) => (
        <Link key={g.gameId} href={`/game/${g.gameId}`} className={`grid ${cols} min-h-11 items-center gap-1.5 border-t border-line px-3.5 py-2 text-[13px] tabular-nums hover:bg-surface-2`}>
          <span className="flex flex-col">
            <b className="font-semibold">
              {formatGameDate(g.gameDate)} {g.homeRoadFlag === "H" ? "vs" : "at"} {g.opponentAbbrev}
            </b>
            {goalie && g.decision && <span className="text-[11px] font-bold text-muted">{g.decision === "W" ? "Win" : g.decision === "L" ? "Loss" : "OT loss"}</span>}
          </span>
          {goalie ? (
            <>
              <span className="text-right">{g.shotsAgainst ?? "–"}</span>
              <span className="text-right">{g.shotsAgainst != null && g.goalsAgainst != null ? g.shotsAgainst - g.goalsAgainst : "–"}</span>
              <span className="text-right font-bold">{g.savePctg != null ? g.savePctg.toFixed(3).replace(/^0/, "") : "–"}</span>
            </>
          ) : (
            <>
              <span className="text-right">{g.goals ?? 0}</span>
              <span className="text-right">{g.assists ?? 0}</span>
              <span className="text-right">{g.plusMinus == null ? "–" : g.plusMinus > 0 ? `+${g.plusMinus}` : g.plusMinus}</span>
              <span className="text-right">{g.shots ?? 0}</span>
              <span className="text-right">{g.toi ?? "–"}</span>
            </>
          )}
        </Link>
      ))}
      {log.length > 5 && (
        <button type="button" onClick={() => setOpen(!open)} className="block min-h-11 w-full border-t border-line text-[13px] font-semibold text-ink hover:bg-surface-2">
          {open ? "Show 5" : goalie ? `Show all ${Math.min(max, log.length)} starts` : `Show ${Math.min(max, log.length)} games`}
        </button>
      )}
    </div>
  );
}
