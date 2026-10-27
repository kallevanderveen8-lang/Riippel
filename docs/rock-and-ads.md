# Quieter lake art and CrazyGames ads

27 October 2026 · Desktop release review.

## Large rocks

The former large-rock cutout was a bright, stacked block with a hard, dashed perimeter. It looked separate from the lake, especially in moonlight. A new overhead granite asset has a lower, irregular profile, cool grey mineral texture and sparse moss at its wet edge. The renderer now gives it a diffused underwater footprint, a restrained continuous waterline and softer contact shadow. Wide collision shapes display a slightly taller dry crown; tall shapes rotate the artwork to avoid stretching its grain. Moonlit rocks darken with the rest of the scene. These changes are visual: collision geometry, wave reflection and every certified puzzle stay the same.

The calm game rhythm stays intact. No new flashing, water animation or artificial wait was added to gameplay. Help, the muted palette and reduced-motion option remain available. The rock is deliberately one material family across lakes so the shore, water and puzzle obstacles feel related.

Reviewed desktop captures: [morning lake rock](rocks.png) and [moonlit rock](rocks-night.png).

## Advertisement placement

CrazyGames' current [advertisement requirements](https://docs.crazygames.com/requirements/ads/) say Basic Launch ads are disabled; a game with nonfunctional rewarded buttons can be rejected. They require only SDK-served ads, no interruptions during a puzzle, input blocked during a request, audio muted only after `adStarted`, and normal play after `adFinished` or `adError`. Their [video ad API](https://docs.crazygames.com/sdk/video-ads/) documents the `midgame` and `rewarded` callbacks and the current `adsDisabled` response. Their [puzzle guide](https://docs.crazygames.com/resources/monetizing-puzzle/) recommends midgame breaks between levels and optional hints or end-of-level bonuses; it says the SDK controls actual ad pacing.

Ripple's Basic ZIP therefore stays playable and ad-free. In the separate Full Launch ZIP, a midgame ad is *requested* only after a first-time campaign chapter finish (every five levels), after at least three minutes in the session, with at least three minutes between local requests. The SDK may decline; the game continues. Daily puzzles, replays, pause, settings, Shop navigation and active puzzles never trigger automatic ads. Existing opt-in rewarded hints in the paused Help dialog and a result-screen star bonus remain optional, with an earned-coin alternative and a shared cooldown. Players never need an ad to solve or unlock a level. The new `adsDisabled` response hides further rewarded offers for that session, avoiding a dead button.

This is intentionally lighter than the aggregate impression counts cited in the CrazyGames puzzle guide. Average playtime or ad revenue in that guide does not prove a higher ad rate would help Ripple. After Full Launch eligibility, review actual first-minute survival, completed chapters, average active time, ad error/fill rate and Day-1 return together. A longer session caused by unwanted breaks is a regression.

## Validation

Unit tests cover Basic suppression, the three-minute gate, five-level cadence, a shared cooldown, input/audio lifecycle, timeout, unfilled requests and the current disabled response. Browser checks exercise chapter boundaries, daily play, SDK mute, and a production package without solution controls. Visual screenshots cover narrow and wide rocks on day and night lakes. Live CrazyGames portal ads, account saves and retention remain portal-side release checks.
