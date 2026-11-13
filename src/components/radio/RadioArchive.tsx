"use client";

import { useEffect, useRef, useState } from "react";
import type { RadioEpisode } from "@/lib/radio";
import { onReplay } from "@/lib/media-bus";

function length(sec: number | null) {
  if (!sec) return "";
  const m = Math.round(sec / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
}

function clock(sec: number) {
  if (!Number.isFinite(sec)) return "0:00";
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${r}` : `${m}:${r}`;
}

const SKIP = 30;

// Plays TSN 1200's radio call for one game, from TSN's public podcast feed, in our own player.
// Pauses itself while a goal replay plays, then picks up where it left off.
export function RadioArchive({ episodes, live }: { episodes: RadioEpisode[]; live: boolean }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const pausedForReplay = useRef(false);

  useEffect(
    () =>
      onReplay(
        () => {
          const a = audio.current;
          if (a && !a.paused) {
            a.pause();
            pausedForReplay.current = true;
          }
        },
        () => {
          if (pausedForReplay.current) {
            pausedForReplay.current = false;
            audio.current?.play().catch(() => {});
          }
        },
      ),
    [],
  );

  if (episodes.length === 0) {
    return (
      <p className="rounded-2xl border border-line bg-surface p-4 text-sm text-muted">
        {live
          ? "The radio call for each period shows up here shortly after the period ends."
          : "No TSN 1200 radio for this game yet."}
      </p>
    );
  }

  const current = episodes.find((e) => e.id === currentId) ?? null;

  const toggle = (ep: RadioEpisode) => {
    const a = audio.current;
    if (!a) return;
    pausedForReplay.current = false;
    if (ep.id === currentId) {
      if (a.paused) void a.play().catch(() => {});
      else a.pause();
      return;
    }
    a.src = ep.url;
    setCurrentId(ep.id);
    setTime(0);
    setDur(ep.seconds ?? 0);
    void a.play().catch(() => {});
  };

  const playNext = () => {
    const idx = episodes.findIndex((e) => e.id === currentId);
    const next = episodes[idx + 1];
    if (next) toggle(next);
  };

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        {episodes.map((ep) => {
          const active = ep.id === currentId;
          return (
            <div key={ep.id} className="grid grid-cols-[minmax(0,1fr)_44px] items-center gap-3 border-b border-line px-3.5 py-2.5 last:border-0">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className={`text-sm font-semibold ${active ? "text-gold-text" : ""}`}>{ep.label}</span>
                <span className="text-xs text-muted">{[length(ep.seconds), ep.kind === "period" ? "Radio call" : "TSN 1200"].filter(Boolean).join(" · ")}</span>
              </div>
              <button
                type="button"
                aria-label={active && playing ? `Pause ${ep.label}` : `Play ${ep.label}`}
                onClick={() => toggle(ep)}
                className={`flex size-11 items-center justify-center rounded-full ${active ? "bg-gold text-ground" : "bg-line text-ink"}`}
              >
                {active && playing ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5l11 7-11 7z" /></svg>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {current && (
        <div className="mt-2.5 rounded-2xl border border-gold-line bg-gold-ground p-3.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-bold uppercase tracking-widest text-gold-text">Now playing · {current.label}</span>
            <span className="text-muted tabular">
              {clock(time)} / {clock(dur)}
            </span>
          </div>
          <input
            type="range"
            aria-label="Position"
            min={0}
            max={dur || 1}
            step={1}
            value={Math.min(time, dur || 1)}
            onChange={(e) => {
              const a = audio.current;
              if (a) a.currentTime = Number(e.target.value);
            }}
            className="mt-2.5 w-full accent-[#C2912C]"
          />
          <div className="mt-1.5 flex items-center justify-center gap-3">
            <button type="button" aria-label="Back 30 seconds" onClick={() => audio.current && (audio.current.currentTime -= SKIP)} className="min-h-11 rounded-xl border border-gold-line px-3 text-sm font-semibold">
              −30s
            </button>
            <button type="button" onClick={() => toggle(current)} className="min-h-11 min-w-24 rounded-xl bg-gold px-4 text-sm font-bold text-ground">
              {playing ? "Pause" : "Play"}
            </button>
            <button type="button" aria-label="Forward 30 seconds" onClick={() => audio.current && (audio.current.currentTime += SKIP)} className="min-h-11 rounded-xl border border-gold-line px-3 text-sm font-semibold">
              +30s
            </button>
          </div>
        </div>
      )}

      <audio
        ref={audio}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDur(e.currentTarget.duration || dur)}
        onEnded={() => {
          setPlaying(false);
          playNext();
        }}
      />
      <p className="mt-2 text-xs text-muted">From TSN 1200&apos;s Ottawa Senators Hockey podcast. Pauses automatically while a goal replay plays.</p>
    </>
  );
}
