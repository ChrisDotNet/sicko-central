import type { SkaterDetail } from "@/lib/player-stats";
import { FormRows } from "./FormRows";
import { PSection, Pctl, mmss } from "./Bits";

// This season, for a skater: role and ice time, form, NHL ranks, tracking, shot map.

const pct0 = (v: number | null | undefined) => (v == null ? "–" : `${Math.round(v * 100)}%`);
const ord = (n: number) => {
  const t = n % 100;
  return `${n}${t >= 11 && t <= 13 ? "th" : n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th"}`;
};

const AREA_BOX: Record<string, { x: number; y: number; w: number; h: number; label: string }> = {
  "L Net Side": { x: 40, y: 46, w: 74, h: 40, label: "L net side" },
  Crease: { x: 120, y: 46, w: 100, h: 40, label: "Crease" },
  "R Net Side": { x: 226, y: 46, w: 74, h: 40, label: "R net side" },
  "L Circle": { x: 18, y: 98, w: 92, h: 40, label: "L circle" },
  "Low Slot": { x: 120, y: 92, w: 100, h: 46, label: "Low slot" },
  "R Circle": { x: 230, y: 98, w: 92, h: 40, label: "R circle" },
  "High Slot": { x: 120, y: 144, w: 100, h: 38, label: "High slot" },
  "L Point": { x: 18, y: 192, w: 92, h: 36, label: "L point" },
  "Center Point": { x: 120, y: 192, w: 100, h: 36, label: "Centre point" },
  "R Point": { x: 230, y: 192, w: 92, h: 36, label: "R point" },
};

export function SkaterSeason({ d, centre }: { d: SkaterDetail; centre: boolean }) {
  const total = (d.evToi ?? 0) + (d.ppToi ?? 0) + (d.shToi ?? 0);
  const last10 = d.log.slice(0, 10);
  const tenPts = last10.reduce((t, g) => t + (g.points ?? 0), 0);
  const tenG = last10.reduce((t, g) => t + (g.goals ?? 0), 0);
  const tenS = last10.reduce((t, g) => t + (g.shots ?? 0), 0);
  const withPts = last10.filter((g) => (g.points ?? 0) > 0).length;
  const maxShots = Math.max(1, ...last10.map((g) => g.shots ?? 0));
  const e = d.edge;
  const areas = (e?.areas ?? []).filter((a) => AREA_BOX[a.area]);
  const ranks = [
    { label: "Points", r: d.ranks.points },
    { label: "Goals", r: d.ranks.goals },
    { label: "Assists", r: d.ranks.assists },
  ].filter((x) => x.r);

  return (
    <>
      {d.toi != null && (
        <PSection title="Role" aside="Ice time a game">
          <div className="rounded-2xl border border-line bg-surface p-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-display text-3xl font-extrabold">{mmss(d.toi)}</span>
              {d.teamToiRank != null && (
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${d.teamToiRank === 1 ? "bg-good-ground text-good-text" : "bg-line text-ink-2"}`}>
                  {d.teamToiRank === 1 ? "Most" : ord(d.teamToiRank)} among Sens {d.ranks.poolLabel}
                </span>
              )}
            </div>
            {total > 0 && (
              <>
                <div className="mt-2.5 flex h-3 overflow-hidden rounded-md" aria-hidden="true">
                  <span className="bg-good-text" style={{ width: `${((d.evToi ?? 0) / total) * 100}%` }} />
                  <span className="bg-gold-bright" style={{ width: `${((d.ppToi ?? 0) / total) * 100}%` }} />
                  <span className="bg-sens-bright" style={{ width: `${((d.shToi ?? 0) / total) * 100}%` }} />
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-ink-2">
                  <span><span className="text-good-text">■</span> Even {mmss(d.evToi)}</span>
                  <span><span className="text-gold-bright">■</span> Power play {mmss(d.ppToi)}</span>
                  <span><span className="text-sens-bright">■</span> Penalty kill {mmss(d.shToi)}</span>
                </div>
              </>
            )}
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              <div className="rounded-xl bg-ground px-2.5 py-2"><div className="text-[11px] text-muted">Team PP time</div><div className="font-display text-2xl font-extrabold">{pct0(d.ppShare)}</div></div>
              <div className="rounded-xl bg-ground px-2.5 py-2"><div className="text-[11px] text-muted">Offensive-zone starts</div><div className="font-display text-2xl font-extrabold">{pct0(d.ozStarts)}</div></div>
              {centre && d.faceoffPct != null ? (
                <div className="rounded-xl bg-ground px-2.5 py-2"><div className="text-[11px] text-muted">Faceoffs</div><div className="font-display text-2xl font-extrabold">{(d.faceoffPct * 100).toFixed(1)}%</div></div>
              ) : (
                <div className="rounded-xl bg-ground px-2.5 py-2"><div className="text-[11px] text-muted">Defensive-zone starts</div><div className="font-display text-2xl font-extrabold">{pct0(d.dzStarts)}</div></div>
              )}
            </div>
          </div>
        </PSection>
      )}

      {last10.length > 0 && (
        <PSection title="Form" aside={`Last ${last10.length} games`}>
          <div className="rounded-2xl border border-line bg-surface p-3.5">
            <div className="flex gap-1" aria-hidden="true">
              {[...last10].reverse().map((g) => (
                <div key={g.gameId} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-16 items-end gap-0.5">
                    <span className={`block w-2 rounded-sm ${(g.points ?? 0) > 0 ? "bg-gold-bright" : "bg-line-strong"}`} style={{ height: `${Math.max(2, Math.min(64, (g.points ?? 0) * 20))}px` }} />
                    <span className="block w-2 rounded-sm bg-faint" style={{ height: `${((g.shots ?? 0) / maxShots) * 56}px` }} />
                  </div>
                  <span className="text-[9.5px] text-muted">{g.opponentAbbrev}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 text-[11px] text-muted">
              <span className="text-gold-bright">■</span> points <span className="ml-1.5 text-faint">■</span> shots
            </div>
            <div className="mt-2.5 grid grid-cols-3 gap-1.5">
              {[["Points", tenPts], ["Goals", tenG], ["Shots", tenS]].map(([l, v]) => (
                <div key={l} className="rounded-xl bg-ground px-2.5 py-2"><div className="text-[11px] text-muted">{l}</div><div className="font-display text-2xl font-extrabold">{v}</div></div>
              ))}
            </div>
            <p className="mt-2.5 text-[13px] leading-snug text-ink-2">
              Points in {withPts} of the last {last10.length}, {tenPts} in all. {(tenS / last10.length).toFixed(1)} shots a game{d.gp ? `, against ${(d.shots / d.gp).toFixed(1)} on the season` : ""}.
            </p>
          </div>
          <FormRows log={d.log} goalie={false} max={10} />
        </PSection>
      )}

      {ranks.length > 0 && (
        <PSection title="Where he ranks" aside={`NHL ${d.ranks.poolLabel}`}>
          <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
            {ranks.map(({ label, r }) => (
              <li key={label} className="flex min-h-11 items-center justify-between gap-3 border-b border-line px-3.5 py-2 text-sm last:border-b-0">
                <span className="w-24 text-[11px] font-bold uppercase tracking-wider text-muted">{label}</span>
                <b className="flex-1">{r!.value}</b>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${r!.rank <= 30 ? "bg-good-ground text-good-text" : "bg-line text-ink-2"}`}>
                  {r!.tied ? "T-" : ""}
                  {ord(r!.rank)}
                </span>
              </li>
            ))}
          </ul>
        </PSection>
      )}

      {e && (e.distance || e.speed || e.shot) && (
        <PSection title="Tracking" aside="NHL EDGE">
          <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
            {e.distance && <Pctl label="Distance skated" value={`${e.distance.metric.toFixed(1)} km`} pct={e.distance.percentile} />}
            {e.bursts && <Pctl label="Bursts over 32 km/h" value={String(e.bursts.value)} pct={e.bursts.percentile} />}
            {e.speed && <Pctl label="Top skating speed" value={`${e.speed.metric.toFixed(1)} km/h`} pct={e.speed.percentile} />}
            {e.ozone && <Pctl label="Offensive-zone time" value={`${(e.ozone.pct * 100).toFixed(1)}%`} pct={e.ozone.percentile} />}
            {e.shot && <Pctl label="Hardest shot" value={`${e.shot.metric.toFixed(1)} km/h`} pct={e.shot.percentile} />}
          </ul>
        </PSection>
      )}

      {areas.some((a) => a.shots > 0) && (
        <PSection title="Where he shoots from" aside="Shots on goal">
          <div className="rounded-2xl border border-line bg-surface p-3">
            <svg viewBox="0 0 340 236" className="h-auto w-full" role="img" aria-label="Where he shoots from, against the league">
              <rect x="2" y="2" width="336" height="232" rx="40" fill="var(--sunk)" stroke="var(--line-strong)" />
              <line x1="2" y1="30" x2="338" y2="30" stroke="var(--sens)" strokeWidth="2" />
              <rect x="152" y="32" width="36" height="10" rx="2" fill="none" stroke="var(--muted)" />
              {areas.map((a) => {
                const b = AREA_BOX[a.area];
                const top = a.percentile >= 0.9;
                return (
                  <g key={a.area}>
                    <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="6" fill={top ? "var(--good-ground)" : "var(--line)"} stroke={top ? "var(--good-text)" : "var(--line-strong)"} strokeOpacity="0.7" />
                    <text x={b.x + b.w / 2} y={b.y + b.h / 2 - 2} textAnchor="middle" fill="var(--ink)" fontSize="11" fontWeight="700">
                      {b.label}
                    </text>
                    <text x={b.x + b.w / 2} y={b.y + b.h / 2 + 12} textAnchor="middle" fill={top ? "var(--good-text)" : "var(--ink-2)"} fontSize="10">
                      {a.shots} shots
                    </text>
                  </g>
                );
              })}
            </svg>
            <p className="mt-1.5 px-0.5 text-xs text-muted">Highlighted: more shots from there than 90% of NHL skaters.</p>
          </div>
        </PSection>
      )}
    </>
  );
}
