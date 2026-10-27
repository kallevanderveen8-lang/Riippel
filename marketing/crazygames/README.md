# Ripple — CrazyGames submission media

Prepared 27 October 2026 against the current [official CrazyGames cover and preview requirements](https://docs.crazygames.com/requirements/game-covers/).

Open `index.html` to view the covers, gameplay previews and screenshots together.

## Musical trailers

`videos/ripple-trailer-music-landscape-1920x1080.mp4` and `videos/ripple-trailer-music-portrait-720x1080.mp4` are the faster, 15-second promotional edits. They get to the drop sooner and cut between three five-second action sequences on music boundaries. The original 96 BPM score uses soft plucked keys, a warm pad, quiet percussion and water texture, with stone drops and lantern chimes synchronized to the actual events. It uses no stock recordings or external music. The stereo WAV and composition notes are in `audio`; the reproducible composition and editing tools are in `tools`.

These sound versions are for sharing and promotion. Upload the silent previews below to CrazyGames' mandatory hover-preview slots: its current requirements explicitly say no sound and no fast-forwarding. Neither edit speeds up the puzzle simulation.

## Upload these covers

| Portal slot | File | Size |
| --- | --- | --- |
| Landscape | `covers/ripple-landscape-1920x1080.jpg` | 1920 × 1080, 16:9 |
| Portrait | `covers/ripple-portrait-800x1200.jpg` | 800 × 1200, 2:3 |
| Square | `covers/ripple-square-800x800.jpg` | 800 × 800, 1:1 |

The three images share one visual identity. They deliberately contain no logo, text, border, platform mark or promotional badge. These are generated key art based on Ripple's own lake, stone and lantern art, rather than screenshots. No third-party stock photography, music or brand marks were added. The source PNGs are preserved in `marketing/masters` at their original generated resolutions; these are not native 4K images.

## Upload these previews

| Portal slot | File | Format |
| --- | --- | --- |
| Landscape | `videos/ripple-preview-landscape-1920x1080.mp4` | 1920 × 1080, 20 s, 30 fps |
| Portrait | `videos/ripple-preview-portrait-720x1080.mp4` | 720 × 1080, 2:3, 20 s, 30 fps |

The larger `1080x1620` portrait master is also included. The public guide says “1080p, 2:3” without defining which edge is 1080 pixels; both portrait exports preserve the required ratio. Use the portal's dimension validator if it asks for the higher-resolution master.

Both previews are silent H.264 MP4s, have no audio stream, stay below 50 MB, open on their matching cover and loop back to it. They have no black bars, cursor, text cards, logo transitions or speed-up. They show actual campaign layouts 3, 41 and 31, using the production renderer and the game's 60 Hz / two-steps-per-tick physics at real speed. The camera edit omits the HUD. The portrait export is marketing footage; Ripple's supported device scope remains desktop.

`capture-manifest.json` records the captured puzzle numbers, par, stone count, successful lantern states, frame rate, timing and file sizes. `validation.json` records the encoded delivery checks.

## Other supplied files

- Five Full HD screenshots of the actual game, including its interface and level collection.
- `store-copy-en.md`: title, short and full descriptions, controls and suggested categories.
- The all-in-one download also contains the current Basic Launch game ZIP, with `index.html` at its root. The marketing files must be uploaded in the portal's media slots; do not put this whole media pack into the playable-game upload.

Submitting to CrazyGames and acceptance by the portal remain separate steps. No live leaderboard, existing player statistics or platform endorsement is claimed in these assets.

## Recreate the files

Run these commands from the repository root:

```sh
node tools/make-crazygames-media.mjs
python3 tools/make-trailer-music.py
node tools/make-trailer-variants.mjs
node tools/validate-crazygames-media.mjs
```

The capture tool also accepts `OUTPUT_DIRECTORY COVER_MASTER_DIRECTORY`. The master directory must contain `landscape.png`, `portrait.png` and `square.png`. This requires FFmpeg, Playwright, Chromium, NumPy and SciPy. Set `CHROME_PATH` and `CODEX_PRIMARY_RUNTIME_NODE_MODULES` as documented in `AGENTS.md` if needed. These tools render promotional footage without changing the game or a player's save.
