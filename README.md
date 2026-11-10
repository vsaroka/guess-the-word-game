# Guess the Word

Browser prototype of a vocabulary game. The left panel lists words in the language you already know
(e.g. German); the right panel lists shuffled translations in the language you want to learn (e.g. French).
Select a word on the left, then its translation on the right, before the timer runs out.

## Run

No build step. Open `src/index.html` in a browser, or serve it:

```
npm start      # http://localhost:8080
npm test       # level/vocabulary checks (Node 18+)
```

## Android (installable web app)

The game is a PWA (`manifest.webmanifest`, `sw.js`, `icons/`). It needs HTTPS (or localhost) for install and offline support.

1. Host the `src/` folder on any static HTTPS host (GitHub Pages, Netlify, Cloudflare Pages).
2. Open the URL in Chrome on Android, then menu → "Install app" / "Add to Home screen".
3. Optional Play Store listing: wrap the hosted URL with [PWABuilder](https://www.pwabuilder.com) or Bubblewrap (Trusted Web Activity), or use Capacitor for a native shell.

The service worker is network-first: online it always loads the newest files, offline it falls back to the cache. Bump `CACHE` in `src/sw.js` when you change the file list. An installed copy running an older service worker needs one or two reloads (or closing and reopening the app) to pick up the first network-first version.
The timer pauses while the app is in the background.

## Version and build date

The start screen shows `Version x.y.z · built <date> · <commit>`, so you can see which copy of the game a device runs.
Run `npm run stamp` before installing or publishing: it writes `src/js/version.js` from the version in `package.json`, the current time and the last git commit. Bump `version` in `package.json` for releases.

## Rules

- 100 levels per language pair; progress and score are stored in `localStorage`.
- A wrong match costs 3 seconds. Running out of time means retrying the level.
- Score per level: 10 per pair + 2 per second left.

## Practice and statistics

- Words you match wrongly go to a failed list. "Practice failed words" replays them (up to 8 words, padded to at least 4 with filler words) until you get them right.
- "Statistics" shows level progress, win rate, match accuracy and your hardest words per language pair.

## Difficulty curve (`src/js/levels.js`)

| Knob | Level 1 | Level 100 |
|---|---|---|
| Words in each panel (same on both sides) | 4 (+2 per level) | 30 (capped from level 14) |
| Time per pair | ~8.9 s | ~3.2 s |
| Vocabulary pool (easy → hard) | 20 words | all words, half drawn from the hardest 40% |

## Layout

```
src/index.html        screens (start, game, result overlay)
src/css/style.css
src/js/vocab.js       vocabulary ordered easy→hard; de, fr, en, es
src/js/levels.js      pure difficulty/selection logic (browser + Node)
src/js/game.js        UI, timer, matching, persistence
test/levels.test.js
```

## Extending

- New language: add a code to `LANGUAGES` and a column to every row in `vocab.js` (the test enforces completeness).
- More words: append rows in difficulty order; the level curve adapts to the list size.
- Ideas: audio, reverse mode at high levels, multi-meaning words, daily challenge, backend leaderboard.
