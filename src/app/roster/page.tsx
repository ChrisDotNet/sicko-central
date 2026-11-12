import type { Metadata } from "next";
import Link from "next/link";
import { ErrorNote, Section } from "@/components/ui";
import { savePct } from "@/lib/format";
import type { RosterPlayer } from "@/lib/nhl";
import { getClubStats, getRoster, name } from "@/lib/nhl";

export const metadata: Metadata = { title: "Roster" };

export default async function RosterPage() {
  const [roster, stats] = await Promise.all([getRoster().catch(() => null), getClubStats().catch(() => null)]);
  if (!roster) return <ErrorNote>The roster isn&apos;t available right now. Try again in a minute.</ErrorNote>;

  const skaterStats = new Map((stats?.skaters ?? []).map((s) => [s.playerId, s]));
  const goalieStats = new Map((stats?.goalies ?? []).map((g) => [g.playerId, g]));
  const byNumber = (a: RosterPlayer, b: RosterPlayer) => (a.sweaterNumber ?? 99) - (b.sweaterNumber ?? 99);

  const skaterGroup = (title: string, players: RosterPlayer[]) => (
    <Section title={title}>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="grid grid-cols-[36px_minmax(0,1fr)_32px_32px_32px_36px] border-b border-line px-3.5 py-2.5 text-[11px] font-semibold text-muted">
          <span>#</span><span>Player</span><span className="text-right">GP</span><span className="text-right">G</span><span className="text-right">A</span><span className="text-right">P</span>
        </div>
        {[...players].sort(byNumber).map((p) => {
          const s = skaterStats.get(p.id);
          return (
            <Link key={p.id} href={`/player/${p.id}`} className="grid min-h-11 grid-cols-[36px_minmax(0,1fr)_32px_32px_32px_36px] items-center border-b border-line px-3.5 py-2.5 text-sm tabular last:border-0">
              <span className="font-display text-lg font-bold text-gold-text">{p.sweaterNumber ?? "–"}</span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-semibold">{name(p.firstName)} {name(p.lastName)}</span>
                <span className="text-xs text-muted">{p.positionCode} · Shoots {p.shootsCatches ?? "–"}</span>
              </span>
              <span className="text-right">{s?.gamesPlayed ?? 0}</span>
              <span className="text-right">{s?.goals ?? 0}</span>
              <span className="text-right">{s?.assists ?? 0}</span>
              <span className="text-right font-bold">{s?.points ?? 0}</span>
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
          <div className="grid grid-cols-[36px_minmax(0,1fr)_32px_32px_52px] border-b border-line px-3.5 py-2.5 text-[11px] font-semibold text-muted">
            <span>#</span><span>Player</span><span className="text-right">GP</span><span className="text-right">W</span><span className="text-right">SV%</span>
          </div>
          {[...roster.goalies].sort(byNumber).map((p) => {
            const s = goalieStats.get(p.id);
            return (
              <Link key={p.id} href={`/player/${p.id}`} className="grid min-h-11 grid-cols-[36px_minmax(0,1fr)_32px_32px_52px] items-center border-b border-line px-3.5 py-2.5 text-sm tabular last:border-0">
                <span className="font-display text-lg font-bold text-gold-text">{p.sweaterNumber ?? "–"}</span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-semibold">{name(p.firstName)} {name(p.lastName)}</span>
                  <span className="text-xs text-muted">G · Catches {p.shootsCatches ?? "–"}</span>
                </span>
                <span className="text-right">{s?.gamesPlayed ?? 0}</span>
                <span className="text-right">{s?.wins ?? 0}</span>
                <span className="text-right font-bold">{savePct(s?.savePercentage)}</span>
              </Link>
            );
          })}
        </div>
      </Section>
    </>
  );
}
