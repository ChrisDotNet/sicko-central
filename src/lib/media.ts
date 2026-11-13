// Everything for a game's Media tab: news, video and the radio call. Each source only
// reaches back so far (TSN and Sportsnet feeds a few days, TSN 1200's podcast feed about a
// year), so whatever we find is saved per game and merged with what's live. Older games
// keep their coverage after it falls out of the feeds.
//
// Only lists are saved (headlines, links, clip ids), never the media itself: about 15 KB
// a game. The store is written only when something new turns up.
import { cacheLife } from "next/cache";
import { getNewsForGame, mergeNews, sortNews } from "./news";
import { getPlayByPlay, getSchedule } from "./nhl";
import type { NewsItem } from "./news";
import { getRadioForGame } from "./radio";
import type { RadioEpisode } from "./radio";
import { getJson, setJson } from "./store";
import { getGameVideo } from "./video";
import type { GameVideo, VideoItem } from "./video";

export type GameMedia = { news: NewsItem[]; video: GameVideo; radio: RadioEpisode[] };

const key = (gameId: string) => `media:${gameId}`;

function unionBy<T>(live: T[], saved: T[] | undefined, id: (x: T) => string | number): T[] {
  const seen = new Set(live.map(id));
  return [...live, ...(saved ?? []).filter((x) => !seen.has(id(x)))];
}

const clip = (v: VideoItem) => v.clipId;

function merge(live: GameMedia, saved: GameMedia | null): GameMedia {
  if (!saved) return live;
  return {
    news: sortNews(mergeNews([...live.news, ...(saved.news ?? [])])),
    video: {
      recaps: unionBy(live.video.recaps, saved.video?.recaps, clip),
      condensed: unionBy(live.video.condensed, saved.video?.condensed, clip).slice(0, 1),
      highlights: unionBy(live.video.highlights, saved.video?.highlights, clip),
      goalThumbs: { ...(saved.video?.goalThumbs ?? {}), ...(live.video.goalThumbs ?? {}) },
    },
    // The radio call is a set: if the feed has it, use the feed's version (fresh labels);
    // otherwise what we saved.
    radio: live.radio.length ? unionBy(live.radio, saved.radio, (e) => e.id).sort((a, b) => a.order - b.order) : (saved.radio ?? []),
  };
}

const isEmpty = (m: GameMedia) =>
  !m.news.length && !m.radio.length && !m.video.recaps.length && !m.video.condensed.length && !m.video.highlights.length;

// Read the sources, merge with what's saved, save if anything is new. Not cached: the
// daily collection job calls this directly.
export async function collectGameMedia(gameId: string, startTimeUTC: string): Promise<GameMedia> {
  const [news, video, radio, saved] = await Promise.all([
    getNewsForGame(gameId),
    getGameVideo(gameId),
    getRadioForGame(startTimeUTC),
    getJson<GameMedia>(key(gameId)),
  ]);
  const merged = merge({ news, video, radio }, saved);
  if (!isEmpty(merged) && JSON.stringify(merged) !== JSON.stringify(saved)) {
    await setJson(key(gameId), merged);
  }
  return merged;
}

// Puck drop for a game id: from the season schedule, or the game's own feed for games
// outside it (an older season).
export async function startTimeFor(gameId: string): Promise<string | null> {
  const schedule = await getSchedule();
  const g = schedule?.games.find((x) => String(x.id) === gameId);
  if (g) return g.startTimeUTC;
  return (await getPlayByPlay(gameId))?.startTimeUTC ?? null;
}

// For pages and the polling route: cached for a minute, so the store is read about once
// a minute per game however many people are looking.
export async function getGameMedia(gameId: string, startTimeUTC: string): Promise<GameMedia> {
  "use cache";
  cacheLife("frequent");
  return collectGameMedia(gameId, startTimeUTC);
}
