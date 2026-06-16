"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { io, type Socket } from "socket.io-client";
import Editor from "@monaco-editor/react";
import type { MatchConfig } from "@/lib/types";

// ─── Types ───────────────────────────────────────────────────────────────────

type DuelLiveShellProps = {
  roomId: string;
  inviteCode: string;
  hostName: string;
  guestName?: string;
  viewerRole: "host" | "guest";
  config: MatchConfig;
};

type FunctionParam = { name: string; type: string };

type Problem = {
  title: string;
  prompt: string;
  difficulty: string;
  rawJson: {
    constraints?: string[];
    functionSignature?: {
      name: string;
      params: FunctionParam[];
      returnType: string;
    };
    examples?: { args: unknown[]; output: unknown; explanation?: string }[];
  };
};

type VerdictResult = {
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  isHidden: boolean;
  error?: string;
  isJudgeError?: boolean;
};

type Verdict = {
  verdict: string;
  passedTests: number;
  totalTests: number;
  hasJudgeErrors?: boolean;
  results?: VerdictResult[];
};

type MatchResult = {
  winnerRole: "host" | "guest" | "draw";
  iWon: boolean;
  isDraw: boolean;
  reason?: "timeout" | "ac";
};

type EmoteToast = {
  id: number;
  emote: string;
  fromRole: "host" | "guest";
};

// ─── Constants ───────────────────────────────────────────────────────────────

const EMOTES = ["👏", "💀", "🔥", "😤", "🤝"];

const starterTemplates: Record<string, string> = {
  javascript: `// Waiting for problem...\n`,
  python:     `# Waiting for problem...\n`,
  cpp:        `// Waiting for problem...\n`,
  go:         `// Waiting for problem...\n`,
  rust:       `// Waiting for problem...\n`,
  java:       `// Waiting for problem...\n`,
  default:    `// Waiting for problem...\n`,
};

// ─── Type maps ───────────────────────────────────────────────────────────────

const GO_TYPES: Record<string, string> = {
  "number": "int", "number[]": "[]int",
  "string": "string", "string[]": "[]string", "boolean": "bool",
};

const CPP_TYPES: Record<string, string> = {
  "number": "int", "number[]": "vector<int>",
  "string": "string", "string[]": "vector<string>", "boolean": "bool",
};

const JAVA_TYPES: Record<string, string> = {
  "number": "int", "number[]": "int[]",
  "string": "String", "string[]": "String[]", "boolean": "boolean",
};

const JAVA_ZERO: Record<string, string> = {
  "number": "0", "boolean": "false", "string": '""',
  "number[]": "null", "string[]": "null",
};

// ─── Stub builder (pure function — no closures, no template nesting) ─────────

function buildStub(
  lang: string,
  name: string,
  params: FunctionParam[],
  returnType: string
): string {
  const simpleParams = params.map((p) => p.name).join(", ");

  if (lang === "javascript") {
    return "function " + name + "(" + simpleParams + ") {\n  // your solution here\n}\n";
  }
  if (lang === "python") {
    return "def " + name + "(" + simpleParams + "):\n    # your solution here\n    pass\n";
  }
  if (lang === "go") {
    const typedParams = params.map((p) => p.name + " " + (GO_TYPES[p.type] ?? "interface{}")).join(", ");
    const ret  = GO_TYPES[returnType] ?? "interface{}";
    const zero = ret === "int" ? "0" : ret === "bool" ? "false" : ret === "string" ? '""' : "nil";
    return "package main\n\nfunc " + name + "(" + typedParams + ") " + ret + " {\n\t// your solution here\n\treturn " + zero + "\n}\n";
  }
  if (lang === "cpp") {
    const typedParams = params.map((p) => (CPP_TYPES[p.type] ?? "int") + " " + p.name).join(", ");
    const ret = CPP_TYPES[returnType] ?? "int";
    return "#include <bits/stdc++.h>\nusing namespace std;\n\n" + ret + " " + name + "(" + typedParams + ") {\n    // your solution here\n}\n";
  }
  if (lang === "java") {
    const typedParams = params.map((p) => (JAVA_TYPES[p.type] ?? "Object") + " " + p.name).join(", ");
    const ret  = JAVA_TYPES[returnType] ?? "Object";
    const zero = JAVA_ZERO[returnType]  ?? "null";
    return "public static " + ret + " " + name + "(" + typedParams + ") {\n    // your solution here\n    return " + zero + ";\n}\n";
  }
  if (lang === "rust") {
    return "fn " + name + "(" + simpleParams + ") {\n    // your solution here\n}\n";
  }
  return "function " + name + "(" + simpleParams + ") {\n  // your solution here\n}\n";
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSocketUrl(): string {
  return process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";
}

function getEditorLanguage(config: MatchConfig): string {
  if (config.mode === "competitive") return config.duelLanguage ?? "javascript";
  return "javascript";
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DuelLiveShell({
  roomId,
  inviteCode,
  hostName,
  guestName,
  viewerRole,
  config,
}: DuelLiveShellProps) {
  const router          = useRouter();
  const socketRef       = useRef<Socket | null>(null);
  const syncTimeoutRef  = useRef<number | null>(null);
  const emoteCounterRef = useRef(0);

  const editorLanguage = getEditorLanguage(config);
  const starterCode    = starterTemplates[editorLanguage] ?? starterTemplates.default;

  const [connectionState, setConnectionState] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [myCode,          setMyCode]          = useState<string>(starterCode);
  const [opponentCode,    setOpponentCode]    = useState<string>(starterCode);
  const [viewerRoleState, setViewerRoleState] = useState<"host" | "guest">(viewerRole);
  const [problem,         setProblem]         = useState<Problem | null>(null);
  const [verdict,         setVerdict]         = useState<Verdict | null>(null);
  const [submitting,      setSubmitting]      = useState(false);
  const [timeLeft,        setTimeLeft]        = useState(30 * 60);
  const [matchResult,     setMatchResult]     = useState<MatchResult | null>(null);
  const [emoteToasts,     setEmoteToasts]     = useState<EmoteToast[]>([]);
  const [opponentLeft,    setOpponentLeft]    = useState<string | null>(null);

  const selfHandle     = useMemo(() => viewerRole === "host" ? hostName : guestName ?? "Guest", [guestName, hostName, viewerRole]);
  const myHandle       = viewerRoleState === "host" ? hostName : (guestName ?? "Guest");
  const opponentHandle = viewerRoleState === "host" ? (guestName ?? "Opponent") : hostName;

  // ── Emotes ───────────────────────────────────────────────────────────────────
  const addEmoteToast = useCallback((emote: string, fromRole: "host" | "guest") => {
    const id = ++emoteCounterRef.current;
    setEmoteToasts((prev) => [...prev, { id, emote, fromRole }]);
    setTimeout(() => setEmoteToasts((prev) => prev.filter((t) => t.id !== id)), 2500);
  }, []);

  function sendEmote(emote: string) {
    socketRef.current?.emit("emote:send", { roomId, emote, fromRole: viewerRoleState });
    addEmoteToast(emote, viewerRoleState);
  }

  // ── Code sync ────────────────────────────────────────────────────────────────
  function emitCode(code: string) {
    socketRef.current?.emit("code:sync", { roomId, inviteCode, role: viewerRoleState, code });
  }

  function handleCodeChange(nextValue: string | undefined) {
    const next = nextValue ?? "";
    setMyCode(next);
    if (syncTimeoutRef.current) window.clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = window.setTimeout(() => emitCode(next), 90);
  }

  function handleLeaveDuel() {
    const socket = socketRef.current;
    if (!socket) { router.push("/match" as Route); return; }
    socket.emit("room:leave", () => router.push("/match" as Route));
  }

  // ── Socket setup ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const socket: Socket = io(getSocketUrl(), { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnectionState("connected");
      socket.emit("room:join", { roomId, inviteCode, role: viewerRoleState, handle: selfHandle });
      socket.emit("duel:join", { roomId, inviteCode, role: viewerRoleState, code: myCode });
    });

    socket.on("disconnect", () => setConnectionState("disconnected"));

    socket.on("room:role-updated", (nextRole: "host" | "guest") => {
      setViewerRoleState(nextRole);
    });

    socket.on("room:state", (nextPresence: { status: string }) => {
      if (nextPresence.status !== "active") {
        router.push(("/room/" + roomId + "?invite=" + inviteCode + "&role=" + viewerRoleState) as Route);
      }
    });

    socket.on("code:state", (payload: { role: "host" | "guest"; code: string }) => {
      if (payload.role === viewerRoleState) return;
      setOpponentCode(payload.code);
    });

    socket.on("problem:ready", (incoming: Problem) => {
      setProblem(incoming);
      const sig = incoming.rawJson?.functionSignature;
      if (!sig) return;
      const stub = buildStub(editorLanguage, sig.name, sig.params, sig.returnType);
      setMyCode(stub);
      setOpponentCode(stub);
      setTimeout(() => emitCode(stub), 150);
    });

    socket.on("match:ended", (payload: { winnerRole: "host" | "guest" | "draw"; reason?: string }) => {
      setMatchResult({
        winnerRole: payload.winnerRole,
        iWon:   payload.winnerRole === viewerRoleState,
        isDraw: payload.winnerRole === "draw",
        reason: payload.reason as "timeout" | "ac" | undefined,
      });
    });

    socket.on("player:left", (payload: { name: string; role: "host" | "guest" }) => {
      // Only show banner if it's the opponent who left, not ourselves
      if (payload.role !== viewerRoleState) {
        setOpponentLeft(payload.name);
      }
    });

    socket.on("emote:receive", (payload: { emote: string; fromRole: "host" | "guest" }) => {
      addEmoteToast(payload.emote, payload.fromRole);
    });

    return () => {
      if (syncTimeoutRef.current) window.clearTimeout(syncTimeoutRef.current);
      socketRef.current = null;
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteCode, roomId]);

  // ── Countdown timer ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!problem) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (viewerRoleState === "host") socketRef.current?.emit("timer:expired", { roomId });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [problem, roomId, viewerRoleState]);

  // ── Submit ────────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: roomId, role: viewerRoleState, language: editorLanguage, code: myCode }),
      });
      const data = (await res.json()) as Verdict;
      setVerdict(data);
    } catch (err) {
      console.error("[submit]", err);
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <main className="relative pb-16">

      {/* ── Opponent left banner ── */}
      {opponentLeft && (
        <div className="sticky top-0 z-40 flex items-center justify-between gap-4 bg-coral/90 px-6 py-3 backdrop-blur-sm">
          <p className="text-sm font-semibold text-white">
            {opponentLeft} has left the room.
          </p>
          <button
            type="button"
            onClick={() => setOpponentLeft(null)}
            className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/30"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Win/Loss Overlay ── */}
      {matchResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className={[
            "flex flex-col items-center gap-6 rounded-3xl border px-12 py-10 text-center shadow-2xl",
            matchResult.isDraw  ? "border-white/20 bg-[#111111]" :
            matchResult.iWon    ? "border-lime/40 bg-[#0a1a0a]"  :
                                  "border-red-500/30 bg-[#1a0a0a]",
          ].join(" ")}>
            <div className="text-7xl">
              {matchResult.isDraw ? "🤝" : matchResult.iWon ? "🏆" : "💀"}
            </div>
            <h1 className={[
              "text-4xl font-black tracking-tight",
              matchResult.isDraw ? "text-white/80" : matchResult.iWon ? "text-lime" : "text-red-400",
            ].join(" ")}>
              {matchResult.isDraw ? "Draw!" : matchResult.iWon ? "Victory!" : "Defeated"}
            </h1>
            <p className="text-sm text-white/50">
              {matchResult.isDraw
                ? (matchResult.reason === "timeout" ? "Time's up — both players tied on score" : "Both players tied")
                : matchResult.iWon
                ? (matchResult.reason === "timeout" ? "Time's up — you had the higher score!" : "You solved it first — gg " + opponentHandle + "!")
                : (matchResult.reason === "timeout"
                    ? "Time's up — " + (matchResult.winnerRole === "host" ? hostName : guestName ?? "Opponent") + " had the higher score"
                    : (matchResult.winnerRole === "host" ? hostName : guestName ?? "Opponent") + " solved it first")}
            </p>
            <button
              type="button"
              onClick={() => router.push("/match" as Route)}
              className="mt-2 rounded-full border border-white/20 bg-white/10 px-8 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Back to Lobby
            </button>
          </div>
        </div>
      )}

      {/* ── Emote toasts ── */}
      <div className="pointer-events-none fixed bottom-8 right-6 z-40 flex flex-col items-end gap-2">
        {emoteToasts.map((t) => (
          <div
            key={t.id}
            className={[
              "animate-bounce rounded-2xl border px-4 py-2 text-2xl shadow-lg transition",
              t.fromRole === viewerRoleState ? "border-lime/30 bg-lime/10" : "border-white/20 bg-white/10",
            ].join(" ")}
          >
            {t.emote}
            <span className="ml-2 text-xs font-semibold text-white/50">
              {t.fromRole === viewerRoleState ? "you" : opponentHandle}
            </span>
          </div>
        ))}
      </div>

      <section className="mx-auto mt-6 max-w-[1600px] px-4 lg:px-6">

        {/* ── Top bar ── */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {[config.mode, config.duelLanguage ?? config.devCategory, config.difficulty].map((label) => (
              <span key={label} className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-semibold capitalize text-white/60">
                {label}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-2 py-1">
              {EMOTES.map((e) => (
                <button key={e} type="button" onClick={() => sendEmote(e)}
                  className="rounded-full px-1.5 py-0.5 text-base transition hover:bg-white/10 active:scale-125">{e}</button>
              ))}
            </div>
            <span className={[
              "rounded-full border px-3 py-1.5 text-xs font-semibold",
              connectionState === "connected" ? "border-lime/30 bg-lime/10 text-lime" : "border-gold/30 bg-gold/10 text-gold",
            ].join(" ")}>
              {connectionState === "connected" ? "● live" : "● connecting"}
            </span>
            <button type="button" onClick={handleLeaveDuel}
              className="rounded-full border border-white/15 px-4 py-1.5 text-sm font-semibold text-white/70 transition hover:border-coral/50 hover:text-white">
              Leave
            </button>
          </div>
        </div>

        {/* ── Problem panel ── */}
        <div className="mb-4 max-h-[380px] overflow-y-auto rounded-[20px] border border-white/10 bg-panel/92 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1">
              {problem ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Problem</p>
                  <h2 className="mt-1.5 text-xl font-semibold text-white">{problem.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-white/65">{problem.prompt}</p>
                  <ul className="mt-3 space-y-1">
                    {problem.rawJson?.constraints?.map((c, i) => (
                      <li key={i} className="text-xs text-white/50">• {c}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Problem</p>
                  <p className="mt-2 animate-pulse text-sm text-white/40">Generating problem...</p>
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2">
                <span className="text-white/45">Host</span>
                <span className="ml-2 font-semibold text-white">{hostName}</span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2">
                <span className="text-white/45">Guest</span>
                <span className="ml-2 font-semibold text-white">{guestName ?? "—"}</span>
              </div>
              <div className={[
                "rounded-2xl border px-4 py-2 font-semibold",
                timeLeft <= 60 ? "border-red-500/30 bg-red-500/10 text-red-400" : "border-gold/30 bg-gold/10 text-gold",
              ].join(" ")}>
                {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:{String(timeLeft % 60).padStart(2, "0")}
              </div>
            </div>
          </div>
          {problem?.rawJson?.examples?.map((ex, i) => (
            <div key={i} className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-xs">
              <p className="text-white/50">Example {i + 1}</p>
              <p className="mt-1 text-white">Input: <code>{JSON.stringify(ex.args)}</code></p>
              <p className="text-white">Output: <code>{JSON.stringify(ex.output)}</code></p>
            </div>
          ))}
        </div>

        {/* ── Side-by-side editors ── */}
        <div className="grid gap-4 lg:grid-cols-2">

          {/* Your editor */}
          <div className="rounded-[20px] border border-lime/25 bg-panel/92 p-4">
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <div>
                <p className="text-sm font-semibold text-white">{myHandle}</p>
                <p className="text-xs uppercase tracking-[0.16em] text-white/40">you · {editorLanguage}</p>
              </div>
              <span className="rounded-full border border-lime/30 bg-lime/10 px-3 py-0.5 text-xs font-semibold uppercase tracking-[0.16em] text-lime">writable</span>
            </div>
            <div className="overflow-hidden rounded-[14px] border border-white/10">
              <Editor height="520px" language={editorLanguage} theme="vs-dark" value={myCode} onChange={handleCodeChange}
                options={{ minimap: { enabled: false }, fontSize: 14, wordWrap: "on", automaticLayout: true, scrollBeyondLastLine: false, padding: { top: 12, bottom: 12 } }} />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button type="button" onClick={handleSubmit} disabled={submitting || !!matchResult}
                className="rounded-full border border-lime/40 bg-lime/15 px-5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-lime transition hover:bg-lime/25 disabled:opacity-50">
                {submitting ? "Running..." : "Submit"}
              </button>
              {verdict && (
                <div className={[
                  "rounded-xl border px-4 py-1.5 text-sm font-semibold",
                  verdict.verdict === "AC"
                    ? "border-lime/30 bg-lime/10 text-lime"
                    : verdict.hasJudgeErrors
                      ? "border-gold/30 bg-gold/10 text-gold"
                      : "border-red-500/30 bg-red-500/10 text-red-400",
                ].join(" ")}>
                  {verdict.verdict === "AC" ? "✓ Accepted" : verdict.hasJudgeErrors ? "⚠ Judge error" : "✗ Wrong Answer"} — {verdict.passedTests}/{verdict.totalTests} tests
                </div>
              )}
            </div>
            {verdict && verdict.hasJudgeErrors && (
              <p className="mt-2 rounded-xl border border-gold/30 bg-gold/10 px-3 py-2 text-xs text-gold">
                The grading service had trouble running one or more tests (often a temporary rate limit on the free judge). This may not be a problem with your code — wait a few seconds and submit again.
              </p>
            )}
            {verdict && verdict.results && verdict.results.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {verdict.results.map((r, i) => (
                  <div key={i} className={[
                    "rounded-lg border px-3 py-2 text-xs",
                    r.passed ? "border-lime/20 bg-lime/5 text-white/70" : "border-red-500/20 bg-red-500/5 text-white/70",
                  ].join(" ")}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">
                        {r.passed ? "✓" : r.isJudgeError ? "⚠" : "✗"} Test {i + 1}
                      </span>
                      <span className="text-white/40">input: <code>{r.input}</code></span>
                    </div>
                    {!r.passed && (
                      <p className="mt-1 text-white/50">
                        {r.error
                          ? r.isJudgeError
                            ? `Judge error: ${r.error}`
                            : `Error: ${r.error}`
                          : `Expected ${r.expected}, got ${r.actual || "(empty)"}`}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Opponent editor */}
          <div className="rounded-[20px] border border-white/10 bg-black/20 p-4">
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <div>
                <p className="text-sm font-semibold text-white/75">{opponentHandle}</p>
                <p className="text-xs uppercase tracking-[0.16em] text-white/40">opponent · {editorLanguage}</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-0.5 text-xs font-semibold uppercase tracking-[0.16em] text-white/45">read only</span>
            </div>
            <div className="overflow-hidden rounded-[14px] border border-white/10">
              <Editor height="520px" language={editorLanguage} theme="vs-dark" value={opponentCode}
                options={{ readOnly: true, minimap: { enabled: false }, fontSize: 14, wordWrap: "on", automaticLayout: true, scrollBeyondLastLine: false, padding: { top: 12, bottom: 12 } }} />
            </div>
          </div>

        </div>
      </section>
    </main>
  );
}