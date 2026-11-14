import type { ReactNode } from "react";
import type { Gauge as GaugeData, ReadLine } from "@/lib/player-read";

// Shared pieces for the player page's This season and Career tabs.

const TONE: Record<ReadLine["tone"], string> = {
  pace: "bg-gold-bright",
  hot: "bg-[#E07A2E]",
  cold: "bg-[#3B7FC4]",
  strength: "bg-good-text",
  role: "bg-muted",
};

// Phones: one column. Desktop: the tab is a 12-column grid (see the player page) and each
// section says how many columns it takes.
export function PSection({ title, aside, children, className = "" }: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`px-4 pt-6 lg:px-0 ${className}`}>
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl font-bold uppercase tracking-wider">{title}</h2>
        {aside && <span className="text-xs text-muted">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

export function ReadCard({ lines, aside, className = "" }: { lines: ReadLine[]; aside: string; className?: string }) {
  if (lines.length === 0) return null;
  return (
    <PSection title="The read" aside={aside} className={className}>
      <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
        {lines.map((l, i) => (
          <li key={i} className="flex gap-2.5 border-b border-line px-3.5 py-2.5 text-sm leading-snug text-ink-2 last:border-b-0">
            <span aria-hidden="true" className={`mt-[7px] size-[7px] shrink-0 rounded-full ${TONE[l.tone]}`} />
            <span>{l.html.map((h, j) => (typeof h === "string" ? h : <b key={j} className="text-ink">{h.b}</b>))}</span>
          </li>
        ))}
      </ul>
    </PSection>
  );
}

export function GaugeCard({ g, className = "" }: { g: GaugeData; className?: string }) {
  const cell = (c: GaugeData["left"]) => (
    <div className="rounded-xl bg-ground px-3 py-2.5">
      <div className="text-[11px] text-muted">{c.label}</div>
      <div className="font-display text-[26px] font-extrabold leading-none">{c.now}</div>
      <div className="text-[11px] text-muted">
        {c.baseLabel} {c.base}
      </div>
    </div>
  );
  return (
    <PSection title="Is it sustainable?" className={className}>
      <div className="rounded-2xl border border-line bg-surface p-3.5">
        <div
          className="relative h-3 rounded-full bg-[linear-gradient(90deg,#3B7FC4_0%,var(--line-strong)_50%,#E07A2E_100%)]"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={g.pos}
          aria-label={g.label}
        >
          <span className="absolute -top-[5px] size-[22px] rounded-full border-[3px] border-ground bg-ink shadow-[0_0_0_1px_var(--line-strong)]" style={{ left: `calc(${g.pos}% - 11px)` }} />
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-muted">
          <span>Running cold</span>
          <span>Normal</span>
          <span>Running hot</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {cell(g.left)}
          {cell(g.right)}
        </div>
        <p className="mt-3 text-[13px] leading-snug text-ink-2">{g.caption}</p>
      </div>
    </PSection>
  );
}

export function Pctl({ label, value, pct }: { label: string; value: string; pct: number }) {
  const p = Math.min(99, Math.floor(pct * 100));
  return (
    <li className="border-b border-line px-3.5 py-2.5 last:border-b-0">
      <div className="flex justify-between gap-3 text-[13px]">
        <span className="text-muted">{label}</span>
        <b className="tabular-nums">{value}</b>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
        <div className="h-1.5 rounded-full bg-good-text" style={{ width: `${p}%` }} />
      </div>
      <div className="mt-1 text-[11px] text-muted">{p}th percentile</div>
    </li>
  );
}

export const mmss = (sec: number | null | undefined) => {
  if (sec == null) return "–";
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
