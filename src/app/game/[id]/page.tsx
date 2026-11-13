import Link from "next/link";
import { Suspense } from "react";
import { GameSections } from "@/components/game/GameSections";
import { GameTabLinks, parseTab } from "@/components/game/GameTabs";
import { RadioArchive } from "@/components/radio/RadioArchive";
import { VideoTab } from "@/components/video/VideoTab";
import { ErrorNote, Section, TeamBar } from "@/components/ui";
import { buildGame } from "@/lib/game";
import { formatDay } from "@/lib/format";
import { getBoxScore, getPlayByPlay } from "@/lib/nhl";
import { getRadioForGame } from "@/lib/radio";
import { getGameVideo } from "@/lib/video";

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
          href={tab === "summary" ? "/live" : `/live?tab=${tab}`}
          className="flex min-h-11 items-center justify-center rounded-xl bg-sens text-sm font-bold text-white"
        >
          This game is live. Follow it here.
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 pt-5">
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
      {tab === "summary" && <GameSections game={game} />}
      {tab === "video" &&
        (game.isPre ? (
          <p className="mx-4 mt-6 rounded-2xl border border-line bg-surface p-4 text-sm text-muted">Video shows up here once the game starts.</p>
        ) : (
          <VideoTab video={await getGameVideo(id)} goals={game.goals} isFinal={game.isFinal} />
        ))}
      {tab === "radio" && (
        <Section title="Radio call" aside="TSN 1200">
          <RadioArchive episodes={await getRadioForGame(game.gameDate)} live={false} />
        </Section>
      )}
    </>
  );
}

export default function GamePage(props: PageProps<"/game/[id]">) {
  return (
    <Suspense fallback={<div className="px-4 pt-6 text-sm text-muted">Loading the game…</div>}>
      <Recap params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
