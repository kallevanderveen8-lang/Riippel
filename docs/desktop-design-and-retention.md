# Ripple — desktop design and retention review

24 October 2026. Desktop product/retention review. The logo and palette below have since been superseded by the [25 October minimalist UI redesign](minimal-ui-redesign.md); desktop scope and retention research limits still apply. Earlier mobile reviews remain historical records.

## Design review

**Overall: Good.** Ripple now uses one consistent desktop interface around its natural lake. The recognizable element is the stone-and-ripple emblem, echoed by the actual puzzle, with a quiet mineral palette and lantern-colored highlights. This is a browser game; the Apple HIG foundations guide craft and accessibility, without imposing native macOS window conventions.

Applied [Apple design skill](../.agents/skills/apple-design/SKILL.md), with its HIG lookup and references for accessibility, layout, typography, color, desktop interaction, branding, icons, buttons, modality, materials, motion and web translation.

### Resolved findings

| Original severity | Finding | Change and guideline |
| --- | --- | --- |
| High | Stock italic wordmark and decorative tagline lacked a clear visual identity. | Custom vector ripple emblem and upright wordmark; tagline removed. `branding.md › Best practices`: “Ensure branding always defers to content.” |
| High | Instructions, controls and statistics were disconnected floating pills. | One control dock, aligned header and restrained footer utilities. `layout.md › Visual hierarchy`: “Group related items to clearly express related information or functions.” |
| High | Text arrows, stars and reset symbols had inconsistent visual weight. | Shared SVG icon system, including selected and earned states. `icons.md › Best practices`: “Maintain visual consistency across all interface icons in your app.” |
| High | Desktop journal felt like a narrow phone drawer. | Wider sidebar/content layout, named level cards, atmosphere previews, chapter progress and explicit hint balance. `typography.md › Conveying hierarchy`: “Minimize the number of typefaces you use, even in a highly customized interface.” |
| Medium | Result prose and many equally prominent choices competed with continuing. | Separate score statistics, succinct reward explanation, primary next-lake action, two secondary actions and an optional bonus disclosure. `buttons.md › Style`: “In general, use a button that has a prominent visual style for the most likely action in a view.” |
| Critical | The new closed bonus disclosure initially let Tab leave the result dialog. | Focus containment excludes controls inside closed details, includes the summary and is exercised with the disclosure open and closed. `accessibility.md › Speech`: “Let people use the keyboard alone to navigate and interact with your app.” |
| Critical | Enlarged text squeezed the journey title beside its action; decoration made the card horizontally scrollable. | Card columns adapt to text size; the decorative ring was removed. Text overflow is now explicitly checked. `accessibility.md › Vision`: “Support larger text sizes.” |
| Medium | A reset or accidental edit was expensive to recover from. | Undo for up to 30 placement, move, removal, delay and reset edits during the current lake; keyboard shortcut is scoped to the focused lake. This is a product judgment about forgiving puzzle exploration. |

### Tokens and interaction

| Role | Dark | Light |
| --- | --- | --- |
| Panel | `#172930` | `#f1f3ef` |
| Inset | `#102129` | `#e3e9e5` |
| Main text | `#eff4f2` | `#243940` |
| Secondary text | `#a8bfc5` | `#53676d` |
| Accent | `#dfc699` | `#755a2f` |
| Divider | `#3f5962` | `#bbc9c6` |

Main/secondary text contrast on panel surfaces: **13.53:1 / 7.82:1 dark**, **10.84:1 / 5.33:1 light**. These values describe those pairs, not every Canvas pixel. System UI text carries navigation; Georgia is reserved for lake and journal titles. Spacing follows a 4/8/12/16/24/32 CSS-pixel scale, with 8/12/18-pixel radii. Controls use at least 44-pixel targets; Drop uses at least 48 pixels. Short reveal transitions, focus rings, light/dark, reduced motion, reduced transparency and increased contrast remain supported.

The desktop release targets 800×450 through 1920×1080 and fullscreen. The downloadable playtest offers desktop frames only. There is no separate phone layout or mobile release claim. Resizing a desktop frame preserves the puzzle and deterministic simulation.

## What the changes do for play and return visits

The improvements below are design hypotheses. They are not measured increases in retention or session duration.

| Player need | Implemented behavior | What to measure |
| --- | --- | --- |
| Understand the first action | Immediate first lake, clear Drop action, optional How to play, mouse/keyboard instructions | First placement, first drop and first-lake completion without coaching |
| Experiment comfortably | Right-click removal, Undo, preserved placements after failure, free rings after four failed drops and guided help after six | Repeated-failure exits; whether players understand why the next attempt improved |
| Have a nearby goal | Five-lake chapter progress and its exact reward are visible in the journal | Chapter completion and continuing after a chapter reward |
| Improve rather than grind | An explicit recommendation selects a completed, unlocked lake closest to three-star mastery | Mastery replay starts/completions and successful return to the current journey |
| Understand rewards | Separate stones/drops/stars, named bonus rewards, newly unlocked atmospheres also explained after a star bonus | Whether players can explain their earned stars and next unlock |
| Have a reason to return | Existing shared daily trail, six permanent keepsakes, six atmosphere unlocks and automatic saves | D1/D7 return, daily start/completion, unlocked-theme selection |

The daily keepsakes count distinct completed days and do not require an unbroken streak. No energy system, waiting period, paid difficulty gate, extra ad pressure or forced session duration was introduced. Mastery recommendations never expose a locked or unplayed lake. Bonus claims and saved progress retain their one-time protections.

## CrazyGames competitor research: access blocked

An actual request to `https://www.crazygames.com/` on 24 October 2026 failed at the environment proxy with **CONNECT HTTP 403**. This environment has no web search connector. The live popularity list and competitor sessions were therefore **not examined**, and this report does not present any title as a verified current top performer or invent competitors' retention figures.

A supported environment configuration draft adds `crazygames.com` and `*.crazygames.com`, preserving the existing package-manager preset. It is saved for review and requires application/publication through the environment UI; saving a draft alone does not grant network access. Existing game code and the optional SDK continue working without that access.

Once access is available, the concrete research pass is:

1. Record the date and the actual visible popular lists; distinguish popularity, ratings and placement from revenue or retention.
2. Sample three comparable desktop puzzle games plus two prominent games from other categories. Do not assume a multiplayer or idle-game retention mechanism fits a wave puzzle.
3. Play fresh sessions and record time to first input/first success, failed-attempt recovery, progression, goal clarity, reward communication, return hooks, interruptions and desktop input quality. Record observed behavior separately from interpretation.
4. Translate only relevant patterns into a specific Ripple experiment and a success/failure measure. Public popularity alone does not establish that a particular feature caused retention.

## Validation and remaining evidence

The completed run passed **28 unit tests, 20 functional browser groups and 12 UI groups**, with no browser errors. The Basic upload ZIP is **42,931 bytes** (137,592 bytes uncompressed, 12 files); the Full Launch variant is 42,930 bytes. Both archives pass integrity checks, have `index.html` at the root and contain no solution harness. Generated outputs are in `/workspace/riippel-desktop-validation`; the refreshed desktop-only playtest is `/workspace/ripple-playtest/Ripple-desktop.html`.

Use `npm test`, `npm run test:browser` and `npm run test:ui` in the workflow documented in [AGENTS.md](../AGENTS.md). The desktop browser flow covers all ten required frame sizes, the ten authored onboarding lakes, generated/daily lakes, saves, rewards, delays, pause, guidance, replay protections and mocked SDK behavior. The UI suite covers the new desktop controls, Undo, right-click, mastery routing, native-dialog focus, bonus disclosure and rewards, 200% text, contrast and preferences.

The production build is separately exercised with real mouse input at 1216×684: placement, reset/Undo, first solve, rewards, journal, next lake and absence of the solution harness. A 180-frame headless idle sample measured a 16.7 ms median and 33.4 ms p95 frame interval on this cloud machine. That is diagnostic evidence, not a claim of sustained 60 fps on consumer laptops.

The portable HTML playtest embeds the game and worker modules, avoids external asset/SDK requests, and is checked over an internal HTTP server at all five selectable desktop sizes and in fullscreen. Managed Chromium blocks `file://` navigation, so double-click file opening could not be verified in this environment.

Before release, run 5–8 uncoached **desktop** playtests, then measure the portal's actual active-session and return metrics. Record first-drop and level-3 conversion, exits around lakes 7/10/15, chapter completion, mastery use, daily completion and D1/D7 return. Treat longer play as valuable when players voluntarily continue and understand their decisions; extra retries or idle time are not success measures. Desktop Safari/Firefox, low-end laptops, assistive-technology users, real SDK/cloud/ad behavior and CrazyGames acceptance still require separate validation. Full nonvisual access to the spatial Canvas puzzle is not claimed.
