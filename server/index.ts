import { createServer } from "node:http";
import express from "express";
import { Server } from "socket.io";
import type { RoomPresenceState } from "../lib/types";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  }
});

const roomPresence = new Map<string, RoomPresenceState>();

function upsertRoomPresence(roomId: string, role: "host" | "guest", handle: string) {
  const current = roomPresence.get(roomId) ?? { roomId };
  const nextState: RoomPresenceState =
    role === "host"
      ? {
          ...current,
          roomId,
          hostName: handle
        }
      : {
          ...current,
          roomId,
          guestName: handle
        };

  roomPresence.set(roomId, nextState);
  return nextState;
}

function clearRoomPresence(roomId: string, role: "host" | "guest") {
  const current = roomPresence.get(roomId);

  if (!current) {
    return null;
  }

  const nextState: RoomPresenceState =
    role === "host"
      ? {
          ...current,
          hostName: undefined
        }
      : {
          ...current,
          guestName: undefined
        };

  if (!nextState.hostName && !nextState.guestName) {
    roomPresence.delete(roomId);
    return { roomId };
  }

  roomPresence.set(roomId, nextState);
  return nextState;
}

app.get("/health", (_request, response) => {
  response.json({
    ok: true,
    service: "coderoyale-socket",
    timestamp: new Date().toISOString()
  });
});

io.on("connection", (socket) => {
  socket.emit("server:hello", {
    message: "CodeRoyale socket server connected"
  });

  socket.on("room:join", (payload: { roomId: string; role: "host" | "guest"; handle: string }) => {
    socket.join(payload.roomId);
    socket.data.roomId = payload.roomId;
    socket.data.role = payload.role;

    const nextState = upsertRoomPresence(payload.roomId, payload.role, payload.handle);
    io.to(payload.roomId).emit("room:state", nextState);
  });

  socket.on("disconnect", () => {
    const roomId = socket.data.roomId as string | undefined;
    const role = socket.data.role as "host" | "guest" | undefined;

    if (!roomId || !role) {
      return;
    }

    const nextState = clearRoomPresence(roomId, role);

    if (nextState) {
      io.to(roomId).emit("room:state", nextState);
    }
  });
});

const port = Number(process.env.PORT ?? 4000);
httpServer.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`CodeRoyale socket server listening on http://localhost:${port}`);
});
