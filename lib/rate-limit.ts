import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

export const rateLimits = {
  // Reviews: 10 requests per hour
  reviews: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 h"),
    analytics: true,
    prefix: "taxi-project:@upstash/ratelimit/reviews",
  }),

  // Forgot Password: 3 requests per hour
  forgotPassword: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, "1 h"),
    analytics: true,
    prefix: "taxi-project:@upstash/ratelimit/forgot-password",
  }),

  // Contact Form: 5 requests per hour
  contact: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 h"),
    analytics: true,
    prefix: "taxi-project:@upstash/ratelimit/contact",
  }),

  // Coupons/Discounts: 15 requests per hour
  coupons: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(15, "1 h"),
    analytics: true,
    prefix: "taxi-project:@upstash/ratelimit/coupons",
  }),

  // Wishlist: 100 requests per hour
  wishlist: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, "1 h"),
    analytics: true,
    prefix: "taxi-project:@upstash/ratelimit/wishlist",
  }),

  // Admin API: 100 requests per minute
  admin: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, "1 m"),
    analytics: true,
    prefix: "taxi-project:@upstash/ratelimit/admin",
  }),

  // Orders: 50 requests per minute
  orders: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(50, "1 m"),
    analytics: true,
    prefix: "taxi-project:@upstash/ratelimit/orders",
  }),

  // Trips: 50 requests per minute
  trips: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(50, "1 m"),
    analytics: true,
    prefix: "taxi-project:@upstash/ratelimit/trips",
  }),

  // Auth (Register/Login): 5 requests per minute
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    analytics: true,
    prefix: "taxi-project:@upstash/ratelimit/auth",
  }),
};

export type RateLimitType = keyof typeof rateLimits;

export async function checkRateLimit(
  identifier: string,
  type: RateLimitType
) {
  // If Redis env vars are not set — skip rate limiting entirely
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) {
    console.warn(`⚠️ Rate limiting skipped for "${type}" — Redis env vars not configured`);
    return { success: true, remaining: 999, limit: 999, reset: 0 };
  }

  const limiter = rateLimits[type];
  if (!limiter) {
    return { success: true, remaining: 999, limit: 999, reset: 0 };
  }

  try {
    return await limiter.limit(identifier);
  } catch (error) {
    // If Redis is unreachable — allow the request through (don't block users)
    console.error(`❌ Rate limit check failed for "${type}":`, error);
    return { success: true, remaining: 999, limit: 999, reset: 0 };
  }
}
