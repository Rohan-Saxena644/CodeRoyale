import { createServer } from "node:http";
import express from "express";
import { Server } from "socket.io";
import { nextMatchStatus } from "../lib/match-state";
import { prisma } from "../lib/prisma-server";
import type { RoomPresenceState } from "../lib/types";

const app = express();
app.use(express.json());

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  },
});

const roomPresence = new Map<string, RoomPresenceState>();
const countdownTimers = new Map<string, NodeJS.Timeout>();
const roomCodeState = new Map<string, { hostCode: string; guestCode: string }>();

// ─── helpers ────────────────────────────────────────────────────────────────

function upsertRoomPresence(
  roomId: string,
  inviteCode: string,
  role: "host" | "guest",
  handle: string
): RoomPresenceState {
  const current: RoomPresenceState = roomPresence.get(roomId) ?? {
    roomId,
    inviteCode,
    status: "waiting",
    hostReady: false,
    guestReady: false,
  };
  const nextState: RoomPresenceState =
    role === "host"
      ? { ...current, roomId, inviteCode, hostName: handle }
      : { ...current, roomId, inviteCode, guestName: handle };
  roomPresence.set(roomId, nextState);
  return nextState;
}

function clearRoomPresence(
  roomId: string,
  role: "host" | "guest"
): RoomPresenceState | null {
  const current = roomPresence.get(roomId);
  if (!current) return null;
  const nextState: RoomPresenceState =
    role === "host"
      ? {
          ...current,
          hostName: undefined,
          hostReady: false,
          status: "waiting",
          countdownEndsAt: undefined,
        }
      : {
          ...current,
          guestName: undefined,
          guestReady: false,
          status: "waiting",
          countdownEndsAt: undefined,
        };
  if (!nextState.hostName && !nextState.guestName) {
    roomPresence.delete(roomId);
    return {
      roomId,
      inviteCode: current.inviteCode,
      status: "waiting",
      hostReady: false,
      guestReady: false,
    };
  }
  roomPresence.set(roomId, nextState);
  return nextState;
}

function clearCountdown(roomId: string) {
  const timer = countdownTimers.get(roomId);
  if (timer) {
    clearTimeout(timer);
    countdownTimers.delete(roomId);
  }
}

function emitRoomState(roomId: string, nextState: RoomPresenceState) {
  roomPresence.set(roomId, nextState);
  io.to(roomId).emit("room:state", nextState);
}

function getRoomCodeState(roomId: string) {
  return roomCodeState.get(roomId) ?? { hostCode: "", guestCode: "" };
}

async function persistNamesForJoin(
  inviteCode: string,
  role: "host" | "guest",
  handle: string
) {
  try {
    if (role === "host") {
      await prisma.match.update({
        where: { inviteCode },
        data: { hostName: handle },
      });
    } else {
      await prisma.match.update({
        where: { inviteCode },
        data: { guestName: handle, status: "waiting" },
      });
    }
  } catch {
    console.warn("[persistNamesForJoin] skipped — not found:", inviteCode);
  }
}

async function persistRoomAfterDisconnect(
  inviteCode: string,
  nextState: RoomPresenceState
) {
  try {
    if (!nextState.hostName && !nextState.guestName) {
      await prisma.match.delete({ where: { inviteCode } });
      return;
    }
    await prisma.match.update({
      where: { inviteCode },
      data: {
        hostName: nextState.hostName ?? "",
        guestName: nextState.guestName ?? null,
        status: nextState.status as never,
      },
    });
  } catch {
    console.warn("[persistRoomAfterDisconnect] skipped:", inviteCode);
  }
}

async function promoteRemainingGuest(
  roomId: string,
  inviteCode: string,
  current: RoomPresenceState
) {
  if (!current.guestName) return current;
  const promotedState: RoomPresenceState = {
    roomId,
    inviteCode,
    status: "waiting",
    hostName: current.guestName,
    guestName: undefined,
    hostReady: false,
    guestReady: false,
    countdownEndsAt: undefined,
  };
  await prisma.match.update({
    where: { inviteCode },
    data: { hostName: current.guestName, guestName: null, status: "waiting" },
  });
  const socketsInRoom = await io.in(roomId).fetchSockets();
  for (const roomSocket of socketsInRoom) {
    roomSocket.data.role = "host";
    roomSocket.emit("room:role-updated", "host");
  }
  return promotedState;
}

async function handleRoomDeparture(
  socket: Parameters<Parameters<typeof io.on>[1]>[0]
) {
  const roomId = socket.data.roomId as string | undefined;
  const role = socket.data.role as "host" | "guest" | undefined;
  const inviteCode = socket.data.inviteCode as string | undefined;
  if (!roomId || !role || !inviteCode || socket.data.departureHandled) return;
  socket.data.departureHandled = true;
  const current = roomPresence.get(roomId);
  if (!current) return;
  if (current.status === "active") return;
  clearCountdown(roomId);
  let nextState: RoomPresenceState | null = null;
  if (role === "host" && current.guestName) {
    nextState = await promoteRemainingGuest(roomId, inviteCode, current);
    roomPresence.set(roomId, nextState);
  } else {
    nextState = clearRoomPresence(roomId, role);
    if (nextState) await persistRoomAfterDisconnect(inviteCode, nextState);
  }
  if (nextState) emitRoomState(roomId, { ...nextState, inviteCode });
}

function scheduleCountdown(
  roomId: string,
  inviteCode: string,
  countdownEndsAt: number
) {
  clearCountdown(roomId);
  const delay = Math.max(0, countdownEndsAt - Date.now());
  const timer = setTimeout(() => {
    const current = roomPresence.get(roomId);
    if (!current) return;
    const nextState: RoomPresenceState = {
      ...current,
      inviteCode,
      status: nextMatchStatus("countdown", "countdown-finished"),
      countdownEndsAt: undefined,
    };
    emitRoomState(roomId, nextState);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    fetch(`${appUrl}/api/problem/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId: roomId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.problem) {
          console.log("[socket] emitting problem:ready to room:", roomId);
          io.to(roomId).emit("problem:ready", data.problem);
        }
      })
      .catch((err) => console.error("[socket] problem generation failed:", err));
    countdownTimers.delete(roomId);
  }, delay);
  countdownTimers.set(roomId, timer);
}

// ─── HTTP routes ─────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "coderoyale-socket", timestamp: new Date().toISOString() });
});

/** Called by /api/submit when a player gets AC */
app.post("/internal/match-ended", (req, res) => {
  const { roomId, winnerRole } = req.body as {
    roomId: string;
    winnerRole: "host" | "guest";
  };
  if (!roomId || !winnerRole) {
    res.status(400).json({ error: "roomId and winnerRole required" });
    return;
  }
  console.log(`[socket] match:ended — room=${roomId} winner=${winnerRole}`);
  io.to(roomId).emit("match:ended", { winnerRole });
  res.json({ ok: true });
});

// ─── Socket events ────────────────────────────────────────────────────────────

io.on("connection", (socket) => {
  socket.emit("server:hello", { message: "CodeRoyale socket server connected" });

  socket.on(
    "room:join",
    async (payload: {
      roomId: string;
      inviteCode: string;
      role: "host" | "guest";
      handle: string;
    }) => {
      socket.join(payload.roomId);
      socket.data.roomId = payload.roomId;
      socket.data.role = payload.role;
      socket.data.inviteCode = payload.inviteCode;
      await persistNamesForJoin(payload.inviteCode, payload.role, payload.handle);
      const nextState = upsertRoomPresence(
        payload.roomId,
        payload.inviteCode,
        payload.role,
        payload.handle
      );
      emitRoomState(payload.roomId, nextState);
    }
  );

  socket.on(
    "player:ready",
    (payload: {
      roomId: string;
      inviteCode: string;
      role: "host" | "guest";
      ready: boolean;
    }) => {
      const current: RoomPresenceState = roomPresence.get(payload.roomId) ?? {
        roomId: payload.roomId,
        inviteCode: payload.inviteCode,
        status: "waiting",
        hostReady: false,
        guestReady: false,
      };
      const nextState: RoomPresenceState =
        payload.role === "host"
          ? { ...current, hostReady: payload.ready }
          : { ...current, guestReady: payload.ready };
      let updatedStatus = nextState.status;
      let countdownEndsAt = nextState.countdownEndsAt;
      if (
        nextState.hostReady &&
        nextState.guestReady &&
        nextState.hostName &&
        nextState.guestName &&
        nextState.status === "waiting"
      ) {
        updatedStatus = nextMatchStatus("waiting", "both-ready");
        countdownEndsAt = Date.now() + 5000;
        scheduleCountdown(payload.roomId, payload.inviteCode, countdownEndsAt);
      } else if (
        (!nextState.hostReady || !nextState.guestReady) &&
        nextState.status === "countdown"
      ) {
        updatedStatus = "waiting";
        countdownEndsAt = undefined;
        clearCountdown(payload.roomId);
      }
      emitRoomState(payload.roomId, { ...nextState, status: updatedStatus, countdownEndsAt });
    }
  );

  socket.on("room:leave", async (done?: () => void) => {
    await handleRoomDeparture(socket);
    done?.();
    socket.disconnect(true);
  });

  socket.on(
    "duel:join",
    async (payload: { roomId: string; role: "host" | "guest"; code: string }) => {
      socket.join(payload.roomId);
      const current = getRoomCodeState(payload.roomId);
      const nextState =
        payload.role === "host"
          ? { ...current, hostCode: payload.code }
          : { ...current, guestCode: payload.code };
      roomCodeState.set(payload.roomId, nextState);
      socket.to(payload.roomId).emit("code:state", {
        role: payload.role,
        code: payload.code,
      });
      try {
        const match = await prisma.match.findUnique({
          where: { id: payload.roomId },
          include: { problem: true },
        });
        if (match?.problem) socket.emit("problem:ready", match.problem);
      } catch (err) {
        console.warn("[duel:join] could not fetch problem:", err);
      }
    }
  );

  socket.on(
    "code:sync",
    (payload: { roomId: string; role: "host" | "guest"; code: string }) => {
      const current = getRoomCodeState(payload.roomId);
      const nextState =
        payload.role === "host"
          ? { ...current, hostCode: payload.code }
          : { ...current, guestCode: payload.code };
      roomCodeState.set(payload.roomId, nextState);
      socket.to(payload.roomId).emit("code:state", {
        role: payload.role,
        code: payload.code,
      });
    }
  );

  // ── Emotes ──────────────────────────────────────────────────────────────────
  socket.on(
    "emote:send",
    (payload: { roomId: string; emote: string; fromRole: "host" | "guest" }) => {
      socket.to(payload.roomId).emit("emote:receive", {
        emote: payload.emote,
        fromRole: payload.fromRole,
      });
    }
  );

  // ── Timer expiry ─────────────────────────────────────────────────────────────
  // Only the host emits this (client-side guard) so it fires exactly once per match.
  socket.on("timer:expired", async (payload: { roomId: string }) => {
    const { roomId } = payload;

    try {
      // Check if already finished — avoid double-firing if AC came in at the same time
      const match = await prisma.match.findUnique({
        where: { id: roomId },
        select: { winnerRole: true, status: true },
      });

      if (match?.winnerRole || match?.status === "finished") {
        return; // already decided
      }

      // Find best submission per role
      const submissions = await prisma.submission.findMany({
        where: { matchId: roomId },
        orderBy: { score: "desc" },
      });

      const hostBest = submissions.find((s) => s.role === "host");
      const guestBest = submissions.find((s) => s.role === "guest");

      const hostScore = hostBest?.score ?? 0;
      const guestScore = guestBest?.score ?? 0;

      let winnerRole: "host" | "guest" | "draw";
      if (hostScore > guestScore) winnerRole = "host";
      else if (guestScore > hostScore) winnerRole = "guest";
      else winnerRole = "draw"; // tied or both 0

      console.log(`[socket] timer:expired room=${roomId} host=${hostScore} guest=${guestScore} winner=${winnerRole}`);

      // Persist
      await prisma.match.update({
        where: { id: roomId },
        data: {
          winnerRole: winnerRole === "draw" ? null : winnerRole,
          status: "finished",
        },
      });

      io.to(roomId).emit("match:ended", { winnerRole, reason: "timeout" });
    } catch (err) {
      console.error("[timer:expired] error:", err);
    }
  });

  socket.on("disconnect", async () => {
    await handleRoomDeparture(socket);
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────

const port = Number(process.env.PORT ?? 4000);
httpServer.listen(port, () => {
  console.log(`CodeRoyale socket server listening on http://localhost:${port}`);
});

