# Enhancements backlog

Chris's list, with how each could be done, what it's worth and what stands in the way.
Value and effort are relative to each other (S = an afternoon-sized change, M = a few
sessions, L = a project of its own). Updated 2026-11-13. Value is judged against the mission.

## The mission (the filter for everything below)

Sicko Central is **the game-watching companion for Sens fans**: the thing you need in your
hand while the game is on, alongside watching on TV (first) or listening on the radio
(second). Everything else is secondary. Each idea gets weighed by one question: does it make
the next game better to watch?

## Bugs

- **Streaming links go to the wrong place** (reported 2026-11-13). The SN1 link goes to
  https://www.sportsnet.ca/watch/, which is a 404. It should go to the game's own page on
  Sportsnet+, e.g. https://watch.sportsnet.ca/event/Ottawa_Pittsburgh_229090 for Nov 14 at
  PIT. Needs a way to find each game's event id (229090); check the other networks' links too.

## Suggested order

**Tier 1: makes the live game better**
1. ~~Keep the screen awake during a game~~ Done 2026-11-13
2. ~~Favourite players, with live alerts~~ Done 2026-11-13
3. ~~Game-day facts ("Did you know")~~ Done 2026-11-13
4. ~~Intermission card~~ Done 2026-11-13
5. ~~Install to home screen~~ Done 2026-11-13. Next: push notifications (pre-game reminder, then goal alerts) via Upstash QStash

6a. ~~Starting goalies on game day~~ Done 2026-11-13 (NHL.com game preview)

**Tier 2: around the game**
6. Player birthdays (mostly feeds the game-day facts)
7. Ticket links for home games
8. All Sens news, not just game days

**Tier 3: reference (good for the off-season, not the mission)**
9. Full career on the player page
10. Sens franchise history
11. Podcasts tab
12. Player contracts (parked: no legitimate data source yet)

## Items

### Animate the Game ("Live") tab during a game — **Done** (2026-11-13)
Tab renamed to Game. Gold dot on game day; during the game a red pulsing LIVE tab (phone),
a red LIVE pill with the score (desktop) and a red score strip on other pages.

### Keep the screen awake during a game — **Done** (2026-11-13)
Phones dim and lock in a minute or two, which is exactly wrong for a second screen. The
browser's Wake Lock API keeps the screen on while the Game page is open and a game is live
(Chrome, Edge and Safari 16.4+ support it), released at the final or when you leave.
With a visible on/off switch.

### Intermission card — **Done** (2026-11-13)
At each intermission, swap the "Right now" card for the period in one screen: score and shots
for the period, goal replays from it, power plays, top Sens skaters, the out-of-town scores,
and the TSN 1200 intermission show. That's the time fans actually pick the phone up.

### Install to home screen — **Done** (2026-11-13)
Manifest, icons, full-screen launch, an "add to Home Screen" card on the home page (Install
button on Android/desktop Chrome, Share › Add to Home Screen steps on iPhone), and a Back
button on game pages since the installed app has no browser back button.

### Push notifications — Value: high · Effort: M (reminder) / M (goal alerts)
Proposed 2026-11-13: web push, opted in with a button, subscriptions saved in Neon. A
pre-game reminder (30 or 60 min before puck drop) booked each morning by the daily job as a
delayed Upstash QStash message (free plan: 1,000 messages a day, delays up to 7 days); at
send time it re-checks the start time. iPhone requires the app to be installed first (done).
The same setup can send goal alerts while the app is closed (QStash calling the site about
every minute during a game, ~200 messages a game). Needs a QStash token and signing keys in
Vercel. Original note:
Installing (a web app manifest plus icons) puts Sicko Central on the home screen, opening
full screen like an app. Push alerts while the app is closed ("Sens score!") need a server
that watches the game and sends them; Vercel Hobby can only run a scheduled job once a day,
so that needs a paid plan or an outside service. Alerts while the page is open already work.

### Player birthdays — Partly done: in game-day facts. Home/player page greeting still open · Effort: S
The roster feed has every player's birth date. Show "Happy birthday" on the home page and the
player page, and include it in game-day facts when it falls on a game day (Pinto's OT winner
on his birthday is the example). No new source needed.

### 3 game-day facts per game ("Did you know") — **Done** (2026-11-13; season series, streaks, milestones, birthdays)
Do it from data, not free-form AI: an AI asked for "notable facts" will invent some, and a
wrong stat on a fan site is worse than none. Candidates the NHL API can back up:
- Birthdays on game day.
- Milestones within reach: career goals/points/games close to a round number
  ("Stützle needs 3 goals for 150"), from career totals.
- Streaks: point streaks and goalie runs from each player's game log.
- Season series and history against tonight's opponent.
Rank by how notable each is and show the top three on the game page before puck drop.
An AI model could optionally reword the chosen facts, but only to phrase what the data says.

### All Sens news, not just game-specific — Value: high · Effort: S
The NHL.com, TSN and Sportsnet feeds are already read and filtered for the Sens; today only
stories near a game are kept. Add a News view (home page section plus its own page) with
every Sens story, saved the same way so it outlasts the feeds. Same headline-and-summary
rule: full articles open on the outlet's site.

### Player career drill-down — Value: high · Effort: S (NHL data) / M (with Elite Prospects)
- **NHL API (free, already used):** the player feed includes every league a player has played
  in, not just the NHL (checked: Stützle's lists DEL, DNL, Champions HL, World Juniors,
  Olympics). Add an "NHL | All leagues" switch and a playoffs view to "By season".
- **Elite Prospects:** has an official API. Free tiers (1,000 or 5,000 calls a month,
  non-commercial) suit a hobby site; the commercial plan is roughly $1,400 CAD a year. Worth it
  later for prospects and draft detail, but the NHL data covers most of the career story.
- **HockeyDB:** no API, and its pages are its own compiled work; copying them isn't a good
  idea. Link out at most.

### Ticket links (Ticketmaster, Gametime) — Value: medium · Effort: S
Ticketmaster's Discovery API is open with a free key (5,000 calls a day) and can find the event
page for each Sens home game; add a "Tickets" link on upcoming games. Gametime has an affiliate
programme, but affiliate links are commercial use, which Vercel Hobby doesn't allow; plain
links now, affiliate links when the site moves to a paid plan. These links do leave the app.

### Favourite players — **Done** (2026-11-13; live on-ice view still open)
Let you star players (saved in the browser, no accounts). Starred players get highlighted in
the skaters table, goals and roster, and an alert fires when one scores or gets a point.
"Highlight when they're on the ice" is the hard part: the NHL publishes shift data (checked:
771 shifts for the Nov 12 game), but it isn't reliably live, often arriving after a period.
Realistic version: live points and shots, plus a shift-by-shift ice-time view after each period.

### Sens franchise history — Value: medium–high · Effort: M
Use the NHL's own records API rather than HockeyDB: it has Ottawa's season-by-season results
since 1992–93 (checked: 34 seasons, with records, goals, playoff rounds), plus franchise
records and playoff series. A History page with every season, best and worst years, playoff
runs and all-time leaders. Good off-season content.

### Podcasts tab — Value: medium · Effort: S–M
Podcasts are public RSS feeds, so a hand-picked list can play in the app's own player (the one
built for the TSN 1200 radio call), newest episodes first, with alerts for new episodes.
Needs Chris's list of shows.

### Player contracts — Value: medium · Effort: blocked
- **PuckPedia:** has private APIs ("contact us for pricing") and a free Connector that turns
  player names into links to its pages. The Connector sends people off-site, which cuts
  against keeping them in the app. Copying its pages isn't an option.
- **CapFriendly:** closed in 2024.
- **Fallback:** a hand-maintained contract table for the current roster (about 25 players,
  updated when signings happen). Cheap and honest, but it's manual upkeep.
Revisit if PuckPedia's API pricing suits a hobby site.
