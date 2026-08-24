import { createClient } from "redis";
import config from "../config/index.js";

const redisClient = createClient({
  url: config.redis.url,
});

redisClient.on("error", (err) => {
  console.error("Redis error:", err);
});

export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
};
export { redisClient as redis };
