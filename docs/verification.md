# Verification — November 2, 2026

## Live Judge0 checks

Endpoint: public Judge0 CE (`https://ce.judge0.com`).

All **30 / 30** checks passed using the application's shared driver and client:

| Language | Number | Boolean | Number array | String | String array |
| --- | --- | --- | --- | --- | --- |
| JavaScript | Pass | Pass | Pass | Pass | Pass |
| Python | Pass | Pass | Pass | Pass | Pass |
| C++ | Pass | Pass | Pass | Pass | Pass |
| Java | Pass | Pass | Pass | Pass | Pass |
| Go | Pass | Pass | Pass | Pass | Pass |
| Rust | Pass | Pass | Pass | Pass | Pass |

String checks include quotes, backslashes, newlines, tabs, carriage returns,
and Unicode. These are driver smoke tests, not proofs for every problem or
every possible user program. Rerun with `npm run test:judge`.

## Regression checks

`npm test` passes eight tests covering driver execution, JSON output comparison,
runtime and compilation failures, asynchronous token polling, authentication,
missing status, Judge0 internal errors, Rust return-type forwarding, hidden-test
response filtering, and preventing wrong-answer scores during service failures.
Submission tests use a fake database and never write real match data.

## UI scope and limits

The shared palette is white and slate with blue actions, light Monaco editors,
subtle borders, visible keyboard focus, and reduced-motion support. The landing
page, match forms, lobby, and duel workspace use this palette. The homepage
remains readable while the room service wakes up.

The production build passed. Local HTTP checks returned 200 for `/`, `/match`,
and `/api/health`. Live `/api/run` checks passed for all six languages with array
results; malformed JSON returned 400 and invalid C++ correctly reported a
compilation failure.
Initial browser automation was unavailable. A later Windows browser attempt was
stopped by the user before app visual review. A full two-player match with real
database persistence and WebSocket synchronization has not been completed.

## Follow-up: local database connectivity

Both local services started successfully on ports 3000 (web) and 4000 (socket).
Room creation returned HTTP 500 because the configured Neon hosts failed system
DNS lookup with `ENOTFOUND`. Control lookups for Judge0 and the Neon console
succeeded. Cloudflare DNS resolved the configured endpoint, and a read-only
`SELECT 1 AS ok` through the Neon HTTP driver succeeded using Cloudflare DNS for
that diagnostic process only. This confirms database reachability and valid
credentials through the alternate resolver; the immediate blocker is system DNS
resolution of the Neon endpoint. No database configuration, credentials, or
system DNS settings were changed.
