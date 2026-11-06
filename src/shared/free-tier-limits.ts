/**
 * Approximate free-tier quotas for the model picker.
 *
 * Update this map when the provider docs change. The model-list APIs do not
 * return quotas. Models absent from the map are unknown: the settings page
 * shows nothing for them, including models loaded dynamically.
 *
 * Checked 2026-11-06:
 * - Gemini rate limits (https://ai.google.dev/gemini-api/docs/rate-limits)
 *   publish a free-tier row only for `gemini-omni-1.2-flash` ("Not supported").
 *   They do not publish RPM/RPD for Gemini 3.8 Flash, Gemini 3.5 Flash-Lite,
 *   or Gemma 4, so those IDs are intentionally omitted.
 * - Gemini pricing says `gemini-4-argon` is not available on the free tier.
 * - OpenAI API chat models are billed. The rate-limits guide
 *   (https://developers.openai.com/api/docs/guides/rate-limits) has no free
 *   tier for the GPT-6 models used here.
 */

export const GEMINI_RATE_LIMITS_URL = "https://ai.google.dev/gemini-api/docs/rate-limits";
export const OPENAI_RATE_LIMITS_URL = "https://developers.openai.com/api/docs/guides/rate-limits";

/** `null` means the docs say there is no free tier. */
export type FreeTierLimit = { rpm: number; rpd: number } | null;

export const FREE_TIER_LIMITS: Readonly<Record<string, FreeTierLimit>> = {
  "gpt-6-luna": null,
  "gpt-6.1-terra": null,
  "gpt-6.1-sol": null,
  "gpt-6-astra": null,
  "gemini-4-argon": null,
  "gemini-omni-1.2-flash": null,
};

export function lookupFreeTier(modelId: string): FreeTierLimit | undefined {
  if (!Object.prototype.hasOwnProperty.call(FREE_TIER_LIMITS, modelId)) return undefined;
  return FREE_TIER_LIMITS[modelId];
}

export function formatFreeTierLimit(limit: FreeTierLimit): string {
  if (limit === null) return "無免費額度";
  return `Free: ${limit.rpm} RPM / ${limit.rpd} RPD`;
}

export function freeTierDocsUrl(modelId: string): string {
  return modelId.startsWith("gpt-") || modelId.startsWith("ft:") || modelId.startsWith("chatgpt-")
    ? OPENAI_RATE_LIMITS_URL
    : GEMINI_RATE_LIMITS_URL;
}
