# CodeRoyale

CodeRoyale is a staged build for a realtime 1v1 coding arena:

- Competitive mode: both players solve the same generated algorithm problem and race to a judged verdict.
- Developer mode: both players repair buggy starter code in a chosen stack like React or Express, then pass assertions.
- Fun mode: emotes and power-ups layered on top once the core duel loop is stable.

## What is in the repo now

- Next.js 15 + TypeScript + Tailwind scaffold
- Landing page that captures the product direction and all 8 roadmap phases
- Match creation flow for competitive vs dev mode
- Waiting room route scaffold
- Shared domain types and room creation API
- Shared problem schemas and match-state helpers
- Prisma schema for users, matches, problems, and submissions
- Socket.IO server outline
- Product docs for the duel strategy and dev-mode direction

## Getting started

1. Install dependencies with `npm install`
2. Copy `.env.example` to `.env`
3. Start the frontend with `npm run dev`
4. Start the websocket server with `npm run socket`

## Build order

1. Finish real room persistence and Socket.IO state transitions
2. Add Monaco editor and synchronized duel state
3. Add generated challenge pipelines and validation
4. Add sandboxed execution and verdicts
5. Add power-ups after the judge is stable

## Product stance

Developer mode now assumes starter-code bug fixing is the primary experience. MCQ-based theory rounds can still be added later for system design, networking, and interview practice, but they should not replace the stronger hands-on duel loop.
