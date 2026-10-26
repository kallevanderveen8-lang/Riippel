# Design review: Ripple's lake interface

> Historical review. The current desktop-only scope and latest changes are documented in [Desktop design and retention](desktop-design-and-retention.md).

## Summary

**Overall: Good, provisionally.** Ripple's distinctive element is the full-screen, natural lake: the controls form a small dock, and the journal is a temporary, readable place to check progress. This pass makes typography, surfaces, navigation and input feedback consistent across the game while keeping the water central.

Scope: browser Canvas game on desktop and touch layouts; header, play controls, feedback/results, pause, hints, level selection, daily goals, keepsakes and atmosphere selection. Reviewed and changed with the installed [Apple design skill](../.agents/skills/apple-design/SKILL.md), routed through its HIG lookup, plus the user's pasted fluid-interaction principles. Native Apple navigation conventions were evaluated for relevance to the web, not applied as mandatory browser rules.

## Resolved findings

Severity below describes the problem before the fix.

| Severity | Finding and guideline | Implemented change |
| --- | --- | --- |
| Critical | Canvas placement required a pointer. `accessibility.md › Speech`: “Let people use the keyboard alone to navigate and interact with your app.” | Arrow-key aiming, Shift for larger steps, Enter placement/delay editing, Delete removal and Space drop; visible instructions/crosshair and live position feedback. |
| Critical | Custom result/pause overlay did not contain keyboard focus. `modality.md › Best practices`: “Always give people an obvious way to dismiss a modal view.” | Dialog semantics, explicit next/resume controls, initial focus, Tab containment, background inertness and focus restoration. Journal/hints retain native dialogs and Escape behavior. |
| High | Small labels and a long undivided journal made progress hard to scan. `typography.md › Ensuring legibility`: “Use font sizes that most people can read easily.” `layout.md › Visual hierarchy`: “Use progressive disclosure to make layouts cleaner and easier to interact with.” | Shared text scale; four labeled journal tabs; header, close and return controls remain reachable while content scrolls. Timing labels use readable CSS-pixel text with an opaque backing instead of stretched world coordinates. |
| Critical | Layout did not reliably accommodate enlarged text. `accessibility.md › Vision`: “Support larger text sizes.” | Rem-based main text, wrapping controls, two-row tabs at 200% text, scrollable content and safe-area spacing. |
| Medium | Different controls had inconsistent states and symbols. `buttons.md › Best practices`: “Always include a press state for a custom button.” | Common immediate press/focus feedback, consistent speaker/pause icons, meaningful accessible state labels, selected theme/tab states. Locked theme requirements remain legible. |
| Medium | Picking up a stone could snap its center to the pointer. User's fluid-interaction guidance: preserve the initial grab offset. | Pointer-relative offset, a screen-pixel drag threshold, cancellation restoring the original position and protection against a second pointer taking over. Precision placement stays on the deterministic grid. |
| Medium | Visual preferences were incomplete. `motion.md › Providing feedback`: “Aim for brevity and precision in feedback animations.” | Short 160 ms panel reveals without delaying input; reduced-motion handling updates live, including ambient lantern motion. Reduced transparency and increased contrast have explicit styles. |

The cited files are in [the installed HIG references](../.agents/skills/apple-design/references/hig/). They were loaded before feedback and implementation.

## Design system

| Role | Dark | Light |
| --- | --- | --- |
| Main panel | `#24383f` | `#f0f3ef` |
| Inset content | `#1b2c33` | `#e5ebe7` |
| Main text | `#eef3ef` | `#243b41` |
| Secondary text | `#b9c9ca` | `#4f6368` |
| Warm accent | `#e7c58f` | `#665333` |
| Divider | `#62777c` | `#bcc9c6` |

Body text uses the system font, typically 15–16 CSS px; secondary labels use 12–14 px, with rem scaling where space permits. Georgia headings provide the existing journal/shoreline character. Controls default to a 48 CSS px minimum target; journal targets were measured at least 44 × 44 CSS px in every tested layout. CSS pixels are web units, not a claim of native Apple point equivalence.

Measured main/secondary text contrast on the actual menu panel surfaces: **10.92:1 / 7.17:1 dark**, **10.56:1 / 5.66:1 light**. These measurements cover those text/surface pairs, not every Canvas pixel or every possible overlay combination.

Content cards use opaque surfaces. Blur is restrained to the floating control layer and dialog backdrop; this adapts `materials.md › Liquid Glass`: “Don't use Liquid Glass in the content layer” and “Use Liquid Glass effects sparingly.” The game adds no downloaded fonts, image assets, animation framework or runtime dependencies.

## What works

- The first lake is immediately playable; opening a journal is optional.
- Drop remains the clear main action. Results explain rewards and provide the next lake and journal together.
- Lakes, Today, Keepsakes and Mood keep the same task order on phone and desktop. Tab changes are immediate and never reset progress.
- Close and Back to the lake remain visible even when a journal panel needs scrolling.
- Selected, locked and earned states use words/icons as well as color.
- The natural water, stone materials and warm lantern light remain the game's identity.

## Validation and platform notes

The final pass passed **26 unit tests, 20 functional Chromium browser groups and 9 UI groups**, with no browser errors. Browser coverage includes actual placement/drag/drop, authored solutions, delays, pause, reload, daily progress, help, rewards and mocked CrazyGames behavior. UI coverage adds keyboard input and timing edits, focus containment/restoration, tab keys, all journal panels at 320×568, 390×844, 844×390 and 1440×1000, 200% text, safe-area spacing, light/dark contrast and live accessibility preferences. Screenshots are generated by `npm run test:ui` for visual inspection.

The production Basic ZIP is additionally tested on a touch-emulated phone: first-lake completion, explained rewards, journal navigation, next lake, no test harness and no browser errors. Production archives are checked for ZIP integrity and a root-level `index.html`.

The updated Basic package contains 12 files, **122,874 uncompressed bytes / 38,854 ZIP bytes**. The Full Launch variant contains 122,873 uncompressed bytes / 38,853 ZIP bytes. The local UI artifacts were generated in `/workspace/riippel-ui-validation`, preserving older tracked reports and release archives in the source checkout.

**High — release validation still open:** physical iPhone/Android touch feel, mobile Safari, VoiceOver/Switch Control, real portal SDK/ad behavior and human retention have not been established by these Chromium checks. Complete these checks before treating the UI as release-approved. This is a validation gap, not a claim that those platforms failed.

Keyboard play and useful live labels are implemented; full nonvisual access to the spatial Canvas puzzle is not claimed. Actual playtesting with assistive-technology users is required to assess what additional spatial descriptions or alternate puzzle interaction they need. These results also do not prove session length, return rate or CrazyGames acceptance; the [playtest/retention review](playtest-and-retention.md) and [release checklist](crazygames-release.md) cover those remaining measurements.
