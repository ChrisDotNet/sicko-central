import type { Metadata } from "next";
import { StandingsTabs } from "@/components/StandingsTabs";
import { ErrorNote } from "@/components/ui";
import { getStandings, name } from "@/lib/nhl";
import { OTT } from "@/lib/teams";

export const metadata: Metadata = { title: "Standings" };

export default async function StandingsPage() {
  const rows = await getStandings().catch(() => []);
  if (rows.length === 0) return <ErrorNote>Standings aren&apos;t available right now. Try again in a minute.</ErrorNote>;

  const ott = rows.find((r) => name(r.teamAbbrev) === OTT);

  return (
    <>
      <div className="px-4 pt-5">
        <h1 className="font-display text-3xl font-extrabold uppercase tracking-wider">Standings</h1>
        <p className="mt-0.5 text-sm text-muted">NHL regular season</p>
      </div>
      <StandingsTabs rows={rows} ottConference={ott?.conferenceAbbrev ?? "E"} ottDivision={ott?.divisionName ?? ""} />
    </>
  );
}
