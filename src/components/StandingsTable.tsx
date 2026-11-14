import type { StandingRow } from "@/lib/nhl";
import { name } from "@/lib/nhl-shared";
import { OTT } from "@/lib/teams";

const pct = (n: number) => n.toFixed(3).replace(/^0/, "");
const diff = (n: number) => (n > 0 ? `+${n}` : String(n));
const l10 = (r: StandingRow) => (r.l10Wins != null ? `${r.l10Wins}-${r.l10Losses ?? 0}-${r.l10OtLosses ?? 0}` : "–");
const streak = (r: StandingRow) => (r.streakCode ? `${r.streakCode}${r.streakCount ?? ""}` : "–");

// Phones get the basics; wider screens add points %, goals, last 10 and streak.
// `extraFrom` picks the width where those appear (a narrow column on a wide page can wait for desktop).
export function StandingsTable({ rows, showRank = true, extraFrom = "md" }: { rows: StandingRow[]; showRank?: boolean; extraFrom?: "md" | "lg" }) {
  const x = extraFrom === "lg" ? "hidden lg:table-cell" : "hidden md:table-cell";
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
            <th className="py-2.5 text-right font-semibold" scope="col">PTS</th>
            <th className={`py-2.5 text-right font-semibold ${x}`} scope="col">P%</th>
            <th className={`py-2.5 text-right font-semibold ${x}`} scope="col">GF</th>
            <th className={`py-2.5 text-right font-semibold ${x}`} scope="col">GA</th>
            <th className={`py-2.5 text-right font-semibold ${x}`} scope="col">DIFF</th>
            <th className={`py-2.5 text-right font-semibold ${x}`} scope="col">L10</th>
            <th className={`py-2.5 text-right font-semibold ${x}`} scope="col">STRK</th>
            <th className="w-3.5" aria-hidden="true" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const abbrev = name(r.teamAbbrev);
            const ott = abbrev === OTT;
            return (
              <tr
                key={abbrev}
                className={`border-b border-line last:border-0 ${ott ? "bg-sens-row shadow-[inset_3px_0_0_var(--sens)]" : ""}`}
              >
                {showRank && <td className="py-2.5 pl-3.5 text-muted">{i + 1}</td>}
                <td className="py-2.5 pl-1 font-bold">{abbrev}</td>
                <td className="py-2.5 text-right">{r.gamesPlayed}</td>
                <td className="py-2.5 text-right">{r.wins}</td>
                <td className="py-2.5 text-right">{r.losses}</td>
                <td className="py-2.5 text-right">{r.otLosses}</td>
                <td className="py-2.5 text-right font-bold">{r.points}</td>
                <td className={`py-2.5 text-right ${x}`}>{pct(r.pointPctg)}</td>
                <td className={`py-2.5 text-right ${x}`}>{r.goalFor}</td>
                <td className={`py-2.5 text-right ${x}`}>{r.goalAgainst}</td>
                <td className={`py-2.5 text-right ${x}`}>{diff(r.goalDifferential)}</td>
                <td className={`py-2.5 text-right ${x}`}>{l10(r)}</td>
                <td className={`py-2.5 text-right ${x}`}>{streak(r)}</td>
                <td className="w-3.5" />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
