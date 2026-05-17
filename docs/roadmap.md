# CodeRoyale Roadmap

This repo now follows the 8-phase plan from the screenshots:

0. Project setup
1. Matchmaking and room system
2. Duel room and live editor sync
3. Problem generation
4. Code execution and judge
5. Fun mode and emotes
6. Dev mode questions
7. Deployment

## Key product decisions

- Competitive mode uses generated or permissively sourced problem content only.
- Developer mode should launch with prerequisite-code bug fixing, not only MCQ theory.
- MCQ packs remain useful as an extension for interview-oriented rounds like system design or networking.
- Fun mode is gated behind serious-mode stability so it does not destabilize the judge.

## Phase 1 milestone

The first milestone worth shipping locally is:

- A host creates a room
- A guest joins from an invite link
- Both players select or confirm a mode
- Both players ready up
- The room transitions into a synced countdown

Everything in the current scaffold is pointed toward making that slice easy to implement next.
