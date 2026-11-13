"use client";

import { useEffect, useState } from "react";

function left(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// "Puck drop in 3:12:40", ticking. Hidden once the scheduled time passes.
export function Countdown({ startTimeUTC }: { startTimeUTC: string }) {
  const start = Date.parse(startTimeUTC);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  // Rendered after load only, so the server and browser clocks never disagree.
  if (now == null || now >= start) return null;
  return (
    <div className="mx-3.5 mb-3 flex items-center justify-between gap-3 rounded-xl border border-gold-line bg-ground px-3 py-2 md:mx-5">
      <span className="text-xs text-muted">Puck drop in</span>
      <span className="font-display text-2xl font-extrabold tabular-nums tracking-wide text-gold-text" role="timer">
        {left(start - now)}
      </span>
    </div>
  );
}
