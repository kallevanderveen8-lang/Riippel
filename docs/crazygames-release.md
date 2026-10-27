# CrazyGames release candidate

Advertisement documentation rechecked 2026-10-27. This repository prepares upload packages; it does not submit or publish the game.

## Packages

| Package | Use | Monetization |
|---|---|---|
| `releases/ripple-crazygames.zip` | Initial Basic Launch | Disabled in code; no ad buttons |
| `releases/ripple-crazygames-full.zip` | Full Launch, after invitation | SDK-only chapter-break midgame and opt-in rewards |

Both have `index.html` at the root. Build with `npm run build` and `node tools/build.mjs --full`. Photorealistic lake and stone images are bundled in `assets/` inside the ZIP; they require no external service. The official v3 SDK is the only optional network script.

## Before submitting

1. Upload the Basic package to the CrazyGames Developer Portal; enable **Progress Save: Yes, using the Data Module**. Use the portal preview and SDK Inspector.
2. Start a fresh guest session. The short first-lake guide must be skippable and lead directly into placing and dropping a stone; there must be no account prompt or ad. Reload after completing it and confirm it does not reappear. Complete lakes 1–3 and check the Daily Trail unlock. Play through lake 7 for reflectors and lake 15 for delays.
3. Check the Inspector: initialization before API calls; actual play start/stop on pause, collection, hint dialogs and completion. Loading events should bracket generated-level waits. Page blur should not produce duplicate custom lifecycle events.
4. Set portal mute before loading; verify that clicking in-game sound cannot unmute it. Change the portal setting during play. Test the separate water and music toggles, then pause, claim a reward, and interrupt/resume audio on a real desktop browser.
5. Move stones, close and reopen. Check placements, delays, best stars, coins, purchased level access and the daily stage. Verify guest → sign-in and sign-out; existing account progress should load. Test storage disabled and an ad blocker too.
6. On the Full package only: use SDK test ads for rewarded success, unfilled, error, adblock and `adsDisabled`. A first-time campaign chapter finish can request a midgame ad after three minutes; a daily puzzle, replay or menu action cannot. Request locks every game input. Audio remains until `adStarted`, then mutes. Only finish earns the stated reward; errors preserve credits and placements. Check recovery and no chained ad. Never use fabricated ad overlays in production.
7. Select **desktop** as the supported device scope. Inspect all ten DPR1 desktop frames: 907×510, 1216×684, 1077×606, 821×462, 1366×768, 1920×1080, 1536×864, 1280×720, 800×450, 1080×607. Also inspect DPR2 desktop displays, 200% text, mouse and keyboard. Drop is ≥48px; the dock can move to uncover water. Verify wheel zoom, empty-water drag and pointer placement after panning. Mobile release support was removed from the product scope on 24 October 2026.
8. Inspect desktop Safari/Firefox/Chrome, actual laptop performance and 144Hz play. Also inspect 3840×2160 rendering on a real 4K monitor: the static lake plate and controls should stay sharp while the animated canvas is capped at 2048×1152 physical pixels. The CI Chromium hash check verifies cadence independence, not all browser/hardware performance.
9. Supply accurate gameplay covers and metadata in the portal. The game has no generated marketing assets in its upload. Review and acceptance remain with CrazyGames.
10. On desktop, pause or switch tabs during a stone drag, then return and reload. The stone must retain its position from before the interrupted drag; releasing an interrupted gesture must not place or remove a stone.

## Repeat-play design and measurement

The play loop is: place → drop → marked near-miss and quicker retry if needed → star result → next level. The first 30 campaign levels are fixed and certified. Later ten-level lakes vary their openings, middle puzzles and finales; every generated solution is checked. Ten levels share a lake and a four-coin completion reward; the first six lakes have distinct art and later phases revisit them. Best stone/drop records and replay create a mastery loop. First solves and five-level chapter finishes also fund coins. Players may spend three coins to unlock only the next level early, while completing the previous level always unlocks it free. Each lake has a saved day/night choice. Thirty-six claimable milestones, including lake postcards, a daily visit gift, and gradually unlocked cosmetic stones/lanterns add reasons to return. One short UTC daily puzzle awards a coin; two more optional puzzles finish the resumable trail with a streak and a 9-star share score. Daily goals provide small optional bonuses. None of these gates normal play behind an ad.

During Basic Launch use CrazyGames' automatically measured playtime, conversion and Day-1 retention. Targets remain hypotheses: ~20-minute sessions, >80% playing over a minute and 10–15% Day-1 return. Do not report them as achieved. Gather human playtests and compare completion/drop-off at lakes 1, 3, 7, 10 and 15. F3 supplies active time, attempts and peaks for observed tests; SDK feedback context includes mode and level. No custom analytics service or personal tracking has been added.

If people leave on the interference lesson, improve spatial hints before adding rewards. If later lakes require excessive trial and error, tune generator geometry, not ad pressure. The existing 300-level blind-search benchmark predates the new profiles; it is bot search, not a measure of human pacing. The full-screen projection does not change solutions. Use the uncoached protocol in [retention-playtest.md](retention-playtest.md) before drawing conclusions about session length or retention.

The latest rock and ad decisions, and links to the current official ad documentation, are in [rock-and-ads.md](rock-and-ads.md).

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
