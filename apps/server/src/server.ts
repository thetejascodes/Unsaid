import "dotenv/config";
import { createServer } from "node:http";
import app from "./app.js";
import config from "./common/config/index.js";
import { attachWebSocketServer } from "./common/ws/server.js";
import { registerMatchingHandlers } from "./modules/matching/matching.gateway.js";
import { connectRedis } from "./common/redis/index.js";
import { registerChatHandlers } from "./modules/chat/chat.gateway.js";

const port = Number(config.port);

const startServer = async () => {
  await connectRedis();
  const httpServer = createServer(app)
  attachWebSocketServer(httpServer);
  registerMatchingHandlers();
  registerChatHandlers();
  httpServer.listen(port, () => {
    console.log(`🚀 Server is running on port ${port}`);
  });
};

startServer().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
