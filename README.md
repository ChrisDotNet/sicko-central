# Sicko Central

The game-watching companion for Ottawa Senators fans: the thing you want in your hand while the game is on, alongside the TV broadcast (or the radio call), never replacing it. Everything else on the site supports that. See `BACKLOG.md` for what's next.

Built with Next.js (App Router, Cache Components), TypeScript and Tailwind. Hosted on Vercel Hobby.

## Pages

| Route | What it shows |
| --- | --- |
| `/` | Record, next game (or tonight's game), last result, division standings, team leaders |
| `/schedule` | Season schedule by month, home/away filter, links to recaps |
| `/live` | Live companion for today's game: "Right now" context card, shot map, game flow, goal replays, Sens skaters tonight, other Atlantic games |
| `/game/[id]` | A game's page: **Summary** (same components as the live page) and **Media** (News, Video, Audio) |
| `/roster` | Current roster with season stats |
| `/player/[id]` | Bio, season and career stats, last five games, season-by-season |
| `/standings` | Conference standings by division, plus the wild card race |

## Data

All data comes from the NHL's public, undocumented API (`api-web.nhle.com`). It's only called from the server, through `src/lib/nhl.ts`:

- Every fetch is cached with `use cache` (profiles in `next.config.ts`: `live` 10 s, `frequent` 1 min, `daily` 1 h).
- The live page polls `/api/game/[id]` every 15 s. That route sends `s-maxage=10`, so the Vercel CDN answers most polls and the NHL sees roughly one request per game every 10 s, however many people are watching.
- The browser never calls an NHL domain, except for embedded goal clips (see below).

The API can change without notice. If something breaks, `src/lib/nhl.ts` (fetching) and `src/lib/game.ts` (turning play-by-play into the live page's data) are the two places to look.

## Screen sizes

Phones get one column. Tablets (768 px and up) get two columns on the home, live and game pages and extra standings columns. Desktop (1024 px and up) moves the menu into the header and lays the live and game pages out in three columns: "Right now" and goals; shot map, shot attempts and skaters; then the out-of-town scoreboard and the latest media. The schedule becomes a month calendar from tablet up; roster, player and standings tables add columns as the screen widens; standings show divisions and conferences side by side on desktop.

The menu's **Game** tab (the `/live` page) reflects today's game through `/api/status`, polled by `src/lib/game-status.ts`: a gold dot on game day, and a red LIVE treatment with the score while the game is on (plus a red strip under the header on phones and tablets, on other pages). Page widths live in `Page` (`src/components/ui.tsx`); the game layout is in `GameSections`.

## Game-night features

- **Screen on**: during a live game the Game page keeps the phone's screen awake (Screen Wake Lock), with a switch beside the broadcast links. On by default; saved per device; hidden where the browser can't do it (`ScreenAwake`).
- **Starting goalies**: on game day until puck drop, both teams' expected starters and backups from the projected lineups in NHL.com's game preview (posted the day of the game), marked Confirmed when the preview's status report says a goalie "will start", Likely when it says "expected to start", otherwise Projected. Re-read every 10 minutes and refreshed on the page every 5; also a one-line "In goal" on the home page's Tonight card (`src/lib/goalies.ts`, `StartingGoalies`).
- **Intermission card**: at each intermission "Right now" becomes the period in one screen: countdown to puck drop (the NHL's intermission clock), the period's shots, attempts, high-danger chances, power plays and faceoffs, its goals with replays, a catch-up reel of every goal so far, the Sens who stood out (points, shots, hits, blocks, goalie saves) and a shortcut to the TSN 1200 intermission show. The shot map opens on that period (`IntermissionCard`; per-period numbers come from `buildGame`).
- **Favourite players**: star a player anywhere (skaters table, roster, player page); saved in the browser. Followed players get a "Your players tonight" strip, gold rows and goal highlights, and their own alert when they score or assist (`src/lib/favourites.ts`).
- **Did you know**: three game-day facts before puck drop and at intermissions, from NHL data only: birthdays, career milestones within reach (adjusted live, so a milestone reached tonight says so), point streaks, the team's streak and the season series (`src/lib/facts.ts`, `facts-shared.ts`).

## Home Screen app

`src/app/manifest.ts`, the icons in `public/` and the `appleWebApp` metadata make the site installable; it opens full screen. The home page shows an "add to Home Screen" card (`InstallPrompt`): an Install button where the browser offers one, the Share › Add to Home Screen steps on iPhone, nothing once installed or for 30 days after "Not now". Safe-area padding keeps the header and the pinned video player clear of the iPhone status bar.

## Media tab

Each game's Media tab has three parts:

- **Streaming links**: TSN and Sportsnet chips open the game's own event page on TSN+ or Sportsnet+, found in the lists those sites' Live pages read (TSN's "NHL - Live & upcoming" collection, about two weeks ahead; Sportsnet+'s NHL "Live & Upcoming" list, about a week) and matched by puck drop. Further out, or for other networks, the chip opens the service's live page (`src/lib/streams.ts`, `src/lib/broadcast.ts`). The next-game card, the no-game Game page and every upcoming game on the schedule put them in a Watch menu (not every network streams, so not "Streaming"), beside a Tickets menu; the live Game page has neither (`GameLinks`, `LinkMenu`; menus open upward when there's no room below).
- **Player birthdays**: a gold "Happy birthday" banner on the home page on the day (linking to the player), a quiet "turns 25 Saturday" line in the week before, and on the player page the current age next to the birth date, a "26 today" chip on the day and a "Turns … " note in the week before. Worked out in the browser from the roster's birth dates, so it's always Ottawa's today (`Birthdays`; `?today=YYYY-MM-DD` to test).
- **Next game card** (home page): the opponent's record, division place, last 10 and streak; the season series with the last meeting; the top game-day fact; broadcasts; and ticket links. On game day it turns gold and adds a countdown and the starting goalies (`NextGameCard`). Tickets: Ticketmaster's event page from the NHL schedule (`ticketsLink`) and Gametime's event page from Gametime's own event search, matched by puck-drop time, falling back to its Senators page (`src/lib/tickets.ts`). Plain links; affiliate links would need a paid Vercel plan.
- **Video tab layout**: one playlist in three parts, like the news: **Pregame** (Sens TV pre-game media, TSN and Sportsnet pieces posted before puck drop), **In game** (every goal in order, other highlights, and TSN/Sportsnet clips posted during the game) and **Postgame** (recaps and condensed game, then Sens TV pressers, TSN and Sportsnet). No auto-play: back and forward buttons step through that order. Timing comes from each video's posting time against puck drop.
- **Sens TV** (the club's YouTube channel, through the YouTube Data API; key in `YOUTUBE_API_KEY`): videos about a game (press conferences, morning skate, pre- and post-game; matched by the news window plus title cues or the opponent's name) appear in that game's Media › Video tab and play in YouTube's own player in the page. Every video also appears in Sens News as "Sens TV", opening on YouTube. Long-form uploads only, English only (the club's French series is left out, by YouTube's language tag or French words in the title); videos the club won't let other sites play open on YouTube (`src/lib/sens-tv.ts`, `YouTubePlayer`). YouTube's RSS feeds don't answer servers, hence the API.
- **Game page tabs**: Summary and Media have icons, and Media shows a red count of news, video and audio this phone hasn't seen yet (cleared by opening the tab; kept per game in the browser, `src/lib/unseen.ts`).
- **TSN 1200 strip**: one slim strip, start and stop only (`LiveRadioBar`, state in `src/lib/radio-store.ts`). It lives in the root layout, so the radio keeps playing while you move between pages. Shown on the Game page while a game is on; once started it follows you to every page, with a close button (×) off the Game page. The play/stop button is iHeartRadio's own, seen through a round window over its embedded player (a third-party frame can only start after a tap inside it); the rest of the player stays out of sight. If iHeart moves that button, update `BTN_X`/`BTN_Y` in `LiveRadioBar`. A full page reload stops it.
- **Leafs Watch**: when the Leafs play, their game leads the out-of-town scoreboard, turning red with "Leafs trail 😈" / "Leafs lose! 😈" (`src/lib/rivals.ts`). A "Leafs lose" alert (Just for fun, on by default, with sound) goes out at the final of every Leafs loss, any night: the daily plan (or a Sens game's first tick) books a check from about 2 h 15 min after the Leafs' puck drop, every 10 minutes, at most 12 times; losses that end in quiet hours reach quiet-hours phones with the morning alerts.
- **Player pages** (`/player/[id]`, tabs `?tab=career`, `?tab=contract`): This season leads with "the read" (rules-based sentences, `src/lib/player-read.ts`, nothing on pace or luck under 10 games) and an "Is it sustainable?" gauge (shooting % vs career and on-ice PDO for skaters; save % vs career and league for goalies), then role and ice time, form (last 10 chart and game rows), NHL ranks, EDGE tracking and a shot map; goalies get every start, save % by shot type, goals saved above average and quality starts (`src/lib/player-stats.ts`). Career builds the path, points a game by level, every season (regular season or playoffs), international events and the draft from the NHL player feed, which goes back to minor hockey (`src/lib/career.ts`). Contract shows PuckPedia's embeddable player summary (official US$ figures) until we have their data API.
- **Settings** (`/settings`, the header gear): Appearance (System, Dark, Light; System follows the device's light/dark setting live) and the notification settings (`/notifications` redirects here). The theme is a `data-theme` attribute on `<html>` set before first paint by `THEME_SCRIPT` (`src/lib/theme-script.ts`); colours are CSS variables in `globals.css` with a light set under `[data-theme="light"]`, so components use tokens (`bg-surface`, `text-good-text`, `var(--ink)` in SVGs) instead of hex values. On an installed iPhone app the strip behind the status bar stays dark, because its text is always white.
- **Stats through a Sens lens** (`src/lib/team-stats.ts`, `team-stats-shared.ts`): every number with its rank of 32 and the league average, from the NHL stats API (team summary, percentages, leading/trailing, goals by period, outshoot, power play; goalie and skater summaries) and NHL EDGE (team and skater tracking). Game page: a tale of the tape before puck drop (`TaleOfTape`, with a "Watch for" line picked from the biggest gaps), one-line season context during the game that shows only when it applies (`SeasonContext`: record after the last finished period, power play or penalty kill, the Sens goalie tonight vs season, shots at intermissions), and "What tonight changed" after the final (`AfterFinal`, via `/api/stats/after`). Stats tab (bottom menu, `/standings`): Standings | Sens team | Sens players (`?view=stats`, `&part=players`), with Team (rank tiles, how games go, playoff race) and Players (leaders with NHL rank, goalies, EDGE tracking, shot areas, last 10). The Next game card shows three tape rows.
- **Push notifications** (`/notifications`, the header bell): web push to phones that turn it on (on iPhone, once the app is on the Home Screen). Kinds: pre-game reminder (30 or 60 min), the game-day preview (NHL.com's projected lines and goalies, once) and the confirmed starting goalie, Sens goals, goals against, your followed players, end of each period, final; goal replays, recap/condensed, pressers and interviews, the TSN 1200 postgame show, game coverage (one alert per batch, at most two a game); birthdays and a morning news digest. Quiet hours (11 p.m.–8 a.m.) hold content and off-day alerts only. Goals, the final, the reminder and the starting goalie make a sound; the rest arrive silently (`SILENT_CATEGORIES`); goal alerts buzz short-short-long on Android. Web apps can't choose their own notification sound. Choices are kept on the phone and in Neon (`push_subs`). Scheduling: the daily job books today's checks with Upstash QStash (goalie checks, reminders, and a game watcher that re-books itself every minute, every two in intermissions and every five for three hours after the final). Budget guards: a 600-a-day message cap counted in Neon (free plan: 1,000), at most one retry per message, deduplication ids, a single game chain per game (token), a 260-tick and 8-hour limit per game, no QStash schedules used, and `NOTIFY_PAUSED=1` to stop everything. `/api/notify/status` shows today's usage. Needs `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` (from the Upstash integration), `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` (`src/lib/notify.ts`, `qstash.ts`, `push.ts`, `public/sw.js`).
- **All Sens news** (`/news`, and the latest six on the home page): every Senators story on NHL.com (league and club, tag `teamid-9`) plus TSN's and Sportsnet's Sens stories and Sens TV videos, grouped by day with an outlet filter. Stories about a game get a chip ("vs COL") linking to that game's Media tab. Saved in Neon (`news:sens`, newest 150) so they outlast the feeds; the daily job saves it too (`src/lib/sens-news.ts`). No paywalled outlets. News is in the desktop header; phones reach it from the home page.
- **News**, under Pregame, In game and Postgame headings like the Video tab (oldest first in each; in-game means posted within 2.5 h of puck drop, recaps always postgame): NHL.com stories tagged with the game id, plus TSN and Sportsnet stories about the Sens from the 24 h before puck drop to 20 h after (`src/lib/news.ts`). Only headlines and the short summary from each outlet's RSS feed are shown; full articles open on the outlet's site.
- **Video**: recaps, condensed game, every goal and other highlights from NHL.com (`src/lib/video.ts`), as a watch page: one player (pinned at the top on phones, beside the playlist on desktop) and a playlist, with back and forward buttons. The player loads on first play. The pop-up player is still used for the Summary tab's goal list.
- **TSN video**: interviews, analysis and TSN's highlights, found through the TSN stories already collected for the game (each story's linked video pages publish standard video details, including an official Bell Media embed address). They play in TSN's own player, ads included, inside the same frame as the NHL player. TSN videos expire about a month after posting and are hidden after their end date (`src/lib/tsn-video.ts`).
- **Sportsnet video**: Sportsnet's feed lists its videos (Brightcove clips tagged by team) next to its stories; Sens ones are matched to games like the stories and play in Sportsnet's own embedded Brightcove player (`getSportsnetVideosForGame` in `src/lib/news.ts`).
- **Thumbnails**: each outlet's own image from its feed or content API, loaded by the browser straight from the outlet (`Thumb`), never copied or passed through Vercel's image optimizer. TSN's are requested at 480 px.
- **Audio**: TSN 1200's radio call from its podcast feed (`src/lib/radio.ts`).

TSN's and Sportsnet's feeds only hold two to three days, so `src/lib/media.ts` saves each game's lists (headlines, links, clip ids; never the media itself, about 15 KB a game) in Neon Postgres (one `kv_store` table, created automatically) and merges them with what's live. A daily job (`/api/cron/collect`, `vercel.json`, 14:00 UTC) saves recent games even if nobody opens them. Without a database configured it falls back to memory, which works for development but forgets.

## Goal replays

Goal events in play-by-play gain a `highlightClip` id once the NHL posts the clip, usually a few minutes after the goal. The page plays it in the NHL's own Brightcove player in an embedded frame. If the embed ever stops playing, the dialog has a fallback link to the clip on NHL.com.

## Notifications

`src/components/notify/NotificationProvider.tsx` wraps the whole app. Any client component can raise an alert for time-sensitive content:

```tsx
const notify = useNotify();
notify({
  key: "goal-clip-6408310992112",           // dedupes: a key never shows twice per visit
  title: "Replay ready: Pinto goal",
  body: "OTT · 1st 07:11 · 1–0",
  tone: "gold",                              // "gold" for Sens content, "neutral" otherwise
  action: { label: "Watch", onSelect: () => openClip(6408310992112) },
});
```

Each alert shows a toast under the header (auto-dismisses after 10 s, at most three at once), plays a short chime and buzzes on Android. The bell in the header turns sounds on or off for that device. Browsers only allow sound after a tap, so the provider unlocks audio on the first tap anywhere.

Current uses, all on the live page: a goal's replay clip posts, and a recap, condensed game or new highlight posts. Alerts only fire for content that appears while the page is open, not for what was already there.

## Replay mode (testing without a live game)

`/live?replay=<gameId>` replays a finished game as if it were live, one minute of game time every 3 seconds. Goal clips "post" three game-minutes after each goal, so replay-ready alerts can be tested too. It's a testing tool, not linked anywhere in the site; open the URL directly. Example: `/live?replay=2026020288`.

## High-danger zone

A shot counts as high danger if it's in the slot drawn on the rink: between 31 and 0 ft from the goal line, widening from ±7.5 ft to ±11.5 ft toward the net. It's a simple, labelled definition, not an expected-goals model.

## Develop

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
npm run lint
```

## Deploy

1. In Vercel, **Add New → Project** and import this repo. The defaults are correct.
2. **Storage → Neon** (free plan), connect it to the project, and redeploy. This sets `DATABASE_URL`, which keeps each game's news after the feeds move on.
3. Optional: set `CRON_SECRET` to any long random string so only Vercel's daily job can call `/api/cron/collect`.
4. Add the domain under **Settings → Domains** once `sickocentral.ca` is registered.

Vercel Hobby is for non-commercial use. Adding affiliate links or ads means moving to Pro or another host.

## Not in the MVP

Goal alerts, fan reactions, franchise history back to 1992, share cards, affiliate links. The site is set to `noindex` while it's personal.
