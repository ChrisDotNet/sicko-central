"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Goal } from "@/lib/game";
import type { GameVideo, VideoItem } from "@/lib/video";
import { periodLabel } from "@/lib/format";
import { strengthTag } from "../game/GoalReplays";
import { ClipPlayer, preloadClipPlayer } from "../game/ClipPlayer";
import type { ClipPlayerHandle } from "../game/ClipPlayer";
import { Thumb } from "../media/Thumb";
import { YouTubePlayer, preloadYouTube } from "./YouTubePlayer";

// The Video tab as a watch page: one player and a playlist, on every screen size.
// - Phone: the player sits at the top and stays there while the playlist scrolls under it.
// - Tablet: the same, with the playlist in two columns.
// - Desktop: player on the left, playlist on the right.
// The player only loads on the first play, so opening the tab costs nothing.
// One video at a time: tap an item, or step with the back and forward buttons. There's no
// auto-play: TSN's and Sportsnet's players don't say when a video ends, so it could never
// work across every source. NHL clips play in the NHL's player, Sens TV in YouTube's, TSN and
// Sportsnet in their own embedded players (ads and all), all in the same spot.

type Section = "full" | "senstv" | "tsn" | "goals" | "highlights" | "sportsnet";
// NHL clips are keyed by their positive clip id; TSN and Sportsnet videos by their negated id;
// Sens TV videos by their position (negative, below -1e12 so they can't meet a TSN id).
type Entry = {
  clipId: number;
  section: Section;
  title: string;
  sub: string;
  thumb?: string | null;
  url?: string;
  team?: string;
  ott?: boolean;
  badge?: string;
  embedUrl?: string;
  source?: "TSN" | "Sportsnet" | "YouTube";
  ytId?: string; // Sens TV: plays in YouTube's player
  published?: string; // TSN, Sportsnet and Sens TV: when it was posted
  phase?: Phase;
  external?: boolean; // opens on the source's site instead (and auto-play skips it)
};

function length(sec: number | null) {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  return `${m}:${String(Math.round(sec % 60)).padStart(2, "0")}`;
}

type Phase = "pre" | "in" | "post";
const PHASES: Phase[] = ["pre", "in", "post"];
const PHASE_TITLES: Record<Phase, string> = { pre: "Pregame", in: "In game", post: "Postgame" };
// Sources within each phase, in order.
const PHASE_SECTIONS: Record<Phase, Section[]> = {
  pre: ["senstv", "tsn", "sportsnet"],
  in: ["goals", "highlights", "tsn", "sportsnet"],
  post: ["full", "senstv", "tsn", "sportsnet"],
};
// Clips TSN or Sportsnet post within this long of puck drop count as in-game.
const IN_GAME_MS = 2.5 * 3600_000;

const SECTION_TITLES: Record<Section, string> = {
  full: "Full game",
  senstv: "Sens TV",
  tsn: "TSN",
  goals: "Goals in order",
  highlights: "Other highlights",
  sportsnet: "Sportsnet",
};
const NOW_LABEL: Record<Section, string> = { full: "Full game", senstv: "Sens TV", tsn: "TSN", goals: "Goals", highlights: "Highlights", sportsnet: "Sportsnet" };

const Play = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5l11 7-11 7z" /></svg>
);

export function VideoTab({
  video,
  goals,
  isFinal,
  note,
  pending,
  startTimeUTC,
}: {
  video: GameVideo | null;
  goals: Goal[];
  isFinal: boolean;
  note?: string;
  // A clip to play right away, e.g. from a "replay ready" alert. `n` changes on each request.
  pending?: { clipId: number; n: number } | null;
  // Puck drop: splits the playlist into pregame, in-game and postgame.
  startTimeUTC: string;
}) {
  const [currentId, setCurrentId] = useState<number | null>(null);
  // The NHL player, once started (`n` remounts it, e.g. after watching a TSN video).
  const [playing, setPlaying] = useState<{ start: number; n: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const [handled, setHandled] = useState(0);
  const [wanted, setWanted] = useState<number | null>(null);
  const [jump, setJump] = useState<{ index: number; n: number } | null>(null);
  const player = useRef<ClipPlayerHandle>(null);


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
      .filter((g) => g.clipId)
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
    const tsn: Entry[] = (video?.tsn ?? []).map((v) => ({
      clipId: -Number(v.id),
      section: "tsn",
      title: v.title,
      sub: `${length(v.seconds)}${v.seconds ? " · " : ""}TSN`,
      thumb: v.thumb,
      url: v.url,
      badge: length(v.seconds),
      embedUrl: v.embedUrl,
      source: "TSN" as const,
      published: v.published,
    }));
    const sn: Entry[] = (video?.sportsnet ?? []).map((v) => ({
      clipId: -Number(v.id),
      section: "sportsnet",
      title: v.title,
      sub: `${length(v.seconds)}${v.seconds ? " · " : ""}Sportsnet`,
      thumb: v.thumb,
      url: v.url,
      badge: length(v.seconds),
      embedUrl: v.embedUrl,
      source: "Sportsnet" as const,
      published: v.published,
    }));
    const tv: Entry[] = (video?.senstv ?? []).map((v, i) => ({
      clipId: -1e12 - i,
      section: "senstv",
      title: v.title,
      sub: `${length(v.seconds)}${v.seconds ? " · " : ""}Sens TV`,
      thumb: v.thumb,
      url: v.url,
      badge: length(v.seconds),
      source: "YouTube" as const,
      published: v.published,
      // Videos the club doesn't let other sites play open on YouTube instead.
      ...(v.embeddable === false ? { external: true } : { ytId: v.id }),
    }));
    // Playlist order: pregame, in game, postgame; by source within each, then by time.
    const start = Date.parse(startTimeUTC);
    const phaseOf = (e: Entry): Phase => {
      if (e.section === "full") return "post";
      if (e.section === "goals" || e.section === "highlights") return "in";
      const t = e.published ? Date.parse(e.published) : NaN;
      if (Number.isNaN(t) || Number.isNaN(start)) return "post";
      if (t < start) return "pre";
      // TSN and Sportsnet post the odd clip during the game; the club's videos come after it.
      return e.section !== "senstv" && t < start + IN_GAME_MS ? "in" : "post";
    };
    const all = [...full, ...tv, ...tsn, ...goalEntries, ...hl, ...sn].map((e) => ({ ...e, phase: phaseOf(e) }));
    const rank = (e: Entry) => PHASES.indexOf(e.phase!) * 10 + PHASE_SECTIONS[e.phase!].indexOf(e.section);
    // Stable sort keeps goal order and NHL order; dated videos go oldest first.
    return all
      .map((e, i) => ({ e, i }))
      .sort((a, b) => rank(a.e) - rank(b.e) || (a.e.published && b.e.published ? a.e.published.localeCompare(b.e.published) : a.i - b.i))
      .map((x) => x.e);
  }, [video, goals, startTimeUTC]);

  const waiting = goals.filter((g) => !g.clipId);
  const pos = currentId == null ? -1 : entries.findIndex((e) => e.clipId === currentId);
  const current = pos >= 0 ? entries[pos] : null;
  // What the poster offers before anything plays: the first full-game video, else the latest goal.
  const suggested = entries.find((e) => e.section === "full") ?? [...entries].reverse().find((e) => e.section === "goals") ?? entries[0] ?? null;
  const shown = current ?? suggested;
  // The NHL player steps through NHL clips only.
  const nhl = useMemo(() => entries.filter((e) => !e.embedUrl && !e.ytId && !e.external), [entries]);
  const tsnNow = current?.embedUrl ? current : null; // TSN or Sportsnet frame
  const ytNow = current?.ytId ? current : null;
  const otherPlayer = !!(tsnNow || ytNow);
  // A Sens TV run (`n` restarts YouTube's player, even for the same video).
  const [ytRun, setYtRun] = useState(0);

  const play = (clipId: number) => {
    const e = entries.find((x) => x.clipId === clipId);
    if (!e) return;
    if (e.external) {
      if (e.url) window.open(e.url, "_blank", "noopener,noreferrer");
      return;
    }
    setFailed(false);
    setCurrentId(clipId);
    if (e.ytId) {
      setYtRun((n) => n + 1);
      return;
    }
    if (e.embedUrl) return; // shown in TSN's or Sportsnet's player
    const i = nhl.findIndex((x) => x.clipId === clipId);
    // Already showing the NHL player: switch clips straight from the tap (keeps iPhone happy).
    if (playing && player.current && !otherPlayer) player.current.goTo(i);
    else setPlaying({ start: i, n: (playing?.n ?? 0) + 1 });
  };

  // Alerts ask for a clip by id (state adjusted during render, not in an effect).
  if (pending && pending.n !== handled) {
    setHandled(pending.n);
    setWanted(pending.clipId);
  }
  if (wanted != null) {
    const i = nhl.findIndex((e) => e.clipId === wanted);
    if (i >= 0) {
      setWanted(null);
      setFailed(false);
      setCurrentId(wanted);
      if (playing && !otherPlayer) setJump({ index: i, n: (jump?.n ?? 0) + 1 });
      else setPlaying({ start: i, n: (playing?.n ?? 0) + 1 });
    } else {
      setWanted(null);
    }
  }
  useEffect(() => {
    if (jump) player.current?.goTo(jump.index);
  }, [jump]);

  const items = useMemo(() => nhl.map((e) => ({ clipId: e.clipId, title: e.team ? `${e.team} · ${e.title}` : e.title, sub: e.sub })), [nhl]);
  const onIndex = useCallback((i: number) => {
    setCurrentId(items[i]?.clipId ?? null);
    setFailed(false);
  }, [items]);
  const noop = useCallback(() => {}, []);
  const onError = useCallback(() => setFailed(true), []);


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
      <div className="sticky top-[env(safe-area-inset-top)] z-10 -mx-4 bg-ground pb-3 md:mx-0 lg:top-4">
        <div className={`relative w-full overflow-hidden bg-black md:rounded-2xl md:border md:border-line ${playing && !otherPlayer ? "" : "aspect-video"}`}>
          {ytNow?.ytId ? (
            <YouTubePlayer key={`${ytNow.ytId}-${ytRun}`} videoId={ytNow.ytId} onEnded={noop} onError={onError} />
          ) : tsnNow ? (
            <iframe
              key={tsnNow.clipId}
              src={tsnNow.embedUrl}
              title={`${tsnNow.title} (${tsnNow.source} video)`}
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
              scrolling="no"
              className="absolute inset-0 size-full overflow-hidden border-0"
            />
          ) : playing ? (
            <div>
              <ClipPlayer
                key={playing.n}
                ref={player}
                items={items}
                start={playing.start}
                autoAdvance={false}
                onIndex={onIndex}
                onDone={noop}
                onError={onError}
              />
            </div>
          ) : (
            shown && (
              <button
                type="button"
                onPointerDown={shown.ytId ? preloadYouTube : preloadClipPlayer}
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
                {current ? `Now playing · ${NOW_LABEL[current.section]}` : "Ready to play"}
              </div>
              <div className="truncate font-display text-xl font-extrabold leading-tight tracking-wide lg:text-[28px]">
                {shown.team ? `${shown.team} · ` : ""}
                {shown.title}
              </div>
              <div className="text-xs text-muted">
                {/* The source becomes a link while a clip plays, so it isn't named twice. */}
                {current?.url ? shown.sub.replace(/(^| · )(NHL\.com|TSN|Sportsnet|Sens TV)$/, "") : shown.sub}
                {failed && <span className="text-sens-text"> · Wouldn&apos;t load here.</span>}
                {current?.url && (
                  <>
                    {shown.sub.replace(/(^| · )(NHL\.com|TSN|Sportsnet|Sens TV)$/, "") ? " · " : ""}
                    <a href={current.url} target="_blank" rel="noopener noreferrer" className="underline">
                      {current.source ?? (failed ? "Open on NHL.com" : "NHL.com")}
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
      </div>

      {/* Playlist */}
      <aside aria-label="Playlist" className="pt-2 lg:rounded-2xl lg:border lg:border-line lg:bg-sunk lg:p-2">
        {note && <p className="mx-0 mb-3 rounded-xl border border-line bg-surface p-3 text-sm text-muted">{note}</p>}
        {PHASES.map((phase) => {
          const inPhase = entries.filter((e) => e.phase === phase);
          if (inPhase.length === 0 && !(phase === "in" && waiting.length)) return null;
          return (
            <div key={phase} className="pt-4 first:pt-1">
              <h2 className="px-1.5 font-display text-xl font-bold uppercase tracking-wider">{PHASE_TITLES[phase]}</h2>
        {PHASE_SECTIONS[phase].map((sec) => {
          const list = inPhase.map((e) => ({ e })).filter((x) => x.e.section === sec);
          const pendingGoals = sec === "goals" ? waiting : [];
          if (list.length === 0 && pendingGoals.length === 0) return null;
          return (
            <section key={sec} className="pt-2">
              <div className="flex items-center justify-between gap-2 px-1.5 pb-1.5">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted">{SECTION_TITLES[sec]}</h3>
              </div>
              <div className="grid gap-1 md:grid-cols-2 lg:grid-cols-1">
                {list.map(({ e }) => {
                  const on = e.clipId === currentId;
                  return (
                    <button
                      key={e.clipId}
                      type="button"
                      aria-current={on ? "true" : undefined}
                      onPointerDown={e.ytId ? preloadYouTube : preloadClipPlayer}
                      onClick={() => play(e.clipId)}
                      className={`flex items-center gap-3 rounded-xl border p-1.5 text-left ${on ? "border-gold-line bg-gold-ground" : "border-transparent hover:bg-surface-2"}`}
                    >
                      <span className="relative shrink-0">
                        <Thumb src={e.thumb} className="aspect-video w-28" />
                        {e.team && (
                          <span className={`absolute top-1 left-1 rounded px-1 text-[10px] font-bold ${e.ott ? "bg-gold text-ground" : "bg-line-strong text-ink"}`}>{e.team}</span>
                        )}
                        {e.source && (
                          <span
                            className={`absolute top-1 left-1 rounded px-1 text-[10px] font-bold ${
                              e.source === "TSN" ? "bg-sens text-white" : e.source === "Sportsnet" ? "bg-[#1f4e99] text-white" : "bg-gold text-ground"
                            }`}
                          >
                            {e.source === "TSN" ? "TSN" : e.source === "Sportsnet" ? "SN" : "SENS TV"}
                          </span>
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
            </div>
          );
        })}
      </aside>
    </div>
  );
}
