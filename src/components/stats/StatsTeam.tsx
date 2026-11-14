import type { Race, SensForm } from "@/lib/team-stats";
import { dec1, dec2, dec3, ordinal, pct1, recStr } from "@/lib/team-stats-shared";
import type { Ranked, TeamLens } from "@/lib/team-stats-shared";
import { teamColor } from "@/lib/teams";
import { RankChip, Rows, StatsSection } from "./StatsBits";

// Stats tab › Team: where the Sens rank, how games go, the playoff race.

type Tile = { label: string; r: Ranked; fmt: (v: number) => string };

export function StatsTeam({ ott, form, race }: { ott: TeamLens; form: SensForm | null; race: Race | null }) {
  const tiles: Tile[] = [
    { label: "Points %", r: ott.pointPct, fmt: dec3 },
    { label: "Power play", r: ott.pp, fmt: pct1 },
    { label: "Penalty kill", r: ott.pk, fmt: pct1 },
    { label: "Faceoffs", r: ott.fo, fmt: pct1 },
    { label: "Goals for / game", r: ott.gf, fmt: dec2 },
    { label: "Goals against / game", r: ott.ga, fmt: dec2 },
    { label: "Shots for / game", r: ott.sf, fmt: dec1 },
    { label: "Shots against / game", r: ott.sa, fmt: dec1 },
    { label: "5-on-5 shot share", r: ott.shotShare, fmt: pct1 },
    { label: "5-on-5 save %", r: ott.sv5, fmt: dec3 },
  ].filter((t) => t.r);
  const ranked = tiles.filter((t) => t.label !== "Points %");
  const best = [...ranked].sort((a, b) => a.r!.rank - b.r!.rank)[0];
  const worst = [...ranked].sort((a, b) => b.r!.rank - a.r!.rank)[0];
  const maxGoals = Math.max(1, ...ott.periods.map((p) => Math.max(p.f, p.a)));
  const worstPeriod = ott.periods.filter((p) => p.label !== "OT").sort((a, b) => b.a - b.f - (a.a - a.f))[0];

  return (
    <>
      <div className="px-4 pt-5">
        <div className="font-display text-4xl font-extrabold tracking-wide">SENS {recStr(ott.rec)}</div>
        <p className="mt-1 text-sm text-muted">
          {ott.points} points in {ott.gp} games
          {race ? ` · ${ordinal(race.place)} ${race.division.replace(/ Division$/, "")}${race.wildcard ? ` · wild card ${race.wildcard}` : ""}` : ""}
        </p>
      </div>

      <div className="lg:grid lg:grid-cols-3 lg:items-start">
        <StatsSection title="Where the Sens rank" aside="Of 32 teams">
          <div className="grid grid-cols-2 gap-2">
            {tiles.map((t) => (
              <div key={t.label} className="flex flex-col gap-0.5 rounded-xl border border-line bg-surface px-3 py-2.5">
                <span className="text-xs font-semibold text-muted">{t.label}</span>
                <span className="font-display text-[28px] font-extrabold leading-none">{t.fmt(t.r!.v)}</span>
                <span className="text-[11px] text-muted">League avg {t.fmt(t.r!.avg)}</span>
                <span className="mt-1">
                  <RankChip rank={t.r!.rank} />
                </span>
              </div>
            ))}
          </div>
          {best && worst && (
            <p className="mt-2.5 rounded-xl border border-line bg-[#131316] px-3.5 py-2.5 text-[13px] leading-snug text-ink-2">
              <b className="text-ink">Best:</b> {best.label.toLowerCase()} ({ordinal(best.r!.rank)}). <b className="text-ink">Worst:</b> {worst.label.toLowerCase()} ({ordinal(worst.r!.rank)}).
            </p>
          )}
          <p className="mt-2 text-[11px] text-muted">Blue: top 10. Orange: bottom 10.</p>
        </StatsSection>

        <StatsSection title="How games go">
          <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted">
                  <th className="px-3.5 py-2 text-left font-bold">Record when…</th>
                  <th className="px-2 py-2 font-bold">After 1st</th>
                  <th className="px-2 py-2 font-bold">After 2nd</th>
                </tr>
              </thead>
              <tbody>
                {(["lead", "tied", "trail"] as const).map((k) => (
                  <tr key={k} className="border-t border-line">
                    <td className="px-3.5 py-2">{k === "lead" ? "Leading" : k === "tied" ? "Tied" : "Trailing"}</td>
                    <td className="px-2 py-2 text-center tabular-nums">{recStr(ott.after1[k])}</td>
                    <td className="px-2 py-2 text-center font-bold tabular-nums">{recStr(ott.after2[k])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-2.5 rounded-2xl border border-line bg-surface px-3.5 py-3">
            <div className="flex items-baseline justify-between text-[11px] font-bold uppercase tracking-widest text-muted">
              <span>Goals by period</span>
              <span className="font-semibold normal-case tracking-normal">
                <span className="text-sens-bright">■</span> for <span className="ml-1.5 text-[#71717A]">■</span> against
              </span>
            </div>
            <ul className="mt-2.5 flex flex-col gap-2.5">
              {ott.periods.map((p) => (
                <li key={p.label} className="grid grid-cols-[2rem_1fr_3.5rem] items-center gap-2 text-sm">
                  <b>{p.label}</b>
                  <span className="flex flex-col gap-1" aria-hidden="true">
                    <span className="block h-2 rounded-sm bg-sens-bright" style={{ width: `${(p.f / maxGoals) * 100}%` }} />
                    <span className="block h-2 rounded-sm bg-[#71717A]" style={{ width: `${(p.a / maxGoals) * 100}%` }} />
                  </span>
                  <b className="text-right tabular-nums">
                    {p.f}–{p.a}
                  </b>
                </li>
              ))}
            </ul>
            {worstPeriod && worstPeriod.a > worstPeriod.f && (
              <p className="mt-2.5 text-xs text-muted">
                Outscored {worstPeriod.a}–{worstPeriod.f} in the {worstPeriod.label} period.
              </p>
            )}
          </div>

          <div className="mt-2.5">
            <Rows
              rows={[
                ...(form
                  ? [
                      { label: "One-goal games", value: recStr(form.splits.oneGoal) },
                      { label: "Overtime and shootout", value: recStr(form.splits.extra) },
                    ]
                  : []),
                { label: "Outshooting the other team", value: recStr(ott.outshooting) },
                { label: "Outshot", value: recStr(ott.outshot) },
                ...(form
                  ? [
                      { label: "Home", value: recStr(form.splits.home) },
                      { label: "Road", value: recStr(form.splits.road) },
                    ]
                  : []),
              ]}
            />
          </div>
        </StatsSection>

        {race && (
          <StatsSection title="Playoff race">
            <div className="overflow-hidden rounded-2xl border border-line bg-surface">
              <div className="grid grid-cols-3 border-b border-line">
                <div className="border-r border-line px-3 py-2.5">
                  <div className="text-xs font-semibold text-muted">Pace</div>
                  <div className="font-display text-2xl font-extrabold">{race.pace} pts</div>
                </div>
                <div className="border-r border-line px-3 py-2.5">
                  <div className="text-xs font-semibold text-muted">{race.third ? `To 3rd (${race.third.abbrev})` : "Division"}</div>
                  <div className="font-display text-2xl font-extrabold">{race.third ? signed(race.third.gap) : ordinal(race.place)}</div>
                  {race.third && race.third.inHand !== 0 && (
                    <div className="text-[11px] text-muted">{inHand(race.third.inHand, race.third.abbrev)}</div>
                  )}
                </div>
                <div className="px-3 py-2.5">
                  <div className="text-xs font-semibold text-muted">{race.firstOut ? `Over 1st out (${race.firstOut.abbrev})` : "Wild card"}</div>
                  <div className="font-display text-2xl font-extrabold">{race.firstOut ? signed(race.firstOut.gap) : "–"}</div>
                  {race.firstOut && race.firstOut.inHand !== 0 && (
                    <div className="text-[11px] text-muted">{inHand(race.firstOut.inHand, race.firstOut.abbrev)}</div>
                  )}
                </div>
              </div>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-muted">
                    <th className="px-3.5 py-2 text-left font-bold">{race.division.replace(/ Division$/, "")}</th>
                    <th className="px-2 py-2 font-bold">GP</th>
                    <th className="px-2 py-2 font-bold">Pts</th>
                    <th className="px-2 py-2 font-bold">P%</th>
                    <th className="px-2 py-2 font-bold">L10</th>
                  </tr>
                </thead>
                <tbody>
                  {race.table.map((t, i) => (
                    <tr key={t.abbrev} className={`border-t ${i === 3 ? "border-dashed border-line-strong" : "border-line"} ${t.abbrev === "OTT" ? "bg-[#2A0F14]" : ""}`}>
                      <td className="px-3.5 py-2">
                        <span className="mr-2 inline-block h-3 w-1.5 rounded-sm align-middle" style={{ background: teamColor(t.abbrev) }} aria-hidden="true" />
                        {i + 1} {t.abbrev}
                        {t.wildcard > 0 && t.wildcard <= 2 ? <span className="ml-1 text-xs text-muted">WC{t.wildcard}</span> : null}
                      </td>
                      <td className="px-2 py-2 text-center tabular-nums">{t.gp}</td>
                      <td className="px-2 py-2 text-center font-bold tabular-nums">{t.points}</td>
                      <td className="px-2 py-2 text-center tabular-nums">{dec3(t.pct)}</td>
                      <td className="px-2 py-2 text-center tabular-nums">{t.l10}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {race.leafs && (
                <div className="flex items-center gap-2.5 border-t border-line bg-[#131316] px-3.5 py-2.5 text-[13px] text-ink-2">
                  <span className="h-5 w-2 shrink-0 rounded-sm" style={{ background: teamColor("TOR") }} aria-hidden="true" />
                  <span>
                    Leafs: {race.leafs.points} points,{" "}
                    <b className="text-ink">
                      {Math.abs(race.leafs.gap)} {race.leafs.gap >= 0 ? "back of" : "ahead of"}
                    </b>{" "}
                    the Sens.{race.leafs.streak >= 3 ? ` Lost ${race.leafs.streak} straight.` : ""}
                  </span>
                </div>
              )}
            </div>
            <p className="mt-2 text-[11px] text-muted">Pace: points percentage over 82 games. The dashed line is the top-three cut.</p>
          </StatsSection>
        )}
      </div>
    </>
  );
}

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0");
// Positive: they have games in hand on the Sens.
const inHand = (n: number, abbrev: string) =>
  n > 0 ? `${abbrev} has ${n} game${n === 1 ? "" : "s"} in hand` : `Sens have ${-n} in hand`;
