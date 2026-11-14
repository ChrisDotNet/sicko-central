import type { GoalieDetail } from "@/lib/player-stats";
import { FormRows } from "./FormRows";
import { PSection, Pctl } from "./Bits";

// This season, for a goalie: every start, save % by shot type, NHL ranks.
const dec3 = (v: number) => v.toFixed(3).replace(/^0/, "");
const ord = (n: number) => {
  const t = n % 100;
  return `${n}${t >= 11 && t <= 13 ? "th" : n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th"}`;
};
const chip = (rank: number) => `rounded-full px-2 py-0.5 text-[11px] font-extrabold ${rank <= 10 ? "bg-good-ground text-good-text" : "bg-line text-ink-2"}`;

export function GoalieSeason({ d }: { d: GoalieDetail }) {
  const starts = d.log.filter((g) => g.gamesStarted === 1 && (g.shotsAgainst ?? 0) > 0);
  const chart = [...starts].slice(0, 12).reverse();
  const below = starts.filter((g) => (g.savePctg ?? 0) < 0.9);
  const h = (sv: number) => Math.max(6, Math.min(80, ((sv - 0.85) / 0.15) * 80));
  return (
    <>
      {starts.length > 0 && (
        <PSection title="Every start" aside="Save % · shots faced" className="lg:col-span-7">
          <div className="rounded-2xl border border-line bg-surface p-3.5">
            <div className="relative">
              <div className="flex gap-1" aria-hidden="true">
                {chart.map((g) => (
                  <div key={g.gameId} className="flex flex-1 flex-col items-center gap-0.5">
                    <span className="text-[9px] text-ink-2">{g.savePctg != null ? dec3(g.savePctg) : "–"}</span>
                    <div className="flex h-20 items-end">
                      <span className={`block w-3.5 rounded-sm ${(g.savePctg ?? 0) >= 0.9 ? "bg-good-text" : "bg-faint"}`} style={{ height: `${h(g.savePctg ?? 0.85)}px` }} />
                    </div>
                    <span className="text-[9.5px] text-muted">{g.opponentAbbrev}</span>
                    <span className="text-[9px] text-faint">{g.shotsAgainst}</span>
                  </div>
                ))}
              </div>
              <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-muted" style={{ top: `${14 + 80 - h(0.9)}px` }} />
            </div>
            <p className="mt-2.5 text-[13px] leading-snug text-ink-2">
              {below.length === 0
                ? `At or above .900 in all ${starts.length} starts.`
                : `Under .900 in ${below.length} of ${starts.length} starts${below.every((g) => g.decision === "W") ? ", all wins" : ""}.`}{" "}
              Dashed line: .900.
            </p>
          </div>
        </PSection>
      )}

      {d.byType.length > 0 && (
        <PSection title="By shot type" aside="Save % vs league" className="lg:col-span-5">
          <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
            {d.byType.map((t) => (
              <Pctl key={t.label} label={`${t.label} · league ${dec3(t.league)}`} value={dec3(t.sv)} pct={t.percentile} />
            ))}
          </ul>
        </PSection>
      )}

      {starts.length > 0 && (
        <PSection title="Start by start" aside="Last 5, or all" className="lg:col-span-7">
          <FormRows log={starts} goalie max={starts.length} />
        </PSection>
      )}

      {(d.svRank || d.gaaRank) && (
        <PSection title="Where he ranks" aside={`${d.svRank?.of ?? d.gaaRank?.of} goalies with 6+ starts`} className="lg:col-span-5">
          <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
            {d.svRank && d.svPct != null && (
              <li className="flex min-h-11 items-center justify-between gap-3 border-b border-line px-3.5 py-2 text-sm last:border-b-0">
                <span className="w-24 text-[11px] font-bold uppercase tracking-wider text-muted">Save %</span>
                <b className="flex-1">{dec3(d.svPct)}</b>
                <span className={chip(d.svRank.rank)}>{ord(d.svRank.rank)}</span>
              </li>
            )}
            {d.gaaRank && d.gaa != null && (
              <li className="flex min-h-11 items-center justify-between gap-3 border-b border-line px-3.5 py-2 text-sm last:border-b-0">
                <span className="w-24 text-[11px] font-bold uppercase tracking-wider text-muted">GAA</span>
                <b className="flex-1">{d.gaa.toFixed(2)}</b>
                <span className={chip(d.gaaRank.rank)}>{ord(d.gaaRank.rank)}</span>
              </li>
            )}
          </ul>
        </PSection>
      )}
    </>
  );
}
