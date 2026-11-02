import { createServer } from "node:http";
import express from "express";
import { Server } from "socket.io";
import { nextMatchStatus } from "../lib/match-state";
import { prisma as defaultDatabase } from "../lib/prisma-server";
import { MATCH_DURATION_MS, matchDeadline, publicProblem } from "../lib/match-rules";
import { z } from "zod";
import type { RoomPresenceState } from "../lib/types";

export function createGameServer(options: {
  database?: typeof defaultDatabase;
  countdownMs?: number;
  disconnectGraceMs?: number;
  fetch?: typeof fetch;
} = {}) {
const prisma = options.database ?? defaultDatabase;
const fetch = options.fetch ?? globalThis.fetch;
const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  },
  pingTimeout: 20000,
  pingInterval: 10000,
});

const roomPresence = new Map<string, RoomPresenceState>();
const countdownTimers = new Map<string, NodeJS.Timeout>();
const roomCodeState = new Map<string, { hostCode: string; guestCode: string }>();
const emoteRateLimit = new Map<string, number>();
const departureTimers = new Map<string, NodeJS.Timeout>();
const matchTimers = new Map<string, NodeJS.Timeout>();
const leftRoles = new Set<string>();

const INTERNAL_SECRET = process.env.INTERNAL_SECRET ?? "";
const DISCONNECT_GRACE_MS = options.disconnectGraceMs ?? Number(process.env.SOCKET_DISCONNECT_GRACE_MS ?? 10_000);

function presenceKey(roomId: string, role: "host" | "guest") {
  return `${roomId}:${role}`;
}

function cancelPendingDeparture(roomId: string, role: "host" | "guest") {
  const key = presenceKey(roomId, role);
  const timer = departureTimers.get(key);
  if (!timer) return false;
  clearTimeout(timer);
  departureTimers.delete(key);
  return true;
}

function markRoleReturned(roomId: string, role: "host" | "guest") {
  const key = presenceKey(roomId, role);
  const hadPendingDeparture = cancelPendingDeparture(roomId, role);
  const hadLeft = leftRoles.delete(key);
  return hadPendingDeparture || hadLeft;
}

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
    roomCodeState.delete(roomId);
    cancelPendingDeparture(roomId, "host");
    cancelPendingDeparture(roomId, "guest");
    leftRoles.delete(presenceKey(roomId, "host"));
    leftRoles.delete(presenceKey(roomId, "guest"));
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

async function persistRoomAfterDisconnect(
  inviteCode: string,
  nextState: RoomPresenceState
) {
  try {
    if (!nextState.hostName && !nextState.guestName) {
      await prisma.match.updateMany({ where: { inviteCode, status: { in: ["waiting", "countdown"] } }, data: { status: "ended", endedAt: new Date() } });
      return;
    }
    await prisma.match.updateMany({
      where: { inviteCode, status: { in: ["waiting", "countdown"] } },
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

async function applyRoomDeparture(
  roomId: string,
  role: "host" | "guest",
  inviteCode: string
) {
  const key = presenceKey(roomId, role);
  departureTimers.delete(key);

  const current = roomPresence.get(roomId);
  if (!current) return;
  if (current.status === "finished" || current.status === "ended") return;

  const leaverName = role === "host" ? current.hostName : current.guestName;

  if (current.status === "active") {
    leftRoles.add(presenceKey(roomId, role));
    if (leaverName) io.to(roomId).emit("player:left", { name: leaverName, role });
    return;
  }

  clearCountdown(roomId);

  let nextState: RoomPresenceState | null = null;
  if (role === "host" && current.guestName) {
    nextState = await promoteRemainingGuest(roomId, inviteCode, current);
    roomPresence.set(roomId, nextState);
  } else {
    nextState = clearRoomPresence(roomId, role);
    if (nextState) await persistRoomAfterDisconnect(inviteCode, nextState);
  }

  if (nextState) {
    emitRoomState(roomId, { ...nextState, inviteCode });
    if (leaverName) io.to(roomId).emit("player:left", { name: leaverName, role });
  }
}

async function handleRoomDeparture(
  socket: Parameters<Parameters<typeof io.on>[1]>[0],
  options: { immediate?: boolean } = {}
) {
  const roomId = socket.data.roomId as string | undefined;
  const role = socket.data.role as "host" | "guest" | undefined;
  const inviteCode = socket.data.inviteCode as string | undefined;
  if (!roomId || !role || !inviteCode || socket.data.departureHandled) return;
  socket.data.departureHandled = true;

  const remaining = await io.in(roomId).fetchSockets();
  if (remaining.some(other => other.id !== socket.id && other.data.role === role)) return;

  cancelPendingDeparture(roomId, role);

  if (options.immediate) {
    await applyRoomDeparture(roomId, role, inviteCode);
    return;
  }

  const key = presenceKey(roomId, role);
  const timer = setTimeout(() => {
    applyRoomDeparture(roomId, role, inviteCode).catch((err) => {
      console.error("[socket] deferred departure failed:", err);
    });
  }, DISCONNECT_GRACE_MS);
  departureTimers.set(key, timer);
}

function scheduleCountdown(
  roomId: string,
  inviteCode: string,
  countdownEndsAt: number
) {
  clearCountdown(roomId);
  const delay = Math.max(0, countdownEndsAt - Date.now());
  const timer = setTimeout(async () => {
    const current = roomPresence.get(roomId);
    if (!current || current.status !== "countdown") return;
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const response = await fetch(`${appUrl}/api/problem/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(INTERNAL_SECRET ? { "x-internal-secret": INTERNAL_SECRET } : {}) },
        body: JSON.stringify({ matchId: roomId }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error(`Problem service returned ${response.status}`);
      const data = await response.json();
      if (!data.problem) throw new Error("Missing problem");
      if (roomPresence.get(roomId)?.status !== "countdown" || roomPresence.get(roomId)?.countdownEndsAt !== countdownEndsAt) return;
      const startedAt = new Date();
      const updated = await prisma.match.updateMany({
        where: { id: roomId, status: { in: ["waiting", "countdown"] }, winnerRole: null },
        data: { status: "active", startedAt },
      });
      if (updated.count !== 1) throw new Error("Match is no longer available");
    const nextState: RoomPresenceState = {
      ...current,
      inviteCode,
      status: nextMatchStatus("countdown", "countdown-finished"),
      countdownEndsAt: undefined,
    };
    emitRoomState(roomId, nextState);
      io.to(roomId).emit("problem:ready", publicProblem(data.problem));
      io.to(roomId).emit("match:timing", { deadlineAt: matchDeadline(startedAt) });
      scheduleMatchTimeout(roomId, startedAt);
    } catch (error) {
      console.error("[socket] match start failed:", error);
      const latest = roomPresence.get(roomId);
      if (latest?.status === "countdown") emitRoomState(roomId, { ...latest, status: "waiting", hostReady: false, guestReady: false, countdownEndsAt: undefined });
      io.to(roomId).emit("room:error", { error: "Could not start the match. Please ready up again." });
    }
    countdownTimers.delete(roomId);
  }, delay);
  countdownTimers.set(roomId, timer);
}

async function resolveTimeout(roomId: string) {
  const match = await prisma.match.findUnique({ where: { id: roomId } });
  const deadline = matchDeadline(match?.startedAt);
  if (!match || match.status !== "active" || match.winnerRole || deadline === null || Date.now() < deadline) return;
  const submissions = await prisma.submission.findMany({ where: { matchId: roomId, createdAt: { lte: new Date(deadline) } }, orderBy: { score: "desc" } });
  const hostScore = submissions.find(s => s.role === "host")?.score ?? 0;
  const guestScore = submissions.find(s => s.role === "guest")?.score ?? 0;
  const winnerRole = hostScore === guestScore ? "draw" : hostScore > guestScore ? "host" : "guest";
  const claimed = await prisma.match.updateMany({ where: { id: roomId, status: "active", winnerRole: null }, data: { status: "finished", winnerRole, endedAt: new Date() } });
  if (claimed.count === 1) {
    const current = roomPresence.get(roomId);
    if (current) roomPresence.set(roomId, { ...current, status: "finished" });
    io.to(roomId).emit("match:ended", { winnerRole, reason: "timeout" });
  }
}

function scheduleMatchTimeout(roomId: string, startedAt: Date) {
  const existing = matchTimers.get(roomId);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    matchTimers.delete(roomId);
    resolveTimeout(roomId).catch(error => {
      console.error("[socket] timeout resolution failed:", error);
      const retry = setTimeout(() => scheduleMatchTimeout(roomId, startedAt), 5000);
      matchTimers.set(roomId, retry);
    });
  }, Math.max(0, (matchDeadline(startedAt) ?? Date.now()) - Date.now()));
  matchTimers.set(roomId, timer);
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "coderoyale-socket",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    activeRooms: roomPresence.size,
  });
});

function requireInternalSecret(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  if (!INTERNAL_SECRET && process.env.NODE_ENV !== "production") {
    next();
    return;
  }
  const provided = req.headers["x-internal-secret"];
  if (!INTERNAL_SECRET || provided !== INTERNAL_SECRET) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}

app.post("/internal/match-ended", requireInternalSecret, async (req, res) => {
  const { roomId, winnerRole } = (req.body ?? {}) as {
    roomId: string;
    winnerRole: "host" | "guest";
  };
  if (!roomId || !winnerRole || !["host", "guest"].includes(winnerRole)) {
    res.status(400).json({ error: "roomId and winnerRole required" });
    return;
  }
  const match = await prisma.match.findUnique({ where: { id: roomId } }).catch(() => null);
  if (!match || match.status !== "finished" || match.winnerRole !== winnerRole) {
    res.status(409).json({ error: "Result does not match persisted verdict" });
    return;
  }
  const current = roomPresence.get(roomId);
  if (current) roomPresence.set(roomId, { ...current, status: "finished" });
  const timer = matchTimers.get(roomId);
  if (timer) clearTimeout(timer);
  matchTimers.delete(roomId);
  io.to(roomId).emit("match:ended", { winnerRole, reason: "ac" });
  res.json({ ok: true });
});

io.on("connection", (socket) => {
  socket.emit("server:hello", { message: "CodeRoyale socket server connected" });

  const joinSchema = z.object({ roomId: z.string().min(1).max(64), inviteCode: z.string().min(4).max(12), role: z.enum(["host", "guest"]) });
  async function joinValidated(payload: unknown) {
    const parsed = joinSchema.safeParse(payload);
    if (!parsed.success) throw new Error("Invalid room details");
    const { roomId, inviteCode, role } = parsed.data;
    const match = await prisma.match.findUnique({ where: { id: roomId }, include: { problem: true } });
    if (!match || match.inviteCode !== inviteCode || !(role === "host" ? match.hostName : match.guestName)) throw new Error("Room or player not found");
    if (socket.data.roomId && (socket.data.roomId !== roomId || socket.data.role !== role)) throw new Error("Leave your current room before joining another");
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.role = role;
    socket.data.inviteCode = inviteCode;
    socket.data.departureHandled = false;
    if (!roomPresence.has(roomId)) roomPresence.set(roomId, {
      roomId, inviteCode, status: match.status,
      hostName: match.hostName, guestName: match.guestName ?? undefined,
      hostReady: match.status === "active", guestReady: match.status === "active",
    });
    if (match.status === "active" && match.startedAt) {
      scheduleMatchTimeout(roomId, match.startedAt);
      socket.emit("match:timing", { deadlineAt: matchDeadline(match.startedAt) });
    }
    if (match.status === "finished") socket.emit("match:ended", { winnerRole: match.winnerRole ?? "draw" });
    return match;
  }

  // Reject malformed event data before any handler dereferences it.
  socket.use(([event, payload], next) => {
    const schemas: Record<string, z.ZodTypeAny> = {
      "room:join": joinSchema.extend({ handle: z.string().min(1).max(32) }),
      "duel:join": joinSchema.extend({ code: z.string().max(50000) }),
      "player:ready": joinSchema.extend({ ready: z.boolean() }),
      "code:sync": z.object({ roomId: z.string(), role: z.enum(["host", "guest"]), code: z.string().max(50000) }),
      "timer:expired": z.object({ roomId: z.string() }),
      "emote:send": z.object({ roomId: z.string(), emote: z.string(), fromRole: z.enum(["host", "guest"]) }),
    };
    if (schemas[event] && !schemas[event].safeParse(payload).success) {
      socket.emit("room:error", { error: "Invalid event payload" });
      return;
    }
    next();
  });

  socket.on(
    "room:join",
    async (payload: {
      roomId: string;
      inviteCode: string;
      role: "host" | "guest";
      handle: string;
    }) => {
      try {
      const match = await joinValidated(payload);
      const returned = markRoleReturned(payload.roomId, payload.role);
      socket.join(payload.roomId);
      socket.data.roomId = payload.roomId;
      socket.data.role = payload.role;
      socket.data.inviteCode = payload.inviteCode;
      const nextState = upsertRoomPresence(
        payload.roomId,
        payload.inviteCode,
        payload.role,
        (payload.role === "host" ? match.hostName : match.guestName)!
      );
      emitRoomState(payload.roomId, nextState);
      if (returned) {
        io.to(payload.roomId).emit("player:returned", {
          name: payload.handle,
          role: payload.role,
        });
      }
      } catch { socket.emit("room:error", { error: "Could not join this room. Check your invite and try again." }); }
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
      if (socket.data.roomId !== payload.roomId) return;
      if (socket.data.role !== payload.role) return;

      const current: RoomPresenceState = roomPresence.get(payload.roomId) ?? {
        roomId: payload.roomId,
        inviteCode: payload.inviteCode,
        status: "waiting",
        hostReady: false,
        guestReady: false,
      };
      if (current.status !== "waiting" && current.status !== "countdown") return;
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
        countdownEndsAt = Date.now() + (options.countdownMs ?? 5000);
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
    try { await handleRoomDeparture(socket, { immediate: true }); }
    catch (error) { console.error("[room:leave] failed:", error); }
    finally { if (typeof done === "function") done(); socket.disconnect(true); }
  });

  socket.on(
    "duel:join",
    async (payload: { roomId: string; inviteCode?: string; role: "host" | "guest"; code: string }) => {
      try {
      const match = await joinValidated(payload);
      const returned = markRoleReturned(payload.roomId, payload.role);
      socket.join(payload.roomId);
      socket.data.roomId = payload.roomId;
      socket.data.role = payload.role;
      if (payload.inviteCode) socket.data.inviteCode = payload.inviteCode;
      const current = getRoomCodeState(payload.roomId);
      const existingOwnCode = payload.role === "host" ? current.hostCode : current.guestCode;
      const nextState =
        payload.role === "host"
          ? { ...current, hostCode: existingOwnCode || payload.code }
          : { ...current, guestCode: existingOwnCode || payload.code };
      roomCodeState.set(payload.roomId, nextState);
      if (existingOwnCode) {
        socket.emit("code:restore", { code: existingOwnCode });
      }
      const opponentCode = payload.role === "host" ? nextState.guestCode : nextState.hostCode;
      const opponentRole = payload.role === "host" ? "guest" : "host";
      if (opponentCode) {
        socket.emit("code:state", {
          role: opponentRole,
          code: opponentCode,
        });
      }
      socket.to(payload.roomId).emit("code:state", {
        role: payload.role,
        code: payload.role === "host" ? nextState.hostCode : nextState.guestCode,
      });
      if (returned) {
        io.to(payload.roomId).emit("player:returned", { role: payload.role });
      }
      if (match.problem) socket.emit("problem:ready", publicProblem(match.problem));
      } catch { socket.emit("room:error", { error: "Could not reconnect to this match. Please try again." }); }
    }
  );

  socket.on(
    "code:sync",
    (payload: { roomId: string; role: "host" | "guest"; code: string }) => {
      if (socket.data.roomId !== payload.roomId) return;
      if (socket.data.role !== payload.role) return;
      if (roomPresence.get(payload.roomId)?.status !== "active") return;

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

  socket.on(
    "emote:send",
    (payload: { roomId: string; emote: string; fromRole: "host" | "guest" }) => {
      if (socket.data.roomId !== payload.roomId) return;
      if (socket.data.role !== payload.fromRole) return;

      const key = `${socket.id}:emote`;
      const last = emoteRateLimit.get(key) ?? 0;
      const now = Date.now();
      if (now - last < 1500) return;
      emoteRateLimit.set(key, now);

      const allowed = ["👏", "💀", "🔥", "😤", "🤝", "🎯", "⚡", "🧠", "💪", "🤖"];
      if (!allowed.includes(payload.emote)) return;

      socket.to(payload.roomId).emit("emote:receive", {
        emote: payload.emote,
        fromRole: payload.fromRole,
      });
    }
  );

  socket.on("timer:expired", async (payload: { roomId: string }) => {
    if (!payload || socket.data.roomId !== payload.roomId) return;
    try { await resolveTimeout(payload.roomId); }
    catch (error) { console.error("[timer:expired] error:", error); }
  });

  socket.on("disconnect", async () => {
    try { await handleRoomDeparture(socket); }
    catch (error) { console.error("[disconnect] failed:", error); }
    emoteRateLimit.delete(`${socket.id}:emote`);
  });
});

return { app, io, httpServer, async close() {
  for (const timer of countdownTimers.values()) clearTimeout(timer);
  for (const timer of departureTimers.values()) clearTimeout(timer);
  for (const timer of matchTimers.values()) clearTimeout(timer);
  await new Promise<void>((resolve) => io.close(() => resolve()));
} };
}
