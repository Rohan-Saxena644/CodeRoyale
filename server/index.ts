import { createServer } from "node:http";
import express from "express";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  }
});

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

  socket.on("room:join", (payload: { roomId: string; handle: string }) => {
    socket.join(payload.roomId);
    io.to(payload.roomId).emit("room:presence", {
      joinedHandle: payload.handle,
      roomId: payload.roomId
    });
  });

  socket.on("disconnect", () => {
    // Room cleanup and match persistence will land in Phase 1.
  });
});

const port = Number(process.env.PORT ?? 4000);
httpServer.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`CodeRoyale socket server listening on http://localhost:${port}`);
});
