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

## Rules

- 100 levels per language pair; progress and score are stored in `localStorage`.
- A wrong match costs 3 seconds. Running out of time means retrying the level.
- Score per level: 10 per pair + 2 per second left.

## Difficulty curve (`src/js/levels.js`)

| Knob | Level 1 | Level 100 |
|---|---|---|
| Pairs to match | 4 | 12 |
| Distractor translations on the right | 0 | 6 |
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
