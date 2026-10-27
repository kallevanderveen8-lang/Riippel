# Weekly puzzle and CrazyGames leaderboard

The Today panel offers one deterministic puzzle to everyone from Monday 09:00 UTC until the next Monday 09:00 UTC. It unlocks after level 5. The game saves a personal best for that week. Three stars require no more than the puzzle's par number of stones; four stones at par three earn two stars. The clock measures time spent actively playing, including retries. Replaying can improve a result. The first clear awards one coin; reaching three stars adds two more, once per week.

The score sent to CrazyGames is `stars * 10_000_000 + 9_999_999 - min(round(seconds * 100), 9_999_999)`. Configure the **one leaderboard allowed for this game** as follows:

| Developer Portal setting | Value |
| --- | --- |
| Leaderboard guide | `Weekly lake: stars first, then fastest time` |
| Metric type | `POINTS` |
| Score sorting | `DESC` |
| Incremental scoring | `false` |
| Minimum / maximum score | `10000000` / `39999999` |
| Cooldown | `0` seconds, if allowed |
| Encryption key | A newly generated 32-byte base64 key |

CrazyGames [only enables leaderboards for invited games](https://docs.crazygames.com/sdk/leaderboards/). Once Ripple is invited, generate the key in the Developer Portal, copy the same key into `C.weeklyLeaderboard.encryptionKey` in `src/config.js`, and set `enabled: true`. Publish the matching build and verify submissions in the CrazyGames preview tool. The [SDK submission](https://docs.crazygames.com/sdk/leaderboards-client/) encrypts each integer score with AES-GCM and calls `CrazyGames.SDK.user.submitScore`. The SDK acknowledges a call even if the backend later rejects the score; check preview logs and the live board before announcing it to players. CrazyGames renders the ranking widget on its own game page. Until portal activation, the game shows only the personal best and makes no global-ranking claim.

Client-side scores can be manipulated. CrazyGames [recommends its server-side API](https://docs.crazygames.com/sdk/leaderboard-api/) when competitive integrity needs stronger protection. That would require a game backend and server-validated puzzle events.
