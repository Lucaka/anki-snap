import type { AiProvider } from "@/shared/types";

/** Official replacement for gpt-4o-mini and gpt-4o (OpenAI deprecations, 2026-10-14). */
export const DEFAULT_OPENAI_MODEL = "gpt-6-luna";

/** Latest stable Flash model (Gemini API models page, GA 2026-09-02). */
export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";

export const MODEL_CATALOG_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_VERSION = 1;
const CACHE_STORAGE_KEY = "ankiSnap.modelCatalog";
const FETCH_TIMEOUT_MS = 15_000;
const MAX_GEMINI_PAGES = 10;

export interface ModelOption {
  id: string;
  label: string;
}

export type ModelListSource = "network" | "cache" | "stale-cache" | "fallback";

export interface CachedModelCatalog {
  version: number;
  keyFingerprint: string;
  fetchedAt: number;
  models: ModelOption[];
}

export interface CatalogStore {
  get(provider: AiProvider): Promise<CachedModelCatalog | null>;
  set(provider: AiProvider, value: CachedModelCatalog): Promise<void>;
}

export interface LoadModelCatalogDeps {
  now?: number;
  store?: CatalogStore;
  fetchImpl?: typeof fetch;
}

const OPENAI_FALLBACK: ModelOption[] = [
  { id: DEFAULT_OPENAI_MODEL, label: "GPT-6 Luna（快速、低費用）" },
  { id: "gpt-6.1-terra", label: "GPT-6.1 Terra（快速、視覺）" },
  { id: "gpt-6.1-sol", label: "GPT-6.1 Sol（均衡）" },
  { id: "gpt-6-astra", label: "GPT-6 Astra（高品質）" },
];

const GEMINI_FALLBACK: ModelOption[] = [
  { id: DEFAULT_GEMINI_MODEL, label: "Gemini 3.8 Flash（快速）" },
  { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite（低費用）" },
  { id: "gemini-4-argon", label: "Gemini 4 Argon（高品質）" },
  { id: "gemma-4-26b-a4b-it", label: "Gemma 4 26B" },
  { id: "gemma-4-31b-it", label: "Gemma 4 31B" },
];

const KNOWN_LABELS = new Map(
  [...OPENAI_FALLBACK, ...GEMINI_FALLBACK].map((model) => [model.id, model.label]),
);

const OPENAI_CHAT_VISION =
  /^(?:ft:)?(?:gpt-4o|gpt-4\.1|gpt-4\.5|gpt-5|gpt-6|chatgpt-4o|o3|o4)(?:[:.-]|$)/i;

const OPENAI_NOT_CHAT_VISION =
  /audio|realtime|transcribe|whisper|tts|embedding|moderation|image|search|diarize|cyber|rosalind|live|speech|sora|dall-e/i;

const GEMINI_NOT_CHAT_VISION =
  /(?:^|[-/])(?:embedding|imagen|tts|aqa|veo|lyria|transcribe|robotics|antigravity|image|native-audio|deep-research|live)(?:$|[-/])/i;

const DATED_SNAPSHOT = /-\d{4}-\d{2}-\d{2}$/;

export function fallbackModels(provider: AiProvider): ModelOption[] {
  const source = provider === "gemini" ? GEMINI_FALLBACK : OPENAI_FALLBACK;
  return source.map((model) => ({ ...model }));
}

export function labelForModel(id: string, displayName?: string): string {
  return KNOWN_LABELS.get(id) ?? (displayName?.trim() || id);
}

export function isOpenAiChatVisionModel(id: string): boolean {
  return OPENAI_CHAT_VISION.test(id) && !OPENAI_NOT_CHAT_VISION.test(id);
}

export function isGeminiChatVisionModel(id: string, methods: string[] | undefined): boolean {
  const supportsChat = (methods ?? []).some((method) => method.toLowerCase() === "generatecontent");
  return supportsChat && !GEMINI_NOT_CHAT_VISION.test(id);
}

export function preferUndatedAliases<T extends { id: string }>(models: T[]): T[] {
  const ids = new Set(models.map((model) => model.id));
  return models.filter((model) => {
    const alias = model.id.replace(DATED_SNAPSHOT, "");
    return alias === model.id || !ids.has(alias);
  });
}

interface OpenAiListedModel {
  id?: string;
  created?: number;
  shutdown_date?: string | null;
}

export function filterOpenAiModels(models: OpenAiListedModel[], now = Date.now()): ModelOption[] {
  const today = new Date(now).toISOString().slice(0, 10);
  const eligible = models.filter((model) => {
    if (!model.id || !isOpenAiChatVisionModel(model.id)) return false;
    if (model.shutdown_date && model.shutdown_date < today) return false;
    return true;
  });
  const undated = preferUndatedAliases(eligible.map((model) => ({ ...model, id: model.id! })));
  undated.sort((a, b) => (b.created ?? 0) - (a.created ?? 0) || a.id.localeCompare(b.id));
  return undated.map((model) => ({ id: model.id, label: labelForModel(model.id) }));
}

export interface GeminiListedModel {
  name?: string;
  displayName?: string;
  supportedGenerationMethods?: string[];
}

export function filterGeminiModels(models: GeminiListedModel[]): ModelOption[] {
  const normalized = models.flatMap((model) => {
    const id = model.name?.replace(/^models\//, "") ?? "";
    if (!id || !isGeminiChatVisionModel(id, model.supportedGenerationMethods)) return [];
    return [{ id, displayName: model.displayName }];
  });
  const undated = preferUndatedAliases(normalized);
  undated.sort((a, b) => b.id.localeCompare(a.id));
  return undated.map((model) => ({
    id: model.id,
    label: labelForModel(model.id, model.displayName),
  }));
}

/**
 * GPT-6 Astra and GPT-6.1 Sol reject `reasoning_effort: "none"` and reject
 * `temperature` unless effort is `none`. Luna, Sol, and Terra accept `none`,
 * which keeps the previous low-variance sampling temperature.
 */
export function openAiSamplingParams(model: string): {
  temperature?: number;
  reasoning_effort?: "none";
} {
  const id = model.toLowerCase();
  if (/^gpt-6-astra(?:-|$)/.test(id) || /^gpt-6\.1-sol(?:-|$)/.test(id)) return {};
  if (
    /^gpt-6-luna(?:-|$)/.test(id) ||
    /^gpt-6-sol(?:-|$)/.test(id) ||
    /^gpt-6\.1-terra(?:-|$)/.test(id)
  ) {
    return { temperature: 0.3, reasoning_effort: "none" };
  }
  return { temperature: 0.3 };
}

export function buildOpenAiChatBody(model: string, systemPrompt: string, text: string) {
  return {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: text },
    ],
    ...openAiSamplingParams(model),
  };
}

/** Gemini 4 and Gemini 3.6+ ignore temperature and will later reject it. */
export function geminiIgnoresTemperature(model: string): boolean {
  const id = model.replace(/^models\//, "");
  const version = /^gemini-(\d+)(?:\.(\d+))?/.exec(id);
  if (!version) return false;
  const major = Number(version[1]);
  const minor = Number(version[2] ?? 0);
  if (major >= 4) return true;
  if (major === 3 && minor >= 6) return true;
  return id.startsWith("gemini-3.5-flash-lite");
}

export function buildGeminiGenerateConfig(model: string, systemPrompt: string) {
  return {
    systemInstruction: systemPrompt,
    automaticContinuation: false,
    ...(geminiIgnoresTemperature(model) ? {} : { temperature: 0.3 }),
  };
}

function fingerprintKey(apiKey: string): string {
  let hash = 2166136261;
  for (let i = 0; i < apiKey.length; i++) {
    hash ^= apiKey.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function chromeCatalogStore(): CatalogStore {
  return {
    async get(provider) {
      const stored = await chrome.storage.local.get(CACHE_STORAGE_KEY);
      const all = stored[CACHE_STORAGE_KEY] as
        | Partial<Record<AiProvider, CachedModelCatalog>>
        | undefined;
      return all?.[provider] ?? null;
    },
    async set(provider, value) {
      const stored = await chrome.storage.local.get(CACHE_STORAGE_KEY);
      const all =
        (stored[CACHE_STORAGE_KEY] as
          | Partial<Record<AiProvider, CachedModelCatalog>>
          | undefined) ?? {};
      all[provider] = value;
      await chrome.storage.local.set({ [CACHE_STORAGE_KEY]: all });
    },
  };
}

function usableCache(
  cached: CachedModelCatalog | null,
  keyFingerprint: string,
  now: number,
): { fresh: boolean } | null {
  if (!cached || cached.version !== CACHE_VERSION) return null;
  if (cached.keyFingerprint !== keyFingerprint || cached.models.length === 0) return null;
  return { fresh: now - cached.fetchedAt < MODEL_CATALOG_TTL_MS };
}

async function fetchOpenAiModels(apiKey: string, fetchImpl: typeof fetch, now: number) {
  const response = await fetchImpl("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`OpenAI models HTTP ${response.status}`);
  const body = (await response.json()) as { data?: OpenAiListedModel[] };
  const models = filterOpenAiModels(body.data ?? [], now);
  if (models.length === 0) throw new Error("OpenAI models list had no chat models");
  return models;
}

async function fetchGeminiModels(apiKey: string, fetchImpl: typeof fetch) {
  const collected: GeminiListedModel[] = [];
  let pageToken = "";
  for (let page = 0; page < MAX_GEMINI_PAGES; page++) {
    const url = new URL("https://generativelanguage.googleapis.com/v1beta/models");
    url.searchParams.set("pageSize", "1000");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await fetchImpl(url, {
      headers: { "x-goog-api-key": apiKey },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Gemini models HTTP ${response.status}`);
    const body = (await response.json()) as {
      models?: GeminiListedModel[];
      nextPageToken?: string;
    };
    collected.push(...(body.models ?? []));
    pageToken = body.nextPageToken ?? "";
    if (!pageToken) break;
  }
  const models = filterGeminiModels(collected);
  if (models.length === 0) throw new Error("Gemini models list had no chat models");
  return models;
}

export async function loadModelCatalog(
  provider: AiProvider,
  apiKey: string,
  deps: LoadModelCatalogDeps = {},
): Promise<{ models: ModelOption[]; source: ModelListSource }> {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) return { models: fallbackModels(provider), source: "fallback" };

  const now = deps.now ?? Date.now();
  const store = deps.store ?? chromeCatalogStore();
  const fetchImpl = deps.fetchImpl ?? fetch;
  const keyFingerprint = fingerprintKey(trimmedKey);
  const cached = await store.get(provider);
  const cacheState = usableCache(cached, keyFingerprint, now);
  if (cacheState?.fresh && cached) return { models: cached.models, source: "cache" };

  try {
    const models =
      provider === "gemini"
        ? await fetchGeminiModels(trimmedKey, fetchImpl)
        : await fetchOpenAiModels(trimmedKey, fetchImpl, now);
    await store.set(provider, {
      version: CACHE_VERSION,
      keyFingerprint,
      fetchedAt: now,
      models,
    });
    return { models, source: "network" };
  } catch {
    if (cacheState && cached) return { models: cached.models, source: "stale-cache" };
    return { models: fallbackModels(provider), source: "fallback" };
  }
}
