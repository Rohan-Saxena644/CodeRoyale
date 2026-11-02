# Logic review — November 2, 2026

## Corrected in this pass

- Problem API and socket payloads now publish only the signature, examples, and
  constraints; test cases and reference solutions remain server-side.
- Winner claims are conditional database updates, shared in principle by accepted
  submissions and timeout resolution. Competing results cannot overwrite a winner.
- The socket server persists the match start time and owns the 30-minute deadline.
  Reconnecting receives the original deadline instead of restarting the clock.
- Only active, unexpired matches can accept submissions, using the selected language.
- Concurrent guest claims cannot overwrite a different guest or reset a running match.
- Socket joins validate room ID, invite code, and the existence of the chosen seat.
  Malformed event data is rejected without crashing handlers.
- Reconnects restore code without reapplying the starter stub. Closing one of
  several same-role connections does not remove that player's presence.
- Finished records are no longer deleted or reset by lobby departure handling.
- Go drivers retain user imports. Invalid room URLs return a missing-page response.
- Problem generation is idempotent, failed starts return to the lobby, and
  production internal callbacks require the configured shared secret.

## Verification

The production build and 16 automated tests pass. Tests include real local Socket.IO host and guest clients
for ready checks, starting a match, code sync, reconnect restoration, fixed
deadlines, rejecting premature timeout events, and score-based timeout resolution.
Persistence and problem generation are mocked in those tests; no real match data
is written. Submission regressions cover simultaneous accepted submissions and
rejection of inactive, expired, or wrong-language requests. Every problem seed
passes schema validation; this does not independently prove its expected answers.

The earlier 30 live Judge0 driver checks passed across six languages. A real
deployed two-player browser match using Neon and Judge0 together remains unverified.

## Readiness verdict

The tested friendly-demo flow has improved, but this is **not a flawless or
unrestricted-public-release sign-off**. Host and guest roles still come from the
client rather than an authenticated, server-issued player session. An attacker
can submit as another role; knowledge of an invite is not proof of seat ownership.
Player session authorization is the main remaining code-level public-use blocker.

The services also require working Neon DNS/connectivity and the same non-empty
`INTERNAL_SECRET` in production. Socket presence and editor buffers remain in
memory on a single server instance, so a server restart loses unsaved editor code.
Winner notification is best-effort; reconnecting reads the persisted result.
