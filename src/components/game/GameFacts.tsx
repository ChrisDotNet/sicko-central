"use client";

import type { Skater } from "@/lib/game";
import type { Fact } from "@/lib/facts-shared";
import { pickFacts } from "@/lib/facts-shared";

// "Did you know": the three best game-day facts, before puck drop and at intermissions.
export function GameFacts({ facts, skaters, className = "" }: { facts: Fact[]; skaters: Skater[]; className?: string }) {
  const shown = pickFacts(facts, skaters);
  if (shown.length === 0) return null;
  return (
    <section className={`px-4 pt-6 ${className}`}>
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl font-bold uppercase tracking-wider">Did you know</h2>
        <span className="text-xs text-muted">From NHL stats</span>
      </div>
      <ol className="flex flex-col gap-2">
        {shown.map((f, i) => (
          <li key={f.key} className="flex gap-2.5 rounded-xl border border-line bg-surface px-3 py-2.5">
            <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-line text-xs font-extrabold text-gold-text">
              {i + 1}
            </span>
            <span className="text-sm leading-snug">{f.text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
