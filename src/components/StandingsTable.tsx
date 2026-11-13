import type { StandingRow } from "@/lib/nhl";
import { name } from "@/lib/nhl-shared";
import { OTT } from "@/lib/teams";

export function StandingsTable({ rows, showRank = true }: { rows: StandingRow[]; showRank?: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <table className="w-full text-sm tabular">
        <thead>
          <tr className="border-b border-line text-[11px] font-semibold text-muted">
            {showRank && <th className="w-8 py-2.5 pl-3.5 text-left font-semibold" scope="col"><span className="sr-only">Rank</span></th>}
            <th className="py-2.5 pl-1 text-left font-semibold" scope="col">Team</th>
            <th className="py-2.5 text-right font-semibold" scope="col">GP</th>
            <th className="py-2.5 text-right font-semibold" scope="col">W</th>
            <th className="py-2.5 text-right font-semibold" scope="col">L</th>
            <th className="py-2.5 text-right font-semibold" scope="col">OTL</th>
            <th className="py-2.5 pr-3.5 text-right font-semibold" scope="col">PTS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const abbrev = name(r.teamAbbrev);
            const ott = abbrev === OTT;
            return (
              <tr
                key={abbrev}
                className={`border-b border-line last:border-0 ${ott ? "bg-[#2A1215] shadow-[inset_3px_0_0_#C52032]" : ""}`}
              >
                {showRank && <td className="py-2.5 pl-3.5 text-muted">{i + 1}</td>}
                <td className="py-2.5 pl-1 font-bold">{abbrev}</td>
                <td className="py-2.5 text-right">{r.gamesPlayed}</td>
                <td className="py-2.5 text-right">{r.wins}</td>
                <td className="py-2.5 text-right">{r.losses}</td>
                <td className="py-2.5 text-right">{r.otLosses}</td>
                <td className="py-2.5 pr-3.5 text-right font-bold">{r.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
