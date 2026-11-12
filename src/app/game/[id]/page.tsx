import Link from "next/link";
import { Suspense } from "react";
import { GameSections } from "@/components/game/GameSections";
import { ErrorNote, TeamBar } from "@/components/ui";
import { buildGame } from "@/lib/game";
import { formatDay } from "@/lib/format";
import { getBoxScore, getPlayByPlay } from "@/lib/nhl";

async function Recap({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d{10}$/.test(id)) return <ErrorNote>That game couldn&apos;t be found.</ErrorNote>;
  const [pbp, box] = await Promise.all([getPlayByPlay(id).catch(() => null), getBoxScore(id)]);
  if (!pbp) return <ErrorNote>That game couldn&apos;t be found, or NHL data isn&apos;t available right now.</ErrorNote>;
  const game = buildGame(pbp, box);

  if (game.isLive) {
    return (
      <div className="px-4 pt-5">
        <Link href="/live" className="flex min-h-11 items-center justify-center rounded-xl bg-sens text-sm font-bold text-white">
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
      <GameSections game={game} />
    </>
  );
}

export default function GamePage(props: PageProps<"/game/[id]">) {
  return (
    <Suspense fallback={<div className="px-4 pt-6 text-sm text-muted">Loading the game…</div>}>
      <Recap params={props.params} />
    </Suspense>
  );
}
