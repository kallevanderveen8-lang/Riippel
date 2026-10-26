# Reference-led minimalist UI redesign

25 October 2026. This supersedes the previous gameplay HUD. Scope: desktop Canvas/browser presentation and navigation, preserving the existing puzzle mechanics. The user's attached image and written brief are the primary visual direction.

## Design review

**Overall: Good.** The lake is the focal point, with a small floating toolbar and useful information at the edges. This implementation follows the reference's hierarchy and spacing; its procedural Canvas environment is not a pixel-for-pixel reproduction of the reference's detailed artwork.

Applied the installed [Apple design skill](../.agents/skills/apple-design/SKILL.md) and the previously read foundations, plus toolbar, button and onboarding guidance. These principles are translated to HTML/CSS/Canvas rather than native Apple window chrome.

| Original severity | Finding and implemented change | Grounding |
| --- | --- | --- |
| High | The large control card obscured the water and mixed instructions, controls and statistics. Replaced it with three toolbar groups: Undo/Reset, stone inventory and Drop. | `toolbars.md › Item groupings`: “In general, aim for a maximum of three.” |
| Medium | Chapter details and routine instructions competed with the puzzle. Chapter progress moved to Pause/journal, instructions to Help/Controls. Only relevant failure feedback appears briefly during play. | `layout.md › Visual hierarchy`: “Use progressive disclosure to make layouts cleaner and easier to interact with.” |
| Medium | Journal and text-heavy utilities occupied the bottom corners. Journal now lives in Pause; the corners contain Help/Controls and a compact lantern/star status display. | Reference-led product judgment, preserving the existing functions. |
| High | Replacing text with icons could obscure their meaning. Every icon button has an accessible action name, visible hover/keyboard tooltip and focus outline. | `toolbars.md › Actions`: “Make sure the meaning of each control is clear.” |
| Medium | Generic inventory dots did not connect to the physical stones. Inventory indicators now reuse the actual stone materials and transition only when their state changes. | Material/craft judgment, with `motion.md › Best practices`: “Add motion purposefully, supporting the experience without overshadowing it.” |

The frame remains usable from compact desktop to Full HD, including enlarged text and preference changes. Further device testing is still needed; the cloud screenshots are evidence of these exercised layouts, not of every browser or GPU.

## Tokens and layout

| Role | Dark | Light |
| --- | --- | --- |
| Panel | `#173638` | `#f1f1e8` |
| Inset | `#112c2e` | `#e2e8dd` |
| Text | `#e8e5d7` | `#213f3e` |
| Secondary text | `#b3c6be` | `#526b63` |
| Selection/focus | `#b7cbb5` | `#40684c` |
| Reward | `#d4ad74` | `#7c5c29` |

Floating controls use translucent `#102d30d9`, warm off-white labels and a restrained blurred background. The main action uses `#c7d7b9` with dark `#173b39` text. Increased contrast strengthens borders; reduced transparency makes the floating material opaque. Measured panel text contrasts are **10.25:1 main / 7.24:1 secondary in dark** and **10.02:1 / 5.08:1 in light**.

Georgia carries lake titles and the Drop action; system UI text carries small labels, menus and tooltips. Labels start at 11 CSS pixels and scale with the root text setting. Interactive targets remain at least 44 pixels; Drop stays at least 48 pixels. Desktop edge spacing scales from 24 to 56 pixels (20 in short windows).

The center toolbar stays centered; measured content widths determine when it must rise above the corner controls. This also accommodates larger text without treating the window as a phone.

```text
Regular desktop
LAKE / Title                              [daily | sound | pause]

                         lake and puzzle

[?] [controls]        [undo | reset | stones | DROP]        [lit | stars]

Compact desktop / enlarged text when needed
LAKE / Title                              [daily | sound | pause]

                         lake and puzzle
                     [undo | reset | stones | DROP]
[?] [controls]                                            [lit | stars]
```

At 1216×684, the former control card measured **560×151 px**. The new toolbar measures **457.63×71.19 px**, a **61.5% reduction in its rectangular footprint**. This compares the main control container, not the total occupied area of the entire interface.

The signature remains the playable water. A 240 ms entrance and restrained 180–280 ms button/inventory/progress feedback support it. The unfinished first lake retains a short placement cue after five seconds; other routine instructions are no longer permanent on the play surface. See `onboarding.md › Best practices`: “Consider providing a collection of context-specific tips instead of a single onboarding flow.”

## Functionality preserved

- Pause exposes Lake journal and Controls. Closing a secondary dialog returns to the paused screen; Resume continues the puzzle.
- Help explains the objective and par. Existing earned hints, free rings and guided layouts remain behind their original availability conditions. Dialog transitions preserve pause state and keyboard focus.
- Controls includes the original move-toolbar option, keeping covered water reachable. Dragging, right-click removal, delay editing, Undo and keyboard input continue working.
- The calendar, mute and pause functions remain available through compact icons. The HUD's lantern count and total stars use the existing game state.
- Stone indicators use cached renderer textures; no external art is loaded. Water lighting and mineral detail were refined without changing obstacle or lantern positions.

A comparison against the preceding nature version confirms all non-render/non-theme configuration is identical. `simulation.js`, `levels.js`, `scripted.js`, `generator-worker.js`, `progress.js`, `sdk.js` and `audio.js` are byte-identical. No physics, authored geometry, procedural generation, reward calculation or save format was changed.

## Validation

- **28 unit tests, 20 functional browser groups and 14 UI groups passed**, no page errors.
- Mouse placement/drag/removal, Undo, timing, first ten authored lakes, generated/daily lakes, rewards, save/reload, help and SDK recovery remain covered.
- New navigation checks exercise Help, Pause → Controls, Pause → Journal, focus restoration and continuation. HUD intersections are checked at 800×450 through Full HD and with 200% text. Existing light/dark contrast and reduced-motion/transparency/increased-contrast checks pass.
- Production files were tested separately with actual mouse input, no solution harness, including the new help/menu routes and moving the toolbar. A 180-frame headless idle sample measured **16.7 ms median / 33.3 ms p95**; this is not a promise of sustained performance on consumer hardware.
- The portable playtest passed seven groups: embedded modules/worker, real pointer play, five desktop frames, fullscreen, scaled pointer mapping, local saves and generated lakes. No external requests were observed. It was tested over internal HTTP; direct `file://` navigation is blocked by managed Chromium.
- Basic package: **46,490 bytes ZIP / 151,099 uncompressed**, 12 files. Full package: 46,490 bytes ZIP. Both are generated outside the checkout and pass archive integrity checks.

Review artifacts: `/workspace/riippel-minimal-review`. Disposable validation/build: `/workspace/riippel-minimal-validation`. Playable HTML: `/workspace/ripple-playtest/Ripple-minimal.html`.

Remaining release evidence includes real desktop Firefox/Safari, low-end hardware and live CrazyGames preview checks. Full nonvisual access to the spatial puzzle and reference-level photorealism are not claimed.
