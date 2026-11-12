"use client";

import { useState } from "react";

type Range = { label: string; tiles: Array<{ label: string; value: string; highlight: boolean }> };

export function PlayerStats({ ranges, notes }: { ranges: Range[]; notes: string[] }) {
  const [idx, setIdx] = useState(0);
  const range = ranges[idx];
  return (
    <>
      <div role="group" aria-label="Stat range" className="mb-3 flex gap-1.5">
        {ranges.map((r, i) => (
          <button
            key={r.label}
            type="button"
            aria-pressed={i === idx}
            onClick={() => setIdx(i)}
            className={`min-h-11 flex-1 rounded-xl border text-sm font-semibold ${
              i === idx ? "border-ink bg-ink text-ground" : "border-line-strong text-ink-2"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {range.tiles.map((t) => (
          <div key={t.label} className="flex flex-col gap-0.5 rounded-xl border border-line bg-surface p-3">
            <span className="text-xs text-muted">{t.label}</span>
            <span className={`font-display text-3xl font-extrabold leading-tight ${t.highlight ? "text-sens-text" : "text-ink"}`}>{t.value}</span>
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-xs text-muted">{notes[idx]}</p>
    </>
  );
}
