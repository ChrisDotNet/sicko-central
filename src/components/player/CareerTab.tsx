"use client";

import { useState } from "react";
import type { Career, CareerRow, Level } from "@/lib/career";
import { PSection, ReadCard } from "./Bits";

// The Career tab: the read, the path, points a game by level, every season (regular season or
// playoffs), international events and the draft.

const LEVEL_COLOUR: Record<Level, string> = { junior: "bg-faint", pro: "bg-gold-bright", nhl: "bg-sens-bright", intl: "bg-good-text" };
const GROUPS: Array<{ level: Level; title: string }> = [
  { level: "nhl", title: "NHL" },
  { level: "pro", title: "Other pro" },
  { level: "junior", title: "Junior and minor" },
];
const sv = (v: number | null) => (v == null ? "–" : v.toFixed(3).replace(/^0/, ""));

function Table({ rows, goalie }: { rows: CareerRow[]; goalie: boolean }) {
  const cols = "grid-cols-[62px_minmax(0,1fr)_30px_28px_28px_32px]";
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className={`grid ${cols} gap-1.5 px-3.5 py-2 text-[11px] font-semibold text-muted`}>
        <span>Season</span>
        <span>Team</span>
        <span className="text-right">GP</span>
        {goalie ? (
          <>
            <span className="text-right">W</span>
            <span />
            <span className="text-right">SV%</span>
          </>
        ) : (
          <>
            <span className="text-right">G</span>
            <span className="text-right">A</span>
            <span className="text-right">P</span>
          </>
        )}
      </div>
      {GROUPS.map(({ level, title }) => {
        const list = rows.filter((r) => r.level === level).reverse();
        if (!list.length) return null;
        return (
          <div key={level}>
            <div className="border-t border-line bg-sunk px-3.5 py-2 text-[10.5px] font-bold uppercase tracking-widest text-gold-text">{title}</div>
            {list.map((r, i) => (
              <div key={`${r.season}-${r.team}-${i}`} className={`grid ${cols} items-center gap-1.5 border-t border-line px-3.5 py-2 text-[12.5px] tabular-nums ${r.best ? "bg-gold-ground" : ""}`}>
                <span className="whitespace-nowrap">{r.label}</span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{r.team}</span>
                  {level !== "nhl" && <span className="truncate text-[11px] text-muted">{r.league}</span>}
                </span>
                <span className="text-right">{r.gp}</span>
                {goalie ? (
                  <>
                    <span className="text-right">{r.w ?? "–"}</span>
                    <span />
                    <span className="text-right font-bold">{sv(r.sv)}</span>
                  </>
                ) : (
                  <>
                    <span className="text-right">{r.g ?? "–"}</span>
                    <span className="text-right">{r.a ?? "–"}</span>
                    <span className="text-right font-bold">{r.p ?? "–"}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export function CareerTab({ c }: { c: Career }) {
  const [playoffs, setPlayoffs] = useState(false);
  const max = Math.max(1, ...c.ppg.map((x) => x.v));
  const levels = [...new Set(c.ppg.map((x) => x.level))];
  return (
    <>
      <ReadCard lines={c.lines} aside="His path, from the numbers" />

      {c.path.length > 1 && (
        <PSection title="The path">
          <ol className="rounded-2xl border border-line bg-surface px-3.5 py-1.5">
            {c.path.map((s, i) => (
              <li key={i} className="flex gap-3">
                <div className="flex w-3.5 flex-col items-center" aria-hidden="true">
                  <span className={`mt-3.5 size-3 rounded-full shadow-[0_0_0_3px_var(--surface)] ${s.kind === "draft" ? "bg-gold-bright" : s.kind === "now" ? "bg-sens-bright" : "bg-line-strong"}`} />
                  {i < c.path.length - 1 && <span className="w-0.5 flex-1 bg-line" />}
                </div>
                <div className="flex-1 pt-2.5 pb-3">
                  {s.ages && <div className="text-[11px] font-bold uppercase tracking-wider text-muted">{s.ages}</div>}
                  <div className="text-[15px] font-bold">{s.team}</div>
                  <div className="text-xs text-muted">{s.detail}</div>
                  {s.stat && <div className="mt-0.5 text-[13px] text-ink-2">{s.stat}</div>}
                </div>
              </li>
            ))}
          </ol>
        </PSection>
      )}

      {c.ppg.length > 2 && (
        <PSection title="Points per game" aside="Every season, every level">
          <div className="rounded-2xl border border-line bg-surface p-3.5">
            <div className="flex gap-0.5 overflow-x-auto">
              {c.ppg.map((x) => (
                <div key={x.season} className="flex min-w-6 flex-1 flex-col items-center gap-0.5">
                  <span className="text-[9px] text-ink-2">{x.v.toFixed(2)}</span>
                  <div className="flex h-24 items-end">
                    <span className={`block w-3.5 rounded-sm ${LEVEL_COLOUR[x.level]}`} style={{ height: `${Math.max(3, (x.v / max) * 96)}px` }} />
                  </div>
                  <span className="text-[8.5px] text-muted">{x.season}</span>
                </div>
              ))}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-3 text-[11px] text-muted">
              {levels.includes("junior") && <span><span className="text-faint">■</span> Junior and minor</span>}
              {levels.includes("pro") && <span><span className="text-gold-bright">■</span> Other pro</span>}
              {levels.includes("nhl") && <span><span className="text-sens-bright">■</span> NHL</span>}
            </div>
            <p className="mt-2 text-xs leading-snug text-muted">Leagues aren&apos;t directly comparable: a drop when he moves up a level is the jump in competition, not a slump.</p>
          </div>
        </PSection>
      )}

      <PSection title="Every season" aside={playoffs ? "Playoffs" : "Regular season"}>
        <div role="group" aria-label="Season type" className="mb-2.5 flex gap-1.5">
          {[false, true].map((po) => (
            <button
              key={String(po)}
              type="button"
              aria-pressed={playoffs === po}
              onClick={() => setPlayoffs(po)}
              className={`min-h-9 rounded-full border px-3.5 text-[13px] font-bold ${playoffs === po ? "border-ink bg-ink text-ground" : "border-line-strong text-muted"}`}
            >
              {po ? "Playoffs" : "Regular season"}
            </button>
          ))}
        </div>
        {(playoffs ? c.playoffs : c.regular).length ? (
          <Table rows={playoffs ? c.playoffs : c.regular} goalie={c.goalie} />
        ) : (
          <p className="text-sm text-muted">No playoff games yet.</p>
        )}
        {!playoffs && c.regular.some((r) => r.best) && <p className="mt-2 text-[11px] text-muted">Gold row: best NHL season.</p>}
      </PSection>

      {c.intl.length > 0 && (
        <PSection title="International">
          <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
            {c.intl.map((x, i) => (
              <li key={i} className="flex items-center gap-3 border-b border-line px-3.5 py-2.5 last:border-b-0">
                <span className="w-10 font-display text-lg font-extrabold text-muted">{x.year}</span>
                <span className="min-w-0 flex-1">
                  <b className="block text-sm">{x.event}</b>
                  <span className="text-xs text-muted">{x.team}</span>
                </span>
                <span className="text-[13px] text-ink-2">
                  {x.gp} GP{x.stat ? <> · <b className="text-ink">{x.stat}</b></> : null}
                </span>
              </li>
            ))}
          </ul>
        </PSection>
      )}

      {c.draft && (
        <PSection title="Draft">
          <div className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface p-3.5">
            <span className="font-display text-5xl font-extrabold text-gold-text">#{c.draft.overallPick}</span>
            <span className="text-sm leading-snug">
              Overall, {c.draft.year}
              <br />
              <span className="text-muted">
                {c.draft.teamAbbrev} · round {c.draft.round}, pick {c.draft.pickInRound}
              </span>
            </span>
          </div>
        </PSection>
      )}
    </>
  );
}
