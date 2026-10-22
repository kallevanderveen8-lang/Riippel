# CrazyGames release candidate

Documentation checked 2026-10-22. This repository prepares upload packages; it does not submit or publish the game.

## Packages

| Package | Use | Monetization |
|---|---|---|
| `releases/ripple-crazygames.zip` | Initial Basic Launch | Disabled in code; no ad buttons |
| `releases/ripple-crazygames-full.zip` | Full Launch, after invitation | SDK-only midgame and opt-in rewards |

Both have `index.html` at the root. Build with `npm run build` and `node tools/build.mjs --full`. No framework or external art/audio. The official v3 SDK is the only optional network script.

## Before submitting

1. Upload the Basic package to the CrazyGames Developer Portal; enable **Progress Save: Yes, using the Data Module**. Use the portal preview and SDK Inspector.
2. Start a fresh guest session. First lake must respond immediately; no front menu, account prompt or ad. Complete lakes 1–3 and check the Daily Trail unlock. Play through lake 7 for reflectors and lake 15 for delays.
3. Check the Inspector: initialization before API calls; actual play start/stop on pause, collection, hint dialogs and completion. Loading events should bracket generated-level waits. Page blur should not produce duplicate custom lifecycle events.
4. Set portal mute before loading; verify that clicking in-game sound cannot unmute it. Change the portal setting during play. Interrupt/resume audio on a physical iPhone and Android device.
5. Move stones, close and reopen. Check placements, delays, best stars, hints and the daily stage. Verify guest → sign-in and sign-out; existing account progress should load. Test storage disabled and an ad blocker too.
6. On the Full package only: use SDK test ads for rewarded success, unfilled, error, adblock and disabled monetization. Request locks every game input. Audio remains until `adStarted`, then mutes. Only finish earns the stated reward; errors preserve credits and placements. Check recovery and no chained ad. Never use fabricated ad overlays in production.
7. Inspect all required DPR1 frame sizes: 907×510, 1216×684, 1077×606, 821×462, 1366×768, 1920×1080, 1536×864, 1280×720, 800×450, 1080×607. Also 320×568 / 390×844 portrait, 844×390 landscape and DPR2 touch devices. All controls are ≥48px; the dock can move to uncover water.
8. Inspect Safari/Firefox/Chrome, actual phone performance and 144Hz play. The CI Chromium hash check verifies cadence independence, not all browser/hardware performance.
9. Supply accurate gameplay covers and metadata in the portal. The game has no generated marketing assets in its upload. Review and acceptance remain with CrazyGames.

## Repeat-play design and measurement

The play loop is: place → three-second drop → immediate adjustment → star result → next lake. Five-lake chapters create short goals. Best stone/drop records and replay create a mastery loop. First solves and chapter finishes fund hints. Themes unlock with stars. The UTC daily three-lake trail creates a shared, resumable return activity with a streak and a 9-star share score. Daily goals provide small optional bonuses. None of these gates normal play behind an ad.

During Basic Launch use CrazyGames' automatically measured playtime, conversion and Day-1 retention. Targets remain hypotheses: ~20-minute sessions, >80% playing over a minute and 10–15% Day-1 return. Do not report them as achieved. Gather human playtests and compare completion/drop-off at lakes 1, 3, 7, 10 and 15. F3 supplies active time, attempts and peaks for observed tests; SDK feedback context includes mode and level. No custom analytics service or personal tracking has been added.

If people leave on the interference lesson, improve spatial hints before adding rewards. If later lakes require excessive trial and error, tune generator geometry, not ad pressure. The existing 300-level blind-search benchmark still has median 13 / p90 23 attempts among solved searches; those are bot attempts, not human pacing. The full-screen projection does not change those solutions. The new hint/replay/daily features require human evaluation.

## Primary references

- https://docs.crazygames.com/
- https://docs.crazygames.com/resources/basic-launch-metrics/
- https://docs.crazygames.com/sdk/intro/
- https://docs.crazygames.com/sdk/game/
- https://docs.crazygames.com/sdk/data/
- https://docs.crazygames.com/sdk/user/#auth-listener
- https://docs.crazygames.com/sdk/video-ads/
- https://docs.crazygames.com/requirements/ads/
- https://docs.crazygames.com/requirements/quality/
- https://docs.crazygames.com/requirements/technical/
- https://docs.crazygames.com/requirements/gameplay/
- https://docs.crazygames.com/resources/monetizing-puzzle/
