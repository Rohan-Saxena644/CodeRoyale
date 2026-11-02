import assert from "node:assert/strict";
import { test } from "node:test";
import { io, type Socket } from "socket.io-client";
import { createGameServer } from "../server/game-server";
import type { prisma } from "../lib/prisma-server";
import { MATCH_DURATION_MS } from "../lib/match-rules";

function waitFor<T = Record<string, unknown>>(socket: Socket, event: string, accept: (value: T) => boolean = () => true): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.off(event, listener); reject(new Error(`Timed out waiting for ${event}`)); }, 4000);
    function listener(value: T) { if (accept(value)) { clearTimeout(timer); socket.off(event, listener); resolve(value); } }
    socket.on(event, listener);
  });
}

test("two players can ready up, start, sync code, reconnect, and finish at the server deadline", async (t) => {
  const record = {
    id: "socket-test", inviteCode: "TEST42", status: "waiting", hostName: "Host", guestName: "Guest",
    winnerRole: null as string | null, startedAt: null as Date | null,
    problem: { title: "Echo", rawJson: { functionSignature: { name: "echo", params: [], returnType: "number" }, examples: [], testCases: [{ args: ["SECRET"], isHidden: true }], referenceSolution: { code: "SECRET" } } },
  };
  const database = {
    match: {
      async findUnique() { return { ...record }; },
      async updateMany(args: { where: { status?: string }; data: Record<string, unknown> }) {
        if (typeof args.where.status === "string" && args.where.status !== record.status) return { count: 0 };
        Object.assign(record, args.data); return { count: 1 };
      },
    },
    submission: { async findMany() { return [{ role: "host", score: 75 }, { role: "guest", score: 25 }]; } },
  };
  const server = createGameServer({ database: database as unknown as typeof prisma, countdownMs: 15, disconnectGraceMs: 1000, fetch: async () => Response.json({ problem: record.problem }) });
  const clients: Socket[] = [];
  t.after(async () => { clients.forEach(client => client.disconnect()); await server.close(); });
  await new Promise<void>(resolve => server.httpServer.listen(0, "127.0.0.1", resolve));
  const address = server.httpServer.address();
  assert.ok(address && typeof address !== "string");
  const url = `http://127.0.0.1:${address.port}`;
  async function connect() {
    const client = io(url, { transports: ["websocket"], forceNew: true, autoConnect: false });
    clients.push(client);
    const connected = waitFor(client, "connect"); client.connect(); await connected;
    return client;
  }
  const host = await connect(); const guest = await connect();
  const hostPayload = { roomId: record.id, inviteCode: record.inviteCode, role: "host", handle: "Host" };
  const guestPayload = { ...hostPayload, role: "guest", handle: "Guest" };
  let state = waitFor(host, "room:state"); host.emit("room:join", hostPayload); await state;
  state = waitFor(guest, "room:state"); guest.emit("room:join", guestPayload); await state;
  const problem = waitFor<{ rawJson: Record<string, unknown> }>(guest, "problem:ready");
  const timing = waitFor<{ deadlineAt: number }>(host, "match:timing");
  host.emit("player:ready", { ...hostPayload, ready: true });
  guest.emit("player:ready", { ...guestPayload, ready: true });
  const publicData = await problem;
  assert.equal(JSON.stringify(publicData).includes("SECRET"), false);
  const deadline = (await timing).deadlineAt;
  assert.equal(record.status, "active");
  assert.ok(record.startedAt);
  assert.equal(deadline, record.startedAt.getTime() + MATCH_DURATION_MS);
  const synced = waitFor<{ code: string }>(guest, "code:state");
  host.emit("code:sync", { ...hostPayload, code: "my solution" });
  assert.equal((await synced).code, "my solution");
  host.disconnect();
  const reconnect = await connect();
  const restored = waitFor<{ code: string }>(reconnect, "code:restore");
  const sameClock = waitFor<{ deadlineAt: number }>(reconnect, "match:timing");
  reconnect.emit("duel:join", { ...hostPayload, code: "stale code" });
  assert.equal((await restored).code, "my solution");
  assert.equal((await sameClock).deadlineAt, deadline);
  // An early browser timeout cannot end the game.
  guest.emit("timer:expired", { roomId: record.id });
  const barrier = waitFor(reconnect, "code:state");
  guest.emit("code:sync", { ...guestPayload, code: "guest solution" }); await barrier;
  assert.equal(record.status, "active");
  record.startedAt = new Date(Date.now() - MATCH_DURATION_MS - 1);
  const finished = waitFor<{ winnerRole: string }>(guest, "match:ended");
  guest.emit("timer:expired", { roomId: record.id });
  assert.equal((await finished).winnerRole, "host");
  assert.equal(record.status, "finished");
});

test("malformed socket events and incorrect invites are rejected without creating rooms", async (t) => {
  const database = { match: { async findUnique() { return null; } } };
  const server = createGameServer({ database: database as unknown as typeof prisma });
  let client: Socket;
  t.after(async () => { client?.disconnect(); await server.close(); });
  await new Promise<void>(resolve => server.httpServer.listen(0, "127.0.0.1", resolve));
  const address = server.httpServer.address(); assert.ok(address && typeof address !== "string");
  client = io(`http://127.0.0.1:${address.port}`, { transports: ["websocket"], autoConnect: false });
  const connected = waitFor(client, "connect"); client.connect(); await connected;
  let error = waitFor(client, "room:error"); client.emit("player:ready", null); await error;
  error = waitFor(client, "room:error"); client.emit("room:join", { roomId: "missing", inviteCode: "WRONG", role: "host", handle: "Host" }); await error;
});
