"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { io, type Socket } from "socket.io-client";
import Editor from "@monaco-editor/react";
import type { MatchConfig } from "@/lib/types";

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

type StatusTone = "neutral" | "primary" | "success" | "warning" | "danger";

const starterTemplates: Record<string, string> = {
  javascript: `// Waiting for problem...\n`,
  python: `# Waiting for problem...\n`,
  cpp: `// Waiting for problem...\n`,
  go: `// Waiting for problem...\n`,
  rust: `// Waiting for problem...\n`,
  java: `// Waiting for problem...\n`,
  default: `// Waiting for problem...\n`,
};

const GO_TYPES: Record<string, string> = {
  number: "int",
  "number[]": "[]int",
  string: "string",
  "string[]": "[]string",
  boolean: "bool",
};

const CPP_TYPES: Record<string, string> = {
  number: "int",
  "number[]": "vector<int>",
  string: "string",
  "string[]": "vector<string>",
  boolean: "bool",
};

const JAVA_TYPES: Record<string, string> = {
  number: "int",
  "number[]": "int[]",
  string: "String",
  "string[]": "String[]",
  boolean: "boolean",
};

const JAVA_ZERO: Record<string, string> = {
  number: "0",
  boolean: "false",
  string: '""',
  "number[]": "null",
  "string[]": "null",
};

const RUST_TYPES: Record<string, string> = {
  number: "i64",
  "number[]": "Vec<i64>",
  string: "String",
  "string[]": "Vec<String>",
  boolean: "bool",
};

const RUST_ZERO: Record<string, string> = {
  number: "0",
  boolean: "false",
  string: "String::new()",
  "number[]": "Vec::new()",
  "string[]": "Vec::new()",
};

function buildStub(lang: string, name: string, params: FunctionParam[], returnType: string): string {
  const simpleParams = params.map((p) => p.name).join(", ");

  if (lang === "javascript") return `function ${name}(${simpleParams}) {\n  // your solution here\n}\n`;
  if (lang === "python") return `def ${name}(${simpleParams}):\n    # your solution here\n    pass\n`;
  if (lang === "go") {
    const typedParams = params.map((p) => `${p.name} ${GO_TYPES[p.type] ?? "interface{}"}`).join(", ");
    const ret = GO_TYPES[returnType] ?? "interface{}";
    const zero = ret === "int" ? "0" : ret === "bool" ? "false" : ret === "string" ? '""' : "nil";
    return `package main\n\nfunc ${name}(${typedParams}) ${ret} {\n\t// your solution here\n\treturn ${zero}\n}\n`;
  }
  if (lang === "cpp") {
    const typedParams = params.map((p) => `${CPP_TYPES[p.type] ?? "int"} ${p.name}`).join(", ");
    const ret = CPP_TYPES[returnType] ?? "int";
    return `#include <bits/stdc++.h>\nusing namespace std;\n\n${ret} ${name}(${typedParams}) {\n    // your solution here\n    return {};\n}\n`;
  }
  if (lang === "java") {
    const typedParams = params.map((p) => `${JAVA_TYPES[p.type] ?? "Object"} ${p.name}`).join(", ");
    const ret = JAVA_TYPES[returnType] ?? "Object";
    const zero = JAVA_ZERO[returnType] ?? "null";
    return `public static ${ret} ${name}(${typedParams}) {\n    // your solution here\n    return ${zero};\n}\n`;
  }
  if (lang === "rust") {
    const typedParams = params.map((p) => `${p.name}: ${RUST_TYPES[p.type] ?? "i64"}`).join(", ");
    const ret = RUST_TYPES[returnType] ?? "i64";
    const zero = RUST_ZERO[returnType] ?? "0";
    return `fn ${name}(${typedParams}) -> ${ret} {\n    // your solution here\n    ${zero}\n}\n`;
  }
  return `function ${name}(${simpleParams}) {\n  // your solution here\n}\n`;
}

function getSocketUrl(): string {
  return process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";
}

function getEditorLanguage(config: MatchConfig): string {
  return config.mode === "competitive" ? config.duelLanguage ?? "javascript" : "javascript";
}

function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: StatusTone }) {
  const classes = {
    neutral: "border-borderSoft bg-surface3 text-textMuted",
    primary: "border-primary/30 bg-primary/10 text-primary",
    success: "border-success/30 bg-success/10 text-success",
    warning: "border-warning/30 bg-warning/10 text-warning",
    danger: "border-danger/30 bg-danger/10 text-danger",
  };
  return <span className={`rounded-md border px-2 py-1 text-xs font-medium ${classes[tone]}`}>{children}</span>;
}

function editorOptions(readOnly = false) {
  return {
    readOnly,
    minimap: { enabled: false },
    fontSize: 14,
    wordWrap: "on" as const,
    automaticLayout: true,
    scrollBeyondLastLine: false,
    padding: { top: 12, bottom: 12 },
    contextmenu: false,
  };
}

export function DuelLiveShell({ roomId, inviteCode, hostName, guestName, viewerRole, config }: DuelLiveShellProps) {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const syncTimeoutRef = useRef<number | null>(null);
  const roleRef = useRef<"host" | "guest">(viewerRole);
  const codeRestoredRef = useRef(false);
  const opponentCodeSeenRef = useRef(false);

  const editorLanguage = getEditorLanguage(config);
  const starterCode = starterTemplates[editorLanguage] ?? starterTemplates.default;

  const [connectionState, setConnectionState] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [myCode, setMyCode] = useState(starterCode);
  const [opponentCode, setOpponentCode] = useState(starterCode);
  const [viewerRoleState, setViewerRoleState] = useState<"host" | "guest">(viewerRole);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [opponentLeft, setOpponentLeft] = useState<string | null>(null);
  const [opponentTouched, setOpponentTouched] = useState(false);

  const selfHandle = useMemo(() => (viewerRole === "host" ? hostName : guestName ?? "Guest"), [guestName, hostName, viewerRole]);
  const myHandle = viewerRoleState === "host" ? hostName : guestName ?? "Guest";
  const opponentHandle = viewerRoleState === "host" ? guestName ?? "Opponent" : hostName;

  function emitCode(code: string) {
    socketRef.current?.emit("code:sync", { roomId, inviteCode, role: roleRef.current, code });
  }

  function handleCodeChange(nextValue: string | undefined) {
    const next = nextValue ?? "";
    setMyCode(next);
    if (syncTimeoutRef.current) window.clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = window.setTimeout(() => emitCode(next), 120);
  }

  function handleLeaveDuel() {
    const socket = socketRef.current;
    if (!socket) {
      router.push("/match" as Route);
      return;
    }
    socket.emit("room:leave", () => router.push("/match" as Route));
  }

  useEffect(() => {
    roleRef.current = viewerRoleState;
  }, [viewerRoleState]);

  useEffect(() => {
    const socket: Socket = io(getSocketUrl(), { transports: ["websocket"], reconnectionAttempts: 5, reconnectionDelay: 1000 });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnectionState("connected");
      socket.emit("room:join", { roomId, inviteCode, role: roleRef.current, handle: selfHandle });
      socket.emit("duel:join", { roomId, inviteCode, role: roleRef.current, code: myCode });
    });

    socket.on("disconnect", () => setConnectionState("disconnected"));
    socket.on("connect_error", () => setConnectionState("disconnected"));
    socket.on("room:role-updated", (nextRole: "host" | "guest") => {
      roleRef.current = nextRole;
      setViewerRoleState(nextRole);
    });
    socket.on("room:state", (nextPresence: { status: string }) => {
      if (nextPresence.status !== "active") router.push((`/room/${roomId}?invite=${inviteCode}&role=${roleRef.current}`) as Route);
    });
    socket.on("code:state", (payload: { role: "host" | "guest"; code: string }) => {
      if (payload.role === roleRef.current) return;
      opponentCodeSeenRef.current = true;
      setOpponentCode(payload.code);
      setOpponentTouched(true);
    });
    socket.on("code:restore", (payload: { code: string }) => {
      codeRestoredRef.current = true;
      setMyCode(payload.code);
    });
    socket.on("problem:ready", (incoming: Problem) => {
      setProblem(incoming);
      const sig = incoming.rawJson?.functionSignature;
      if (!sig) return;
      const stub = buildStub(editorLanguage, sig.name, sig.params, sig.returnType);
      if (!codeRestoredRef.current) {
        setMyCode(stub);
      }
      if (!opponentCodeSeenRef.current) {
        setOpponentCode(stub);
      }
      if (!codeRestoredRef.current) {
        setTimeout(() => {
          socketRef.current?.emit("code:sync", { roomId, inviteCode, role: roleRef.current, code: stub });
        }, 150);
      }
    });
    socket.on("match:ended", (payload: { winnerRole: "host" | "guest" | "draw"; reason?: string }) => {
      setMatchResult({
        winnerRole: payload.winnerRole,
        iWon: payload.winnerRole === roleRef.current,
        isDraw: payload.winnerRole === "draw",
        reason: payload.reason as "timeout" | "ac" | undefined,
      });
    });
    socket.on("player:left", (payload: { name: string; role: "host" | "guest" }) => {
      if (payload.role !== roleRef.current) setOpponentLeft(payload.name);
    });
    socket.on("player:returned", (payload: { role: "host" | "guest" }) => {
      if (payload.role !== roleRef.current) setOpponentLeft(null);
    });

    return () => {
      if (syncTimeoutRef.current) window.clearTimeout(syncTimeoutRef.current);
      socketRef.current = null;
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteCode, roomId]);

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

  const timeIsLow = timeLeft <= 60;
  const timeDisplay = `${String(Math.floor(timeLeft / 60)).padStart(2, "0")}:${String(timeLeft % 60).padStart(2, "0")}`;
  const myStatus = matchResult ? "Ended" : verdict?.verdict === "AC" ? "Accepted" : submitting ? "Running" : myCode.trim() ? "Editing" : "Waiting";
  const myTone: StatusTone = myStatus === "Accepted" ? "success" : myStatus === "Running" ? "warning" : myStatus === "Editing" ? "primary" : "neutral";
  const opponentStatus = opponentLeft ? "Left" : opponentTouched ? "Editing" : connectionState === "connected" ? "Connected" : "Waiting";
  const opponentTone: StatusTone = opponentLeft ? "danger" : opponentStatus === "Editing" ? "primary" : opponentStatus === "Connected" ? "success" : "neutral";
  const connectionTone: StatusTone = connectionState === "connected" ? "success" : connectionState === "connecting" ? "warning" : "danger";

  return (
    <main className="pb-6">
      {opponentLeft && (
        <div className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-danger/30 bg-danger/10 px-6 py-3 backdrop-blur-sm">
          <p className="text-sm font-semibold text-textMain">{opponentLeft} has left the room.</p>
          <button type="button" onClick={() => setOpponentLeft(null)} className="rounded-lg border border-border px-3 py-1 text-xs font-semibold text-textMuted hover:text-textMain">Dismiss</button>
        </div>
      )}

      {matchResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-md">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 text-center shadow-card">
            <StatusBadge tone={matchResult.isDraw ? "warning" : matchResult.iWon ? "success" : "danger"}>{matchResult.reason ?? "complete"}</StatusBadge>
            <h1 className="mt-4 text-3xl font-semibold text-textMain">{matchResult.isDraw ? "Draw" : matchResult.iWon ? "Accepted first" : "Opponent accepted first"}</h1>
            <p className="mt-3 text-sm leading-6 text-textMuted">
              {matchResult.isDraw ? "Both players tied on score." : matchResult.iWon ? `You beat ${opponentHandle} to Accepted.` : `${opponentHandle} solved it first.`}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button type="button" onClick={() => router.push("/match" as Route)} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primaryHover">Back to lobby</button>
              <button type="button" onClick={() => setMatchResult(null)} className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-textMuted hover:text-textMain">View code</button>
            </div>
          </div>
        </div>
      )}

      <section className="mx-auto max-w-[1800px] px-4 lg:px-6">
        <div className="sticky top-0 z-30 -mx-4 border-y border-border bg-bg/95 px-4 py-3 backdrop-blur lg:-mx-6 lg:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-base font-semibold text-textMain">{problem?.title ?? "Generating problem"}</h1>
                <StatusBadge tone={problem?.difficulty === "hard" ? "danger" : problem?.difficulty === "easy" ? "success" : "warning"}>{problem?.difficulty ?? config.difficulty}</StatusBadge>
                <StatusBadge>{editorLanguage}</StatusBadge>
              </div>
              <p className="mt-1 text-xs text-textSoft">Invite {inviteCode} · {myHandle} vs {opponentHandle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={connectionTone}>{connectionState === "connected" ? "Connected" : connectionState}</StatusBadge>
              <div className={`rounded-lg border px-3 py-2 font-mono text-sm ${timeIsLow ? "border-danger/40 bg-danger/10 text-danger" : "border-border bg-surface2 text-textMain"}`}>{timeDisplay}</div>
              <StatusBadge tone={myTone}>You: {myStatus}</StatusBadge>
              <StatusBadge tone={opponentTone}>Opponent: {opponentStatus}</StatusBadge>
              <button type="button" onClick={handleLeaveDuel} className="rounded-lg border border-border bg-surface2 px-4 py-2 text-sm font-semibold text-textMuted transition hover:border-danger hover:text-danger">Leave</button>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[0.78fr_1fr_1fr]">
          <aside className="max-h-[720px] overflow-y-auto rounded-xl border border-border bg-surface p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-textSoft">Problem statement</p>
            {problem ? (
              <>
                <h2 className="mt-3 text-xl font-semibold text-textMain">{problem.title}</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-textMuted">{problem.prompt}</p>
                {problem.rawJson?.examples?.map((ex, i) => (
                  <div key={i} className="mt-4 rounded-lg border border-borderSoft bg-bgSoft p-3 text-xs">
                    <p className="font-semibold text-textMain">Example {i + 1}</p>
                    <p className="mt-2 text-textMuted">Input: <code>{JSON.stringify(ex.args)}</code></p>
                    <p className="text-textMuted">Output: <code>{JSON.stringify(ex.output)}</code></p>
                    {ex.explanation && <p className="mt-2 text-textSoft">{ex.explanation}</p>}
                  </div>
                ))}
                {problem.rawJson?.constraints?.length ? (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-textSoft">Constraints</p>
                    <ul className="mt-2 space-y-1 text-xs text-textMuted">
                      {problem.rawJson.constraints.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="mt-3 text-sm text-textMuted">Generating the shared problem...</p>
            )}
          </aside>

          <section className="rounded-xl border border-border bg-surface p-3">
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <div><p className="text-sm font-semibold text-textMain">{myHandle}</p><p className="text-xs text-textSoft">Your editor</p></div>
              <StatusBadge tone={myTone}>{myStatus}</StatusBadge>
            </div>
            <div className="overflow-hidden rounded-lg border border-borderSoft bg-editorBg">
              <Editor
                height="620px"
                language={editorLanguage}
                theme="vs-dark"
                value={myCode}
                onChange={handleCodeChange}
                options={editorOptions(false)}
                onMount={(editor) => {
                  editor.onKeyDown((e) => {
                    const isCopyPaste = (e.ctrlKey || e.metaKey) && ["KeyV", "KeyC", "KeyX"].includes(e.code);
                    if (isCopyPaste) {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  });
                  ["paste", "copy", "cut"].forEach((eventName) => {
                    editor.getDomNode()?.addEventListener(eventName, (ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                    });
                  });
                }}
              />
            </div>
          </section>

          <section className="rounded-xl border border-border bg-surface p-3">
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <div><p className="text-sm font-semibold text-textMain">{opponentHandle}</p><p className="text-xs text-textSoft">Opponent editor</p></div>
              <StatusBadge tone={opponentTone}>{opponentStatus}</StatusBadge>
            </div>
            <div className="overflow-hidden rounded-lg border border-borderSoft bg-editorBg">
              <Editor height="620px" language={editorLanguage} theme="vs-dark" value={opponentCode} options={editorOptions(true)} />
            </div>
          </section>
        </div>

        <section className="mt-4 rounded-xl border border-border bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-textMain">Test cases / Output / Submission results</p>
              <p className="mt-1 text-xs text-textSoft">Visible judge output appears here after you submit.</p>
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !!matchResult || !problem}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primaryHover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Running..." : "Submit"}
            </button>
          </div>

          {verdict ? (
            <div className="mt-4">
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge tone={verdict.verdict === "AC" ? "success" : verdict.hasJudgeErrors ? "warning" : "danger"}>
                  {verdict.verdict === "AC" ? "Accepted" : verdict.hasJudgeErrors ? "Judge error" : "Failed"}
                </StatusBadge>
                <span className="text-sm text-textMuted">{verdict.passedTests}/{verdict.totalTests} tests passed</span>
              </div>
              {verdict.hasJudgeErrors && <p className="mt-3 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">The grading service had trouble running one or more tests. Wait a few seconds and try again.</p>}
              {verdict.results?.length ? (
                <div className="mt-3 grid gap-2 lg:grid-cols-2">
                  {verdict.results.map((r, i) => (
                    <div key={i} className={`rounded-lg border px-3 py-2 text-xs ${r.passed ? "border-success/20 bg-success/5" : "border-danger/20 bg-danger/5"}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-textMain">Test {i + 1}: {r.passed ? "Passed" : r.isJudgeError ? "Judge error" : "Failed"}</span>
                        <span className="font-mono text-textSoft">input {r.input}</span>
                      </div>
                      {!r.passed && <p className="mt-1 text-textMuted">{r.error ? r.error : `Expected ${r.expected}, got ${r.actual || "(empty)"}`}</p>}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-borderSoft bg-bgSoft px-3 py-3 text-sm text-textMuted">No submission yet.</div>
          )}
        </section>
      </section>
    </main>
  );
}

