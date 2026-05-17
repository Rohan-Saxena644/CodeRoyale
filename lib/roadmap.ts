import type { PhaseTask } from "@/lib/types";

export const roadmap: PhaseTask[] = [
  {
    id: "0",
    title: "Project setup",
    estimate: "2-3 days",
    statusLine: "Project scaffolded, local APIs planned, Prisma modelled, ready for live room work.",
    warning:
      "Skipping the API and schema groundwork early will make realtime and problem generation much messier later.",
    techStack: ["next@15", "typescript", "tailwindcss", "socket.io", "prisma", "docker"],
    tasks: [
      "Init Next.js 15 with TypeScript and Tailwind CSS",
      "Set up ESLint, env examples, and project structure",
      "Sketch the Socket.IO server and API boundaries",
      "Model Prisma tables for users, matches, problems, and submissions",
      "Write roadmap docs for duel mode and dev mode"
    ]
  },
  {
    id: "1",
    title: "Matchmaking + room system",
    estimate: "4-5 days",
    statusLine: "Two players should be able to share an invite link, join the same room, and move into countdown cleanly.",
    warning:
      "State transitions need to be formal from day one or power-ups and verdicts will become brittle.",
    techStack: ["socket.io", "nanoid", "prisma", "next.js api routes", "react state"],
    tasks: [
      "Create room API and invite code generation",
      "Build waiting room UI with serious vs fun mode",
      "Add ready states and countdown state machine",
      "Persist match creation in PostgreSQL"
    ]
  },
  {
    id: "2",
    title: "Duel room + live editor sync",
    estimate: "5-7 days",
    statusLine: "Both players see the same prompt, timer, and mirrored code activity in realtime.",
    warning:
      "Do not send every keystroke unthrottled over WebSocket or the editor sync will collapse under load.",
    techStack: ["monaco-editor", "socket.io", "lodash", "react state"],
    tasks: [
      "Integrate Monaco and read-only opponent view",
      "Throttle sync events to a safe rate",
      "Add language selector and shared timer",
      "Stress test two-tab typing"
    ]
  },
  {
    id: "3",
    title: "Problem generation",
    estimate: "4-5 days",
    statusLine: "Room start should produce one shared generated challenge with validation and caching.",
    warning:
      "LLM output must be validated and retried before it ever reaches the duel room.",
    techStack: ["anthropic sdk", "zod", "prisma", "next.js api routes"],
    tasks: [
      "Define competitive and dev challenge JSON schemas",
      "Generate problems with difficulty and category controls",
      "Cache validated problems in PostgreSQL",
      "Use non-copyrighted sources and AI-generated variants only"
    ]
  },
  {
    id: "4",
    title: "Code execution + judge",
    estimate: "5-7 days",
    statusLine: "Submit should produce a real verdict, feed the room state, and decide the winner safely.",
    warning:
      "The executor has to be resource-capped from the first real draft.",
    techStack: ["docker", "child_process", "next.js api routes", "socket.io"],
    tasks: [
      "Create sandbox images per language",
      "Run code with timeout, CPU, memory, and network restrictions",
      "Compare stdout against expected output for competitive mode",
      "Return assertion-based verdicts for dev mode"
    ]
  },
  {
    id: "5",
    title: "Fun mode + emotes",
    estimate: "3-4 days",
    statusLine: "Fun mode should add chaos without breaking the core judge loop.",
    warning:
      "Only ship power-ups after the judge, timer, and room sync are reliable.",
    techStack: ["socket.io", "react state", "monaco editor api", "tailwind animations"],
    tasks: [
      "Build charge meter from typing activity",
      "Implement freeze, inject, and timer-pause power-ups",
      "Add emote panel and synced overlay reactions"
    ]
  },
  {
    id: "6",
    title: "Dev mode questions",
    estimate: "4-5 days",
    statusLine: "Dev mode should support realistic debugging challenges first, with MCQ theory as a later extension.",
    warning:
      "Ship one dev category well before expanding into every framework and backend stack.",
    techStack: ["anthropic sdk", "iframe + postMessage", "zod", "docker", "next.js"],
    tasks: [
      "Start with prerequisite-code bug-fix challenges instead of only MCQs",
      "Support category selection like React, Express, Go, Rust, and Next actions",
      "Render React/HTML challenges in a preview sandbox",
      "Judge fixes with DOM or HTTP assertions",
      "Keep a future path open for interview-style MCQ packs"
    ]
  },
  {
    id: "7",
    title: "Deployment",
    estimate: "3-4 days",
    statusLine: "Frontend, API, Socket.IO, and executor should be deployable as a shareable public duel product.",
    warning:
      "Socket.IO cannot live on a pure serverless Vercel setup by itself.",
    techStack: ["docker-compose", "vercel", "railway", "express-rate-limit", "nginx"],
    tasks: [
      "Split realtime server from the Next.js frontend",
      "Deploy executor and websocket server to a VPS or Railway-style host",
      "Rate limit generation and submission endpoints",
      "Run a production full-duel test"
    ]
  }
];
