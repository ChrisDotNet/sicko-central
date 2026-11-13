import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LiveCompanion } from "@/components/game/LiveCompanion";
import { parseSegment, parseTab } from "@/components/game/GameTabs";
import { Card, Chevron, Kicker } from "@/components/ui";
import { BroadcastLinks } from "@/components/BroadcastLinks";
import { buildGame } from "@/lib/game";
import { formatDay, formatTime } from "@/lib/format";
import { getBoxScore, getPlayByPlay, getSchedule, getScoresNowLive } from "@/lib/nhl";
import { atlanticGames } from "@/lib/rivals";
import { getRadioForGame } from "@/lib/radio";
import { scoreLine, splitSchedule } from "@/lib/schedule";
import { OTT } from "@/lib/teams";

export const metadata: Metadata = { title: "Live" };

async function LiveContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const tab = parseTab(sp.tab);
  const segment = parseSegment(sp.show, sp.tab);
  const replayId = typeof sp.replay === "string" && /^\d{10}$/.test(sp.replay) ? Number(sp.replay) : null;
  if (replayId) {
    return <LiveCompanion key={`replay-${replayId}`} gameId={replayId} initial={null} replay initialTab={tab} initialSegment={segment} />;
  }

  const [scores, schedule] = await Promise.all([getScoresNowLive().catch(() => null), getSchedule().catch(() => null)]);
  const today = scores?.games.find((g) => g.awayTeam.abbrev === OTT || g.homeTeam.abbrev === OTT);

  if (today) {
    const id = String(today.id);
    const [pbp, box] = await Promise.all([getPlayByPlay(id).catch(() => null), getBoxScore(id)]);
    const game = pbp ? buildGame(pbp, box) : null;
    const radio = game ? await getRadioForGame(game.startTimeUTC) : [];
    const initial = game ? { game, rivals: scores ? atlanticGames(scores, today.id) : [], radio } : null;
    return <LiveCompanion key={id} gameId={today.id} initial={initial} replay={false} initialTab={tab} initialSegment={segment} />;
  }

  const { next, last } = schedule ? splitSchedule(schedule.games) : { next: null, last: null };
  return (
    <div className="flex flex-col gap-2.5 px-4 pt-5">
      <h1 className="font-display text-3xl font-extrabold uppercase tracking-wider">No game today</h1>
      <p className="text-sm text-muted">On game nights this page becomes a companion to the broadcast.</p>
      {next && (
        <Card className="mt-2 p-4">
          <Kicker>Next game</Kicker>
          <div className="mt-2 font-display text-2xl font-extrabold tracking-wide">
            {next.home ? "vs" : "at"} {next.opp}
          </div>
          <div className="text-sm text-ink-2">
            {formatDay(next.startTimeUTC).long} · {formatTime(next.startTimeUTC)}
          </div>
          <BroadcastLinks networks={next.broadcasts} className="mt-3" />
        </Card>
      )}
      {last && (
        <>
          <Link href={`/game/${last.id}`} className="flex min-h-11 items-center justify-between rounded-2xl border border-line bg-surface p-4">
            <span className="flex flex-col gap-1">
              <Kicker tone="muted">Last game</Kicker>
              <span className="font-display text-xl font-bold tracking-wide">
                {scoreLine(last)} {last.home ? "vs" : "at"} {last.opp}
              </span>
            </span>
            <span className="flex items-center gap-1 text-sm font-semibold">Game Summary <Chevron /></span>
          </Link>
        </>
      )}
    </div>
  );
}

export default function LivePage(props: PageProps<"/live">) {
  return (
    <Suspense fallback={<div className="px-4 pt-6 text-sm text-muted">Loading the game…</div>}>
      <LiveContent searchParams={props.searchParams} />
    </Suspense>
  );
}
