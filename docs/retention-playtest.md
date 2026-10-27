# Retention and desktop playtest protocol

This release changes puzzle pacing and rewards. It has **no measured human retention yet**. The earlier 300-puzzle blind bot benchmark used the previous difficulty profiles, and neither its search attempts nor automated solution checks predict human enjoyment.

## Player-first walkthrough

At a 1216 × 684 CrazyGames-sized desktop frame, the first level can be solved with one stone and the next level starts immediately. The review found three trust breaks in that path: clicking an existing stone silently deleted it despite the drag/right-click instructions; the first result displayed seven “stars earned” even though the level awarded three stars and two daily goals supplied four bonus stars; and instructions for new mechanics existed only in screen-reader text. A failed attempt also hid its advice after 4.2 seconds, before a player might finish watching the water.

The game now treats an existing stone as draggable, gives a short pointer cue on click, and reserves right-click or Delete for removal. Dragging a stone beyond the lake restores it instead of silently deleting it. Results show the level rating separately from daily and optional bonus stars. A short, persistent tip appears when players first meet a two-lantern puzzle, protected rings, rock reflections, or delayed stones; it clears when they edit the lake. Failure advice remains visible until the next interaction. These changes follow [Apple's Designing for games › Jump into gameplay](../.agents/skills/apple-design/references/hig/designing-for-games.md), [Onboarding › Best practices](../.agents/skills/apple-design/references/hig/onboarding.md), [Feedback › Best practices](../.agents/skills/apple-design/references/hig/feedback.md), and [Accessibility › Cognitive](../.agents/skills/apple-design/references/hig/accessibility.md) as web-game interaction principles.

Automated checks cover first-run placement and results, pointer movement/removal, failure recovery, chapter and daily rewards, Collection, settings, and desktop layouts from 800 × 450 to Full HD. They verify function and layout, not enjoyment or retention. The uncoached sessions below are still needed before describing the pacing or return loop as successful.

## Uncoached sessions before submission

Ask 5–8 people unfamiliar with Ripple to play in a CrazyGames-sized desktop frame, with mouse and sound at their own preference. Give only “play as you normally would.” Watch the first 15–20 minutes without helping. Record time and count for the first stone, first drop, first successful level, levels 3/7/10/15 reached, failed drops per level, hints opened, pauses, shop visits, daily puzzle started/completed, and voluntary continuation after the first daily puzzle. Record their own words when they stop or feel stuck. Do not label a level “easy” or “hard” based only on the certificate or a bot run.

Check especially whether the marked lantern after failure helps them adjust a stone, whether the faster retry feels responsive, and whether the lake finale and postcard are noticed without interrupting play. Ask afterwards which level they wanted to retry, whether they understand coins and stars, what they expect to find in Collection, and whether the daily puzzle feels worth returning for. Test at least one returning save and one reduced-motion/high-contrast session.

If multiple players stall at the same level, inspect its geometry and instructions before increasing rewards. If people leave after the daily puzzle, check whether that is a satisfying short visit or confusion about the optional trail. If they buy no cosmetics, check discoverability, preview quality and coin value before changing prices. Preserve a no-purchase route through all campaign levels.

## After Basic Launch

Use the CrazyGames dashboard after its stated minimum sample of seven days and 500 plays; allow up to 21 days for a reliable review window. Compare first-minute survival, average session duration, level progression and Day-1 return with the game's own prior period and official [Basic Launch metrics](https://docs.crazygames.com/resources/basic-launch-metrics/). Rough targets of over 80% playing past the first minute, 10+ minute sessions and 10–15% Day-1 return are hypotheses, **not achievements**. The [puzzle monetization guide](https://docs.crazygames.com/resources/monetizing-puzzle/) cites a different aggregate, around 21 minutes and 6.2% Day-1, so its figures should not be merged into a single benchmark.

Review session and retention together. A longer average session caused by excessive retries is a problem; a short daily visit followed by a repeat visit can be healthy. Revisit profiles, hints and reward cadence after real player evidence. Ripple does not currently send custom user analytics.

## Reference patterns

CrazyGames' [Cups Water Sort](https://www.crazygames.com/game/cups---water-sort-puzzle) uses many levels, stars, coins, assists and customization; [Words of Wonders](https://www.crazygames.com/game/words-of-wonders) couples escalating puzzles with themed worlds and hints; [Hexa Sort](https://www.crazygames.com/game/hexa-sort) gives immediate cascading feedback. Ripple adopts varied levels, clear feedback and gradual cosmetic goals while keeping its quieter pace and optional daily continuation. These comparisons are product observations, not evidence that a feature will raise Ripple's retention.
