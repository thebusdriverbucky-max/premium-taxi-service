import { Redis } from "@upstash/redis";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

export const hasPartialRedisConfiguration = Boolean(redisUrl || redisToken)
  && !(redisUrl && redisToken);

// Upstash is optional. Never initialize its SDK with placeholder credentials.
export const redis = (() => {
  if (!redisUrl || !redisToken) return null;

  try {
    return new Redis({ url: redisUrl, token: redisToken });
  } catch (error) {
    console.error("Failed to initialize optional Upstash Redis client:", error);
    return null;
  }
})();

export const redisKey = (key: string) => `taxi-project:${key}`;
