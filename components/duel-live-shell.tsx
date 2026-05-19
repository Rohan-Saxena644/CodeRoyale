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

    return () => {
      if (syncTimeoutRef.current) {
        window.clearTimeout(syncTimeoutRef.current);
      }

      socketRef.current = null;
      socket.disconnect();
    };
  }, [inviteCode, myCode, roomId, router, selfHandle, viewerRoleState]);

  return (
    <main className="pb-16">
      <section className="mx-auto mt-8 max-w-7xl px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-gold">Phase 2 duel room</p>
            <h1 className="mt-2 text-4xl font-semibold text-white">Live editor battle</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/68">
              This is the first editor shell for CodeRoyale. You can type in the primary editor while the opponent
              pane mirrors the other player through socket sync.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-white/75">
              Role: <span className="font-semibold text-white">{viewerRoleState}</span>
            </div>
            <div className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-white/75">
              Socket:{" "}
              <span className={connectionState === "connected" ? "font-semibold text-lime" : "font-semibold text-gold"}>
                {connectionState}
              </span>
            </div>
            <button
              type="button"
              onClick={handleLeaveDuel}
              className="rounded-full border border-white/15 px-5 py-2 font-semibold text-white/82"
            >
              Leave duel
            </button>
          </div>
        </div>

        <section className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
          <aside className="space-y-6">
            <div className="card-border rounded-[28px] border border-white/10 bg-panel/92 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Problem</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Placeholder challenge</h2>
              <p className="mt-4 text-sm leading-6 text-white/72">
                For this slice we are intentionally holding a placeholder prompt here. Phase 3 will swap this panel
                over to generated competitive or dev-mode tasks from the API.
              </p>
              <div className="mt-5 rounded-2xl border border-gold/30 bg-gold/10 p-4 text-sm text-gold">
                Competitive placeholder: read input, transform it correctly, and print the expected output.
              </div>
            </div>

            <div className="card-border rounded-[28px] border border-white/10 bg-black/20 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Match info</p>
              <dl className="mt-4 space-y-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-white/55">Host</dt>
                  <dd className="font-medium text-white">{hostName}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-white/55">Guest</dt>
                  <dd className="font-medium text-white">{guestName ?? "Waiting"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-white/55">Mode</dt>
                  <dd className="font-medium capitalize text-white">{config.mode}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-white/55">Track</dt>
                  <dd className="font-medium text-white">{config.duelLanguage ?? config.devCategory}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-white/55">Timer</dt>
                  <dd className="font-medium text-gold">30:00 placeholder</dd>
                </div>
              </dl>
            </div>
          </aside>

          <section className="grid gap-6">
            <div className="card-border rounded-[28px] border border-white/10 bg-panel/92 p-4">
              <div className="mb-3 flex items-center justify-between gap-4 px-2">
                <div>
                  <p className="text-sm font-semibold text-white">Your editor</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/45">{editorLanguage}</p>
                </div>
                <div className="rounded-full border border-lime/25 bg-lime/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-lime">
                  Writable
                </div>
              </div>
              <div className="overflow-hidden rounded-[22px] border border-white/10">
                <Editor
                  height="420px"
                  language={editorLanguage}
                  theme="vs-dark"
                  value={myCode}
                  onChange={handleCodeChange}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    wordWrap: "on",
                    automaticLayout: true
                  }}
                />
              </div>
            </div>

            <div className="card-border rounded-[28px] border border-white/10 bg-black/20 p-4">
              <div className="mb-3 flex items-center justify-between gap-4 px-2">
                <div>
                  <p className="text-sm font-semibold text-white">Opponent view</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                    {viewerRoleState === "host" ? guestName ?? "Opponent" : hostName}
                  </p>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                  Read only
                </div>
              </div>
              <div className="overflow-hidden rounded-[22px] border border-white/10">
                <Editor
                  height="320px"
                  language={editorLanguage}
                  theme="vs-dark"
                  value={opponentCode}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 14,
                    wordWrap: "on",
                    automaticLayout: true
                  }}
                />
              </div>
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}
