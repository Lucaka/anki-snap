import { describe, expect, it, vi } from "vitest";
import type { AiProvider } from "../types";
import {
  buildGeminiGenerateConfig,
  buildOpenAiChatBody,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_OPENAI_MODEL,
  filterGeminiModels,
  filterOpenAiModels,
  loadModelCatalog,
  MODEL_CATALOG_TTL_MS,
  type CachedModelCatalog,
  type CatalogStore,
} from "../model-catalog";

function memoryStore(
  initial: Partial<Record<AiProvider, CachedModelCatalog>> = {},
): CatalogStore & {
  data: Partial<Record<AiProvider, CachedModelCatalog>>;
} {
  const data = { ...initial };
  return {
    data,
    async get(provider) {
      return data[provider] ?? null;
    },
    async set(provider, value) {
      data[provider] = value;
    },
  };
}

describe("model filters", () => {
  it("keeps OpenAI chat models that accept images and drops specialists", () => {
    const now = Date.parse("2026-11-06T00:00:00Z");
    const models = filterOpenAiModels(
      [
        { id: "gpt-6-luna", created: 50 },
        { id: "gpt-6-luna-2026-05-18", created: 40 },
        { id: "gpt-6-astra", created: 80 },
        { id: "gpt-4o-mini", created: 10 },
        { id: "gpt-4o", created: 20 },
        { id: "gpt-4o-mini-tts", created: 30 },
        { id: "gpt-4o-transcribe", created: 30 },
        { id: "text-embedding-3-small", created: 30 },
        { id: "whisper-1", created: 30 },
        { id: "dall-e-3", created: 30 },
        { id: "gpt-image-2.6-sunburst", created: 90 },
        { id: "gpt-realtime-2", created: 90 },
        { id: "omni-moderation-latest", created: 90 },
        { id: "gpt-6-cyber", created: 100 },
        { id: "gpt-5.6-cyber", created: 70 },
        { id: "ft:gpt-4o-mini:org:cards:abc", created: 15 },
        { id: "old-chat", created: 1, shutdown_date: "2026-10-01" },
        { id: "gpt-4o-2024-08-06", created: 5, shutdown_date: "2026-10-23" },
      ],
      now,
    );

    expect(models.map((model) => model.id)).toEqual([
      "gpt-6-astra",
      "gpt-6-luna",
      "gpt-4o",
      "ft:gpt-4o-mini:org:cards:abc",
      "gpt-4o-mini",
    ]);
    expect(models[0]?.label).toBe("GPT-6 Astra（高品質）");
    expect(models.find((model) => model.id === "gpt-4o-mini")?.label).toBe("gpt-4o-mini");
  });

  it("keeps Gemini and Gemma chat models and drops image, audio, and embedding models", () => {
    const models = filterGeminiModels([
      {
        name: "models/gemini-3.8-flash",
        displayName: "Gemini 3.8 Flash",
        supportedGenerationMethods: ["generateContent", "countTokens"],
      },
      {
        name: "models/gemini-4-argon",
        displayName: "Gemini 4 Argon",
        supportedGenerationMethods: ["generateContent"],
      },
      {
        name: "models/gemma-4-31b-it",
        displayName: "Gemma 4 31B",
        supportedGenerationMethods: ["generateContent"],
      },
      {
        name: "models/gemini-2.5-flash-image",
        displayName: "Nano Banana",
        supportedGenerationMethods: ["generateContent"],
      },
      {
        name: "models/gemini-3.8-flash-tts",
        supportedGenerationMethods: ["generateContent"],
      },
      {
        name: "models/gemini-3.8-live",
        supportedGenerationMethods: ["generateContent"],
      },
      {
        name: "models/gemini-embedding-001",
        supportedGenerationMethods: ["embedContent"],
      },
      {
        name: "models/text-embedding-004",
        supportedGenerationMethods: ["embedContent", "generateContent"],
      },
      {
        name: "models/deep-research-preview-04-2026",
        supportedGenerationMethods: ["generateContent"],
      },
      {
        name: "models/gemini-2.5-flash",
        displayName: "Gemini 2.5 Flash",
        supportedGenerationMethods: ["generateMessage"],
      },
    ]);

    expect(models.map((model) => model.id)).toEqual([
      "gemma-4-31b-it",
      "gemini-4-argon",
      "gemini-3.8-flash",
    ]);
    expect(models.find((model) => model.id === "gemini-3.8-flash")?.label).toBe(
      "Gemini 3.8 Flash（快速）",
    );
  });
});

describe("request bodies", () => {
  it("keeps temperature for GPT-6 Luna by disabling reasoning", () => {
    expect(buildOpenAiChatBody("gpt-6-luna", "system", "word").reasoning_effort).toBe("none");
    expect(buildOpenAiChatBody("gpt-6-luna", "system", "word").temperature).toBe(0.3);
  });

  it("omits temperature for GPT-6 Astra and GPT-6.1 Sol", () => {
    expect(buildOpenAiChatBody("gpt-6-astra", "system", "word")).not.toHaveProperty("temperature");
    expect(buildOpenAiChatBody("gpt-6-astra", "system", "word")).not.toHaveProperty(
      "reasoning_effort",
    );
    expect(buildOpenAiChatBody("gpt-6.1-sol", "system", "word")).not.toHaveProperty("temperature");
  });

  it("keeps the previous temperature for older chat models", () => {
    expect(buildOpenAiChatBody("gpt-4o-mini", "system", "word").temperature).toBe(0.3);
    expect(buildOpenAiChatBody("gpt-4o-mini", "system", "word")).not.toHaveProperty(
      "reasoning_effort",
    );
  });

  it("drops temperature only for Gemini models that ignore it", () => {
    expect(buildGeminiGenerateConfig("gemini-3.8-flash", "system")).not.toHaveProperty(
      "temperature",
    );
    expect(buildGeminiGenerateConfig("gemini-4-argon", "system")).not.toHaveProperty("temperature");
    expect(buildGeminiGenerateConfig("gemini-3.6-flash", "system")).not.toHaveProperty(
      "temperature",
    );
    expect(buildGeminiGenerateConfig("gemini-3.5-flash-lite", "system")).not.toHaveProperty(
      "temperature",
    );
    expect(buildGeminiGenerateConfig("gemini-2.5-flash", "system").temperature).toBe(0.3);
    expect(buildGeminiGenerateConfig("gemini-3.1-pro-preview", "system").temperature).toBe(0.3);
    expect(buildGeminiGenerateConfig("gemma-4-31b-it", "system").temperature).toBe(0.3);
    expect(buildGeminiGenerateConfig("gemini-3.8-flash", "system").automaticContinuation).toBe(
      false,
    );
  });
});

describe("loadModelCatalog", () => {
  const now = Date.parse("2026-11-06T00:00:00Z");

  it("uses the fallback list when there is no API key", async () => {
    const fetchImpl = vi.fn();
    const result = await loadModelCatalog("openai", "  ", {
      now,
      store: memoryStore(),
      fetchImpl,
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.source).toBe("fallback");
    expect(result.models[0]?.id).toBe(DEFAULT_OPENAI_MODEL);
    expect(result.models.map((model) => model.id)).toContain("gpt-6-astra");
  });

  it("fetches, filters, and caches OpenAI models", async () => {
    const store = memoryStore();
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: [
          { id: "gpt-6-luna", created: 2 },
          { id: "whisper-1", created: 3 },
          { id: "gpt-6-astra", created: 4 },
        ],
      }),
    }));

    const result = await loadModelCatalog("openai", "sk-test", {
      now,
      store,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.source).toBe("network");
    expect(result.models.map((model) => model.id)).toEqual(["gpt-6-astra", "gpt-6-luna"]);
    expect(store.data.openai?.models).toEqual(result.models);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.openai.com/v1/models",
      expect.objectContaining({
        headers: { Authorization: "Bearer sk-test" },
      }),
    );
  });

  it("follows Gemini page tokens and skips a fresh cache", async () => {
    const store = memoryStore();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            {
              name: "models/gemini-3.8-flash",
              displayName: "Gemini 3.8 Flash",
              supportedGenerationMethods: ["generateContent"],
            },
          ],
          nextPageToken: "page-2",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            {
              name: "models/gemini-embedding-001",
              supportedGenerationMethods: ["embedContent"],
            },
            {
              name: "models/gemini-4-argon",
              supportedGenerationMethods: ["generateContent"],
            },
          ],
        }),
      });

    const first = await loadModelCatalog("gemini", "AIza-test", {
      now,
      store,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const second = await loadModelCatalog("gemini", "AIza-test", {
      now: now + 1_000,
      store,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(first.source).toBe("network");
    expect(first.models.map((model) => model.id)).toEqual(["gemini-4-argon", "gemini-3.8-flash"]);
    expect(first.models[0]?.id).not.toBe(DEFAULT_GEMINI_MODEL);
    expect(second.source).toBe("cache");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain("/v1beta/models");
    expect(String(fetchImpl.mock.calls[1]?.[0])).toContain("pageToken=page-2");
    expect(fetchImpl.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ headers: { "x-goog-api-key": "AIza-test" } }),
    );
  });

  it("returns a stale cache when refresh fails, otherwise the fallback list", async () => {
    const stale: CachedModelCatalog = {
      version: 1,
      keyFingerprint: "",
      fetchedAt: now - MODEL_CATALOG_TTL_MS - 1,
      models: [{ id: "gpt-6-luna", label: "cached" }],
    };
    const failing = vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) }));

    const primed = await loadModelCatalog("openai", "sk-one", {
      now: stale.fetchedAt,
      store: memoryStore(),
      fetchImpl: vi.fn(async () => ({
        ok: true,
        json: async () => ({ data: [{ id: "gpt-6-luna", created: 1 }] }),
      })) as unknown as typeof fetch,
    });
    const store = memoryStore();
    await loadModelCatalog("openai", "sk-one", {
      now: stale.fetchedAt,
      store,
      fetchImpl: vi.fn(async () => ({
        ok: true,
        json: async () => ({ data: [{ id: "gpt-6-luna", created: 1 }] }),
      })) as unknown as typeof fetch,
    });
    stale.keyFingerprint = store.data.openai?.keyFingerprint ?? "";
    store.data.openai = stale;

    const fromStale = await loadModelCatalog("openai", "sk-one", {
      now,
      store,
      fetchImpl: failing as unknown as typeof fetch,
    });
    const fromEmpty = await loadModelCatalog("gemini", "AIza-missing", {
      now,
      store: memoryStore(),
      fetchImpl: failing as unknown as typeof fetch,
    });

    expect(primed.source).toBe("network");
    expect(fromStale.source).toBe("stale-cache");
    expect(fromStale.models).toEqual(stale.models);
    expect(fromEmpty.source).toBe("fallback");
    expect(fromEmpty.models[0]?.id).toBe(DEFAULT_GEMINI_MODEL);
  });
});
