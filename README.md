# CodeRoyale

Real-time 1v1 competitive coding duels. Two developers, one problem, first to pass all test cases wins.

---

## What it is

CodeRoyale is a full-stack web app that puts two developers head-to-head on the same algorithm problem. Both players write code in a live shared editor — you see your opponent's code update in real time as they type. The first player to submit a solution that passes all test cases wins the match. If neither player solves it before the 30-minute timer runs out, the player with the higher partial score wins.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), React 18, TypeScript |
| Editor | Monaco Editor (`@monaco-editor/react`) |
| Real-time | Socket.IO 4 over WebSocket (standalone Express server) |
| Database | PostgreSQL via Neon (serverless), Prisma ORM |
| Code execution | Judge0 API (sandboxed remote execution) |
| Styling | Tailwind CSS |
| Validation | Zod |
| Deployment | Vercel (Next.js) + Render (Socket.IO server) |

---

## How a match works

1. **Create a room** — pick language (`JavaScript`, `Python`, `C++`, `Go`, `Rust`, or `Java`) and difficulty (`easy` / `medium` / `hard`). A 4-character invite code is generated.
2. **Opponent joins** — they enter the invite code on `/match`. Both players land in a pre-game lobby.
3. **Ready check** — both players click Ready. A 5-second countdown fires.
4. **Problem drops** — a curated algorithm problem is assigned to the match. Both players see it simultaneously.
5. **Duel** — write your solution. Your opponent's keystrokes stream into their editor panel on your screen in real time via Socket.IO.
6. **Submit** — code is sent to Judge0. It runs against all test cases (including hidden ones). First player to reach AC wins. On timeout, highest partial score wins.

---

## Project structure

```
coderoyale/
├── app/
│   ├── page.tsx                  # Landing page (live match count from DB)
│   ├── match/page.tsx            # Create / join room
│   ├── room/[roomId]/page.tsx    # Pre-game lobby
│   ├── duel/[roomId]/page.tsx    # Live duel workspace
│   └── api/
│       ├── match/route.ts        # Create match (rate limited)
│       ├── match/join/route.ts   # Join by invite code (rate limited)
│       ├── run/route.ts          # Test-run code (rate limited)
│       ├── submit/route.ts       # Final submission + verdict (rate limited)
│       ├── problem/generate/     # Assign problem to match
│       └── health/route.ts       # Web service health + live stats
├── components/
│   ├── duel-live-shell.tsx       # Main duel UI (editors, timer, emotes, result overlay)
│   ├── room-live-shell.tsx       # Lobby socket client
│   ├── room-shell.tsx            # Lobby UI (ready check, config display)
│   ├── server-wake.tsx           # Polls socket server until it's warm
│   ├── match-form.tsx            # Room creation form
│   └── join-room-form.tsx        # Join by invite code form
├── server/
│   └── index.ts                  # Socket.IO server (presence, code sync, emotes, timers)
├── lib/
│   ├── judge.ts                  # Judge0 driver builder for all 6 languages
│   ├── match-repository.ts       # Prisma match CRUD
│   ├── match-state.ts            # Match status state machine
│   ├── problem-seeds.ts          # Curated problem bank (100+ problems)
│   └── types.ts                  # Shared TypeScript types
└── prisma/
    └── schema.prisma             # Match, Problem, Submission, User models
```

---

## Running locally

### Prerequisites

- Node.js 20+
- A PostgreSQL database (Neon free tier works)
- A Judge0 API key (RapidAPI free tier works)

### 1. Clone and install

```bash
git clone <your-repo-url>
cd coderoyale
npm install
```

### 2. Environment variables

Create `.env.local` in the project root:

```env
# Database (Neon or any PostgreSQL)
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Judge0 (via RapidAPI)
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=your_key_here
JUDGE0_API_HOST=judge0-ce.p.rapidapi.com

# Socket server URL (local dev)
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000

# Shared secret between Next.js and socket server (generate with: openssl rand -hex 32)
INTERNAL_SECRET=your_secret_here

# App URL (used by socket server for internal callbacks)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Set up the database

```bash
npx prisma migrate dev
npx prisma generate
```

### 4. Start both servers

In one terminal — the Next.js app:

```bash
npm run dev
```

In a second terminal — the Socket.IO server:

```bash
npm run socket
```

Open `http://localhost:3000`. Open a second browser tab or window and create + join a room to test a full match.

---

## Architecture notes

### Why a separate Socket.IO server?

Next.js serverless functions are stateless and cannot hold WebSocket connections open. The Socket.IO server runs as a persistent Express/Node process (on Render in production) that owns all in-memory room presence state, countdown timers, and code sync. The Next.js app talks to it over HTTP for internal match-ended notifications.

### Code execution

Submissions are sent to Judge0, a sandboxed remote code execution service. The `lib/judge.ts` driver wraps user-submitted function code in a per-language harness that calls the function with test case inputs and prints the return value as JSON. The submit route retries up to 3 times with backoff on judge errors before marking a test as a judge error (not a wrong answer).

### Anti-cheat

- Copy/paste is blocked at the Monaco editor level (keyboard shortcuts and DOM events both intercepted).
- The opponent code panel is read-only with no copy/paste access.
- Final submissions run server-side in Judge0's sandbox — the in-browser run button only tests local cases.

### Rate limiting

All mutation endpoints use in-memory sliding window rate limiting:

| Endpoint | Limit |
|---|---|
| `POST /api/match` | 5 rooms / min / IP |
| `POST /api/match/join` | 10 joins / min / IP |
| `POST /api/run` | 20 runs / min / IP |
| `POST /api/submit` | 5 submits / min / player |
| Socket emotes | 1 per 1.5s per socket |

---

## Deployment

### Next.js → Vercel

Push to GitHub and connect the repo to Vercel. Set all env vars in the Vercel dashboard. Make sure `NEXT_PUBLIC_SOCKET_URL` points to your Render socket server URL.

### Socket server → Render

Create a new Web Service on Render pointing to the same repo. Set the start command to:

```bash
npx tsx server/index.ts
```

Set the `PORT` env var (Render provides this automatically). Set `NEXT_PUBLIC_APP_URL` to your Vercel deployment URL so the socket server can call back into the Next.js API for problem generation.

---

## License

MIT
