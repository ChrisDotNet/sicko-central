"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Goal } from "@/lib/game";
import type { GameVideo, VideoItem } from "@/lib/video";
import { periodLabel } from "@/lib/format";
import { unlockSfx } from "@/lib/sfx";
import { strengthTag } from "../game/GoalReplays";
import { ClipPlayer, preloadClipPlayer } from "../game/ClipPlayer";
import type { ClipPlayerHandle } from "../game/ClipPlayer";
import { Thumb } from "../media/Thumb";

// The Video tab as a watch page: one player and a playlist, on every screen size.
// - Phone: the player sits at the top and stays there while the playlist scrolls under it.
// - Tablet: the same, with the playlist in two columns.
// - Desktop: player on the left, playlist on the right.
// The player only loads on the first play, so opening the tab costs nothing.
// Clips play one at a time; with "Play the next clip automatically" ticked, each clip runs
// on into the next one in the list (with the up-next card), the way "Watch all goals" did.

type Section = "full" | "goals" | "highlights";
type Entry = { clipId: number; section: Section; title: string; sub: string; thumb?: string | null; url?: string; team?: string; ott?: boolean; badge?: string };
type Filter = "all" | "ott" | "opp";

function length(sec: number | null) {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  return `${m}:${String(Math.round(sec % 60)).padStart(2, "0")}`;
}

const SECTION_TITLES: Record<Section, string> = { full: "Full game", goals: "Goals in order", highlights: "Other highlights" };

const Play = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5l11 7-11 7z" /></svg>
);

export function VideoTab({
  video,
  goals,
  isFinal,
  note,
  pending,
  oppAbbrev,
}: {
  video: GameVideo | null;
  goals: Goal[];
  isFinal: boolean;
  note?: string;
  // A clip to play right away, e.g. from a "replay ready" alert. `n` changes on each request.
  pending?: { clipId: number; n: number } | null;
  oppAbbrev: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [playing, setPlaying] = useState<{ start: number } | null>(null);
  const [autoNext, setAutoNext] = useState(true);
  const [failed, setFailed] = useState(false);
  const [handled, setHandled] = useState(0);
  const [wanted, setWanted] = useState<number | null>(null);
  const [jump, setJump] = useState<{ index: number; n: number } | null>(null);
  const player = useRef<ClipPlayerHandle>(null);

  const goalOk = useCallback((g: Goal) => filter === "all" || (filter === "ott" ? g.team === "OTT" : g.team !== "OTT"), [filter]);

  // One flat playlist (the player steps through it by position), in section order.
  const entries = useMemo<Entry[]>(() => {
    const full: Entry[] = [...(video?.recaps ?? []), ...(video?.condensed ?? [])].map((v: VideoItem) => ({
      clipId: v.clipId,
      section: "full",
      title: v.title,
      sub: `${length(v.seconds)}${v.seconds ? " · " : ""}NHL.com`,
      thumb: v.thumb,
      url: v.url,
      badge: length(v.seconds),
    }));
    const goalEntries: Entry[] = goals
      .filter((g) => g.clipId && goalOk(g))
      .map((g) => ({
        clipId: g.clipId as number,
        section: "goals",
        title: `${g.scorer}${g.scorerTotal ? ` (${g.scorerTotal})` : ""}${strengthTag(g)}`,
        sub: `${periodLabel(g.period, g.periodType)} ${g.time} · ${g.scoreAfter}`,
        thumb: video?.goalThumbs?.[String(g.clipId)],
        url: g.clipUrl,
        team: g.teamAbbrev,
        ott: g.team === "OTT",
      }));
    const hl: Entry[] = (video?.highlights ?? []).map((v) => ({
      clipId: v.clipId,
      section: "highlights",
      title: v.title,
      sub: length(v.seconds),
      thumb: v.thumb,
      url: v.url,
      badge: length(v.seconds),
    }));
    return [...full, ...goalEntries, ...hl];
  }, [video, goals, goalOk]);

  const waiting = goals.filter((g) => !g.clipId && goalOk(g));
  const pos = currentId == null ? -1 : entries.findIndex((e) => e.clipId === currentId);
  const current = pos >= 0 ? entries[pos] : null;
  // What the poster offers before anything plays: the first full-game video, else the latest goal.
  const suggested = entries.find((e) => e.section === "full") ?? [...entries].reverse().find((e) => e.section === "goals") ?? entries[0] ?? null;
  const shown = current ?? suggested;
  // With the box ticked, whatever is next in the list plays next (after the up-next card).
  const next = pos >= 0 ? entries[pos + 1] : undefined;
  const advances = autoNext && !!current && !!next;

  const play = (clipId: number) => {
    const i = entries.findIndex((e) => e.clipId === clipId);
    if (i < 0) return;
    setFailed(false);
    setCurrentId(clipId);
    // Already showing the player: switch clips straight from the tap (keeps iPhone happy).
    if (playing && player.current) player.current.goTo(i);
    else setPlaying({ start: i });
  };

  // Alerts ask for a clip by id (state adjusted during render, not in an effect). If the
  // team filter hides it, clear the filter first and pick it up on the next render.
  if (pending && pending.n !== handled) {
    setHandled(pending.n);
    setWanted(pending.clipId);
  }
  if (wanted != null) {
    const i = entries.findIndex((e) => e.clipId === wanted);
    if (i >= 0) {
      setWanted(null);
      setFailed(false);
      setCurrentId(wanted);
      if (playing) setJump({ index: i, n: (jump?.n ?? 0) + 1 });
      else setPlaying({ start: i });
    } else if (filter !== "all") {
      setFilter("all");
    } else {
      setWanted(null);
    }
  }
  useEffect(() => {
    if (jump) player.current?.goTo(jump.index);
  }, [jump]);

  const items = useMemo(() => entries.map((e) => ({ clipId: e.clipId, title: e.team ? `${e.team} · ${e.title}` : e.title, sub: e.sub })), [entries]);
  const onIndex = useCallback((i: number) => {
    setCurrentId(items[i]?.clipId ?? null);
    setFailed(false);
  }, [items]);
  const onDone = useCallback(() => {}, []);
  const onError = useCallback(() => setFailed(true), []);

  const goalCount = (f: Filter) => goals.filter((g) => (f === "all" ? true : f === "ott" ? g.team === "OTT" : g.team !== "OTT")).length;
  const sections: Section[] = ["full", "goals", "highlights"];
  const firstGoal = entries.find((e) => e.section === "goals");

  if (entries.length === 0 && waiting.length === 0) {
    return (
      <p className="mx-4 mt-6 rounded-2xl border border-line bg-surface p-4 text-sm text-muted">
        {note ??
          (isFinal
            ? "The recap and condensed game usually post within an hour or two of the final."
            : "Goal replays post a few minutes after each goal; the recap and condensed game after the final.")}
      </p>
    );
  }

  return (
    <div className="px-4 pt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-6">
      {/* Player: pinned to the top of the screen on phones and tablets, and at the top of its column on desktop. */}
      <div className="sticky top-0 z-10 -mx-4 bg-ground pb-3 md:mx-0 lg:top-4">
        <div className={`relative w-full overflow-hidden bg-black md:rounded-2xl md:border md:border-line ${playing ? "" : "aspect-video"}`}>
          {playing ? (
            <div>
              <ClipPlayer
                ref={player}
                items={items}
                start={playing.start}
                autoAdvance={advances}
                onIndex={onIndex}
                onDone={onDone}
                onError={onError}
              />
            </div>
          ) : (
            shown && (
              <button
                type="button"
                onPointerDown={preloadClipPlayer}
                onClick={() => play(shown.clipId)}
                aria-label={`Play ${shown.title}`}
                className="absolute inset-0 block"
              >
                <span className="absolute inset-0">
                  <Thumb src={shown.thumb} square className="size-full" />
                </span>
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex size-16 items-center justify-center rounded-full bg-sens text-white shadow-lg lg:size-20"><Play size={26} /></span>
                </span>
              </button>
            )
          )}
        </div>
        {shown && (
          <div className="flex items-start gap-3 px-4 pt-2.5 md:px-0">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold uppercase tracking-widest text-gold-text">
                {current ? `Now playing · ${SECTION_TITLES[current.section].replace(" in order", "")}` : "Ready to play"}
              </div>
              <div className="truncate font-display text-xl font-extrabold leading-tight tracking-wide lg:text-[28px]">
                {shown.team ? `${shown.team} · ` : ""}
                {shown.title}
              </div>
              <div className="text-xs text-muted">
                {/* The source becomes a link while a clip plays, so it isn't named twice. */}
                {current?.url ? shown.sub.replace(/(^| · )NHL\.com$/, "") : shown.sub}
                {failed && <span className="text-sens-text"> · Wouldn&apos;t load here.</span>}
                {current?.url && (
                  <>
                    {current.url && shown.sub.replace(/(^| · )NHL\.com$/, "") ? " · " : ""}
                    <a href={current.url} target="_blank" rel="noopener noreferrer" className="underline">
                      {failed ? "Open on NHL.com" : "NHL.com"}
                    </a>
                  </>
                )}
              </div>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button type="button" aria-label="Previous clip" disabled={pos <= 0} onClick={() => play(entries[pos - 1].clipId)} className="flex size-11 items-center justify-center rounded-xl border border-line-strong disabled:opacity-30">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
              </button>
              <button type="button" aria-label="Next clip" disabled={pos < 0 || pos >= entries.length - 1} onClick={() => play(entries[pos + 1].clipId)} className="flex size-11 items-center justify-center rounded-xl bg-ink text-ground disabled:opacity-30">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
              </button>
            </div>
          </div>
        )}
        <label className="flex min-h-9 items-center gap-2.5 px-4 pt-1 text-xs text-muted md:px-0">
          <input type="checkbox" checked={autoNext} onChange={(e) => setAutoNext(e.target.checked)} className="size-4 accent-[#c52032]" />
          <span>
            Play the next clip automatically
            {advances && next ? (
              <>
                {" · up next: "}
                <b className="font-semibold text-ink">{next.title}</b>
              </>
            ) : null}
          </span>
        </label>
      </div>

      {/* Playlist */}
      <aside aria-label="Playlist" className="pt-2 lg:rounded-2xl lg:border lg:border-line lg:bg-[#121214] lg:p-2">
        {note && <p className="mx-0 mb-3 rounded-xl border border-line bg-surface p-3 text-sm text-muted">{note}</p>}
        {goals.length > 0 && (
          <div role="group" aria-label="Show goals by team" className="flex gap-1.5 pb-1 lg:p-1.5">
            {(["all", "ott", "opp"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className={`min-h-9 flex-1 rounded-full border text-xs font-semibold ${filter === f ? "border-ink bg-ink text-ground" : "border-line-strong text-ink-2"}`}
              >
                {f === "all" ? "All goals" : f === "ott" ? "Sens" : oppAbbrev} · {goalCount(f)}
              </button>
            ))}
          </div>
        )}
        {sections.map((sec) => {
          const list = entries.map((e, i) => ({ e, i })).filter((x) => x.e.section === sec);
          const pendingGoals = sec === "goals" ? waiting : [];
          if (list.length === 0 && pendingGoals.length === 0) return null;
          return (
            <section key={sec} className="pt-3">
              <div className="flex items-center justify-between gap-2 px-1.5 pb-1.5">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted">{SECTION_TITLES[sec]}</h3>
                {sec === "goals" && firstGoal && list.length > 1 && (
                  <button
                    type="button"
                    onPointerDown={preloadClipPlayer}
                    onClick={() => {
                      unlockSfx();
                      setAutoNext(true);
                      play(firstGoal.clipId);
                    }}
                    className="flex min-h-9 items-center gap-1.5 rounded-lg bg-sens px-3 text-xs font-bold text-white"
                  >
                    <Play size={12} /> Play all · about {Math.max(1, Math.round((list.length * 40) / 60))} min
                  </button>
                )}
              </div>
              <div className="grid gap-1 md:grid-cols-2 lg:grid-cols-1">
                {list.map(({ e }) => {
                  const on = e.clipId === currentId;
                  return (
                    <button
                      key={e.clipId}
                      type="button"
                      aria-current={on ? "true" : undefined}
                      onPointerDown={preloadClipPlayer}
                      onClick={() => play(e.clipId)}
                      className={`flex items-center gap-3 rounded-xl border p-1.5 text-left ${on ? "border-gold-line bg-gold-ground" : "border-transparent hover:bg-surface-2"}`}
                    >
                      <span className="relative shrink-0">
                        <Thumb src={e.thumb} className="aspect-video w-28" />
                        {e.team && (
                          <span className={`absolute top-1 left-1 rounded px-1 text-[10px] font-bold ${e.ott ? "bg-gold text-ground" : "bg-line-strong text-ink"}`}>{e.team}</span>
                        )}
                        {e.badge && <span className="absolute right-1 bottom-1 rounded bg-black/70 px-1 text-[10px] font-bold text-white">{e.badge}</span>}
                        {on && (
                          <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/45 text-[10px] font-bold tracking-widest text-white">PLAYING</span>
                        )}
                      </span>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-[13px] font-bold leading-snug">{e.title}</span>
                        <span className="text-xs text-muted">{e.sub}</span>
                      </span>
                    </button>
                  );
                })}
                {pendingGoals.map((g) => (
                  <div key={g.id} className="flex items-center gap-3 rounded-xl p-1.5 opacity-60">
                    <span className="flex aspect-video w-28 shrink-0 items-center justify-center rounded-lg border border-dashed border-line-strong text-[10px] font-semibold text-muted">
                      Replay coming
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-[13px] font-bold leading-snug">
                        {g.teamAbbrev} · {g.scorer}
                        {strengthTag(g)}
                      </span>
                      <span className="text-xs text-muted">
                        {periodLabel(g.period, g.periodType)} {g.time} · {g.scoreAfter}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
        {autoNext && playing && (
          <p className="px-1.5 pt-3 text-[10px] text-muted">
            Slapshot sound between clips: &ldquo;Hockey Puck Slap&rdquo; by jameb32, SoundBible.com,{" "}
            <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener noreferrer" className="underline">
              CC BY 3.0
            </a>
          </p>
        )}
      </aside>
    </div>
  );
}
