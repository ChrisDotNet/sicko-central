"use client";

import { useState } from "react";
import type { Goal, LiveGame } from "@/lib/game";
import { periodLabel } from "@/lib/format";
import { unlockSfx } from "@/lib/sfx";
import { openLiveRadio } from "@/lib/media-bus";
import { useFavourites } from "@/lib/favourites";
import { goalToReelItem, strengthTag } from "./GoalReplays";
import { preloadClipPlayer } from "./ClipPlayer";
import { ClipDialog, nextReelSession } from "../video/ClipDialog";
import type { Reel } from "../video/ClipDialog";

// Shown in place of "Right now" during an intermission: the period that just ended in one
// screen. That's when people pick the phone up, so everything here is a catch-up.

const ordinalWord = (n: number) => (n === 1 ? "one" : n === 2 ? "two" : n === 3 ? "three" : periodLabel(n));

function minutesLeft(clock: string): number | null {
  const [m, s] = clock.split(":").map(Number);
  if (Number.isNaN(m)) return null;
  const secs = m * 60 + (s || 0);
  return secs > 0 ? Math.ceil(secs / 60) : null;
}

const pct = (won: number, total: number) => (total ? `${Math.round((won / total) * 100)}%` : "–");

export function IntermissionCard({ game, radio }: { game: LiveGame; radio: boolean }) {
  const favs = useFavourites();
  const [reel, setReel] = useState<Reel | null>(null);
  const n = game.period;
  const label = periodLabel(n);
  const opp = game.opp.abbrev;
  const p = game.periods.find((x) => x.period === n);
  const lines = game.periodLines.find((x) => x.period === n);
  const inPeriod = game.goals.filter((g) => g.period === n);
  const ready = game.goals.filter((g) => g.clipId);
  const back = minutesLeft(game.clock);

  // Power plays in the period: opportunities from minor and major penalties, goals from strength.
  const pens = game.penalties.filter((x) => x.period === n && (x.minutes === 2 || x.minutes === 5));
  const ppOtt = `${inPeriod.filter((g) => g.team === "OTT" && g.strength === "PP").length}/${pens.filter((x) => x.team === "OPP").length}`;
  const ppOpp = `${inPeriod.filter((g) => g.team === "OPP" && g.strength === "PP").length}/${pens.filter((x) => x.team === "OTT").length}`;

  const lead =
    game.ott.score === game.opp.score
      ? `Tied ${game.ott.score}–${game.opp.score}`
      : game.ott.score > game.opp.score
        ? `Sens lead ${game.ott.score}–${game.opp.score}`
        : `Sens trail ${game.ott.score}–${game.opp.score}`;
  const periodGoals = { ott: inPeriod.filter((g) => g.team === "OTT").length, opp: inPeriod.length - inPeriod.filter((g) => g.team === "OTT").length };
  const sub =
    inPeriod.length === 0
      ? `No goals in the ${label}.`
      : `The ${label} went ${periodGoals.ott}–${periodGoals.opp}${periodGoals.ott > periodGoals.opp ? " for Ottawa" : periodGoals.ott < periodGoals.opp ? ` for ${opp}` : ""}.`;

  const stats = [
    { v: p ? `${p.ottSog}–${p.oppSog}` : "–", l: "Shots on goal" },
    { v: p ? `${p.ottAtt}–${p.oppAtt}` : "–", l: "Shot attempts" },
    { v: p ? `${p.ottHd}–${p.oppHd}` : "–", l: "High-danger" },
    { v: ppOtt, l: "Sens power play" },
    { v: ppOpp, l: `${opp} power play` },
    { v: p ? pct(p.ottFo, p.fo) : "–", l: "Faceoffs won" },
  ];

  // Who stood out: points first, then the most shots, hits and blocks (one line per player),
  // then the goalie.
  const standouts: Array<{ id: number; name: string; detail: string }> = [];
  const used = new Set<number>();
  const sk = lines?.skaters ?? [];
  const add = (s: (typeof sk)[number] | undefined, detail: string) => {
    if (!s || used.has(s.id) || standouts.length >= 3) return;
    used.add(s.id);
    standouts.push({ id: s.id, name: s.name, detail });
  };
  const plural = (x: number, one: string, many = `${one}s`) => `${x} ${x === 1 ? one : many}`;
  for (const s of [...sk].filter((x) => x.g + x.a > 0).sort((a, b) => b.g * 2 + b.a - (a.g * 2 + a.a))) {
    add(s, [s.g ? plural(s.g, "goal") : "", s.a ? plural(s.a, "assist") : ""].filter(Boolean).join(", ") + (s.sog ? ` · ${plural(s.sog, "shot")}` : ""));
  }
  const top = (k: "sog" | "hits" | "blocks") => [...sk].filter((x) => x[k] >= 2 && !used.has(x.id)).sort((a, b) => b[k] - a[k])[0];
  add(top("sog"), plural(top("sog")?.sog ?? 0, "shot"));
  add(top("hits"), plural(top("hits")?.hits ?? 0, "hit"));
  add(top("blocks"), `${plural(top("blocks")?.blocks ?? 0, "blocked shot")}`);
  const goalie = lines?.goalie;

  const openReel = (goals: Goal[], start: number, playAll: boolean) => {
    if (playAll) unlockSfx();
    setReel({ items: goals.map(goalToReelItem), start, playAll, session: nextReelSession() });
  };
  const fav = (g: Goal) => (g.scorerId != null && favs.has(g.scorerId)) || g.assistIds.some((id) => favs.has(id));

  return (
    <div className="rounded-2xl border border-gold-line bg-gold-ground p-4" aria-live="polite">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-widest text-gold-text">{label} intermission</span>
        {back && <span className="rounded-full bg-ground px-2.5 py-1 text-xs font-bold">Back in about {back} min</span>}
      </div>
      <h2 className="mt-2 font-display text-[30px] font-extrabold leading-[1.05] tracking-wide">
        {lead} after {ordinalWord(n)}
      </h2>
      <p className="mt-1 text-sm text-ink-2">{sub}</p>

      <h3 className="mt-4 text-[11px] font-bold uppercase tracking-widest text-muted">The {label} period</h3>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <div key={s.l} className="rounded-xl bg-ground px-2.5 py-2">
            <div className="font-display text-[22px] font-extrabold leading-none">{s.v}</div>
            <div className="mt-0.5 text-[11px] leading-snug text-muted">{s.l}</div>
          </div>
        ))}
      </div>

      <h3 className="mt-4 text-[11px] font-bold uppercase tracking-widest text-muted">Goals this period</h3>
      {inPeriod.length === 0 ? (
        <p className="mt-2 text-sm text-muted">None.</p>
      ) : (
        <div className="mt-2 flex flex-col gap-1.5">
          {inPeriod.map((g) => {
            const idx = ready.indexOf(g);
            return (
              <div key={g.id} className={`flex items-center gap-2.5 rounded-xl bg-ground px-3 py-2 ${fav(g) ? "shadow-[inset_3px_0_0_var(--gold)]" : ""}`}>
                <span className={`rounded px-1.5 py-px text-[11px] font-bold ${g.team === "OTT" ? "bg-gold text-ground" : "bg-line-strong text-ink"}`}>{g.teamAbbrev}</span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-bold">
                    {g.scorerId != null && favs.has(g.scorerId) && <span className="text-gold-text">★ </span>}
                    {g.scorer}
                    {g.scorerTotal ? ` (${g.scorerTotal})` : ""}
                    {strengthTag(g)}
                  </span>
                  <span className="truncate text-xs text-muted">
                    {g.time} · {g.assists.length ? g.assists.join(", ") : "Unassisted"} · {g.scoreAfter}
                  </span>
                </span>
                {g.clipId ? (
                  <button
                    type="button"
                    aria-label={`Play ${g.scorer} goal`}
                    onPointerDown={preloadClipPlayer}
                    onClick={() => openReel(ready, idx, false)}
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-line text-ink"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5l11 7-11 7z" /></svg>
                  </button>
                ) : (
                  <span className="shrink-0 text-[11px] text-muted">Replay soon</span>
                )}
              </div>
            );
          })}
        </div>
      )}
      {ready.length > 0 && (
        <button
          type="button"
          onPointerDown={preloadClipPlayer}
          onClick={() => openReel(ready, 0, true)}
          className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-sens text-sm font-bold text-white"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5l12 7-12 7z" /></svg>
          Catch up: {ready.length === 1 ? "the goal so far" : `all ${ready.length} goals so far`}
        </button>
      )}

      {(standouts.length > 0 || goalie) && (
        <>
          <h3 className="mt-4 text-[11px] font-bold uppercase tracking-widest text-muted">Sens who stood out in the {label}</h3>
          <div className="mt-2 flex flex-col gap-1.5 text-sm">
            {standouts.map((s) => (
              <div key={s.id} className="flex items-baseline justify-between gap-3">
                <span className="font-bold">
                  {favs.has(s.id) && <span className="text-gold-text">★ </span>}
                  {s.name}
                </span>
                <span className="text-right text-[13px] text-ink-2">{s.detail}</span>
              </div>
            ))}
            {goalie && goalie.shots > 0 && (
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-bold">{goalie.name}</span>
                <span className="text-[13px] text-ink-2">
                  {goalie.saves} {goalie.saves === 1 ? "save" : "saves"} on {goalie.shots}
                </span>
              </div>
            )}
          </div>
        </>
      )}

      {radio && (
        <button
          type="button"
          onClick={openLiveRadio}
          className="mt-4 flex min-h-11 w-full items-center gap-3 rounded-xl border border-sens-line bg-sens-ground px-3 text-left"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sens-bright text-white">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5l11 7-11 7z" /></svg>
          </span>
          <span className="flex flex-col">
            <span className="text-sm font-bold">TSN 1200 intermission show</span>
            <span className="text-xs text-muted">Live now: tap play in the radio strip</span>
          </span>
        </button>
      )}

      <ClipDialog reel={reel} noun="goal" onClose={() => setReel(null)} />
    </div>
  );
}
