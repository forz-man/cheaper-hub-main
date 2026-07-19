import { NextResponse } from "next/server";

const rateMap = new Map();

export function rateLimit({ interval = 60 * 1000, maxRequests = 60 } = {}) {
  return (req) => {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")
      || "anonymous";
    const now = Date.now();
    const entry = rateMap.get(ip) || { count: 0, resetAt: now + interval };

    if (now > entry.resetAt) {
      entry.count = 0;
      entry.resetAt = now + interval;
    }

    entry.count++;

    if (entry.count > maxRequests) {
      rateMap.set(ip, entry);
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      return {
        error: NextResponse.json(
          { message: "Too many requests. Please try again later." },
          { status: 429, headers: { "Retry-After": String(retryAfter) } }
        ),
      };
    }

    rateMap.set(ip, entry);

    if (rateMap.size > 10000) {
      const cutoff = now - 120 * 1000;
      for (const [key, val] of rateMap) {
        if (val.resetAt < cutoff) rateMap.delete(key);
      }
    }

    return { error: null };
  };
}
