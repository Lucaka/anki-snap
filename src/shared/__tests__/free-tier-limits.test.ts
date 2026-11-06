import { describe, expect, it } from "vitest";
import {
  formatFreeTierLimit,
  freeTierDocsUrl,
  GEMINI_RATE_LIMITS_URL,
  lookupFreeTier,
  OPENAI_RATE_LIMITS_URL,
} from "../free-tier-limits";

describe("free-tier limits", () => {
  it("formats a quota and a missing free tier", () => {
    expect(formatFreeTierLimit({ rpm: 3, rpd: 15 })).toBe("Free: 3 RPM / 15 RPD");
    expect(formatFreeTierLimit(null)).toBe("無免費額度");
  });

  it("marks known models with no free tier and hides unknown ids", () => {
    expect(lookupFreeTier("gpt-6-luna")).toBeNull();
    expect(lookupFreeTier("gpt-6-astra")).toBeNull();
    expect(lookupFreeTier("gemini-4-argon")).toBeNull();
    expect(lookupFreeTier("gemini-omni-1.2-flash")).toBeNull();
    expect(lookupFreeTier("gemini-3.8-flash")).toBeUndefined();
    expect(lookupFreeTier("gemini-3.5-flash-lite")).toBeUndefined();
    expect(lookupFreeTier("gemma-4-31b-it")).toBeUndefined();
    expect(lookupFreeTier("gpt-5.4")).toBeUndefined();
  });

  it("points at the provider rate-limits page", () => {
    expect(freeTierDocsUrl("gpt-6-luna")).toBe(OPENAI_RATE_LIMITS_URL);
    expect(freeTierDocsUrl("gemini-4-argon")).toBe(GEMINI_RATE_LIMITS_URL);
  });
});
