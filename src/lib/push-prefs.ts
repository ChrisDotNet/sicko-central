// What each phone has asked to be notified about. Shared by the settings page and the server.

export const CATEGORIES = [
  // Game night
  { key: "pre", group: "game", title: "Pre-game reminder", sub: "Time, channel and who starts in goal", on: true },
  { key: "goalie", group: "game", title: "Starting goalie", sub: "When NHL.com's preview names the Sens starter", on: true },
  { key: "sens", group: "game", title: "Sens goals", sub: "Scorer, time and score, within a minute or so", on: true },
  { key: "against", group: "game", title: "Goals against", sub: "", on: false },
  { key: "fav", group: "game", title: "Your players", sub: "Goals and points by players you follow (★)", on: true },
  { key: "period", group: "game", title: "End of each period", sub: "Score and shots", on: true },
  { key: "final", group: "game", title: "Final score", sub: "", on: true },
  // New content
  { key: "replay", group: "content", title: "Goal replays", sub: "When a Sens goal's replay is up", on: false },
  { key: "recap", group: "content", title: "Recap and condensed game", sub: "Usually an hour or two after the final", on: true },
  { key: "pressers", group: "content", title: "Pressers and interviews", sub: "Sens TV postgame media, TSN and Sportsnet", on: true },
  { key: "radio", group: "content", title: "Radio call", sub: "When the TSN 1200 postgame show is ready", on: false },
  { key: "news", group: "content", title: "Game coverage", sub: "One alert for new stories about the game, not one per story", on: true },
  // Off days
  { key: "bday", group: "off", title: "Player birthdays", sub: "Morning of", on: false },
  { key: "digest", group: "off", title: "Morning news digest", sub: "New Sens stories since yesterday, once a day", on: false },
  // Just for fun
  { key: "leafs", group: "fun", title: "Leafs lose", sub: "At the final whistle of every Toronto Maple Leafs loss, any night. Late ones come with breakfast if quiet hours are on.", on: false },
] as const;

export type Category = (typeof CATEGORIES)[number]["key"];

export type Prefs = {
  on: Category[];
  remind: 30 | 60; // minutes before puck drop
  quiet: boolean; // no content or off-day alerts 11 p.m.–8 a.m. Ottawa time
  favs: number[]; // followed player ids (from this phone's ★ list)
};

export const DEFAULT_PREFS: Prefs = {
  on: CATEGORIES.filter((c) => c.on).map((c) => c.key),
  remind: 30,
  quiet: true,
  favs: [],
};

const KEYS = new Set<string>(CATEGORIES.map((c) => c.key));

// Whatever came in, as valid prefs.
export function cleanPrefs(p: unknown): Prefs {
  const x = (p ?? {}) as Partial<Prefs>;
  return {
    on: Array.isArray(x.on) ? (x.on.filter((k) => typeof k === "string" && KEYS.has(k)) as Category[]) : DEFAULT_PREFS.on,
    remind: x.remind === 60 ? 60 : 30,
    quiet: x.quiet !== false,
    favs: Array.isArray(x.favs) ? x.favs.filter((n) => Number.isInteger(n)).slice(0, 50) : [],
  };
}

// Content and off-day alerts wait out quiet hours; game alerts never do.
export const QUIET_CATEGORIES = new Set<Category>(["replay", "recap", "pressers", "radio", "news", "bday", "digest", "leafs"]);
