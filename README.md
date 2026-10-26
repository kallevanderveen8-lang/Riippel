# Ripple

A calm wave-interference puzzle for **desktop browsers with mouse and keyboard**, built with **Canvas 2D + vanilla JavaScript**. Six photorealistic lake plates, small journal previews, a transparent stone atlas and an angular boulder are bundled locally as WebP images. There are no runtime packages or art downloads; sound is synthesized with WebAudio.

The visual direction follows the supplied minimalist lake reference: natural teal water, intricate caustics, detailed shore rocks and mineral-textured stones. The lake fills the viewport. A small level identifier/title sits left, **Collection** is centered above the lake, and daily/sound/pause controls sit right. The logo and tagline are absent. Collection opens directly on ten level cards for the current lake; Today, Milestones, Day & night and Shop are secondary tabs. The supported release target is the ten CrazyGames desktop frames, from 800×450 to 1920×1080, plus a 3840×2160 presentation; mobile is outside the current release scope.

The six landscapes are Morning lake (woodland), Evening light (reed shallows), After the rain (rainforest pool), Moonlit water (rocky cove), Autumn glow (amber woodland), and Alpine dawn (mountain basin). Each has its own photographic-style lake plate and matching small journal preview. Levels 1–10 stay at Morning lake, 11–20 at Evening light, and so on; after level 60, the six environments return in new ten-level runs. Day and night can be selected separately for each unlocked lake. The water and stones are separate: the wave simulation, stone placement and level collision remain interactive. Image loading falls back to the original procedural scene if a local asset fails. The lake plates are packaged at 3840×2160 pixels; their generated source images were 1672×941 and were upscaled for export, so they do not contain native 4K source detail. At large display sizes, the static lake plate retains its full resolution while the animated canvas is capped at 2048×1152 for smoother play.

The first 30 campaign puzzles have fixed, verified layouts. Later shores alternate shorter openings, denser middle puzzles and five-stone finales; every generated solution is checked against the wave model. A failed drop marks the closest unlit lantern and gives a short adjustment cue, while later retries run faster. The daily puzzle now pays one coin after the first puzzle; two more optional puzzles complete the shareable trail. Collection has lake postcards, additional claimable milestones and cosmetics that unlock gradually. In-progress puzzles from older saves retain their original generation profile.

## Play and upload

Requirements: Node.js 20+ for the development tools. The game itself runs in a browser.

```sh
npm start
```

Open **http://localhost:4173**. Use HTTP rather than opening `index.html` as a `file://` URL: ES modules and workers need a web origin.

```sh
npm run build
```

This creates:

- `dist/` — static production files; no test/solution console harness.
- `releases/ripple-crazygames.zip` — upload this ZIP to CrazyGames. `index.html` is at the ZIP root.
- `reports/build.json` — measured compressed/uncompressed sizes.

The default package is **Basic Launch**: all ad offers and requests are disabled. After CrazyGames invites the game to Full Launch, run `node tools/build.mjs --full` to create `dist-full/` and `releases/ripple-crazygames-full.zip`. Full Launch enables the guarded ad adapter; it does not bypass CrazyGames availability/cooldown decisions.

To test exactly the production files: `node tools/serve.mjs dist`.

In the CrazyGames submission, enable **Progress Save / Data Module**. Test the upload in the portal preview with SDK Inspector, an ad blocker, and normal/rewarded ad scenarios before submitting for review. The repository does not submit or publish the game to CrazyGames automatically.

## How to play

1. Click open water to place a stone. All stones fall together when you press **Drop stones**.
2. Light every lantern. Overlapping positive wave heights add together; reflected waves count too.
3. Drag a stone to move it; right-click to remove it. Before level 15, clicking a stone also removes it. From level 15, clicking cycles its delay through **0 / 1 / 2 seconds**. Dragging outside the lake still removes it.
4. **Reset** clears the stones. **Undo** restores your last placement, move, removal, timing change or reset (up to 30 edits in the current lake, while planning between drops). Failed drops keep the stones. There are no lives, timers or attempt limits.
5. Use at most par stones for three stars, par + 1 for two, otherwise one. Beating par gets its own celebration.

From pond 3, faint gold sanctuaries protect the water around lanterns. You cannot place stones inside them. This closes the obvious “drop directly on each lantern” shortcut. Reflections can still yield clever below-par solutions.

Keyboard: Tab to the lake, use arrow keys to aim (Shift moves four cells), Enter to place or edit a stone, Delete/Backspace to remove it, Space to drop, Ctrl/Cmd Z to undo an edit, and 0 to center the camera. These shortcuts act while the lake is focused. Use the mouse wheel to zoom around the pointer; drag empty water to pan. Clicking empty water still places a stone, and dragging a stone still moves it. Collection's horizontal tabs support Left/Right, Home and End; Escape closes native dialogs. The **? Help** button explains the puzzle and exposes earned guidance; **How to play** shows three immediate steps, with keyboard and camera controls on request. Both pause the current puzzle. The Settings menu saves sound, lake ambience, calmer motion, clearer contrast and toolbar position. Turning off lake ambience keeps stone and lantern effects. Results keep keyboard focus within their choices, including the optional star bonus disclosure.

Menus use a consistent dark teal lake palette, scenic imagery, editorial journal sections and clear focus states. Text scales with browser text settings. The UI respects reduced motion, reduced transparency and increased contrast where the browser exposes those preferences, with in-game motion and contrast overrides in Settings. Timing labels retain their proportions when the game frame changes. See the [CrazyGames menu research](docs/crazygames-menu-research.md) for the observed competitors and resulting choices, the [minimal UI redesign review](docs/minimal-ui-redesign.md) for palette and layout, and the [desktop design and retention review](docs/desktop-design-and-retention.md) for progression and research limitations.

Campaign levels 1–30 are fixed and verified. Level 3 introduces interference; two failed attempts on levels 3–5 reveal faint launch rings. Rocks arrive on level 7, larger puzzles on level 10, optional timed stones on level 15. Every fifth later level includes a delayed stone in its certified solution.

## Progression

- The first 120 levels are grouped into twelve ten-level lakes. The first six use distinct local art; the second six revisit those environments with new puzzles. Procedural generation continues beyond level 120. The location follows the level; day/night is saved for each lake.
- The existing five-level scoring chapters still grant three bonus stars and two coins once, and another two coins for all 15 chapter stars. Completing all ten levels of a lake grants four more coins once. Lantern progress and total stars remain in the small gameplay status pill.
- Best stone/drop records and the Collection level cards let players revisit unlocked lakes for three stars. Stars, chapter rewards and coins cannot be farmed by repeating a solve. The next locked lake can be unlocked early for three coins after the first solve; completing the preceding lake always unlocks it for free. Only the immediate next lake can be bought, so a purchase never strands the player.
- When a lake has completed levels below three stars, **Improve level** recommends an unlocked level closest to mastery. Players can return directly to their unlocked journey afterward.
- Each first journey solve earns one coin. Players begin with three. After two failed attempts, the Hint dialog offers a solution ring for one coin; after four failed drops, free rings are available regardless of coins. After six, an optional guided layout places the certified solution so the player can watch and learn. Assistance keeps stars and progression.
- The daily puzzle unlocks after level 3. Its first short puzzle pays one coin once per UTC date; the two optional follow-up puzzles complete the shareable trail and grant two more coins once. All three are seeded by UTC date and stage, so players share the same geometry. Closing and reopening restores the current stage and placed stones; finishing the trail grows the streak.
- The daily share card reports up to 9 stars, total stones, and 3/3 lakes, with clipboard fallback. It contains no ad bonus stars.
- Thirty-six milestones track levels, lake postcards, three-star solutions, daily trails, stars and daily visits. Completed milestones show a **Claim** action; the coin reward and brief animation occur once, and the result screen points to ready claims. A daily visit gift pays two to seven coins and restarts its streak after a missed UTC day. The Shop sells natural and playful stone skins and lantern finishes for earned coins, with new items appearing as players progress. Owned items, choices, claims and visits survive reloads. Collection can resume the highest unlocked level.
- Three daily goals with small bonuses; replaying a completed pond cannot repeatedly farm its stars or goals.
- Local save in standalone mode. When the initialized CrazyGames SDK Data module is present, it becomes the save backend. Cloud data is read before writing; a late initialization reconciles earned progress.
- Mid-level placement, delays, attempts and completed reward screens survive reloads.

The first visit opens a short, optional introduction over the first lake. Choosing **Show me how** leads through placing a real stone and dropping it; players can skip at any time. The introduction stays completed after reload, and existing saved players are not interrupted. A placement cue appears after five seconds on an unfinished first lake; routine instructions stay in Help. Invalid actions and failed-drop feedback appear briefly above the toolbar. Chimes, particles, a brief zoom finish and the daily-unlock reveal follow the player's actual actions. The requested 0:15 / 0:45 / 1:30 milestones are pacing targets, not forced timers. Browser autoplay restrictions mean sound starts with the first user gesture.

## Simulation and generation

All physics/gameplay parameters are in `src/config.js`; authored geometry lives in `src/scripted.js`. Visual drawing coordinates are in the renderer/CSS.

- Fixed 128 × 128 `Float32Array` height, previous-height and peak grids on every device.
- `hNew = fround((2*h - hOld + 0.22*laplacian(h)) * 0.996)`.
- Reflective zero-gradient pond and rock boundaries, implemented through self-neighbour substitution.
- Arithmetic quartic bumps, amplitude 1, radius 4; both height buffers receive the same bump.
- A 60 Hz accumulator advances two simulation steps per tick. A failed drop lasts 360 steps / three simulated seconds, independently of display refresh rate. Delays are exact integer step offsets.
- No trigonometric/exponential functions in the physics or seeded generator. Trigonometry is only used for cosmetic drawing/audio.
- Seeded Mulberry32 RNG, integer placements, deterministic shuffle and candidate ordering.
- Generated lanterns require combined peak >= `1.15*T`, and each constituent single-stone peak <= `0.7*T`. Every returned level has a solution certificate. Placement and spacing checks are applied as well.
- The optimized generator simulates the entire single-stone height field but records single-stone peaks only at already eligible lantern cells. Tests establish equality with full peak tracking at those cells; this does not approximate the simulation.
- The next level and daily pond are generated in a worker while the current pond is playable. Fixed onboarding ponds load without runtime generation. If workers are unavailable, generation falls back to the main thread.

Generation uses a seeded mirrored pair plus random extra stones, rather than unrestricted independent random placement. This makes constructive bands more reliable and keeps resampling rare. Rocks are included before evaluating any wave solution. Par is the construction budget, **not a proof of the minimum possible stone count**.

## Validation and tuning

```sh
npm test                         # deterministic physics, saves/rewards, SDK failure handling
npm run calibrate                # one-stone and two-stone peak tables
npm run benchmark                # 300 levels, 24 black-box search attempts each
node tools/benchmark.mjs 30 48    # smaller/custom search
node tools/script-levels.mjs     # rebuild fixed onboarding after intentional physics changes
```

F3 toggles a debug overlay: level time, attempts, session drops, generation time, seed, step and lantern peaks versus threshold. F3 does not reveal a solution. The fixed 128² lake projects across the **entire canvas**, with independent horizontal/vertical scale. Consequently circles project as ellipses on rectangular screens, while solutions and timing remain identical. Stones and lantern sprites retain their proportions. There is no hidden central play square. **Settings → Controls at the top** or the move button in How to play moves the tray so every covered water cell remains accessible. A win stops scoring, but water keeps simulating to 720 steps to let waves travel to the shoreline; those extra visual steps never count toward solving a failed attempt. The development-only `?test` harness is stripped by the build tool.

### Calibration

`T = 0.065`, using a centered stone in an empty reference pond:

| Distance in cells | Single-stone peak | Lights |
|---|---:|---|
| 15 | 0.08990 | Yes |
| 20 | 0.06530 | Yes |
| 25 | 0.04938 | No |
| 30 | 0.03733 | No |
| 40 | 0.03476 | No |
| 50 | 0.03632 | No |

Two stones at (40,64) and (88,64) produce 0.06863 at (64,104), approximately 46.6 cells from each stone. Two stones at (36,64) and (92,64) each produce 0.04157 at (64,64); together they produce 0.08314. Boundaries and rocks can focus waves, so these reference distances are not universal distance cutoffs.

### 300-level measurement

Measured on Node 24.19.0 / AMD EPYC 9V74. `reports/benchmark.json` contains every seed and result; `reports/benchmark-before-tuning.json` preserves the baseline.

| Metric | Before peak-tracking optimization | After |
|---|---:|---:|
| Verified solution + margin failures | 0 / 300 | 0 / 300 |
| Generation median | 203.3 ms | 182.0 ms |
| Generation p90 | 225.2 ms | 215.6 ms |
| Generation maximum | 331.8 ms | 303.7 ms |
| Generations >= 200 ms | 179 / 300 | 71 / 300 |
| Blind bot solved within 24 attempts | 161 / 300 | 161 / 300 |
| Median / p90 attempts, solved levels only | 13 / 23 | 13 / 23 |
| Median / p90 with budget-capped failures | 23 / 24 | 23 / 24 |
| First-attempt solves flagged as potentially trivial | 4 / 300 | 4 / 300 |

The bot uses randomized hill climbing and only public geometry/peak feedback; it never reads `level.solution`. Its 139 failed searches are budget exhaustion, **not impossible levels**: every construction certificate passed. The unchanged solve counts also verify that peak-tracking optimization preserves generated puzzles.

Tuning performed: threshold calibration; fixed, symmetric interference lessons on ponds 3–4; tighter mirrored-pair separation; candidate selection near constructive bands; sparse peak tracking; 48 px minimum touch hit regions; and near-miss arcs around unlit lanterns after a failed drop.

**Remaining targets:** generation is not below 200 ms in every case, and the blind solver does not meet a 3–6-attempt target. The worker removes generation from the interactive thread but does not make the raw computation faster. Human 60–120-second levels, 20-minute sessions, first-minute conversion and next-day retention require real playtests/portal analytics; they are not proven by these tools. Treat the later curve as a playtest candidate, not finished commercial balance.

### Browser and visual test

```sh
npm install --no-save --package-lock=false playwright@1.56.1
npx playwright install --with-deps chromium
npm run test:browser
npm run test:ui
```

GitHub Actions runs the same checks and uploads screenshots, the browser report and the upload ZIP as **ripple-validation-and-upload**. The script checks initial interaction, mid-level restore, all ten onboarding solutions, chapter rewards, failed attempts, earned hints, delays, pause/resume, three daily stages, active-mode/stage/stone restore on reload, sharing, replay anti-farming, all ten CrazyGames desktop frame sizes, full-screen pointer mapping, 60/144 Hz peak equality, and mocked SDK/cloud/ad/mute behavior.

The separate UI suite checks keyboard play and timing edits, Undo and right-click removal, modal focus, bonus accessibility and one-time rewards, journal navigation, mastery recommendations, drag offset, all four journal sections at compact through Full HD desktop sizes, 200% text, safe areas, computed text contrast and accessibility preferences. It writes `reports/ui.json` and `reports/ui/` screenshots. In the managed workspace, use a disposable copy as described in [AGENTS.md](AGENTS.md) to keep generated reports and archives separate from source changes.

The current local validation runs unit, browser and UI checks in a disposable copy; the browser suite includes all ten CrazyGames desktop sizes and mocked SDK behavior. Earlier [passing CI run](https://github.com/kallevanderveen8-lang/Riippel/actions/runs/39792903212) covers the previous release, before the new imagery, Collection and camera controls.

Inspected screenshots of the current desktop release: [lake](docs/desktop.png) and [Collection](docs/collection.png). The standalone playtest has separate local saves and no SDK/ad requests.

## CrazyGames integration (official docs checked 22 October 2026)

`src/sdk.js` loads the official v3 SDK asynchronously. It awaits `init()` with a timeout and only uses supported `local` / `crazygames` environments. A blocked or unavailable SDK leaves a playable local game. Loading events, gameplay start/stop, happytime, feedback context and a completion milestone (the first 30 lakes) are integrated. Tab hiding pauses local audio/physics, while the SDK handles its own tab lifecycle.

- Basic Launch is the default and has **no monetization**. The separately built Full Launch package enables offers only when the SDK ad module is available and no adblock is detected.
- No ad request in the first 180 seconds. A shared 180-second cooldown prevents ad chains. Midgame requests occur only on a first-completion result screen and at least five newly solved lakes apart.
- Rewarded offers live in a paused hint/collection dialog or the result screen, with clear `Watch ad` labels. Continue/dismiss choices are immediately available and equally sized/styled. Hints, star doubling and a daily-goal reroll also have earned-credit alternatives.
- All app input becomes inert from request through finish/error. Audio mutes on **adStarted**, not at request. Unfilled/error/throw/request timeout/playback timeout recover; callbacks received after completion are ignored. Only `adFinished` grants a reward once.
- `game.settings.muteAudio` and its change listener override the in-game audio toggle. WebAudio also resumes from suspended/interrupted states on a user gesture.
- After SDK initialization, Data is the exclusive backend. The initial cloud/guest read is captured before writes and reconciled before enabling writes. Standalone local progress can migrate on first use; the SDK handles guest/account switching and reload. Select **Yes, using the Data Module** in the submission.
- No ads, trackers, third-party assets or network calls other than the official SDK. No Escape/Ctrl+W bindings.

Read [docs/crazygames-release.md](docs/crazygames-release.md) for the portal test checklist and retention measurement plan. Passing repository tests does not mean CrazyGames approval or proven retention. Real ads, guest/account sync and device audio interruptions need the portal preview and physical-device testing.
For uncoached player sessions and release metrics, use [docs/retention-playtest.md](docs/retention-playtest.md).

Official references: [SDK initialization](https://docs.crazygames.com/sdk/intro/), [game events/settings](https://docs.crazygames.com/sdk/game/), [video ads](https://docs.crazygames.com/sdk/video-ads/), [advertisement requirements](https://docs.crazygames.com/requirements/ads/), [Data](https://docs.crazygames.com/sdk/data/), [quality](https://docs.crazygames.com/requirements/quality/), [gameplay/responsive sizes](https://docs.crazygames.com/requirements/gameplay/), [puzzle monetization](https://docs.crazygames.com/resources/monetizing-puzzle/).

See [the playtest and retention review](docs/playtest-and-retention.md) for the journal update, observed play sessions, difficulty sample, and remaining human validation.

## Implementation map

| File | Responsibility |
|---|---|
| `simulation.js` | Fixed grid, walls, impulses, RNG, deterministic time |
| `levels.js`, `scripted.js`, `curated.js`, `generator-worker.js` | Construction, certificates, fixed first 30 campaign puzzles, pre-generation |
| `renderer.js`, `audio.js` | Water shading, lanterns, particles, synthesized sound |
| `main.js` | Interaction, frame accumulator, progression flow, responsive UI bindings |
| `progress.js` | Saves, stars, daily goals and streaks |
| `sdk.js` | Optional portal, storage and advertisement adapter |
| `tools/` | Local server, calibration, black-box bot, benchmark, browser test and ZIP builder |

Build process followed: (1) physics/rendering, (2) placement/drop/lighting, (3) seeded construction/certificates, (4) onboarding/stars, (5) retention/saves, (6) audio/celebration, (7) SDK/pause/ads, (8) responsive and touch pass, (9) calibration/300-level bot/tuning, followed by browser/visual QA and packaging.
