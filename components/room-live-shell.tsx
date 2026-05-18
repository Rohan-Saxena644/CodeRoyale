"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { io, type Socket } from "socket.io-client";
import { RoomShell } from "@/components/room-shell";
import type { MatchConfig, RoomPresenceState } from "@/lib/types";

type RoomLiveShellProps = {
  roomId: string;
  inviteCode: string;
  hostName: string;
  guestName?: string;
  viewerRole: "host" | "guest";
  config: MatchConfig;
};

type JoinPayload = {
  roomId: string;
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
  config
}: RoomLiveShellProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [presence, setPresence] = useState<RoomPresenceState>({
    roomId,
    hostName,
    guestName
  });
  const [connectionState, setConnectionState] = useState<"connecting" | "connected" | "disconnected">("connecting");

  const joinPayload = useMemo<JoinPayload>(
    () => ({
      roomId,
      role: viewerRole,
      handle: viewerRole === "host" ? hostName : guestName ?? "Guest"
    }),
    [guestName, hostName, roomId, viewerRole]
  );

  useEffect(() => {
    const socket: Socket = io(getSocketUrl(), {
      transports: ["websocket"]
    });

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
        hostName: nextPresence.hostName ?? current.hostName,
        guestName: nextPresence.guestName
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, [joinPayload, roomId]);

  return (
    <RoomShell
      roomId={roomId}
      inviteCode={inviteCode}
      hostName={presence.hostName ?? hostName}
      guestName={presence.guestName}
      viewerRole={viewerRole}
      config={config}
      connectionState={connectionState}
    />
  );
}
