import { createGameServer } from "./game-server";

const { httpServer } = createGameServer();
const port = Number(process.env.PORT ?? 4000);
httpServer.on("error", (error: NodeJS.ErrnoException) => {
  console.error(error.code === "EADDRINUSE" ? `Port ${port} is already in use.` : error);
  process.exit(1);
});
httpServer.listen(port, () => console.log(`CodeRoyale socket server listening on http://localhost:${port}`));
