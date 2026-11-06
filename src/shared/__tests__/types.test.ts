import { describe, it, expect } from "vitest";
import { DEFAULT_GEMINI_MODEL, DEFAULT_OPENAI_MODEL } from "../model-catalog";
import { DEFAULT_SETTINGS } from "../types";

describe("DEFAULT_SETTINGS", () => {
  it("has a valid AnkiConnect URL", () => {
    expect(DEFAULT_SETTINGS.ankiConnectUrl).toBe("http://localhost:8765");
  });

  it("has an empty tags array", () => {
    expect(DEFAULT_SETTINGS.defaultTags).toEqual([]);
  });

  it("has a default deck name", () => {
    expect(DEFAULT_SETTINGS.defaultDeck).toBe("預設");
  });

  it("defaults to the current OpenAI and Gemini models", () => {
    expect(DEFAULT_SETTINGS.openaiModel).toBe(DEFAULT_OPENAI_MODEL);
    expect(DEFAULT_SETTINGS.geminiModel).toBe(DEFAULT_GEMINI_MODEL);
    expect(DEFAULT_OPENAI_MODEL).toBe("gpt-6-luna");
    expect(DEFAULT_GEMINI_MODEL).toBe("gemini-3.8-flash");
  });
});
