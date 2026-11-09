# Guess the Word: implemented features

Status of the prototype in `src/`. Plain HTML, CSS and JS with no build step.

## Gameplay

- **Two-panel matching.** The left panel lists words in the language the player knows. The right panel lists shuffled translations in the language being learned. The player selects a left word, then its translation on the right.
- **Correct match.** Both entries turn green and are locked.
- **Wrong match.** The tapped entry shakes and the timer loses 3 seconds.
- **Level cleared** when every pair is matched. A result overlay offers "Next level".
- **Level failed** when the timer reaches 0. The overlay offers "Retry" for the same level.
- **Finish.** Clearing level 100 shows a completion message with "Play again", which restarts from level 1.
- **Menu button** in the game bar and on the overlay returns to the start screen and stops the timer.

## Languages

- Four languages: German (`de`), French (`fr`), English (`en`), Spanish (`es`).
- The player picks the language they speak and the language they want to learn. Any combination works except identical languages (Start is disabled).
- About 130 vocabulary entries, ordered from easy to hard. Every entry has all four languages.

## Levels and difficulty

100 levels. Difficulty is computed in `src/js/levels.js`.

| Parameter | Level 1 | Level 100 |
|---|---|---|
| Words in each panel (same count on both sides, every word has a match) | 4 (two more every level) | 30 (capped from level 14) |
| Time per pair | about 8.9 s | 3.2 s (floor) |
| Vocabulary pool | 20 easiest words | all words |

- The level time is pairs multiplied by the time per pair.
- Half of the pairs in each level come from the hardest 40% of the pool, so later levels feel harder.
- Words are random each attempt. They are unique within a level.

## Practice mode (retry failed words)

- A word is added to the failed list when the player picks a wrong translation for it, or when it is still unmatched at timeout.
- "Practice failed words (N)" on the start screen starts a round with up to 8 of the failed words, 8 seconds per word. If fewer than 4 words failed, random filler words pad the round to 4 so both panels stay equal. Fillers are not counted in statistics or the failed list.
- A word leaves the list when it is matched without a mistake in practice mode.
- Practice rounds do not change level progress or score. Retry and "Practice again" are offered until the list is empty.
- The failed list is kept per language pair.

## Statistics

Per language pair, opened with "Statistics" on the start screen:
- highest level reached, levels cleared (of 100), level attempts, win rate
- match accuracy (correct matches against mistakes), practice rounds cleared, total score
- number of failed words waiting for practice
- the 10 hardest words with their miss counts
- "Reset statistics" clears the statistics and the failed list for the pair (with a confirmation).

## Timer

- Countdown bar and seconds display. The bar turns red below 25% of the time.
- The timer pauses when the tab or app goes to the background and resumes when it returns.

## Scoring and progress

- Score on clearing a level: 10 points per pair plus 2 points per second left.
- A running total is shown in the game bar.
- Progress (highest unlocked level) is stored per language pair in `localStorage`, so German to French and German to English have separate progress. The total score is shared.
- "Reset progress" on the start screen resets the level for the selected language pair only. It does not reset the score.
- The game falls back to defaults if `localStorage` is unavailable or empty.

## Interface

- Start screen, game screen and result overlay.
- Dark mode follows the system setting.
- Mobile layout: buttons at least 48px tall, a narrow-screen layout under 480px, and safe-area padding for notches.

## Android and offline (PWA)

- Web app manifest, three PNG icons (192, 512 and a maskable 512) and a service worker that caches all game files for offline play.
- Installable from Chrome on Android over HTTPS or `localhost`.
- The service worker is not registered when the page is opened directly from disk (`file://`).
- Tested on a Pixel 7a: served from the PC over USB port forwarding, installed from Chrome, and confirmed by the user to work offline after unplugging.
- Saved progress belongs to the `localhost:8080` address it was installed from. Moving to a hosted URL later starts with empty progress.

## Project and tests

- `test/levels.test.js` (Node's built-in test runner, `npm test`) checks that difficulty never decreases, every level picks valid unique words, and every language has complete, unambiguous vocabulary. It also covers the +1 option growth and the practice round. Five tests, all passing.
- `npm start` serves `src/` on port 8080.

## Not implemented

- Audio or pronunciation.
- User accounts, cloud sync or leaderboard.
- Reverse mode (translation to native word) or multiple meanings per word.
- Keyboard controls.
- Hosting. The game currently runs only from a local server.
- A native Android package (APK or Play Store listing).
