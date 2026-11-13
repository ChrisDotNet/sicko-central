import type { Metadata } from "next";
import Link from "next/link";
import { ErrorNote, Section } from "@/components/ui";
import { pct, savePct, toiFromSeconds } from "@/lib/format";
import type { RosterPlayer } from "@/lib/nhl";
import { getClubStats, getRoster, name } from "@/lib/nhl";

export const metadata: Metadata = { title: "Roster" };

// Phones: GP, G, A, P. Tablets add +/-, PIM, shots and shooting %. Desktop adds power-play
// goals, game winners, ice time and faceoffs.
const SKATER_COLS =
  "grid-cols-[36px_minmax(0,1fr)_32px_32px_32px_36px] md:grid-cols-[44px_minmax(0,1fr)_repeat(4,44px)_repeat(4,56px)] lg:grid-cols-[44px_minmax(0,1fr)_repeat(4,48px)_repeat(4,60px)_repeat(4,64px)]";
// Phones: GP, W, SV%. Wider screens add starts, losses, OT losses, GAA and shutouts.
const GOALIE_COLS =
  "grid-cols-[36px_minmax(0,1fr)_32px_32px_52px] md:grid-cols-[44px_minmax(0,1fr)_repeat(5,48px)_60px_60px_48px]";

const md = "hidden text-right md:block";
const lg = "hidden text-right lg:block";
const signed = (n?: number) => (n == null ? "–" : n > 0 ? `+${n}` : String(n));

export default async function RosterPage() {
  const [roster, stats] = await Promise.all([getRoster().catch(() => null), getClubStats().catch(() => null)]);
  if (!roster) return <ErrorNote>The roster isn&apos;t available right now. Try again in a minute.</ErrorNote>;

  const skaterStats = new Map((stats?.skaters ?? []).map((s) => [s.playerId, s]));
  const goalieStats = new Map((stats?.goalies ?? []).map((g) => [g.playerId, g]));
  const byNumber = (a: RosterPlayer, b: RosterPlayer) => (a.sweaterNumber ?? 99) - (b.sweaterNumber ?? 99);
  const head = `grid border-b border-line px-3.5 py-2.5 text-[11px] font-semibold text-muted`;
  const row = `grid min-h-11 items-center border-b border-line px-3.5 py-2.5 text-sm tabular last:border-0 hover:bg-surface-2`;

  const skaterGroup = (title: string, players: RosterPlayer[]) => (
    <Section title={title}>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className={`${head} ${SKATER_COLS}`}>
          <span>#</span><span>Player</span><span className="text-right">GP</span><span className="text-right">G</span><span className="text-right">A</span><span className="text-right">P</span>
          <span className={md}>+/-</span><span className={md}>PIM</span><span className={md}>SOG</span><span className={md}>S%</span>
          <span className={lg}>PPG</span><span className={lg}>GWG</span><span className={lg}>TOI/GP</span><span className={lg}>FO%</span>
        </div>
        {[...players].sort(byNumber).map((p) => {
          const s = skaterStats.get(p.id);
          return (
            <Link key={p.id} href={`/player/${p.id}`} className={`${row} ${SKATER_COLS}`}>
              <span className="font-display text-lg font-bold text-gold-text">{p.sweaterNumber ?? "–"}</span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-semibold">{name(p.firstName)} {name(p.lastName)}</span>
                <span className="text-xs text-muted">{p.positionCode} · Shoots {p.shootsCatches ?? "–"}</span>
              </span>
              <span className="text-right">{s?.gamesPlayed ?? 0}</span>
              <span className="text-right">{s?.goals ?? 0}</span>
              <span className="text-right">{s?.assists ?? 0}</span>
              <span className="text-right font-bold">{s?.points ?? 0}</span>
              <span className={md}>{signed(s?.plusMinus)}</span>
              <span className={md}>{s?.penaltyMinutes ?? "–"}</span>
              <span className={md}>{s?.shots ?? "–"}</span>
              <span className={md}>{s?.shots ? pct(s.shootingPctg) : "–"}</span>
              <span className={lg}>{s?.powerPlayGoals ?? "–"}</span>
              <span className={lg}>{s?.gameWinningGoals ?? "–"}</span>
              <span className={lg}>{s?.avgTimeOnIcePerGame ? toiFromSeconds(s.avgTimeOnIcePerGame) : "–"}</span>
              <span className={lg}>{s?.faceoffWinPctg ? pct(s.faceoffWinPctg) : "–"}</span>
            </Link>
          );
        })}
      </div>
    </Section>
  );

  return (
    <>
      <div className="px-4 pt-5">
        <h1 className="font-display text-3xl font-extrabold uppercase tracking-wider">Roster</h1>
        <p className="mt-0.5 text-sm text-muted">Current roster · season stats</p>
      </div>
      {skaterGroup("Forwards", roster.forwards)}
      {skaterGroup("Defence", roster.defensemen)}
      <Section title="Goalies">
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className={`${head} ${GOALIE_COLS}`}>
            <span>#</span><span>Player</span><span className="text-right">GP</span>
            <span className={md}>GS</span><span className="text-right">W</span><span className={md}>L</span><span className={md}>OTL</span>
            <span className={md}>GAA</span><span className="text-right">SV%</span><span className={md}>SO</span>
          </div>
          {[...roster.goalies].sort(byNumber).map((p) => {
            const s = goalieStats.get(p.id);
            return (
              <Link key={p.id} href={`/player/${p.id}`} className={`${row} ${GOALIE_COLS}`}>
                <span className="font-display text-lg font-bold text-gold-text">{p.sweaterNumber ?? "–"}</span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-semibold">{name(p.firstName)} {name(p.lastName)}</span>
                  <span className="text-xs text-muted">G · Catches {p.shootsCatches ?? "–"}</span>
                </span>
                <span className="text-right">{s?.gamesPlayed ?? 0}</span>
                <span className={md}>{s?.gamesStarted ?? "–"}</span>
                <span className="text-right">{s?.wins ?? 0}</span>
                <span className={md}>{s?.losses ?? "–"}</span>
                <span className={md}>{s?.overtimeLosses ?? "–"}</span>
                <span className={md}>{s?.goalsAgainstAverage != null ? s.goalsAgainstAverage.toFixed(2) : "–"}</span>
                <span className="text-right font-bold">{savePct(s?.savePercentage)}</span>
                <span className={md}>{s?.shutouts ?? "–"}</span>
              </Link>
            );
          })}
        </div>
      </Section>
    </>
  );
}
