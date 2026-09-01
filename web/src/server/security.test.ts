import { describe, expect, it } from "vitest";
import { generateOpaqueToken, hashOpaqueToken } from "./security";

describe("session token security", () => {
  it("stores only a deterministic SHA-256 hash", () => {
    const token = "a-private-session-token";
    const hashed = hashOpaqueToken(token);
    expect(hashed).toHaveLength(64);
    expect(hashed).not.toContain(token);
    expect(hashOpaqueToken(token)).toBe(hashed);
  });

  it("generates high-entropy URL-safe tokens", () => {
    const first = generateOpaqueToken();
    const second = generateOpaqueToken();
    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThanOrEqual(40);
    expect(first).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
