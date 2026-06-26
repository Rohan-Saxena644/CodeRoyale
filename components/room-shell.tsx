import Link from "next/link";
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
  const safeCountdown = countdownLeft != null && countdownLeft > 0 ? countdownLeft : null;

  const roomHeadline =
    matchStatus === "countdown"
      ? safeCountdown != null
        ? `Match starts in ${safeCountdown}s`
        : "Match starting…"
      : matchStatus === "active"
        ? "Duel is ready to begin"
        : guestName
          ? "Both players are in the room"
          : "Waiting for opponent";

  const roomSubcopy =
    matchStatus === "countdown"
      ? "Both players are locked in. Get ready — the editor is loading."
      : matchStatus === "active"
        ? "Match is live. Routing you to the duel workspace now."
        : guestName
          ? "Both players are here. Mark yourself ready to start the countdown."
          : "Share the invite code with your opponent so they can join.";

  const viewerReady = viewerRole === "host" ? hostReady : guestReady;
  const canReadyUp = Boolean(hostName && guestName) && matchStatus !== "active";

  const leaveWarning =
    matchStatus === "countdown" || matchStatus === "active"
      ? "Leaving this tab or pressing leave will drop you from the room and end this match."
      : "Leaving the room returns you to matchmaking. If you close this tab, the room presence is lost.";

  return (
    <section className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
      <article className="card-border rounded-[28px] border border-white/10 bg-panel/92 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime">Room status</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">{roomHeadline}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">{roomSubcopy}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-right">
            <div className="text-xs uppercase tracking-[0.18em] text-white/45">Invite code</div>
            <div className="mt-1 font-mono text-2xl text-gold">{inviteCode}</div>
          </div>
        </div>

        {matchStatus === "countdown" && safeCountdown != null && (
          <div className="mt-6 flex items-center gap-4 rounded-[20px] border border-gold/30 bg-gold/8 px-5 py-4">
            <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 56 56" fill="none">
                <circle cx="28" cy="28" r="24" stroke="rgba(255,200,60,0.15)" strokeWidth="4" />
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  stroke="#ffc83c"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 24}`}
                  strokeDashoffset={`${2 * Math.PI * 24 * (1 - safeCountdown / 5)}`}
                  style={{ transition: "stroke-dashoffset 0.25s linear" }}
                />
              </svg>
              <span className="text-xl font-black tabular-nums text-gold">{safeCountdown}</span>
            </div>
            <div>
              <p className="font-semibold text-gold">Get ready!</p>
              <p className="mt-0.5 text-sm text-white/60">
                The duel workspace is loading. You'll be taken there automatically.
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-black/15 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-white/45">Host</p>
            <p className="mt-2 text-lg font-semibold text-white">{hostName}</p>
            <p className={`mt-2 text-sm ${hostReady ? "text-lime" : "text-white/45"}`}>
              {hostReady ? "✓ Ready" : viewerRole === "host" ? "You created this room" : "Host joined"}
            </p>
          </div>
          <div
            className={
              "rounded-3xl p-5 " +
              (guestName
                ? "border border-white/10 bg-black/15"
                : "border border-dashed border-white/15 bg-black/10")
            }
          >
            <p className="text-xs uppercase tracking-[0.18em] text-white/45">Opponent</p>
            <p className="mt-2 text-lg font-semibold text-white/72">{guestName ?? "Open slot"}</p>
            <p className={`mt-2 text-sm ${guestReady ? "text-lime" : "text-white/45"}`}>
              {guestName
                ? guestReady
                  ? "✓ Ready"
                  : viewerRole === "guest"
                    ? "You joined with the invite code"
                    : "Opponent joined"
                : "Waiting for someone to join with the invite code"}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 rounded-[24px] border border-lime/25 bg-lime/10 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-lime">Ready check</p>
            <p className="mt-1 text-sm text-white/72">
              {canReadyUp
                ? viewerReady
                  ? matchStatus === "countdown"
                    ? "Countdown is live. You can still unready to cancel the start."
                    : "You're locked in. Click Unready to change your mind."
                  : matchStatus === "countdown"
                    ? "If either player unreadies during countdown, the room resets."
                    : "Both players are here. Mark yourself ready to start the countdown."
                : "The ready button activates once both players are in the room."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onReadyToggle}
              disabled={!canReadyUp || connectionState !== "connected" || isReadyPending}
              className={
                "rounded-full px-6 py-3 font-semibold transition " +
                (viewerReady ? "bg-white text-ink" : "bg-lime text-ink") +
                " disabled:cursor-not-allowed disabled:opacity-50"
              }
            >
              {isReadyPending ? "Updating..." : viewerReady ? "Unready" : "Ready up"}
            </button>
            <button
              type="button"
              onClick={onLeaveRoom}
              className="rounded-full border border-white/15 px-6 py-3 font-semibold text-white/80 transition hover:border-coral/55 hover:text-white"
            >
              Leave room
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-[20px] border border-coral/35 bg-coral/10 p-4 text-sm text-white/78">
          <p className="font-semibold text-coral">Warning</p>
          <p className="mt-2">{leaveWarning}</p>
        </div>
      </article>

      <aside className="space-y-6">
        <div className="card-border rounded-[28px] border border-white/10 bg-black/20 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Configuration</p>
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
              <dd className="font-medium text-white">{config.duelLanguage ?? config.devCategory}</dd>
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
                className={
                  "font-medium capitalize " +
                  (connectionState === "connected"
                    ? "text-lime"
                    : connectionState === "connecting"
                      ? "text-gold"
                      : "text-coral")
                }
              >
                {connectionState}
              </dd>
            </div>
          </dl>
        </div>

        <Link
          href="/match"
          className="inline-flex rounded-full border border-white/10 bg-white px-5 py-3 font-semibold text-ink"
        >
          Create another room
        </Link>
      </aside>
    </section>
  );
}
