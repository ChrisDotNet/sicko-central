import { ordinal, recStr, tapeRows, watchFor } from "@/lib/team-stats-shared";
import type { SeasonLens } from "@/lib/team-stats-shared";
import { teamColor } from "@/lib/teams";
import { Section } from "../ui";

// Before puck drop: the Sens against tonight's opponent, row by row, with each team's rank of
// 32. The better side of each row is brighter. "Watch for" is picked from the biggest gaps.
export function TaleOfTape({ lens, goalies, className = "" }: { lens: SeasonLens; goalies?: { ott?: string; opp?: string }; className?: string }) {
  const rows = tapeRows(lens, goalies);
  if (rows.length === 0) return null;
  const watch = watchFor(lens);
  const { ott, opp } = lens;
  return (
    <Section className={className} title="Tale of the tape" aside="Rank of 32">
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-line bg-[#131316] px-3.5 py-2.5">
          <div>
            <div className="font-display text-xl font-extrabold tracking-wide" style={{ color: teamColor(ott.abbrev) }}>
              {ott.abbrev}
            </div>
            <div className="text-[11px] font-semibold text-muted">{recStr(ott.rec)}</div>
          </div>
          <div className="text-center text-[11px] font-semibold uppercase tracking-widest text-muted">Season</div>
          <div className="text-right">
            <div className="font-display text-xl font-extrabold tracking-wide" style={{ color: teamColor(opp.abbrev) }}>
              {opp.abbrev}
            </div>
            <div className="text-[11px] font-semibold text-muted">{recStr(opp.rec)}</div>
          </div>
        </div>
        <ul>
          {rows.map((r) => {
            const ottBetter = r.ottRank < r.oppRank;
            const even = r.ottRank === r.oppRank;
            return (
              <li key={r.label} className="grid grid-cols-[1fr_minmax(0,9rem)_1fr] items-center gap-2 border-b border-line px-3.5 py-2 last:border-b-0">
                <div className={ottBetter || even ? "text-ink" : "text-muted"}>
                  <span className="text-[15px] font-extrabold tabular-nums">{r.ott}</span>{" "}
                  <span className="text-[11px] font-semibold text-muted">{ordinal(r.ottRank)}</span>
                </div>
                <div className="text-center text-[11.5px] font-semibold leading-tight text-muted">{r.label}</div>
                <div className={`text-right ${!ottBetter || even ? "text-ink" : "text-muted"}`}>
                  <span className="text-[11px] font-semibold text-muted">{ordinal(r.oppRank)}</span>{" "}
                  <span className="text-[15px] font-extrabold tabular-nums">{r.opp}</span>
                </div>
              </li>
            );
          })}
        </ul>
        {watch && (
          <div className="flex items-start gap-2.5 border-t border-line px-3.5 py-2.5 text-[13px] leading-snug text-ink-2">
            <span className="mt-px shrink-0 rounded-md bg-gold-ground px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-gold-text">Watch for</span>
            <span>{watch}</span>
          </div>
        )}
      </div>
    </Section>
  );
}
