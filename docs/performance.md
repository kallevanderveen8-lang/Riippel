# Desktop performance review · 27 October 2026

The expensive path was the visual layer, not the puzzle solver. Before this pass, each frame recalculated water/photo coordinates, checked every pixel against every rock, and repainted large boulders with a blur and color filter. Collection also generated every cosmetic preview when it opened. This caused visible stalls even when no stone was moving.

The lake photograph now appears without waiting for procedural fallback art. The water mask and its coordinate lookup are prepared once per level, lake theme, camera position and resolution. The water effect is still animated, but its pixel count can step down from 560 to 360, 280 or 240 when sustained frame cost warrants it, then recover gradually after stable fast frames. The animated canvas can also use a lower pixel ratio. The photograph and separate static boulder layer stay sharp. Camera movement rebuilds the lookup and reprojects the boulder layer; puzzle physics always runs on the same fixed 128×128 grid at 60 Hz.

The boulder image loads only when a level needs it, with an early preload near its first campaign appearance. The next lake image preloads at a lake boundary. Stone fallback art is cheap while the atlas downloads. Collection defers Shop creation until its tab is opened, caches previews, and makes one preview during each idle slot. Animation drawing is capped near 72 Hz; completed results draw at 30 Hz and paused dialogs at 3 Hz. `requestIdleCallback` and Canvas `roundRect` have fallbacks.

## Reproduce the measurement

Start `PORT=4260 npm start`, then run `CHROME_PATH=/usr/bin/chromium CODEX_PRIMARY_RUNTIME_NODE_MODULES=/workspace/Riippel/node_modules npm run test:performance`. Set `PERF_LEVEL=8` to measure a boulder level and `PERF_REPEATS=1` for a quick check. The script uses a 1216×684 desktop viewport, samples 90 animation intervals before and during a solved wave, and repeats with normal and 4× CPU throttling. `firstLevelReadyMs` is always the initial level-1 startup time, even when sampling another level. The optional CrazyGames SDK is blocked in this local measurement.

| Scenario | Previous median frame interval | Current median frame interval | Current p95 interval |
| --- | ---: | ---: | ---: |
| Level 1, normal CPU | about 16.7 ms | 16.7 ms | about 16.8 ms |
| Level 1, 4× CPU throttle | about 83 ms | 17–33 ms | about 33–67 ms |
| Boulder level, normal CPU | about 33 ms | 16.7 ms | about 17 ms |
| Boulder level, 4× CPU throttle | about 150 ms | about 33 ms | about 50–67 ms |

These are local headless Chromium/CDP observations, not an FPS guarantee. Initial level-1 readiness in repeated runs was usually about 0.3–1.0 seconds at normal speed and 1.4–2.4 seconds at 4× throttle, down from roughly 1.0–1.3 and 3.5–4.4 seconds in the pre-change runs. The 4× runs still show occasional 50–67 ms frames, especially while an image or rock layer is prepared. A slower GPU, browser compositor, thermal throttling or portal embed can change these numbers.

## Browser and release evidence

The 39 unit tests, full Chromium gameplay test, and UI test pass. The UI test covers the compact desktop through Full HD, 200% text, pointer/keyboard input, camera controls, Shop, day/night, reduced motion, and save/restore. Firefox ESR 140 was also exercised through WebDriver: first load, mouse placement, solve, level 8 with boulders, and opening the Shop. The build is dependency-free at runtime apart from the optional CrazyGames SDK.

Actual low-end desktop hardware, desktop Safari/WebKit, 4K display hardware and the CrazyGames portal embed remain release checks. The standard browser APIs used by the game target current desktop Chrome, Firefox, Edge and Safari; this local environment cannot certify every version or device. Measure a first visit and a 10-minute session on those targets before publishing, including frame pacing during camera movement, a new lake, and a Shop purchase. In particular, confirm that the optional SDK cannot delay the first interactive screen on the portal.
