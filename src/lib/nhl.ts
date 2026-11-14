// The only module that talks to the NHL. Every response is cached server-side,
// so page views and live polling never multiply calls to the NHL.
// Endpoints are public but undocumented: treat every field as optional.
import { cacheLife } from "next/cache";

const WEB = "https://api-web.nhle.com/v1";

export class NhlError extends Error {}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${WEB}${path}`, {
    headers: { "User-Agent": "SickoCentral/0.1 (hobby fan site)" },
    cache: "no-store",
    // Fail fast if the NHL is slow, so pages show an error note instead of hanging a build.
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new NhlError(`NHL ${res.status} for ${path}`);
  return (await res.json()) as T;
}

type Text = { default: string; fr?: string };

export type TeamRef = {
  id: number;
  abbrev: string;
  score?: number;
  sog?: number;
  commonName?: Text;
  placeName?: Text;
};

export type Broadcast = { network: string; countryCode: string; market: string };

export type ScheduleGame = {
  id: number;
  season: number;
  gameType: number;
  gameDate: string;
  startTimeUTC: string;
  gameState: string;
  venue?: Text;
  tvBroadcasts?: Broadcast[];
  awayTeam: TeamRef;
  homeTeam: TeamRef;
  periodDescriptor?: { number: number; periodType: string };
  gameOutcome?: { lastPeriodType: string };
  threeMinRecap?: string;
  condensedGame?: string;
  ticketsLink?: string; // Ticketmaster event page
};

export type Schedule = { currentSeason: number; games: ScheduleGame[] };

export type Play = {
  eventId: number;
  periodDescriptor: { number: number; periodType: string };
  timeInPeriod: string;
  timeRemaining: string;
  situationCode?: string;
  homeTeamDefendingSide?: "left" | "right";
  typeDescKey: string;
  sortOrder: number;
  details?: {
    xCoord?: number;
    yCoord?: number;
    zoneCode?: string;
    shotType?: string;
    eventOwnerTeamId?: number;
    shootingPlayerId?: number;
    scoringPlayerId?: number;
    scoringPlayerTotal?: number;
    assist1PlayerId?: number;
    assist1PlayerTotal?: number;
    assist2PlayerId?: number;
    assist2PlayerTotal?: number;
    awayScore?: number;
    homeScore?: number;
    awaySOG?: number;
    homeSOG?: number;
    highlightClip?: number;
    highlightClipSharingUrl?: string;
    committedByPlayerId?: number;
    servedByPlayerId?: number;
    descKey?: string;
    duration?: number;
    typeCode?: string;
    winningPlayerId?: number;
    losingPlayerId?: number;
    hittingPlayerId?: number;
    blockingPlayerId?: number;
    goalieInNetId?: number;
  };
};

export type RosterSpot = {
  teamId: number;
  playerId: number;
  firstName: Text;
  lastName: Text;
  sweaterNumber?: number;
  positionCode?: string;
};

export type PlayByPlay = {
  id: number;
  season: number;
  gameType: number;
  gameDate: string;
  startTimeUTC: string;
  gameState: string;
  venue?: Text;
  tvBroadcasts?: Broadcast[];
  awayTeam: TeamRef;
  homeTeam: TeamRef;
  periodDescriptor?: { number: number; periodType: string };
  clock?: { timeRemaining: string; secondsRemaining: number; running: boolean; inIntermission: boolean };
  plays: Play[];
  rosterSpots: RosterSpot[];
};

export type BoxSkater = {
  playerId: number;
  name: Text;
  position: string;
  goals: number;
  assists: number;
  points: number;
  sog: number;
  toi: string;
  hits?: number;
  plusMinus?: number;
  blockedShots?: number;
  faceoffWinningPctg?: number;
};

export type BoxGoalie = {
  playerId: number;
  name: Text;
  saves?: number;
  shotsAgainst?: number;
  savePctg?: number;
  toi?: string;
};

export type BoxScore = {
  playerByGameStats?: {
    awayTeam: { forwards: BoxSkater[]; defense: BoxSkater[]; goalies: BoxGoalie[] };
    homeTeam: { forwards: BoxSkater[]; defense: BoxSkater[]; goalies: BoxGoalie[] };
  };
};

export type Scores = { currentDate: string; games: ScheduleGame[] };

export type StandingRow = {
  teamAbbrev: Text;
  teamName?: Text;
  divisionAbbrev: string;
  divisionName: string;
  conferenceAbbrev: string;
  divisionSequence: number;
  conferenceSequence: number;
  wildcardSequence: number;
  leagueSequence: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  otLosses: number;
  points: number;
  pointPctg: number;
  goalFor: number;
  goalAgainst: number;
  goalDifferential: number;
  regulationWins: number;
  streakCode?: string;
  streakCount?: number;
  l10Wins?: number;
  l10Losses?: number;
  l10OtLosses?: number;
};

export type RosterPlayer = {
  id: number;
  headshot?: string;
  firstName: Text;
  lastName: Text;
  sweaterNumber?: number;
  positionCode: string;
  shootsCatches?: string;
  heightInInches?: number;
  weightInPounds?: number;
  birthDate?: string;
  birthCity?: Text;
  birthCountry?: string;
  birthStateProvince?: Text;
};

export type Roster = { forwards: RosterPlayer[]; defensemen: RosterPlayer[]; goalies: RosterPlayer[] };

export type SeasonLine = {
  season: number;
  gameTypeId: number;
  leagueAbbrev: string;
  teamName?: Text;
  teamCommonName?: Text;
  sequence?: number;
  gamesPlayed?: number;
  goals?: number;
  assists?: number;
  points?: number;
  plusMinus?: number;
  avgToi?: string;
  wins?: number;
  losses?: number;
  otLosses?: number;
  savePctg?: number;
  goalsAgainstAvg?: number;
  shutouts?: number;
  pim?: number;
  powerPlayGoals?: number;
  shots?: number;
  shootingPctg?: number;
  gamesStarted?: number;
};

export type PlayerLanding = {
  playerId: number;
  isActive?: boolean;
  firstName: Text;
  lastName: Text;
  sweaterNumber?: number;
  position: string;
  headshot?: string;
  currentTeamAbbrev?: string;
  heightInInches?: number;
  weightInPounds?: number;
  birthDate?: string;
  birthCity?: Text;
  birthCountry?: string;
  birthStateProvince?: Text;
  shootsCatches?: string;
  draftDetails?: { year: number; teamAbbrev: string; round: number; pickInRound: number; overallPick: number };
  featuredStats?: {
    season: number;
    regularSeason?: { subSeason?: Record<string, number>; career?: Record<string, number> };
  };
  careerTotals?: { regularSeason?: Record<string, number | string> };
  seasonTotals?: SeasonLine[];
  last5Games?: Array<{
    gameId: number;
    gameDate: string;
    opponentAbbrev: string;
    homeRoadFlag: string;
    goals?: number;
    assists?: number;
    points?: number;
    shots?: number;
    toi?: string;
    decision?: string;
    savePctg?: number;
    shotsAgainst?: number;
    goalsAgainst?: number;
  }>;
};

export type ClubSkater = {
  playerId: number;
  firstName: Text;
  lastName: Text;
  positionCode: string;
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
  plusMinus: number;
  penaltyMinutes?: number;
  powerPlayGoals?: number;
  gameWinningGoals?: number;
  shots?: number;
  shootingPctg?: number;
  avgTimeOnIcePerGame?: number;
  faceoffWinPctg?: number;
};

export type ClubGoalie = {
  playerId: number;
  firstName: Text;
  lastName: Text;
  gamesPlayed: number;
  wins: number;
  savePercentage: number;
  goalsAgainstAverage: number;
  gamesStarted?: number;
  losses?: number;
  overtimeLosses?: number;
  shutouts?: number;
};

export type ClubStats = { skaters: ClubSkater[]; goalies: ClubGoalie[] };

// ---------- cached fetchers ----------
// These never throw: with Cache Components a thrown error inside a cached function fails
// the build, so failures come back as null (or an empty value) and pages show an error note.

async function safe<T>(path: string): Promise<T | null> {
  try {
    return await get<T>(path);
  } catch {
    return null;
  }
}

export async function getSchedule(): Promise<Schedule | null> {
  "use cache";
  cacheLife("frequent");
  return safe<Schedule>("/club-schedule-season/OTT/now");
}

// Another club's season schedule (the Leafs, for Leafs Watch).
export async function getTeamSchedule(abbrev: string): Promise<Schedule | null> {
  "use cache";
  cacheLife("frequent");
  if (!/^[A-Z]{3}$/.test(abbrev)) return null;
  return safe<Schedule>(`/club-schedule-season/${abbrev}/now`);
}

// Score and state of any game, straight from the feed (not cached): for final-score checks.
export type GameSummary = {
  id: number;
  gameState: string;
  awayTeam: { abbrev: string; score?: number };
  homeTeam: { abbrev: string; score?: number };
  gameOutcome?: { lastPeriodType?: string };
  periodDescriptor?: { periodType?: string };
};
export async function getGameSummary(gameId: number): Promise<GameSummary | null> {
  return safe<GameSummary>(`/gamecenter/${gameId}/landing`);
}

export async function getScoresNow(): Promise<Scores | null> {
  "use cache";
  cacheLife("frequent");
  return safe<Scores>("/score/now");
}

export async function getScoresNowLive(): Promise<Scores | null> {
  "use cache";
  cacheLife("live");
  return safe<Scores>("/score/now");
}

export async function getStandings(): Promise<StandingRow[]> {
  "use cache";
  cacheLife("frequent");
  const data = await safe<{ standings: StandingRow[] }>("/standings/now");
  return data?.standings ?? [];
}

export async function getRoster(): Promise<Roster | null> {
  "use cache";
  cacheLife("daily");
  return safe<Roster>("/roster/OTT/current");
}

export async function getClubStats(): Promise<ClubStats | null> {
  "use cache";
  cacheLife("daily");
  return safe<ClubStats>("/club-stats/OTT/now");
}

export async function getPlayer(id: string): Promise<PlayerLanding | null> {
  "use cache";
  cacheLife("daily");
  try {
    return await get<PlayerLanding>(`/player/${encodeURIComponent(id)}/landing`);
  } catch {
    return null;
  }
}

// Live game data: cached for about 10 s, so every viewer shares one NHL call.
export async function getPlayByPlay(gameId: string): Promise<PlayByPlay | null> {
  "use cache";
  cacheLife("live");
  return safe<PlayByPlay>(`/gamecenter/${encodeURIComponent(gameId)}/play-by-play`);
}

export async function getBoxScore(gameId: string): Promise<BoxScore> {
  "use cache";
  cacheLife("live");
  try {
    return await get<BoxScore>(`/gamecenter/${encodeURIComponent(gameId)}/boxscore`);
  } catch {
    return {};
  }
}

export { LIVE_STATES, FINAL_STATES, name } from "./nhl-shared";
