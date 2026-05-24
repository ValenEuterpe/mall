import { describe, it, expect } from "vitest";
import { RateLimiter } from "@/lib/utils/rate-limit";
import { RateLimitError } from "@/lib/errors/custom-errors";

describe("RateLimiter", () => {
  it("allows requests within the limit", () => {
    const limiter = new RateLimiter({ interval: 60000, max: 5 });

    const result1 = limiter.tryConsume("user1");
    expect(result1.success).toBe(true);
    expect(result1.remaining).toBe(4);

    const result2 = limiter.tryConsume("user1");
    expect(result2.success).toBe(true);
    expect(result2.remaining).toBe(3);
  });

  it("blocks requests exceeding the limit", () => {
    const limiter = new RateLimiter({ interval: 60000, max: 3 });

    limiter.tryConsume("user1");
    limiter.tryConsume("user1");
    limiter.tryConsume("user1");

    const result = limiter.tryConsume("user1");
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("tracks different identifiers independently", () => {
    const limiter = new RateLimiter({ interval: 60000, max: 2 });

    limiter.tryConsume("user1");
    limiter.tryConsume("user1");

    const result = limiter.tryConsume("user2");
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it("uses custom limit override when provided", () => {
    const limiter = new RateLimiter({ interval: 60000, max: 10 });

    const result = limiter.tryConsume("user1", 1);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(0);

    const blocked = limiter.tryConsume("user1", 1);
    expect(blocked.success).toBe(false);
  });

  it("resets rate limit for a specific identifier", () => {
    const limiter = new RateLimiter({ interval: 60000, max: 2 });

    limiter.tryConsume("user1");
    limiter.tryConsume("user1");
    expect(limiter.tryConsume("user1").success).toBe(false);

    limiter.reset("user1");
    expect(limiter.tryConsume("user1").success).toBe(true);
  });

  it("reports remaining requests correctly", () => {
    const limiter = new RateLimiter({ interval: 60000, max: 5 });

    expect(limiter.getRemainingRequests("user1")).toBe(5);
    limiter.tryConsume("user1");
    expect(limiter.getRemainingRequests("user1")).toBe(4);
  });

  it("check method throws RateLimitError when exceeded", async () => {
    const limiter = new RateLimiter({ interval: 60000, max: 1 });
    await limiter.check("user1");

    try {
      await limiter.check("user1");
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
    }
  });
});
