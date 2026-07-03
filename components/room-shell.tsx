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

function StatusBadge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "success" | "warning" | "danger" }) {
  const classes = {
    neutral: "border-borderSoft bg-surface3 text-textMuted",
    success: "border-success/30 bg-success/10 text-success",
    warning: "border-warning/30 bg-warning/10 text-warning",
    danger: "border-danger/30 bg-danger/10 text-danger",
  };
  return <span className={`rounded-md border px-2 py-1 text-xs font-medium ${classes[tone]}`}>{children}</span>;
}

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
  const viewerReady = viewerRole === "host" ? hostReady : guestReady;
  const canReadyUp = Boolean(hostName && guestName) && matchStatus !== "active";
  const roomHeadline = matchStatus === "countdown" && safeCountdown ? `Match starts in ${safeCountdown}s` : guestName ? "Both players are in the room" : "Waiting for opponent";
  const shortRoomId = roomId.length > 14 ? `${roomId.slice(0, 6)}...${roomId.slice(-4)}` : roomId;
  const socketTone = connectionState === "connected" ? "success" : connectionState === "connecting" ? "warning" : "danger";

  return (
    <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <article className="card-border rounded-xl border border-border bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Lobby</p>
            <h1 className="mt-2 text-3xl font-semibold text-textMain">{roomHeadline}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-textMuted">
              {guestName ? "Ready up when both players are settled." : "Share the invite code with your opponent so they can join."}
            </p>
          </div>
          <StatusBadge tone={matchStatus === "countdown" ? "warning" : "neutral"}>{matchStatus}</StatusBadge>
        </div>

        <div className="mt-6 rounded-xl border border-borderSoft bg-bgSoft p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-textSoft">Invite code</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-textMain">{inviteCode}</p>
            </div>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(inviteCode)}
              className="rounded-lg border border-border bg-surface2 px-4 py-2 text-sm font-semibold text-textMain transition hover:border-primary hover:text-primary"
            >
              Copy
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-borderSoft bg-bgSoft p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-textSoft">Host</p>
                <p className="mt-2 text-lg font-semibold text-textMain">{hostName}</p>
              </div>
              <StatusBadge tone={hostReady ? "success" : "neutral"}>{hostReady ? "Ready" : "Waiting"}</StatusBadge>
            </div>
          </div>
          <div className="rounded-xl border border-borderSoft bg-bgSoft p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-textSoft">Opponent</p>
                <p className="mt-2 text-lg font-semibold text-textMain">{guestName ?? "Open slot"}</p>
              </div>
              <StatusBadge tone={guestReady ? "success" : "neutral"}>{guestName ? guestReady ? "Ready" : "Waiting" : "Empty"}</StatusBadge>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 rounded-xl border border-borderSoft bg-surface2 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-textMain">Ready state</p>
            <p className="mt-1 text-sm text-textMuted">
              {canReadyUp ? (viewerReady ? "You are ready. Unready if you need to change settings." : "Both players are present. Ready up to start the countdown.") : "The ready button activates once both slots are filled."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onReadyToggle}
              disabled={!canReadyUp || connectionState !== "connected" || isReadyPending}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primaryHover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isReadyPending ? "Updating..." : viewerReady ? "Unready" : "Ready up"}
            </button>
            <button
              type="button"
              onClick={onLeaveRoom}
              className="rounded-lg border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-textMuted transition hover:border-danger hover:text-danger"
            >
              Leave room
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          Leaving this page removes your room presence.
        </div>
      </article>

      <aside className="card-border rounded-xl border border-border bg-surface p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Room settings</p>
        <dl className="mt-5 space-y-4 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-textMuted">Mode</dt><dd className="font-medium capitalize text-textMain">{config.mode}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-textMuted">Difficulty</dt><dd className="font-medium capitalize text-textMain">{config.difficulty}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-textMuted">Language</dt><dd className="font-medium text-textMain">{config.duelLanguage ?? config.devCategory}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-textMuted">Socket connection</dt><dd><StatusBadge tone={socketTone}>{connectionState}</StatusBadge></dd></div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-textMuted">Room ID</dt>
            <dd className="flex items-center gap-2">
              <span className="font-mono text-xs text-textMain">{shortRoomId}</span>
              <button type="button" onClick={() => navigator.clipboard?.writeText(roomId)} className="rounded-md border border-border px-2 py-1 text-xs text-textMuted hover:text-primary">Copy</button>
            </dd>
          </div>
          <div className="flex justify-between gap-4"><dt className="text-textMuted">Your role</dt><dd className="font-medium capitalize text-textMain">{viewerRole}</dd></div>
        </dl>

        <Link href="/match" className="mt-6 inline-flex rounded-lg border border-border bg-surface2 px-4 py-2 text-sm font-semibold text-textMain transition hover:border-primary hover:text-primary">
          Create another room
        </Link>
      </aside>
    </section>
  );
}

