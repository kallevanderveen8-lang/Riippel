# Ripple puzzle review · 27 October 2026

I played the first three Ripple levels with real mouse placement and Drop, then opened the newly unlocked daily puzzle. Levels 1–3 each solved in one attempt. The old first daily stage immediately jumped to a three-stone, three-lantern puzzle with a rock. Its “one quick puzzle” promise did not match that jump. The result screen already gives the next level a clear primary action and keeps the optional route secondary; that hierarchy should stay quiet.

## Comparable games and platform guidance

These are observations from public CrazyGames game descriptions and documentation retrieved on 27 October 2026, not rankings, gameplay telemetry, or proof that a mechanic raises retention.

| Source | Published pattern | Useful lesson for Ripple |
| --- | --- | --- |
| [Cups – Water Sort Puzzle](https://www.crazygames.com/game/cups---water-sort-puzzle) | Its page describes 300+ progressively harder puzzles, three-star efficiency, assists, coins after levels, and cup/background cosmetics. | Keep each next action clear and let cosmetics remain optional earned goals. Give an accessible hint before repeated failure becomes a grind. |
| [Words of Wonders](https://www.crazygames.com/game/words-of-wonders) | Its page describes rising puzzle complexity, limited hints, themed worlds, and background images earned at milestones. | A lake can feel like a chapter; the short daily entry should precede its harder optional trail. |
| [Hexa Sort](https://www.crazygames.com/game/hexa-sort) | Its page emphasizes smooth placement feedback and cascading matches alongside boosters. | Make a successful wave immediately readable through lantern light, chime and nearby text. Avoid adding unrelated effects to a calm lake. |
| [Bloxorz](https://www.crazygames.com/game/bloxorz) | Its page describes a simple initial objective and new switches/tiles as the 33 levels get harder. | Introduce each wave rule before expecting players to combine it with rocks or timed stones. |

The official [Basic Launch guide](https://docs.crazygames.com/resources/basic-launch-metrics/) says its evaluation uses average play time, Day-1 return, and the share still playing after one minute. It recommends a rewarding core action, a clear next goal, gradual mechanics, fair difficulty, meaningful progression, daily hooks, saved progress, and fast loading. Its 10+ minute, 10–15% Day-1, and 80%+ one-minute examples describe successful titles, **not Ripple’s measured results**. The [puzzle guide](https://docs.crazygames.com/resources/monetizing-puzzle/) warns against interrupting active solving with midgame ads and suggests a first free hint as a way to teach the help habit. Its aggregate figures describe a different group of games and are not a forecast for Ripple.

Apple’s [Onboarding › Best practices](../.agents/skills/apple-design/references/hig/onboarding.md) favors brief, optional, interactive learning; [Feedback › Best practices](../.agents/skills/apple-design/references/hig/feedback.md) asks for accessible feedback near the action; [Motion › Best practices](../.agents/skills/apple-design/references/hig/motion.md) asks for purposeful motion. These are interaction principles for this desktop web game, not native macOS rules.

## Changes made from the review

The first daily puzzle is now a date-seeded, one-stone, two-lantern layout with no rock. Twenty deterministic days are covered by a certificate test; a separate 100-day audit found 100 distinct layouts and no unsolved lantern. Existing unfinished daily saves keep their previous geometry. The optional next two puzzles retain their harder structure, and the first daily result now says that they are harder and optional.

After two failed drops, the first guide ring is free and the paid option is hidden in its place. Players can buy a further early hint if they want; more free rings remain available after four failed drops and a complete guided layout after six. The visible failure message points to the free help. This keeps retries exploratory and avoids presenting a coin cost exactly when a newly stuck player needs guidance.

The pointer now shows a restrained preview of the next stone over valid open water. It disappears while dragging or when the stone supply is full. Keyboard guidance also says when all stones have been placed instead of promising that Enter can add another one.

These changes address an observed mismatch and a documented help pattern. They do not establish higher retention. In the first uncoached desktop sessions, compare first daily start/completion, the share who choose the optional trail, time spent at levels 3/7/15, hint use after the second failure, and voluntary next-level play. After Basic Launch, use the actual CrazyGames dashboard for one-minute conversion, session time and Day-1 return before changing difficulty or adding rewards again.

Validation passed: 40 unit tests, the full Chromium gameplay and UI suites, the standalone preview at six desktop sizes including 4K, and a production-build first-level smoke test. The browser suite specifically checks a mouse-played new daily opening, the free/paid hint sequence, and migration of an unfinished old daily puzzle. These checks establish correct behavior; uncoached play and portal metrics are still needed to judge enjoyment and return rate.
