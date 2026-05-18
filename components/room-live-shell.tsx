"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
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
  const [, startTransition] = useTransition();
  const socketRef = useRef<Socket | null>(null);
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

  const isViewerReady = viewerRole === "host" ? presence.hostReady : presence.guestReady;

  function handleReadyToggle() {
    if (connectionState !== "connected") {
      return;
    }

    setIsReadyPending(true);
    socketRef.current?.emit("player:ready", {
      roomId,
      inviteCode,
      role: viewerRole,
      ready: !isViewerReady
    });
  }

  function handleLeaveRoom() {
    socketRef.current?.disconnect();
    router.push("/match" as Route);
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

    socket.on("room:state", (nextPresence: RoomPresenceState) => {
      if (nextPresence.roomId !== roomId) {
        return;
      }

      startTransition(() => {
        router.refresh();
      });

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
  }, [joinPayload, roomId, router, startTransition]);

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
      viewerRole={viewerRole}
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
