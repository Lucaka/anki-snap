import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../types";
import {
  geminiAudioToWav,
  noteWithPronunciation,
  pcm16leToWav,
  stableAudioFilename,
  ttsRoute,
} from "../tts";

const card = { front: "Resist", back: "抵抗", example: "", related: "" };

describe("ttsRoute", () => {
  it("stays off unless pronunciation is enabled", () => {
    expect(ttsRoute({ ...DEFAULT_SETTINGS, openaiApiKey: "sk" })).toBeNull();
  });

  it("uses OpenAI whenever that key exists", () => {
    expect(
      ttsRoute({
        ...DEFAULT_SETTINGS,
        pronunciation: true,
        openaiApiKey: "sk",
        geminiApiKey: "gem",
      }),
    ).toBe("openai");
  });

  it("uses Gemini only when there is no OpenAI key", () => {
    expect(ttsRoute({ ...DEFAULT_SETTINGS, pronunciation: true, geminiApiKey: "gem" })).toBe(
      "gemini",
    );
  });
});

describe("stableAudioFilename", () => {
  it("hashes the normalized word and keeps the extension", async () => {
    const first = await stableAudioFilename("  Resist  ", "mp3");
    const second = await stableAudioFilename("resist", "mp3");
    const wav = await stableAudioFilename("resist", "wav");
    expect(first).toBe(second);
    expect(first).toMatch(/^anki-snap-[0-9a-f]{16}\.mp3$/);
    expect(wav.endsWith(".wav")).toBe(true);
    expect(wav.slice(0, -4)).toBe(first.slice(0, -4));
  });
});

describe("pcm16leToWav", () => {
  it("writes a 24 kHz mono WAV header around the PCM frames", () => {
    const wav = pcm16leToWav(new Uint8Array([1, 2, 3, 4, 5]), 24000);
    const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
    expect(String.fromCharCode(...wav.subarray(0, 4))).toBe("RIFF");
    expect(String.fromCharCode(...wav.subarray(8, 12))).toBe("WAVE");
    expect(view.getUint32(24, true)).toBe(24000);
    expect(view.getUint16(34, true)).toBe(16);
    expect(view.getUint32(40, true)).toBe(4);
    expect(wav[44]).toBe(1);
    expect(wav[47]).toBe(4);
  });

  it("leaves an existing WAV payload unchanged", () => {
    const wav = pcm16leToWav(new Uint8Array([9, 8]), 16000);
    const again = geminiAudioToWav(btoa(String.fromCharCode(...wav)), "audio/wav");
    expect([...again]).toEqual([...wav]);
  });

  it("reads a rate hint from raw PCM mime data", () => {
    const pcm = new Uint8Array([1, 2]);
    const wrapped = geminiAudioToWav(btoa(String.fromCharCode(...pcm)), "audio/l16;rate=16000");
    const view = new DataView(wrapped.buffer, wrapped.byteOffset, wrapped.byteLength);
    expect(view.getUint32(24, true)).toBe(16000);
  });
});

describe("noteWithPronunciation", () => {
  it("adds the note without audio when synthesis throws", async () => {
    const speak = vi.fn(async () => {
      throw new Error("429");
    });
    const prepared = await noteWithPronunciation(
      card,
      { ...DEFAULT_SETTINGS, pronunciation: true, openaiApiKey: "sk" },
      speak,
    );
    expect(prepared.audioSkipped).toBe(true);
    expect(prepared.note.audio).toBeUndefined();
    expect(prepared.note.fields["正面"]).toBe("Resist");
    expect(speak).toHaveBeenCalledWith("openai", "Resist");
  });

  it("attaches a stable file on the front field", async () => {
    const prepared = await noteWithPronunciation(
      card,
      { ...DEFAULT_SETTINGS, pronunciation: true, geminiApiKey: "gem" },
      async () => ({ filename: "anki-snap-abc.wav", data: "QQ==" }),
    );
    expect(prepared.audioSkipped).toBe(false);
    expect(prepared.note.audio?.[0].fields).toEqual(["正面"]);
    expect(prepared.note.audio?.[0].filename).toBe("anki-snap-abc.wav");
  });

  it("does not call the provider when the toggle is off", async () => {
    const speak = vi.fn();
    const prepared = await noteWithPronunciation(
      card,
      { ...DEFAULT_SETTINGS, openaiApiKey: "sk" },
      speak,
    );
    expect(prepared.audioSkipped).toBe(false);
    expect(speak).not.toHaveBeenCalled();
  });
});
