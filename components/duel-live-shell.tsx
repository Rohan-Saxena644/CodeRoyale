"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

type CodeStatePayload = {
  roomId: string;
  inviteCode: string;
  role: "host" | "guest";
  code: string;
};

const starterTemplates: Record<string, string> = {
  javascript: `function solve(input) {\n  // Write your solution here\n  return input;\n}\n\nconsole.log(solve("CodeRoyale"));\n`,
  python: `def solve(input_data: str):\n    # Write your solution here\n    return input_data\n\nprint(solve("CodeRoyale"))\n`,
  cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n  // Write your solution here\n  cout << "CodeRoyale" << endl;\n  return 0;\n}\n`,
  go: `package main\n\nimport "fmt"\n\nfunc main() {\n  // Write your solution here\n  fmt.Println("CodeRoyale")\n}\n`,
  rust: `fn main() {\n    // Write your solution here\n    println!("CodeRoyale");\n}\n`,
  default: `// Write your solution here\n`
};

function getSocketUrl() {
  return process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";
}

function getEditorLanguage(config: MatchConfig) {
  if (config.mode === "competitive") {
    if (config.duelLanguage === "cpp") {
      return "cpp";
    }

    return config.duelLanguage ?? "javascript";
  }

  return "javascript";
}

export function DuelLiveShell({
  roomId,
  inviteCode,
  hostName,
  guestName,
  viewerRole,
  config
}: DuelLiveShellProps) {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const syncTimeoutRef = useRef<number | null>(null);
  const editorLanguage = getEditorLanguage(config);
  const starterCode = starterTemplates[editorLanguage] ?? starterTemplates.default;
  const [connectionState, setConnectionState] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [myCode, setMyCode] = useState(starterCode);
  const [opponentCode, setOpponentCode] = useState(starterCode);
  const [viewerRoleState, setViewerRoleState] = useState<"host" | "guest">(viewerRole);
  const [problem, setProblem] = useState<null | {
    title: string;
    prompt: string;
    difficulty: string;
    rawJson: {
      constraints?: string[];
      examples?: { input: string; output: string; explanation?: string }[];
    };
  }>(null);

  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes in seconds

  const selfHandle = useMemo(
    () => (viewerRole === "host" ? hostName : guestName ?? "Guest"),
    [guestName, hostName, viewerRole]
  );

  function emitCode(code: string) {
    socketRef.current?.emit("code:sync", {
      roomId,
      inviteCode,
      role: viewerRoleState,
      code
    } satisfies CodeStatePayload);
  }

  function handleCodeChange(nextValue: string | undefined) {
    const nextCode = nextValue ?? "";
    setMyCode(nextCode);

    if (syncTimeoutRef.current) {
      window.clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = window.setTimeout(() => {
      emitCode(nextCode);
    }, 90);
  }

  function handleLeaveDuel() {
    const socket = socketRef.current;

    if (!socket) {
      router.push("/match" as Route);
      return;
    }

    socket.emit("room:leave", () => {
      router.push("/match" as Route);
    });
  }

  useEffect(() => {
    const socket: Socket = io(getSocketUrl(), {
      transports: ["websocket"]
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnectionState("connected");
      socket.emit("room:join", {
        roomId,
        inviteCode,
        role: viewerRoleState,
        handle: selfHandle
      });
      socket.emit("duel:join", {
        roomId,
        inviteCode,
        role: viewerRoleState,
        code: myCode
      });
    });

    socket.on("disconnect", () => {
      setConnectionState("disconnected");
    });

    socket.on("room:role-updated", (nextRole: "host" | "guest") => {
      setViewerRoleState(nextRole);
    });

    socket.on("room:state", (nextPresence: { status: string }) => {
      if (nextPresence.status !== "active") {
        router.push(`/room/${roomId}?invite=${inviteCode}&role=${viewerRoleState}` as Route);
      }
    });

    socket.on("code:state", (payload: { role: "host" | "guest"; code: string }) => {
      if (payload.role === viewerRoleState) {
        return;
      }

      setOpponentCode(payload.code);
    });

    socket.on("problem:ready", (incoming) => {
      console.log("problem:ready payload:", JSON.stringify(incoming, null, 2));
      setProblem(incoming);
    });


    return () => {
      if (syncTimeoutRef.current) {
        window.clearTimeout(syncTimeoutRef.current);
      }

      socketRef.current = null;
      socket.disconnect();
    };
  }, [inviteCode, myCode, roomId, router, selfHandle, viewerRoleState]);


  useEffect(() => {
    if (!problem) return; // don't start until problem is ready

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [problem]); // starts when problem arrives


  const myHandle = viewerRoleState === "host" ? hostName : (guestName ?? "Guest");
  const opponentHandle = viewerRoleState === "host" ? (guestName ?? "Opponent") : hostName;

  return (
    <main className="pb-16">
      <section className="mx-auto mt-6 max-w-[1600px] px-4 lg:px-6">

        {/* ── Top bar ── */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
              {config.mode}
            </span>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
              {config.duelLanguage ?? config.devCategory}
            </span>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-semibold capitalize text-white/60">
              {config.difficulty}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              connectionState === "connected"
                ? "border-lime/30 bg-lime/10 text-lime"
                : "border-gold/30 bg-gold/10 text-gold"
            }`}>
              {connectionState === "connected" ? "● live" : "● connecting"}
            </span>
            <button
              type="button"
              onClick={handleLeaveDuel}
              className="rounded-full border border-white/15 px-4 py-1.5 text-sm font-semibold text-white/70 transition hover:border-coral/50 hover:text-white"
            >
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
                    {problem.rawJson?.constraints && problem.rawJson.constraints.map((c:string, i: number) => (
                      <li key={i} className="text-xs text-white/50">• {c}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Problem</p>
                  <p className="mt-2 text-sm text-white/40 animate-pulse">Generating problem...</p>
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
              <div className="rounded-2xl border border-gold/30 bg-gold/10 px-4 py-2 font-semibold text-gold">
                {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:{String(timeLeft % 60).padStart(2, "0")}
              </div>
            </div>
          </div>

          {problem && problem.rawJson?.examples &&problem.rawJson.examples.map((ex: { input: string; output: string; explanation?: string }, i: number) => (
            <div key={i} className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-xs">
              <p className="text-white/50">Example {i + 1}</p>
              <p className="mt-1 text-white">Input: <code>{ex.input}</code></p>
              <p className="text-white">Output: <code>{ex.output}</code></p>
              {/* {ex.explanation && <p className="mt-1 text-white/50">{ex.explanation}</p>} */}
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
              <span className="rounded-full border border-lime/30 bg-lime/10 px-3 py-0.5 text-xs font-semibold uppercase tracking-[0.16em] text-lime">
                writable
              </span>
            </div>
            <div className="overflow-hidden rounded-[14px] border border-white/10">
              <Editor
                height="520px"
                language={editorLanguage}
                theme="vs-dark"
                value={myCode}
                onChange={handleCodeChange}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  wordWrap: "on",
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                  padding: { top: 12, bottom: 12 },
                }}
              />
            </div>
          </div>

          {/* Opponent editor */}
          <div className="rounded-[20px] border border-white/10 bg-black/20 p-4">
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <div>
                <p className="text-sm font-semibold text-white/75">{opponentHandle}</p>
                <p className="text-xs uppercase tracking-[0.16em] text-white/40">opponent · {editorLanguage}</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-0.5 text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
                read only
              </span>
            </div>
            <div className="overflow-hidden rounded-[14px] border border-white/10">
              <Editor
                height="520px"
                language={editorLanguage}
                theme="vs-dark"
                value={opponentCode}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 14,
                  wordWrap: "on",
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                  padding: { top: 12, bottom: 12 },
                }}
              />
            </div>
          </div>

        </div>

      </section>
    </main>
  );
}

