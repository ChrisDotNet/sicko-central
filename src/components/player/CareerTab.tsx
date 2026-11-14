"use client";

import { useState, type ReactNode } from "react";
import type { Career, CareerRow, Level } from "@/lib/career";
import { PSection, ReadCard } from "./Bits";

// The Career tab. Phones: one column. Desktop (the page's 12-column grid), grouped in rows:
// Summary (the read | totals and draft), The path (across the page), Production (points a game
// | playoffs), Every season (the table | international).

const LEVEL_COLOUR: Record<Level, string> = { junior: "bg-faint", pro: "bg-gold-bright", nhl: "bg-sens-bright", intl: "bg-good-text" };
const GROUPS: Array<{ level: Level; title: string }> = [
  { level: "nhl", title: "NHL" },
  { level: "pro", title: "Other pro" },
  { level: "junior", title: "Junior and minor" },
];
const sv = (v: number | null) => (v == null ? "–" : v.toFixed(3).replace(/^0/, ""));
const pm = (v: number | null) => (v == null ? "–" : v > 0 ? `+${v}` : String(v));

function Table({ rows, goalie }: { rows: CareerRow[]; goalie: boolean }) {
  // Phones: the basics. Desktop adds +/-, PIM and shooting % (GAA for goalies).
  const cols = goalie
    ? "grid-cols-[62px_minmax(0,1fr)_30px_28px_44px] lg:grid-cols-[72px_minmax(0,1fr)_44px_40px_56px_52px]"
    : "grid-cols-[62px_minmax(0,1fr)_30px_28px_28px_32px] lg:grid-cols-[72px_minmax(0,1fr)_44px_40px_40px_44px_44px_44px_52px]";
  const wide = "hidden text-right lg:block";
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className={`grid ${cols} gap-1.5 px-3.5 py-2 text-[11px] font-semibold text-muted`}>
        <span>Season</span>
        <span>Team</span>
        <span className="text-right">GP</span>
        {goalie ? (
          <>
            <span className="text-right">W</span>
            <span className="text-right">SV%</span>
            <span className={wide}>GAA</span>
          </>
        ) : (
          <>
            <span className="text-right">G</span>
            <span className="text-right">A</span>
            <span className="text-right">P</span>
            <span className={wide}>+/-</span>
            <span className={wide}>PIM</span>
            <span className={wide}>S%</span>
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
                <span className="flex min-w-0 flex-col lg:flex-row lg:gap-1.5">
                  <span className="truncate">{r.team}</span>
                  {level !== "nhl" && <span className="truncate text-[11px] text-muted lg:text-[12.5px]">{r.league}</span>}
                </span>
                <span className="text-right">{r.gp}</span>
                {goalie ? (
                  <>
                    <span className="text-right">{r.w ?? "–"}</span>
                    <span className="text-right font-bold">{sv(r.sv)}</span>
                    <span className={wide}>{r.gaa != null ? r.gaa.toFixed(2) : "–"}</span>
                  </>
                ) : (
                  <>
                    <span className="text-right">{r.g ?? "–"}</span>
                    <span className="text-right">{r.a ?? "–"}</span>
                    <span className="text-right font-bold">{r.p ?? "–"}</span>
                    <span className={wide}>{pm(r.pm)}</span>
                    <span className={wide}>{r.pim ?? "–"}</span>
                    <span className={wide}>{r.sh != null ? `${(r.sh * 100).toFixed(1)}%` : "–"}</span>
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

export function CareerTab({ c, totals }: { c: Career; totals: ReactNode }) {
  const [playoffs, setPlayoffs] = useState(false);
  const max = Math.max(1, ...c.ppg.map((x) => x.v));
  const levels = [...new Set(c.ppg.map((x) => x.level))];
  const nhlPo = c.playoffs.filter((r) => r.level === "nhl");
  const po = {
    gp: nhlPo.reduce((t, r) => t + r.gp, 0),
    g: nhlPo.reduce((t, r) => t + (r.g ?? 0), 0),
    a: nhlPo.reduce((t, r) => t + (r.a ?? 0), 0),
    p: nhlPo.reduce((t, r) => t + (r.p ?? 0), 0),
    w: nhlPo.reduce((t, r) => t + (r.w ?? 0), 0),
    years: nhlPo.map((r) => Number(r.label.slice(-2)) + 2000),
  };
  const stopDot = (k: string) => (k === "draft" ? "bg-gold-bright" : k === "now" ? "bg-sens-bright" : "bg-line-strong");
  return (
    <>
      <ReadCard lines={c.lines} aside="His path, from the numbers" className="lg:col-span-7" />

      <div className="flex flex-col lg:col-span-5">
        {totals}
        {c.draft && (
          <section className="px-4 pt-3 lg:px-0">
            <div className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface p-3.5">
              <span className="font-display text-5xl font-extrabold text-gold-text">#{c.draft.overallPick}</span>
              <span className="text-sm leading-snug">
                Drafted overall, {c.draft.year}
                <br />
                <span className="text-muted">
                  {c.draft.teamAbbrev} · round {c.draft.round}, pick {c.draft.pickInRound}
                </span>
              </span>
            </div>
          </section>
        )}
      </div>

      {c.path.length > 1 && (
        <PSection title="The path" className="lg:col-span-12">
          {/* Phones: down the page. Desktop: across it. */}
          <ol className="rounded-2xl border border-line bg-surface px-3.5 py-1.5 lg:hidden">
            {c.path.map((s, i) => (
              <li key={i} className="flex gap-3">
                <div className="flex w-3.5 flex-col items-center" aria-hidden="true">
                  <span className={`mt-3.5 size-3 rounded-full shadow-[0_0_0_3px_var(--surface)] ${stopDot(s.kind)}`} />
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
          <ol className="relative hidden rounded-2xl border border-line bg-surface px-5 py-5 lg:grid" style={{ gridTemplateColumns: `repeat(${c.path.length}, minmax(0, 1fr))` }}>
            <span aria-hidden="true" className="absolute top-[26px] right-8 left-8 h-0.5 bg-line" />
            {c.path.map((s, i) => (
              <li key={i} className="relative pr-4">
                <span aria-hidden="true" className={`block size-3.5 rounded-full shadow-[0_0_0_4px_var(--surface)] ${stopDot(s.kind)}`} />
                {s.ages && <div className="mt-3 text-[11px] font-bold uppercase tracking-wider text-muted">{s.ages}</div>}
                <div className="mt-0.5 text-[15px] font-bold leading-snug">{s.team}</div>
                <div className="mt-0.5 text-xs text-muted">{s.detail}</div>
                {s.stat && <div className="mt-1 text-[13px] text-ink-2">{s.stat}</div>}
              </li>
            ))}
          </ol>
        </PSection>
      )}

      {c.ppg.length > 2 && (
        <PSection title="Points per game" aside="Every season, every level" className={po.gp ? "lg:col-span-8" : "lg:col-span-12"}>
          <div className="rounded-2xl border border-line bg-surface p-3.5">
            <div className="flex gap-0.5 overflow-x-auto">
              {c.ppg.map((x) => (
                <div key={x.season} className="flex min-w-6 flex-1 flex-col items-center gap-0.5">
                  <span className="text-[9px] text-ink-2 lg:text-[10px]">{x.v.toFixed(2)}</span>
                  <div className="flex h-24 items-end lg:h-32">
                    <span className={`block w-3.5 rounded-sm lg:w-5 ${LEVEL_COLOUR[x.level]}`} style={{ height: `${Math.max(3, (x.v / max) * 100)}%` }} />
                  </div>
                  <span className="text-[8.5px] text-muted lg:text-[10px]">{x.season}</span>
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

      {po.gp > 0 && (
        <PSection title="Playoffs" aside="NHL" className={c.ppg.length > 2 ? "lg:col-span-4" : "lg:col-span-12"}>
          <div className="rounded-2xl border border-line bg-surface p-3.5">
            <div className="grid grid-cols-4 gap-1.5">
              {(c.goalie
                ? [["GP", po.gp], ["W", po.w]]
                : [["GP", po.gp], ["G", po.g], ["A", po.a], ["P", po.p]]
              ).map(([l, v]) => (
                <div key={l} className="rounded-xl bg-ground px-2.5 py-2">
                  <div className="text-[11px] text-muted">{l}</div>
                  <div className="font-display text-2xl font-extrabold">{v}</div>
                </div>
              ))}
            </div>
            <p className="mt-2.5 text-xs text-muted">{po.years.length === 1 ? `${po.years[0]} playoffs` : `${po.years.join(" and ").replace(/ and (?=.* and )/g, ", ")} playoffs`}</p>
          </div>
        </PSection>
      )}

      <PSection title="Every season" aside={playoffs ? "Playoffs" : "Regular season"} className={c.intl.length ? "lg:col-span-8" : "lg:col-span-12"}>
        <div role="group" aria-label="Season type" className="mb-2.5 flex gap-1.5">
          {[false, true].map((p) => (
            <button
              key={String(p)}
              type="button"
              aria-pressed={playoffs === p}
              onClick={() => setPlayoffs(p)}
              className={`min-h-9 rounded-full border px-3.5 text-[13px] font-bold ${playoffs === p ? "border-ink bg-ink text-ground" : "border-line-strong text-muted"}`}
            >
              {p ? "Playoffs" : "Regular season"}
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
        <PSection title="International" className="lg:col-span-4">
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
    </>
  );
}
