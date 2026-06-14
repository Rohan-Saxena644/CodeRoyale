"use client";

import { useState } from "react";
import type { MatchConfig, MatchStatus } from "@/lib/types";

type RoomShellProps = {
  roomId: string;
  inviteCode: string;
  hostName: string;
  guestName?: string;
  viewerRole: "host" | "guest";
  config: MatchConfig;
  matchStatus: MatchStatus;
  hostReady: boolean;
  guestReady: boolean;
  countdownLeft?: number | null;
  connectionState?: "connecting" | "connected" | "disconnected";
  onReadyToggle: () => void;
  onLeaveRoom: () => void;
  isReadyPending?: boolean;
};

export function RoomShell({
  roomId,
  inviteCode,
  hostName,
  guestName,
  viewerRole,
  config,
  matchStatus,
  hostReady,
  guestReady,
  countdownLeft,
  connectionState = "disconnected",
  onReadyToggle,
  onLeaveRoom,
  isReadyPending = false,
}: RoomShellProps) {
  // ── Copy-to-clipboard state ──────────────────────────────────────────────
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // ── Derived display values ───────────────────────────────────────────────
  const roomHeadline =
    matchStatus === "countdown"
      ? countdownLeft != null
        ? `Match starts in ${countdownLeft}s`
        : "Match starting…"
      : matchStatus === "active"
        ? "Duel is live"
        : guestName
          ? "Both players are in the room"
          : "Waiting for opponent…";

  const roomSubcopy =
    matchStatus === "countdown"
      ? "Both players are locked in. Get ready — the editor room is loading."
      : matchStatus === "active"
        ? "Match is live. Routing you to the duel workspace now."
        : guestName
          ? "Both players are here. Mark yourself ready to start the countdown."
          : "Share the invite code with your opponent so they can join.";

  const viewerReady = viewerRole === "host" ? hostReady : guestReady;
  const canReadyUp = Boolean(hostName && guestName) && matchStatus !== "active";
  const leaveWarning =
    matchStatus === "countdown" || matchStatus === "active"
      ? "Leaving now will drop you from the room and forfeit the match."
      : "Leaving returns you to matchmaking. Your room slot will be freed.";

  return (
    <section className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
      <article className="card-border rounded-[28px] border border-white/10 bg-panel/92 p-6">

        {/* ── Header: status + invite code ─────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime">
              Room status
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white">
              {roomHeadline}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
              {roomSubcopy}
            </p>
          </div>

          {/* Invite code card with copy button */}
          <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-right">
            <div className="text-xs uppercase tracking-[0.18em] text-white/45">
              Invite code
            </div>
            <div className="mt-1 font-mono text-2xl text-gold">{inviteCode}</div>
            <button
              type="button"
              onClick={handleCopy}
              className={`mt-2 rounded-full px-3 py-1 text-xs font-semibold transition-all duration-200 ${
                copied
                  ? "bg-lime/20 text-lime"
                  : "bg-white/8 text-white/60 hover:bg-white/15 hover:text-white"
              }`}
            >
              {copied ? "✓ Copied!" : "Copy code"}
            </button>
          </div>
        </div>

        {/* ── Player slots ─────────────────────────────────────────────── */}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {/* Host slot */}
          <div className="rounded-3xl border border-white/10 bg-black/15 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-white/45">Host</p>
            <p className="mt-2 text-lg font-semibold text-white">{hostName}</p>
            <div className="mt-2 flex items-center gap-2">
              {hostReady ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-lime" />
                  <span className="text-sm text-lime">Ready</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-white/25" />
                  <span className="text-sm text-white/45">
                    {viewerRole === "host" ? "You created this room" : "Not ready"}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Guest slot */}
          <div
            className={`rounded-3xl p-5 transition-all duration-300 ${
              guestName
                ? "border border-white/10 bg-black/15"
                : "border border-dashed border-white/15 bg-black/10"
            }`}
          >
            <p className="text-xs uppercase tracking-[0.18em] text-white/45">Opponent</p>
            {guestName ? (
              <>
                <p className="mt-2 text-lg font-semibold text-white">{guestName}</p>
                <div className="mt-2 flex items-center gap-2">
                  {guestReady ? (
                    <>
                      <span className="h-2 w-2 rounded-full bg-lime" />
                      <span className="text-sm text-lime">Ready</span>
                    </>
                  ) : (
                    <>
                      <span className="h-2 w-2 rounded-full bg-white/25" />
                      <span className="text-sm text-white/45">
                        {viewerRole === "guest" ? "You joined" : "Not ready yet"}
                      </span>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="mt-2 text-lg font-semibold text-white/30">Open slot</p>
                {/* Waiting animation */}
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/30 [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/30 [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/30 [animation-delay:300ms]" />
                  <span className="ml-1 text-sm text-white/40">Waiting for opponent</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Ready check ──────────────────────────────────────────────── */}
        <div className="mt-6 flex flex-col gap-4 rounded-[24px] border border-lime/25 bg-lime/10 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-lime">Ready check</p>
            <p className="mt-1 text-sm text-white/72">
              {canReadyUp
                ? viewerReady
                  ? matchStatus === "countdown"
                    ? "Countdown is live. You can still unready to cancel."
                    : "You are locked in. Unready if you want to change."
                  : matchStatus === "countdown"
                    ? "If either player unreadies, the countdown resets."
                    : "Both players are here. Mark yourself ready to start."
                : "The ready button activates once both players are in the room."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onReadyToggle}
              disabled={!canReadyUp || connectionState !== "connected" || isReadyPending}
              className={`rounded-full px-6 py-3 font-semibold transition ${
                viewerReady ? "bg-white text-ink" : "bg-lime text-ink"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {isReadyPending ? "Updating…" : viewerReady ? "Unready" : "Ready up"}
            </button>
            <button
              type="button"
              onClick={onLeaveRoom}
              className="rounded-full border border-white/15 px-6 py-3 font-semibold text-white/82 transition hover:border-coral/55 hover:text-white"
            >
              Leave room
            </button>
          </div>
        </div>

        {/* ── Leave warning ─────────────────────────────────────────────── */}
        <div className="mt-4 rounded-[20px] border border-coral/35 bg-coral/10 p-4 text-sm text-white/78">
          <p className="font-semibold text-coral">Room warning</p>
          <p className="mt-2">{leaveWarning}</p>
        </div>
      </article>

      {/* ── Sidebar: config ───────────────────────────────────────────────── */}
      <aside className="space-y-6">
        <div className="card-border rounded-[28px] border border-white/10 bg-black/20 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
            Configuration
          </p>
          <dl className="mt-4 space-y-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-white/55">Mode</dt>
              <dd className="font-medium capitalize text-white">{config.mode}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/55">Difficulty</dt>
              <dd className="font-medium capitalize text-white">{config.difficulty}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/55">Track</dt>
              <dd className="font-medium text-white">
                {config.duelLanguage ?? config.devCategory}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/55">Room ID</dt>
              <dd className="font-mono text-xs text-white/75">{roomId}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/55">Your role</dt>
              <dd className="font-medium capitalize text-white">{viewerRole}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/55">Socket</dt>
              <dd
                className={`font-medium capitalize ${
                  connectionState === "connected"
                    ? "text-lime"
                    : connectionState === "connecting"
                      ? "text-gold"
                      : "text-coral"
                }`}
              >
                {connectionState}
              </dd>
            </div>
          </dl>
        </div>
      </aside>
    </section>
  );
}