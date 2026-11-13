"use client";

import { useState } from "react";
import type { Goal } from "@/lib/game";
import type { NewsItem } from "@/lib/news";
import { NewsCard } from "../news/NewsCard";
import type { RadioEpisode } from "@/lib/radio";
import type { GameVideo } from "@/lib/video";
import { Section } from "../ui";
import { RadioArchive } from "../radio/RadioArchive";
import { VideoTab } from "../video/VideoTab";
import { SEGMENTS } from "../game/GameTabs";
import type { MediaSegment } from "../game/GameTabs";

const Note = ({ children }: { children: React.ReactNode }) => (
  <p className="rounded-2xl border border-line bg-surface p-4 text-sm text-muted">{children}</p>
);

function NewsList({ news, startTimeUTC, isPre }: { news: NewsItem[]; startTimeUTC: string; isPre: boolean }) {
  const start = Date.parse(startTimeUTC);
  const post = news.filter((n) => Date.parse(n.published) >= start);
  const pre = news.filter((n) => Date.parse(n.published) < start);
  if (news.length === 0) {
    return (
      <Section>
        <Note>
          {isPre
            ? "Previews from NHL.com, TSN and Sportsnet show up here on game day."
            : "No coverage found for this game yet. Recaps usually post within an hour of the final."}
        </Note>
      </Section>
    );
  }
  const group = (title: string, items: NewsItem[]) =>
    items.length > 0 && (
      <Section title={title} aside={`${items.length} ${items.length === 1 ? "story" : "stories"}`}>
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          {items.map((n) => (
            <NewsCard key={n.url} n={n} />
          ))}
        </div>
      </Section>
    );
  return (
    <>
      {group("Postgame", post)}
      {group("Pregame", pre)}
      <p className="px-4 pt-3 text-xs text-muted">Headlines and short summaries from each outlet&apos;s feed. Full articles open on their site.</p>
    </>
  );
}

// News, Video and Audio for one game. Used on the game page and the live page.
export function MediaTab({
  news,
  video,
  radio,
  goals,
  startTimeUTC,
  isPre,
  isFinal,
  initialSegment = "news",
  pending,
  videoNote,
  oppAbbrev,
}: {
  news: NewsItem[];
  video: GameVideo | null;
  radio: RadioEpisode[];
  goals: Goal[];
  startTimeUTC: string;
  isPre: boolean;
  isFinal: boolean;
  initialSegment?: MediaSegment;
  // A clip to open right away (from an alert): switches to Video. `n` changes per request.
  pending?: { clipId: number; n: number } | null;
  videoNote?: string;
  oppAbbrev: string;
}) {
  const [segment, setSegment] = useState<MediaSegment>(initialSegment);
  const [seenPending, setSeenPending] = useState(0);
  if (pending && pending.n !== seenPending) {
    setSeenPending(pending.n);
    setSegment("video");
  }

  // A clip request only opens once: after leaving Video it isn't replayed on coming back.
  const [consumed, setConsumed] = useState(0);
  const pick = (s: MediaSegment) => {
    setSegment(s);
    if (s !== "video") setConsumed(pending?.n ?? 0);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", "media");
      if (s === "news") url.searchParams.delete("show");
      else url.searchParams.set("show", s);
      window.history.replaceState(window.history.state, "", url);
    } catch {
      /* not important */
    }
  };

  return (
    <>
      <div role="tablist" aria-label="Media type" className="flex gap-2 px-4 pt-4 md:max-w-md">
        {SEGMENTS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={segment === s.id}
            onClick={() => pick(s.id)}
            className={`min-h-10 flex-1 rounded-full border text-sm font-semibold ${
              segment === s.id ? "border-ink bg-ink text-ground" : "border-line-strong text-ink-2"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* News and Audio read best at a column width; Video uses the whole page. */}
      {segment === "news" && (
        <div className="lg:max-w-3xl">
          <NewsList news={news} startTimeUTC={startTimeUTC} isPre={isPre} />
        </div>
      )}

      {segment === "video" &&
        (isPre ? (
          <Section>
            <Note>Video shows up here once the game starts.</Note>
          </Section>
        ) : (
          <VideoTab
            video={video}
            goals={goals}
            isFinal={isFinal}
            pending={pending && pending.n > consumed ? pending : null}
            note={videoNote}
            oppAbbrev={oppAbbrev}
          />
        ))}

      {segment === "audio" && (
        <Section title="Radio call" aside="TSN 1200" className="lg:max-w-3xl">
          {isPre && radio.length === 0 ? (
            <Note>Listen live with the TSN 1200 bar below. The pre-game show and each period show up here once they&apos;ve aired.</Note>
          ) : (
            <RadioArchive episodes={radio} live={!isFinal} />
          )}
        </Section>
      )}
    </>
  );
}
