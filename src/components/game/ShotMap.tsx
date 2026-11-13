"use client";

import { useState } from "react";
import type { Shot } from "@/lib/game";

// `initialPeriod`: 0 for all periods, or a period number (the intermission card opens it on
// the period that just ended).
export function ShotMap({ shots, oppAbbrev, periods, initialPeriod = 0 }: { shots: Shot[]; oppAbbrev: string; periods: number; initialPeriod?: number }) {
  const [period, setPeriod] = useState(Math.min(initialPeriod, 4));
  const labels = ["All", "1st", "2nd", "3rd", ...(periods > 3 ? ["OT"] : [])];
  const shown = shots.filter((s) => period === 0 || (period === 4 ? s.period >= 4 : s.period === period));
  const ott = shown.filter((s) => s.team === "OTT");
  const opp = shown.filter((s) => s.team === "OPP");

  return (
    <>
      <div role="group" aria-label="Period" className="mb-3 flex gap-1.5">
        {labels.map((l, i) => (
          <button
            key={l}
            type="button"
            aria-pressed={period === i}
            onClick={() => setPeriod(i)}
            className={`min-h-11 flex-1 rounded-xl border text-sm font-semibold ${
              period === i ? "border-ink bg-ink text-ground" : "border-line-strong text-ink-2"
            }`}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="rounded-2xl border border-line bg-surface p-3">
        <svg viewBox="0 0 200 85" width="100%" role="img" aria-label={`Shot locations: Ottawa ${ott.length} shots attacking right, ${oppAbbrev} ${opp.length} attacking left`} className="block">
          <rect x="0.5" y="0.5" width="199" height="84" rx="28" fill="#1C2026" stroke="#3F3F46" strokeWidth="0.8" />
          <polygon points="189,31 158,35 158,50 189,54" fill="#E23A4C" fillOpacity="0.12" stroke="#E23A4C" strokeOpacity="0.5" strokeWidth="0.4" strokeDasharray="1.5 1" />
          <polygon points="11,31 42,35 42,50 11,54" fill="#FFFFFF" fillOpacity="0.04" stroke="#71717A" strokeOpacity="0.6" strokeWidth="0.4" strokeDasharray="1.5 1" />
          <line x1="11" y1="4" x2="11" y2="81" stroke="#C52032" strokeWidth="0.5" strokeOpacity="0.8" />
          <line x1="189" y1="4" x2="189" y2="81" stroke="#C52032" strokeWidth="0.5" strokeOpacity="0.8" />
          <line x1="75" y1="0.5" x2="75" y2="84.5" stroke="#4A6FA5" strokeWidth="1.2" />
          <line x1="125" y1="0.5" x2="125" y2="84.5" stroke="#4A6FA5" strokeWidth="1.2" />
          <line x1="100" y1="0.5" x2="100" y2="84.5" stroke="#C52032" strokeWidth="1" strokeOpacity="0.7" />
          <circle cx="100" cy="42.5" r="15" fill="none" stroke="#4A6FA5" strokeWidth="0.5" />
          {[[31, 20.5], [31, 64.5], [169, 20.5], [169, 64.5]].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="15" fill="none" stroke="#C52032" strokeWidth="0.4" strokeOpacity="0.55" />
          ))}
          <path d="M189 38.5 h-4.5 a4 4 0 0 0 0 8 h4.5 z" fill="#4A6FA5" fillOpacity="0.35" />
          <path d="M11 38.5 h4.5 a4 4 0 0 1 0 8 h-4.5 z" fill="#4A6FA5" fillOpacity="0.35" />
          <rect x="189" y="39.5" width="3.3" height="6" fill="none" stroke="#D4D4D8" strokeWidth="0.5" />
          <rect x="7.7" y="39.5" width="3.3" height="6" fill="none" stroke="#D4D4D8" strokeWidth="0.5" />
          {opp.map((s, i) =>
            s.goal ? (
              <circle key={`o${i}`} cx={s.x} cy={s.y} r="3.4" fill="#E4E4E7" stroke="#0D0D0E" strokeWidth="0.8" />
            ) : (
              <circle key={`o${i}`} cx={s.x} cy={s.y} r="2.2" fill="none" stroke="#B4B4BC" strokeWidth="0.9" />
            ),
          )}
          {ott.map((s, i) =>
            s.goal ? (
              <circle key={`s${i}`} cx={s.x} cy={s.y} r="3.4" fill="#D9AE45" stroke="#0D0D0E" strokeWidth="0.8" />
            ) : (
              <circle key={`s${i}`} cx={s.x} cy={s.y} r="2.2" fill="#E23A4C" />
            ),
          )}
        </svg>
        <div className="mt-2.5 flex flex-wrap gap-x-3.5 gap-y-1.5 text-xs text-muted">
          <span className="flex items-center gap-1.5"><span className="size-[9px] rounded-full bg-sens-bright" />OTT shot</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded-full bg-gold-bright" />OTT goal</span>
          <span className="flex items-center gap-1.5"><span className="size-[9px] rounded-full border-[1.5px] border-[#B4B4BC]" />{oppAbbrev} shot</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded-full bg-[#E4E4E7]" />{oppAbbrev} goal</span>
          <span className="flex items-center gap-1.5"><span className="h-[9px] w-3.5 border border-dashed border-sens-bright" />High-danger zone</span>
        </div>
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-2.5">
        <Tally label="High-danger shots" ott={ott.filter((s) => s.hd).length} opp={opp.filter((s) => s.hd).length} oppAbbrev={oppAbbrev} />
        <Tally label="Shots on goal" ott={ott.length} opp={opp.length} oppAbbrev={oppAbbrev} />
      </div>
    </>
  );
}

function Tally({ label, ott, opp, oppAbbrev }: { label: string; ott: number; opp: number; oppAbbrev: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-3.5 py-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-display text-[32px] font-extrabold leading-none text-sens-text">{ott}</span>
        <span className="text-[13px] text-muted">OTT</span>
        <span className="ml-2 font-display text-[32px] font-extrabold leading-none text-ink-2">{opp}</span>
        <span className="text-[13px] text-muted">{oppAbbrev}</span>
      </div>
    </div>
  );
}
