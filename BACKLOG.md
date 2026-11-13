# Enhancements backlog

Chris's list, with how each could be done, what it's worth and what stands in the way.
Value and effort are relative to each other (S = an afternoon-sized change, M = a few
sessions, L = a project of its own). Updated 2026-11-13.

## Suggested order

1. Player birthdays + game-day facts (data-driven "Did you know")
2. All Sens news, not just game days
3. Full career on the player page (junior, Europe, international, playoffs)
4. Ticket links for home games
5. Favourite players
6. Sens franchise history
7. Podcasts tab
8. Player contracts (parked until there's a legitimate data source)

## Items

### Animate the Game ("Live") tab during a game — **Done** (2026-11-13)
Tab renamed to Game. Gold dot on game day; during the game a red pulsing LIVE tab (phone),
a red LIVE pill with the score (desktop) and a red score strip on other pages.

### Player birthdays — Value: medium · Effort: S
The roster feed has every player's birth date. Show "Happy birthday" on the home page and the
player page, and include it in game-day facts when it falls on a game day (Pinto's OT winner
on his birthday is the example). No new source needed.

### 3 game-day facts per game ("Did you know") — Value: high · Effort: M
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

### Favourite players — Value: medium–high · Effort: M
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
