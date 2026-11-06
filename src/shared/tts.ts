import { buildAnkiNote, type AnkiAudio, type AnkiNote } from "@/shared/anki";
import type { AnkiCardData, Settings } from "@/shared/types";

// Speech API model. Deprecated 2026-10-01 and scheduled to shut down 2027-01-06.
// gpt-realtime-2.1-mini is not accepted by /v1/audio/speech, so this stays until that endpoint moves.
export const OPENAI_TTS_MODEL = "gpt-4o-mini-tts";
export const GEMINI_TTS_MODEL = "gemini-3.8-flash-tts";
export const GEMINI_TTS_LIMITS_URL = "https://ai.google.dev/gemini-api/docs/rate-limits";

export type TtsRoute = "openai" | "gemini";

export function ttsRoute(settings: Settings): TtsRoute | null {
  if (!settings.pronunciation) return null;
  if (settings.openaiApiKey.trim()) return "openai";
  if (settings.geminiApiKey.trim()) return "gemini";
  return null;
}

export async function stableAudioFilename(word: string, extension: "mp3" | "wav"): Promise<string> {
  const normalized = word.trim().toLowerCase().replace(/\s+/g, " ");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
  const hex = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
  return `anki-snap-${hex}.${extension}`;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Wrap 16-bit little-endian mono PCM in a WAV container Anki can play. */
export function pcm16leToWav(pcm: Uint8Array, sampleRate = 24000): Uint8Array {
  const even = pcm.length % 2 === 0 ? pcm : pcm.subarray(0, pcm.length - 1);
  const buffer = new ArrayBuffer(44 + even.length);
  const view = new DataView(buffer);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + even.length, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, even.length, true);
  new Uint8Array(buffer, 44).set(even);
  return new Uint8Array(buffer);
}

function isWav(bytes: Uint8Array): boolean {
  return (
    bytes.length > 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46
  );
}

export function geminiAudioToWav(base64: string, mimeType?: string): Uint8Array {
  const bytes = base64ToBytes(base64);
  if (mimeType?.includes("wav") || isWav(bytes)) return bytes;
  const rate = Number(mimeType?.match(/rate=(\d+)/)?.[1] ?? 24000);
  return pcm16leToWav(bytes, Number.isFinite(rate) && rate > 0 ? rate : 24000);
}

export interface PreparedNote {
  note: AnkiNote;
  audioSkipped: boolean;
}

export async function noteWithPronunciation(
  card: AnkiCardData,
  settings: Settings,
  speak: (route: TtsRoute, text: string) => Promise<AnkiAudio>,
): Promise<PreparedNote> {
  const route = ttsRoute(settings);
  if (!route) {
    return { note: buildAnkiNote(card, settings), audioSkipped: settings.pronunciation };
  }
  try {
    const audio = await speak(route, card.front);
    return { note: buildAnkiNote(card, settings, audio), audioSkipped: false };
  } catch {
    return { note: buildAnkiNote(card, settings), audioSkipped: true };
  }
}

interface GeminiPart {
  inlineData?: { data?: string; mimeType?: string };
}

interface GeminiSpeechResponse {
  candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
  error?: { message?: string };
}

export async function synthesizeSpeech(
  route: TtsRoute,
  text: string,
  settings: Settings,
): Promise<AnkiAudio> {
  const spoken = text.trim();
  if (!spoken) throw new Error("沒有可朗讀的單字");
  if (route === "openai") return synthesizeOpenAI(settings.openaiApiKey, spoken);
  return synthesizeGemini(settings.geminiApiKey, spoken);
}

async function synthesizeOpenAI(apiKey: string, text: string): Promise<AnkiAudio> {
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_TTS_MODEL,
      voice: "alloy",
      input: text.slice(0, 4096),
      response_format: "mp3",
    }),
  });
  if (!response.ok) throw new Error(`OpenAI 語音合成失敗（${response.status}）`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length === 0) throw new Error("OpenAI 語音合成沒有回傳音檔");
  return { filename: await stableAudioFilename(text, "mp3"), data: bytesToBase64(bytes) };
}

async function synthesizeGemini(apiKey: string, text: string): Promise<AnkiAudio> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TTS_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: text.slice(0, 2000) }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          responseFormat: { audio: { mimeType: "AUDIO_L16", sampleRate: 24000 } },
          speechConfig: { voiceConfig: { voice: "Kore" } },
        },
      }),
    },
  );
  const body = (await response.json().catch(() => ({}))) as GeminiSpeechResponse;
  if (!response.ok) {
    throw new Error(body.error?.message || `Gemini 語音合成失敗（${response.status}）`);
  }
  const part = body.candidates?.[0]?.content?.parts?.find((item) => item.inlineData?.data);
  const data = part?.inlineData?.data;
  if (!data) throw new Error("Gemini 語音合成沒有回傳音檔");
  const wav = geminiAudioToWav(data, part?.inlineData?.mimeType);
  return { filename: await stableAudioFilename(text, "wav"), data: bytesToBase64(wav) };
}
