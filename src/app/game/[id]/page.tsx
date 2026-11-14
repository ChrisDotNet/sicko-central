import Link from "next/link";
import { Suspense } from "react";
import { GameSections } from "@/components/game/GameSections";
import { GameTabLinks, parseSegment, parseTab } from "@/components/game/GameTabs";
import type { MediaSegment } from "@/components/game/GameTabs";
import { MediaTab } from "@/components/media/MediaTab";
import { BackButton } from "@/components/BackButton";
import { Latest } from "@/components/game/Latest";
import { latestItems } from "@/components/game/latest-items";
import { ErrorNote, TeamBar } from "@/components/ui";
import { buildGame } from "@/lib/game";
import type { LiveGame } from "@/lib/game";
import { formatDay } from "@/lib/format";
import { getBoxScore, getPlayByPlay } from "@/lib/nhl";
import { getGameMedia } from "@/lib/media";

async function Recap({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!/^\d{10}$/.test(id)) return <ErrorNote>That game couldn&apos;t be found.</ErrorNote>;
  const [pbp, box] = await Promise.all([getPlayByPlay(id), getBoxScore(id)]);
  if (!pbp) return <ErrorNote>That game couldn&apos;t be found, or NHL data isn&apos;t available right now.</ErrorNote>;
  const game = buildGame(pbp, box);
  const tab = parseTab(sp.tab);

  if (game.isLive) {
    return (
      <div className="px-4 pt-5">
        <Link
          href={tab === "summary" ? "/live" : `/live?tab=media&show=${parseSegment(sp.show, sp.tab)}`}
          className="flex min-h-11 items-center justify-center rounded-xl bg-sens text-sm font-bold text-white"
        >
          This game is live. Follow it here.
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="px-2 pt-1">
        <BackButton fallback="/schedule" />
      </div>
      <div className="px-4 pt-1">
        <p className="text-xs font-bold uppercase tracking-widest text-muted">
          {formatDay(game.startTimeUTC).long} · {game.venue}
        </p>
        <div className="mt-2 flex items-center gap-3">
          <TeamBar abbrev="OTT" />
          <span className="font-display text-[34px] font-extrabold leading-none tracking-wide">
            OTT {game.ott.score} – {game.opp.score} {game.opp.abbrev}
          </span>
          <TeamBar abbrev={game.opp.abbrev} />
        </div>
      </div>
      <GameTabLinks base={`/game/${id}`} active={tab} />
      {tab === "summary" && <SummaryWithLatest id={id} game={game} />}
      {tab === "media" && <GameMedia id={id} game={game} segment={parseSegment(sp.show, sp.tab)} />}
    </>
  );
}

async function SummaryWithLatest({ id, game }: { id: string; game: LiveGame }) {
  const media = await getGameMedia(id, game.startTimeUTC);
  const items = latestItems(media, { video: () => `/game/${id}?tab=media&show=video` });
  return <GameSections game={game} aside={<Latest items={items} all={{ href: `/game/${id}?tab=media` }} />} />;
}

async function GameMedia({ id, game, segment }: { id: string; game: LiveGame; segment: MediaSegment }) {
  const media = await getGameMedia(id, game.startTimeUTC);
  return (
    <MediaTab
      news={media.news}
      video={media.video}
      radio={media.radio}
      goals={game.goals}
      startTimeUTC={game.startTimeUTC}
      isPre={game.isPre}
      isFinal={game.isFinal}
      initialSegment={segment}
    />
  );
}

export default function GamePage(props: PageProps<"/game/[id]">) {
  return (
    <Suspense fallback={<div className="px-4 pt-6 text-sm text-muted">Loading the game…</div>}>
      <Recap params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
