"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { io, type Socket } from "socket.io-client";
import type { Route } from "next";
import { RoomShell } from "@/components/room-shell";
import type { MatchConfig, RoomPresenceState } from "@/lib/types";

type RoomLiveShellProps = {
  roomId: string;
  inviteCode: string;
  hostName: string;
  guestName?: string;
  viewerRole: "host" | "guest";
  config: MatchConfig;
  initialStatus: RoomPresenceState["status"];
  initialHostReady: boolean;
  initialGuestReady: boolean;
  initialCountdownEndsAt?: number;
};

type JoinPayload = {
  roomId: string;
  inviteCode: string;
  role: "host" | "guest";
  handle: string;
};

function getSocketUrl() {
  return process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";
}

export function RoomLiveShell({
  roomId,
  inviteCode,
  hostName,
  guestName,
  viewerRole,
  config,
  initialStatus,
  initialHostReady,
  initialGuestReady,
  initialCountdownEndsAt,
}: RoomLiveShellProps) {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const [currentViewerRole, setCurrentViewerRole] = useState<"host" | "guest">(viewerRole);
  const [presence, setPresence] = useState<RoomPresenceState>({
    roomId,
    inviteCode,
    status: initialStatus,
    hostName,
    guestName,
    hostReady: initialHostReady,
    guestReady: initialGuestReady,
    countdownEndsAt: initialCountdownEndsAt,
  });
  const [connectionState, setConnectionState] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [countdownLeft, setCountdownLeft] = useState<number | null>(null);
  const [isReadyPending, setIsReadyPending] = useState(false);
  const [playerLeftName, setPlayerLeftName] = useState<string | null>(null);

  const joinPayload = useMemo<JoinPayload>(
    () => ({
      roomId,
      inviteCode,
      role: viewerRole,
      handle: viewerRole === "host" ? hostName : guestName ?? "Guest",
    }),
    [guestName, hostName, inviteCode, roomId, viewerRole]
  );

  const isViewerReady = currentViewerRole === "host" ? presence.hostReady : presence.guestReady;

  function handleReadyToggle() {
    if (connectionState !== "connected") return;
    setIsReadyPending(true);
    socketRef.current?.emit("player:ready", {
      roomId,
      inviteCode,
      role: currentViewerRole,
      ready: !isViewerReady,
    });
  }

  function handleLeaveRoom() {
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
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnectionState("connected");
      socket.emit("room:join", joinPayload);
    });

    socket.on("disconnect", () => {
      setConnectionState("disconnected");
    });

    socket.on("room:role-updated", (nextRole: "host" | "guest") => {
      setCurrentViewerRole(nextRole);
      setIsReadyPending(false);
    });

    socket.on("room:state", (nextPresence: RoomPresenceState) => {
      if (nextPresence.roomId !== roomId) return;

      if (nextPresence.status === "active") {
        router.push(
          `/duel/${roomId}?invite=${inviteCode}&host=${encodeURIComponent(
            nextPresence.hostName ?? hostName
          )}&guest=${encodeURIComponent(
            nextPresence.guestName ?? guestName ?? ""
          )}&mode=${config.mode}&difficulty=${config.difficulty}&track=${
            config.duelLanguage ?? config.devCategory ?? "javascript"
          }&role=${currentViewerRole}` as Route
        );
        return;
      }

      setPresence((current) => ({
        roomId: nextPresence.roomId,
        inviteCode: nextPresence.inviteCode ?? current.inviteCode,
        status: nextPresence.status,
        hostName: nextPresence.hostName ?? current.hostName,
        guestName: nextPresence.guestName,
        hostReady: nextPresence.hostReady,
        guestReady: nextPresence.guestReady,
        countdownEndsAt: nextPresence.countdownEndsAt,
      }));
      setIsReadyPending(false);
    });

    socket.on("player:left", (payload: { name: string; role: "host" | "guest" }) => {
      if (payload.role !== currentViewerRole) {
        setPlayerLeftName(payload.name);
      }
    });

    return () => {
      socketRef.current = null;
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.devCategory, config.difficulty, config.duelLanguage, config.mode, guestName, hostName, inviteCode, joinPayload, roomId, router, currentViewerRole]);

  useEffect(() => {
    if (!presence.countdownEndsAt || presence.status !== "countdown") {
      setCountdownLeft(null);
      return;
    }

    function updateCountdown() {
      const ms = presence.countdownEndsAt! - Date.now();
      const secs = Math.ceil(ms / 1000);
      setCountdownLeft(Math.max(1, secs));
    }

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 250);
    return () => window.clearInterval(interval);
  }, [presence.countdownEndsAt, presence.status]);

  return (
    <>
      {playerLeftName && (
        <div className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-coral/40 bg-coral/10 px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="text-lg">👋</span>
            <p className="text-sm font-semibold text-white">
              <span className="text-coral">{playerLeftName}</span> has left the room.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPlayerLeftName(null)}
            className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/70 transition hover:bg-white/20"
          >
            Dismiss
          </button>
        </div>
      )}
      <RoomShell
        roomId={roomId}
        inviteCode={inviteCode}
        hostName={presence.hostName ?? hostName}
        guestName={presence.guestName}
        viewerRole={currentViewerRole}
        config={config}
        matchStatus={presence.status}
        hostReady={presence.hostReady}
        guestReady={presence.guestReady}
        countdownLeft={countdownLeft}
        connectionState={connectionState}
        onReadyToggle={handleReadyToggle}
        onLeaveRoom={handleLeaveRoom}
        isReadyPending={isReadyPending}
      />
    </>
  );
}
