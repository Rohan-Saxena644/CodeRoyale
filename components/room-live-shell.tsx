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
  initialCountdownEndsAt
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
    countdownEndsAt: initialCountdownEndsAt
  });
  const [connectionState, setConnectionState] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [countdownLeft, setCountdownLeft] = useState<number | null>(null);
  const [isReadyPending, setIsReadyPending] = useState(false);

  const joinPayload = useMemo<JoinPayload>(
    () => ({
      roomId,
      inviteCode,
      role: viewerRole,
      handle: viewerRole === "host" ? hostName : guestName ?? "Guest"
    }),
    [guestName, hostName, inviteCode, roomId, viewerRole]
  );

  const isViewerReady = currentViewerRole === "host" ? presence.hostReady : presence.guestReady;

  function handleReadyToggle() {
    if (connectionState !== "connected") {
      return;
    }

    setIsReadyPending(true);
    socketRef.current?.emit("player:ready", {
      roomId,
      inviteCode,
      role: currentViewerRole,
      ready: !isViewerReady
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
      transports: ["websocket"]
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
      if (nextPresence.roomId !== roomId) {
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
        countdownEndsAt: nextPresence.countdownEndsAt
      }));
      setIsReadyPending(false);
    });

    return () => {
      socketRef.current = null;
      socket.disconnect();
    };
  }, [joinPayload, roomId]);

  useEffect(() => {
    if (!presence.countdownEndsAt || presence.status !== "countdown") {
      setCountdownLeft(null);
      return;
    }

    const updateCountdown = () => {
      const secondsLeft = Math.max(0, Math.ceil((presence.countdownEndsAt! - Date.now()) / 1000));
      setCountdownLeft(secondsLeft);
    };

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 250);

    return () => {
      window.clearInterval(interval);
    };
  }, [presence.countdownEndsAt, presence.status]);

  return (
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
  );
}
