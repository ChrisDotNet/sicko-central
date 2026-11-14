"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LiveGame } from "@/lib/game";
import type { RivalGame } from "@/lib/rivals";
import type { RadioEpisode } from "@/lib/radio";
import { setRadioOffer } from "@/lib/radio-store";
import { periodLabel } from "@/lib/format";
import { Section } from "../ui";
import { GameSections } from "./GameSections";
import { StreamingMenu, TicketsMenu } from "../GameLinks";
import type { TicketLinks } from "@/lib/tickets";
import { GameTabButtons } from "./GameTabs";
import { mediaKeys, useUnseen } from "@/lib/unseen";
import type { GameTab } from "./GameTabs";
import { MediaTab } from "../media/MediaTab";
import type { MediaSegment } from "./GameTabs";
import type { GameMedia } from "@/lib/media";
import type { GameVideo } from "@/lib/video";
import type { NewsItem } from "@/lib/news";
import { useNotify } from "../notify/NotificationProvider";
import { strengthTag } from "./GoalReplays";
import { Latest } from "./Latest";
import { ScreenAwake } from "./ScreenAwake";
import type { Fact } from "@/lib/facts-shared";
import type { StartingGoalies as StartingGoaliesData } from "@/lib/goalies";
import { getFavourites } from "@/lib/favourites";
import { latestItems } from "./latest-items";

// Leafs Watch: what the out-of-town scoreboard says about Toronto's game.
const LEAFS_LINE: Record<string, string> = {
  pre: "",
  losing: " · Leafs trail 😈",
  lost: " · Leafs lose! 😈",
  tied: " · tied",
  winning: " · Leafs lead, for now",
  won: " · Leafs won. Ugh.",
};

type Payload = { game: LiveGame; rivals: RivalGame[]; radio?: RadioEpisode[] };

const LIVE_POLL_MS = 15_000;
const PRE_POLL_MS = 60_000;
// Replay speed: one minute of game time every 3 seconds (a full game in about 3 minutes).
const REPLAY_STEP = 60;
const REPLAY_TICK_MS = 3_000;
const GAME_END = 3900;
const MEDIA_POLL_MS = 60_000;
const MEDIA_PRE_POLL_MS = 5 * 60_000;

export function LiveCompanion({
  gameId,
  initial,
  replay,
  initialTab = "summary",
  initialSegment = "news",
  facts,
  goalies,
  streams,
  tickets,
}: {
  gameId: number;
  initial: Payload | null;
  replay: boolean;
  initialTab?: GameTab;
  initialSegment?: MediaSegment;
  facts?: Fact[];
  goalies?: StartingGoaliesData | null;
  // Network -> this game's own streaming page (TSN+, Sportsnet+).
  streams?: Record<string, string>;
  // Gametime and Ticketmaster pages for this game (shown until the final).
  tickets?: TicketLinks;
}) {
  const [tab, setTab] = useState<GameTab>(initialTab);
  const [media, setMedia] = useState<GameMedia | null>(null);
  const [pending, setPending] = useState<{ clipId: number; n: number } | null>(null);
  const notify = useNotify();
  // Clips already known, so alerts only fire for ones that appear while the page is open.
  const knownClips = useRef<Set<number> | null>(
    initial ? new Set(initial.game.goals.flatMap((g) => (g.clipId ? [g.clipId] : []))) : null,
  );
  const knownVideo = useRef<Set<number> | null>(null);
  const knownNews = useRef<Set<string> | null>(null);
  const openRef = useRef<(clipId: number) => void>(() => {});
  const videoComplete = useRef(false);
  const requests = useRef(0);
  const [data, setData] = useState<Payload | null>(initial);
  const [error, setError] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [t, setT] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<Payload | null>(initial);

  // Goals already seen, so a followed player's goal or assist alerts once, when it happens.
  const knownGoals = useRef<Set<number> | null>(initial ? new Set(initial.game.goals.map((g) => g.id)) : null);
  function announceFavouriteGoals(game: LiveGame) {
    if (knownGoals.current) {
      const favs = getFavourites();
      for (const g of game.goals) {
        if (knownGoals.current.has(g.id)) continue;
        const scorer = g.scorerId != null && favs.has(g.scorerId);
        const helpers = g.assists.filter((_, i) => favs.has(g.assistIds[i]));
        if (!scorer && helpers.length === 0) continue;
        notify({
          key: `fav-goal-${g.id}`,
          title: scorer ? `Your player: ${g.scorer} scores!` : `Your player: ${helpers.join(" and ")} with an assist`,
          body: `${periodLabel(g.period, g.periodType)} ${g.time}${strengthTag(g)} · ${g.teamAbbrev === "OTT" ? "OTT" : g.teamAbbrev} · ${g.scoreAfter}`,
          tone: "gold",
        });
      }
    }
    knownGoals.current = new Set(game.goals.map((g) => g.id));
  }

  // Alert when a goal's replay clip shows up (the NHL posts them a few minutes after the goal).
  function announceGoalClips(game: LiveGame) {
    const ready = game.goals.filter((g) => g.clipId);
    if (knownClips.current) {
      for (const g of ready) {
        if (knownClips.current.has(g.clipId!)) continue;
        notify({
          key: `goal-clip-${g.clipId}`,
          title: `Replay ready: ${g.scorer} goal`,
          body: `${g.teamAbbrev}${strengthTag(g)} · ${periodLabel(g.period, g.periodType)} ${g.time} · ${g.scoreAfter}`,
          tone: g.team === "OTT" ? "gold" : "neutral",
          action: { label: "Watch", onSelect: () => openRef.current(g.clipId!) },
        });
      }
    }
    knownClips.current = new Set([...(knownClips.current ?? []), ...ready.map((g) => g.clipId!)]);
  }

  // Requests can finish out of order (a slow one after a newer one); only the latest counts.
  const loadSeq = useRef(0);
  const load = useCallback(
    async (at?: number) => {
      const seq = ++loadSeq.current;
      try {
        const qs = at != null ? `?t=${at}` : "";
        const res = await fetch(`/api/game/${gameId}${qs}`, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const next = (await res.json()) as Payload;
        if (seq !== loadSeq.current) return;
        announceFavouriteGoals(next.game);
        announceGoalClips(next.game);
        latest.current = next;
        setData(next);
        setError(false);
        setUpdatedAt(Date.now());
      } catch {
        if (seq === loadSeq.current) setError(true);
      }
    },
    // announceGoalClips only reads refs and the stable notify function.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  function announceVideo(v: GameVideo) {
    const all = [
      ...v.recaps.map((x) => ({ ...x, kind: "recap" })),
      ...v.condensed.map((x) => ({ ...x, kind: "condensed" })),
      ...v.highlights.map((x) => ({ ...x, kind: "highlight" })),
    ];
    if (knownVideo.current) {
      for (const x of all) {
        if (knownVideo.current.has(x.clipId)) continue;
        notify({
          key: `video-${x.clipId}`,
          title: x.kind === "highlight" ? `New highlight: ${x.title}` : `${x.title} is up`,
          body: x.kind === "condensed" ? "The whole game in about 10 minutes" : x.kind === "recap" ? "Watch the game's highlights" : undefined,
          tone: "neutral",
          action: { label: "Watch", onSelect: () => openRef.current(x.clipId) },
        });
      }
    }
    knownVideo.current = new Set([...(knownVideo.current ?? []), ...all.map((x) => x.clipId)]);
    videoComplete.current = v.recaps.length > 0 && v.condensed.length > 0;
  }

  // Alert for new stories from NHL.com, TSN and Sportsnet while the page is open.
  function announceNews(news: NewsItem[]) {
    if (knownNews.current) {
      for (const n of news) {
        if (knownNews.current.has(n.url)) continue;
        notify({
          key: `news-${n.url}`,
          title: `${n.outlet}: ${n.title}`,
          tone: "neutral",
          sound: false,
          action: { label: "Read", onSelect: () => window.open(n.url, "_blank", "noopener,noreferrer") },
        });
      }
    }
    knownNews.current = new Set([...(knownNews.current ?? []), ...news.map((n) => n.url)]);
  }

  // Media: news, video and radio for this game, refreshed every minute once the game
  // starts (every five before), so the Media tab stays current and new clips and stories
  // can raise alerts. Keeps going after the final until the recap and condensed game have
  // posted. Not in replay mode, where post-game coverage would spoil the game.
  useEffect(() => {
    if (replay) return;
    let cancelled = false;
    let id: ReturnType<typeof setTimeout> | null = null;
    let polls = 0;
    const fetchMedia = async () => {
      polls += 1;
      try {
        const res = await fetch(`/api/game/${gameId}/media`, { cache: "no-store" });
        if (res.ok && !cancelled) {
          const m = (await res.json()) as GameMedia;
          announceVideo(m.video);
          announceNews(m.news);
          setMedia(m);
        }
      } catch {
        /* keep what we have */
      }
      const g = latest.current?.game;
      const complete = Boolean(g?.isFinal) && videoComplete.current;
      if (!cancelled && !complete && polls < 300) id = setTimeout(fetchMedia, g?.isPre ? MEDIA_PRE_POLL_MS : MEDIA_POLL_MS);
    };
    id = setTimeout(fetchMedia, 0);
    return () => {
      cancelled = true;
      if (id) clearTimeout(id);
    };
    // announceVideo and announceNews only read refs and the stable notify function.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replay, gameId]);

  const changeTab = (t: GameTab) => {
    setTab(t);
    try {
      const url = new URL(window.location.href);
      if (t === "summary") {
        url.searchParams.delete("tab");
        url.searchParams.delete("show");
      }
      else url.searchParams.set("tab", t);
      window.history.replaceState(null, "", url);
    } catch {
      /* not important */
    }
  };

  // "Watch" on an alert: switch to the Video tab and open that clip.
  useEffect(() => {
    openRef.current = (clipId: number) => {
      changeTab("media");
      requests.current += 1;
      setPending({ clipId, n: requests.current });
    };
  });

  // "Updated 12 s ago" ticker.
  useEffect(() => {
    if (replay) return;
    const id = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(id);
  }, [replay]);

  // Offer the TSN 1200 bar (it lives in the root layout) while the game is on.
  const g0 = data?.game;
  const offer =
    !g0 || replay || !(g0.isPre || g0.isLive || (g0.isFinal && !(media?.radio.length ? media.radio : (data?.radio ?? [])).some((e) => e.kind === "postgame")))
      ? null
      : g0.isPre
        ? "Pre-game coverage before puck drop"
        : g0.isLive
          ? "The radio call, live"
          : "Post-game show";
  useEffect(() => {
    setRadioOffer(offer);
  }, [offer]);
  useEffect(() => () => setRadioOffer(null), []);

  // Media tab badge: news, video and audio not seen yet on this phone.
  const unseen = useUnseen(gameId, replay ? [] : mediaKeys(media, data?.game.goals ?? []), tab === "media");

  if (!data) {
    return (
      <div className="mx-4 mt-6 rounded-2xl border border-line bg-surface p-4 text-sm text-ink-2">
        {error ? "Can't reach the game feed right now. Retrying…" : "Loading the game…"}
      </div>
    );
  }

  const { game, rivals } = data;
  // The game feed carries tonight's radio episodes; the media list adds any saved ones.
  const radio = !replay && media?.radio.length ? media.radio : (data.radio ?? []);
  const hasPostgame = radio.some((e) => e.kind === "postgame");
  const showLiveBar = !replay && (game.isPre || game.isLive || (game.isFinal && !hasPostgame));
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

      <section aria-label="Game status" className="px-4 pt-2.5 lg:pt-5">
        <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2 lg:gap-4 lg:rounded-2xl lg:px-5 lg:py-3">
          {game.isLive && (
            <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-widest text-sens-text">
              <span className="size-1.5 rounded-full bg-sens-bright" />
              LIVE
            </span>
          )}
          {game.isFinal && <span className="text-[11px] font-bold tracking-widest text-muted">FINAL</span>}
          <span className="font-display text-[19px] font-extrabold tracking-wide lg:text-[30px] lg:leading-none">
            {game.isPre
              ? `OTT ${game.ott.isHome ? "vs" : "at"} ${game.opp.abbrev}`
              : `OTT ${game.ott.score} – ${game.opp.score} ${game.opp.abbrev}`}
          </span>
          {game.isPre && <span className="text-[13px] text-muted lg:text-[15px]">Tonight</span>}
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
          <p className="mt-1.5 text-center text-[11px] text-muted lg:text-left">
            {error ? "Connection hiccup, retrying · " : ago != null ? `Updated ${ago} s ago · ` : ""}
            Runs about 20 s behind TV · check it during stoppages
          </p>
        )}
        {(game.isPre || game.isLive) && (game.broadcasts.length > 0 || tickets || game.isLive) && (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
            {game.broadcasts.length > 0 && <StreamingMenu networks={game.broadcasts} streams={streams} />}
            {tickets && <TicketsMenu tickets={tickets} align="left" />}
            <ScreenAwake active={game.isLive} />
          </div>
        )}
      </section>

      <GameTabButtons active={tab} onChange={changeTab} badges={{ media: unseen }} />

      {tab === "summary" && (
        <GameSections
          game={game}
          facts={facts}
          goalies={goalies}
          radio={showLiveBar}
          aside={
            <>
              {rivals.length > 0 && (
                <Section title="Out of town scoreboard">
                  <div className="flex flex-col gap-2 md:grid md:grid-cols-3 lg:flex">
                    {rivals.map((r) => {
                      const toronto = r.away === "TOR" || r.home === "TOR";
                      const bad = r.leafs === "losing" || r.leafs === "lost";
                      return (
                        <div
                          key={r.id}
                          className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-3 ${bad ? "border-sens bg-[#2a1216]" : "border-line bg-surface"}`}
                        >
                          <span className="flex min-w-0 flex-col">
                            {toronto && (
                              <span className={`text-[10px] font-bold uppercase tracking-widest ${bad ? "text-sens-text" : "text-muted"}`}>
                                Leafs Watch{LEAFS_LINE[r.leafs ?? "pre"]}
                              </span>
                            )}
                            <span className="font-display text-[19px] font-bold tracking-wide">
                              {r.awayScore != null ? `${r.away} ${r.awayScore} – ${r.homeScore} ${r.home}` : `${r.away} at ${r.home}`}
                            </span>
                          </span>
                          <span className="shrink-0 text-[13px] text-muted">{r.status}</span>
                        </div>
                      );
                    })}
                  </div>
                </Section>
              )}
              <Latest
                items={replay ? [] : latestItems(media, { video: (clipId) => () => openRef.current(clipId) })}
                all={{ onSelect: () => changeTab("media") }}
              />
              {showLiveBar && <div aria-hidden="true" className="hidden h-24 lg:block" />}
            </>
          }
        />
      )}

      {tab === "media" && (
        <MediaTab
          news={replay ? [] : (media?.news ?? [])}
          video={replay ? null : (media?.video ?? null)}
          radio={radio}
          goals={game.goals}
          startTimeUTC={game.startTimeUTC}
          isPre={game.isPre}
          isFinal={game.isFinal}
          initialSegment={initialSegment}
          pending={pending}
          videoNote={replay ? "Recaps and highlights are hidden in replay mode so they don't spoil the game." : undefined}
        />
      )}


    </>
  );
}
