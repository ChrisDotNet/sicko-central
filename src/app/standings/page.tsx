import type { Metadata } from "next";
import { StandingsTable } from "@/components/StandingsTable";
import { ErrorNote, Section } from "@/components/ui";
import { getStandings, name } from "@/lib/nhl";
import { OTT } from "@/lib/teams";

export const metadata: Metadata = { title: "Standings" };

export default async function StandingsPage() {
  const rows = await getStandings().catch(() => []);
  if (rows.length === 0) return <ErrorNote>Standings aren&apos;t available right now. Try again in a minute.</ErrorNote>;

  const ott = rows.find((r) => name(r.teamAbbrev) === OTT);
  const conf = ott?.conferenceAbbrev ?? "E";
  const inConf = rows.filter((r) => r.conferenceAbbrev === conf);
  const divisions = [...new Set(inConf.map((r) => r.divisionName))].sort((a, b) =>
    a === ott?.divisionName ? -1 : b === ott?.divisionName ? 1 : a.localeCompare(b),
  );

  // Wild card race: teams outside their division's top three, ranked by wildcard sequence.
  const wildcard = inConf
    .filter((r) => r.wildcardSequence > 0)
    .sort((a, b) => a.wildcardSequence - b.wildcardSequence);

  return (
    <>
      <div className="px-4 pt-5">
        <h1 className="font-display text-3xl font-extrabold uppercase tracking-wider">Standings</h1>
        <p className="mt-0.5 text-sm text-muted">{conf === "E" ? "Eastern" : "Western"} Conference</p>
      </div>
      {divisions.map((d) => (
        <Section key={d} title={d}>
          <StandingsTable rows={inConf.filter((r) => r.divisionName === d).sort((a, b) => a.divisionSequence - b.divisionSequence)} />
        </Section>
      ))}
      {wildcard.length > 0 && (
        <Section title="Wild card" aside="Top two make the playoffs">
          <StandingsTable rows={wildcard} />
        </Section>
      )}
    </>
  );
}
