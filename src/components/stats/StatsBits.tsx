import type { ReactNode } from "react";
import { band, ordinal } from "@/lib/team-stats-shared";

// Shared pieces for the Stats tab.

const BAND = {
  top: "bg-good-ground text-good-text",
  mid: "bg-line text-ink-2",
  bottom: "bg-bad-ground text-bad-text",
} as const;

// "5th" in blue (top 10), grey, or orange (bottom 10).
export function RankChip({ rank, of = 32, tied = false, suffix = "" }: { rank: number; of?: number; tied?: boolean; suffix?: string }) {
  return (
    <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-extrabold ${BAND[band(rank, of)]}`}>
      {tied ? "T-" : ""}
      {ordinal(rank)}
      {suffix}
    </span>
  );
}

export function StatsSection({ title, aside, children, className = "" }: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`px-4 pt-6 ${className}`}>
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl font-bold uppercase tracking-wider">{title}</h2>
        {aside && <span className="text-xs text-muted">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

export function Rows({ rows }: { rows: { label: ReactNode; value: ReactNode }[] }) {
  return (
    <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
      {rows.map((r, i) => (
        <li key={i} className="flex min-h-11 items-center justify-between gap-3 border-b border-line px-3.5 py-2 text-sm last:border-b-0">
          <span className="text-ink-2">{r.label}</span>
          <b className="text-right">{r.value}</b>
        </li>
      ))}
    </ul>
  );
}
