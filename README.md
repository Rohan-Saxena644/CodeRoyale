# CodeRoyale

Real-time 1v1 competitive coding duels. Two developers solve the same problem, watch each other code live, and race to the first accepted submission.

## Overview

CodeRoyale is a full-stack competitive coding platform built around real-time head-to-head matches. A host creates a private room, shares an invite code, both players ready up, and the app drops the same algorithm problem for both sides. Code updates stream over WebSockets, submissions are judged remotely, and the first player to pass all test cases wins.

This is not a CRUD dashboard. The core challenge is coordinating live room presence, synchronized editor state, countdown timers, server-side judging, hidden test cases, and match resolution across a separate Next.js app and persistent Socket.IO server.

## Key features

- Invite-based 1v1 coding rooms with no signup required
- Real-time opponent code streaming with Socket.IO
- Pre-game lobby with ready checks and countdown
- Monaco-powered coding workspace
- Support for JavaScript, Python, C++, Go, Rust, and Java
- Curated problem bank with 100+ algorithm problems
- Server-side submissions through Judge0
- Hidden test cases and partial scoring
- Timeout winner resolution by best score
- Separate production-ready Socket.IO server for WebSocket state

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 App Router, React 18, TypeScript |
| Editor | Monaco Editor (`@monaco-editor/react`) |
| Real-time | Socket.IO 4 over WebSocket, standalone Express server |
| Database | PostgreSQL via Neon, Prisma ORM |
| Code execution | Judge0 CE API |
| Styling | Tailwind CSS |
| Validation | Zod |
| Deployment | Vercel for Next.js, Render for Socket.IO server |

## How a match works

1. **Create a room** - choose a language and difficulty. The app generates an invite code.
2. **Opponent joins** - the second player enters the invite code and lands in the lobby.
3. **Ready check** - both players mark themselves ready.
4. **Countdown** - a short countdown starts once both players are ready.
5. **Problem drops** - both players receive the same algorithm problem.
6. **Live duel** - each player writes code while seeing the opponent editor update in real time.
7. **Submit** - code is judged against visible and hidden test cases.
8. **Winner is resolved** - first accepted submission wins. If time expires, highest partial score wins.

## Project structure

```text
coderoyale/
├── app/
│   ├── page.tsx                  # Landing page
│   ├── match/page.tsx            # Create / join room
│   ├── room/[roomId]/page.tsx    # Pre-game lobby
│   ├── duel/[roomId]/page.tsx    # Live duel workspace
│   └── api/
│       ├── match/route.ts        # Create match
│       ├── match/join/route.ts   # Join match by invite code
│       ├── run/route.ts          # Run code through judge driver
│       ├── submit/route.ts       # Final submission and verdict
│       ├── problem/generate/     # Assign problem to match
│       └── health/route.ts       # App health endpoint
├── components/
│   ├── duel-live-shell.tsx       # Duel UI, editors, timer, results
│   ├── room-live-shell.tsx       # Lobby socket client
│   ├── room-shell.tsx            # Lobby dashboard UI
│   ├── server-wake.tsx           # Polls socket server until ready
│   ├── match-form.tsx            # Room creation form
│   └── join-room-form.tsx        # Join by invite code form
├── server/
│   └── index.ts                  # Socket.IO server: presence, code sync, timers
├── lib/
│   ├── judge.ts                  # Judge0 driver builder for all supported languages
│   ├── match-repository.ts       # Prisma match helpers
│   ├── match-state.ts            # Match status state machine
│   ├── problem-seeds.ts          # Curated problem bank
│   └── types.ts                  # Shared TypeScript types
└── prisma/
    └── schema.prisma             # Match, Problem, Submission, User models
```

## Running locally

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Internet access for Judge0 CE requests

### 1. Clone and install

```bash
git clone <your-repo-url>
cd coderoyale
npm install
```

### 2. Environment variables

Create `.env.local` in the project root:

```env
# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Socket server URL for the browser
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000

# App URL used by the socket server for internal callbacks
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Shared secret between Next.js and the socket server
INTERNAL_SECRET=your_secret_here
```

The current judge implementation uses the public Judge0 CE endpoint in `lib/judge.ts`.

### 3. Set up the database

```bash
npx prisma migrate dev
npx prisma generate
```

### 4. Start both servers

In one terminal, start the Next.js app:

```bash
npm run dev
```

In a second terminal, start the Socket.IO server:

```bash
npm run socket
```

Open `http://localhost:3000`, create a room, then join it from another browser tab or window.

If port `4000` is already in use, stop the existing socket process or run the socket server with another `PORT`.

## Architecture notes

### Why a separate Socket.IO server?

The Next.js app handles pages, API routes, persistence, and submission judging. The Socket.IO server is a separate long-running Node process because WebSocket presence, live code sync, countdown timers, and room broadcasts need persistent in-memory runtime state.

In production, this means the Next.js app and socket server should be deployed as separate services.

### Code execution

Submissions are wrapped in a language-specific driver from `lib/judge.ts` and sent to Judge0 CE. The driver calls the submitted function with test case inputs and prints a JSON-compatible return value. Final submissions are evaluated server-side against visible and hidden tests.

### Match state

The app stores durable match, problem, and submission records in PostgreSQL. Live presence, code sync, countdown timers, and active room state are owned by the Socket.IO process. This keeps the real-time loop fast, but it also means a production deployment should run the socket server as a persistent service.

### Anti-cheat

- Copy, paste, and cut are blocked inside the writable Monaco editor.
- The opponent editor is read-only.
- Final verdicts are computed server-side through Judge0.
- Hidden tests are never sent to the client.

### Rate limiting

Mutation endpoints use simple in-memory sliding-window rate limiting:

| Endpoint | Limit |
|---|---|
| `POST /api/match` | 5 rooms / min / IP |
| `POST /api/match/join` | 10 joins / min / IP |
| `POST /api/run` | 20 runs / min / IP |
| `POST /api/submit` | 5 submits / min / player |

## Deployment

### Next.js on Vercel

Deploy the Next.js app to Vercel and set the database and socket environment variables. `NEXT_PUBLIC_SOCKET_URL` must point to the deployed Socket.IO server.

### Socket.IO server on Render

Deploy the same repo as a Render Web Service and use:

```bash
npx tsx server/index.ts
```

Set `NEXT_PUBLIC_APP_URL` to the deployed Vercel app URL so the socket server can call back into the app for problem generation and match events.

## Resume highlights

- Built a full-stack real-time coding duel platform with Next.js, TypeScript, Socket.IO, Prisma, PostgreSQL, Monaco Editor, and Judge0.
- Implemented invite-based rooms, live opponent code sync, ready checks, countdown timers, hidden test judging, partial scoring, and winner resolution.
- Designed a split deployment architecture with a serverless Next.js frontend/API and a persistent WebSocket server.

## License

MIT
