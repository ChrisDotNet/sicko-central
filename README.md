# Sicko Central

An Ottawa Senators reference site with a live companion page for game nights. It sits beside the TV broadcast rather than replacing it.

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

## Media tab

Each game's Media tab has three parts:

- **News**, under Pregame and Postgame headings: NHL.com stories tagged with the game id, plus TSN and Sportsnet stories about the Sens from the 24 h before puck drop to 20 h after (`src/lib/news.ts`). Only headlines and the short summary from each outlet's RSS feed are shown; full articles open on the outlet's site.
- **Video**: recaps, condensed game, every goal and other highlights from NHL.com (`src/lib/video.ts`).
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
