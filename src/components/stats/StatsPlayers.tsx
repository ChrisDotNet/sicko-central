import type { SensForm } from "@/lib/team-stats";
import { dec2, dec3, ordinal, pct1, recStr } from "@/lib/team-stats-shared";
import type { ShotArea, StatsPage } from "@/lib/team-stats-shared";
import { RankChip, StatsSection } from "./StatsBits";

// Stats tab › Players: leaders in league context, goalies, NHL EDGE tracking, where the shots
// come from, and the last 10 games.

// Offensive-zone areas on a simple half-rink (the Sens attack up the page toward the net).
const AREA_BOX: Record<string, { x: number; y: number; w: number; h: number; label: string }> = {
  "L Net Side": { x: 40, y: 46, w: 74, h: 42, label: "L net side" },
  Crease: { x: 120, y: 46, w: 100, h: 42, label: "Crease" },
  "R Net Side": { x: 226, y: 46, w: 74, h: 42, label: "R net side" },
  "L Circle": { x: 18, y: 100, w: 92, h: 42, label: "L circle" },
  "Low Slot": { x: 120, y: 94, w: 100, h: 46, label: "Low slot" },
  "R Circle": { x: 230, y: 100, w: 92, h: 42, label: "R circle" },
  "High Slot": { x: 120, y: 146, w: 100, h: 40, label: "High slot" },
  "L Point": { x: 18, y: 196, w: 92, h: 38, label: "L point" },
  "Center Point": { x: 120, y: 196, w: 100, h: 38, label: "Centre point" },
  "R Point": { x: 230, y: 196, w: 92, h: 38, label: "R point" },
};
const FILL = { top: ["var(--good-ground)", "var(--good-text)"], mid: ["var(--line)", "var(--ink-2)"], bottom: ["var(--bad-ground)", "var(--bad-text)"] } as const;
const bandOf = (r: number) => (r <= 10 ? "top" : r > 22 ? "bottom" : "mid");

function ShotMapAreas({ areas }: { areas: ShotArea[] }) {
  return (
    <svg viewBox="0 0 340 244" className="h-auto w-full" role="img" aria-label="Where the Sens shoot from, ranked against the league">
      <rect x="2" y="2" width="336" height="240" rx="40" fill="var(--sunk)" stroke="var(--line-strong)" />
      <line x1="2" y1="30" x2="338" y2="30" stroke="var(--sens)" strokeWidth="2" />
      <rect x="152" y="32" width="36" height="10" rx="2" fill="none" stroke="var(--muted)" />
      {areas.map((a) => {
        const b = AREA_BOX[a.area];
        if (!b) return null;
        const [bg, fg] = FILL[bandOf(a.rank)];
        return (
          <g key={a.area}>
            <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="6" fill={bg} stroke={fg} strokeOpacity="0.6" />
            <text x={b.x + b.w / 2} y={b.y + b.h / 2 - 3} textAnchor="middle" fill="var(--ink)" fontSize="11" fontWeight="700">
              {b.label}
            </text>
            <text x={b.x + b.w / 2} y={b.y + b.h / 2 + 12} textAnchor="middle" fill={fg} fontSize="10">
              {a.shots} · {ordinal(a.rank)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function StatsPlayers({ page, form }: { page: StatsPage; form: SensForm | null }) {
  const e = page.edgeTeam;
  const maxG = Math.max(1, ...(form?.last10 ?? []).map((g) => Math.max(g.f, g.a)));
  const tenF = (form?.last10 ?? []).reduce((s, g) => s + g.f, 0);
  const tenA = (form?.last10 ?? []).reduce((s, g) => s + g.a, 0);
  return (
    <div className="lg:grid lg:grid-cols-3 lg:items-start">
      <div>
        {page.leaders.length > 0 && (
          <StatsSection title="Sens leaders" aside="NHL rank">
            <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
              {page.leaders.map((l) => (
                <li key={l.label} className="flex min-h-11 items-center gap-3 border-b border-line px-3.5 py-2 text-sm last:border-b-0">
                  <span className="w-20 shrink-0 text-[11px] font-bold uppercase tracking-wider text-muted">{l.label}</span>
                  <span className="min-w-0 flex-1">
                    <b>{l.names.join(", ")}</b> <span className="text-muted">{l.value}</span>
                  </span>
                  <RankChip rank={l.rank} of={l.pool === "D" ? 120 : 400} tied={l.tied} suffix={l.pool === "D" ? " D" : ""} />
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-muted">Among all NHL skaters (defencemen for D points). Ties share a rank.</p>
          </StatsSection>
        )}

        {page.goalies.length > 0 && (
          <StatsSection title="Goalies" aside={`Save % rank, 6+ starts`}>
            <div className="grid grid-cols-2 gap-2">
              {page.goalies.slice(0, 2).map((g) => (
                <div key={g.id} className="rounded-2xl border border-line bg-surface p-3">
                  <div className="font-bold">{g.lastName}</div>
                  <div className="text-xs text-muted">
                    {g.starts} starts · {recStr(g.rec)}
                  </div>
                  <div className="mt-2 font-display text-3xl font-extrabold leading-none">{dec3(g.svPct)}</div>
                  <div className="text-xs text-muted">{dec2(g.gaa)} GAA</div>
                  <div className="mt-1.5">{g.rank ? <RankChip rank={g.rank} of={g.of} suffix={` of ${g.of}`} /> : <span className="text-[11px] text-muted">Under 6 starts</span>}</div>
                </div>
              ))}
            </div>
          </StatsSection>
        )}
      </div>

      <div>
        {(page.edgePlayers.length > 0 || e) && (
          <StatsSection title="Tracking" aside="NHL EDGE">
            <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
              {page.edgePlayers.map((p) => (
                <li key={p.label} className="border-b border-line px-3.5 py-2.5 last:border-b-0">
                  <div className="flex justify-between gap-3 text-[13px] text-muted">
                    <span>{p.label}</span>
                    <span className="text-[11px]">{Math.min(99, Math.floor(p.percentile))}th percentile</span>
                  </div>
                  <div className="mt-0.5 flex justify-between gap-3">
                    <b>{p.name}</b>
                    <b className="tabular-nums">{p.value}</b>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
                    <div className="h-1.5 rounded-full bg-good-text" style={{ width: `${p.percentile}%` }} />
                  </div>
                </li>
              ))}
              {e?.ozone && (
                <li className="flex items-center justify-between gap-3 border-b border-line px-3.5 py-2.5 text-sm last:border-b-0">
                  <span className="text-ink-2">Team: offensive-zone time {pct1(e.ozone.pct)}</span>
                  <RankChip rank={e.ozone.rank} />
                </li>
              )}
              {e?.hardShots && (
                <li className="flex items-center justify-between gap-3 border-b border-line px-3.5 py-2.5 text-sm last:border-b-0">
                  <span className="text-ink-2">Team: shots over 145 km/h ({e.hardShots.value})</span>
                  <RankChip rank={e.hardShots.rank} />
                </li>
              )}
              {e?.topSpeed && (
                <li className="flex items-center justify-between gap-3 border-b border-line px-3.5 py-2.5 text-sm last:border-b-0">
                  <span className="text-ink-2">Team: top skating speed ({e.topSpeed.kmh.toFixed(1)} km/h)</span>
                  <RankChip rank={e.topSpeed.rank} />
                </li>
              )}
            </ul>
            <p className="mt-2 text-[11px] text-muted">Players with 5 or more games. Percentile among NHL skaters.</p>
          </StatsSection>
        )}
      </div>

      <div>
        {e && e.areas.length > 0 && (
          <StatsSection title="Where the shots come from" aside="Shots · rank of 32">
            <div className="rounded-2xl border border-line bg-surface p-3">
              <ShotMapAreas areas={e.areas} />
              {e.highDanger && (
                <p className="mt-2 text-[13px] leading-snug text-ink-2">
                  High-danger shots: {e.highDanger.shots}, <b className="text-ink">{ordinal(e.highDanger.rank)}</b>. They score on {pct1(e.highDanger.pct)} of them,{" "}
                  <b className="text-ink">{ordinal(e.highDanger.pctRank)}</b>.
                </p>
              )}
            </div>
          </StatsSection>
        )}

        {form && form.last10.length > 0 && (
          <StatsSection title={`Last ${form.last10.length} games`} aside="Goals for and against">
            <div className="rounded-2xl border border-line bg-surface p-3.5">
              <div className="flex h-24 items-end gap-1.5">
                {form.last10.map((g, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex h-[72px] items-end gap-0.5" aria-hidden="true">
                      <span className="block w-2 rounded-sm bg-sens-bright" style={{ height: `${(g.f / maxG) * 72}px` }} />
                      <span className="block w-2 rounded-sm bg-faint" style={{ height: `${(g.a / maxG) * 72}px` }} />
                    </div>
                    <span className="text-[10px] text-muted">{g.opp}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">
                <span className="text-sens-bright">■</span> Sens <span className="ml-1 text-faint">■</span> opponent · {tenF} for, {tenA} against
              </p>
              <ul className="sr-only">
                {form.last10.map((g, i) => (
                  <li key={i}>
                    {g.home ? "vs" : "at"} {g.opp}: {g.f}–{g.a}
                  </li>
                ))}
              </ul>
            </div>
          </StatsSection>
        )}
      </div>
    </div>
  );
}
