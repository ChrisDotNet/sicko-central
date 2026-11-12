"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LiveGame } from "@/lib/game";
import type { RivalGame } from "@/lib/rivals";
import { periodLabel } from "@/lib/format";
import { Section } from "../ui";
import { GameSections } from "./GameSections";

type Payload = { game: LiveGame; rivals: RivalGame[] };

const LIVE_POLL_MS = 15_000;
const PRE_POLL_MS = 60_000;
// Replay speed: one minute of game time every 3 seconds (a full game in about 3 minutes).
const REPLAY_STEP = 60;
const REPLAY_TICK_MS = 3_000;
const GAME_END = 3900;

export function LiveCompanion({ gameId, initial, replay }: { gameId: number; initial: Payload | null; replay: boolean }) {
  const [data, setData] = useState<Payload | null>(initial);
  const [error, setError] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [t, setT] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<Payload | null>(initial);

  const load = useCallback(
    async (at?: number) => {
      try {
        const qs = at != null ? `?t=${at}` : "";
        const res = await fetch(`/api/game/${gameId}${qs}`, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const next = (await res.json()) as Payload;
        latest.current = next;
        setData(next);
        setError(false);
        setUpdatedAt(Date.now());
      } catch {
        setError(true);
      }
    },
    [gameId],
  );

  // Live polling: every 15 s during the game, every 60 s before it, stop after the final.
  useEffect(() => {
    if (replay) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      if (document.visibilityState === "visible") await load();
      if (cancelled) return;
      const g = latest.current?.game;
      if (!g?.isFinal) timer.current = setTimeout(tick, g?.isPre ? PRE_POLL_MS : LIVE_POLL_MS);
    };
    if (!initial?.game.isFinal) timer.current = setTimeout(tick, initial ? LIVE_POLL_MS : 0);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [replay, load, initial]);

  // Replay mode: step game time forward and fetch the game as it stood at that moment.
  useEffect(() => {
    if (!replay) return;
    const id = setTimeout(() => void load(t), 0);
    return () => clearTimeout(id);
  }, [replay, t, load]);

  useEffect(() => {
    if (!replay || paused || t >= GAME_END) return;
    const id = setTimeout(() => setT((x) => Math.min(GAME_END, x + REPLAY_STEP)), REPLAY_TICK_MS);
    return () => clearTimeout(id);
  }, [replay, paused, t]);

  // "Updated 12 s ago" ticker.
  useEffect(() => {
    if (replay) return;
    const id = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(id);
  }, [replay]);

  if (!data) {
    return (
      <div className="mx-4 mt-6 rounded-2xl border border-line bg-surface p-4 text-sm text-ink-2">
        {error ? "Can't reach the game feed right now. Retrying…" : "Loading the game…"}
      </div>
    );
  }

  const { game, rivals } = data;
  const ago = updatedAt && now ? Math.max(0, Math.round((now - updatedAt) / 1000)) : null;

  return (
    <>
      {replay && (
        <section className="px-4 pt-3">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-gold-line bg-gold-ground px-3 py-2 text-xs text-gold-text">
            <span className="font-bold tracking-wider">REPLAY MODE</span>
            <span className="text-ink-2">Game time {Math.floor(t / 60)}:00</span>
            <div className="ml-auto flex gap-1.5">
              <button type="button" onClick={() => setPaused((p) => !p)} className="min-h-9 rounded-lg border border-gold-line px-2.5 font-semibold text-ink">
                {paused ? "Play" : "Pause"}
              </button>
              {[1200, 2400].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setT(s);
                    setPaused(true);
                  }}
                  className="min-h-9 rounded-lg border border-gold-line px-2.5 font-semibold text-ink">
                  End of {s === 1200 ? "1st" : "2nd"}
                </button>
              ))}
              <Link href="/live" className="flex min-h-9 items-center rounded-lg border border-gold-line px-2.5 font-semibold text-ink">
                Exit
              </Link>
            </div>
          </div>
        </section>
      )}

      <section aria-label="Game status" className="px-4 pt-2.5">
        <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2">
          {game.isLive && (
            <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-widest text-sens-text">
              <span className="size-1.5 rounded-full bg-sens-bright" />
              LIVE
            </span>
          )}
          {game.isFinal && <span className="text-[11px] font-bold tracking-widest text-muted">FINAL</span>}
          <span className="font-display text-[19px] font-extrabold tracking-wide">
            {game.isPre
              ? `OTT ${game.ott.isHome ? "vs" : "at"} ${game.opp.abbrev}`
              : `OTT ${game.ott.score} – ${game.opp.score} ${game.opp.abbrev}`}
          </span>
          {game.isPre && <span className="text-[13px] text-muted">Tonight</span>}
          {game.isLive && (
            <span className="text-[13px] text-muted">
              {game.intermission ? `End of ${periodLabel(game.period)}` : `${periodLabel(game.period, game.periodType)} · ${game.clock.replace(/^0/, "")}`}
            </span>
          )}
          {game.strength && (
            <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-bold ${game.strength.team === "OTT" ? "bg-gold text-ground" : "bg-line-strong text-ink"}`}>
              {game.strength.team === "OTT" ? "PP" : `${game.opp.abbrev} PP`}
            </span>
          )}
        </div>
        {game.isLive && !replay && (
          <p className="mt-1.5 text-center text-[11px] text-muted">
            {error ? "Connection hiccup, retrying · " : ago != null ? `Updated ${ago} s ago · ` : ""}
            Runs about 20 s behind TV · check it during stoppages
          </p>
        )}
      </section>

      <GameSections game={game} />

      {rivals.length > 0 && (
        <Section title="Around the Atlantic">
          <div className="flex flex-col gap-2">
            {rivals.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-line bg-surface px-3.5 py-3">
                <span className="font-display text-[19px] font-bold tracking-wide">
                  {r.awayScore != null ? `${r.away} ${r.awayScore} – ${r.homeScore} ${r.home}` : `${r.away} at ${r.home}`}
                </span>
                <span className="text-[13px] text-muted">{r.status}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}
