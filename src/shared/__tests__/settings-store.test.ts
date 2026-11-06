import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadSettings, mergeSettings, saveSettings, secretsFrom } from "../settings-store";
import { DEFAULT_SETTINGS } from "../types";

describe("secretsFrom", () => {
  it("prefers a local key and still drops the synced copy", () => {
    expect(
      secretsFrom(
        { openaiApiKey: "sk-old", geminiApiKey: "gem-sync" },
        { openaiApiKey: "sk-local" },
      ),
    ).toEqual({
      secrets: { openaiApiKey: "sk-local", geminiApiKey: "gem-sync" },
      removeFromSync: ["openaiApiKey", "geminiApiKey"],
    });
  });

  it("leaves sync alone when no secret was stored there", () => {
    expect(secretsFrom({ openaiApiKey: "", geminiApiKey: "" }, {})).toEqual({
      secrets: { openaiApiKey: "", geminiApiKey: "" },
      removeFromSync: [],
    });
  });
});

describe("mergeSettings", () => {
  it("does not let a synced key override local storage", () => {
    const merged = mergeSettings(
      { ...DEFAULT_SETTINGS, openaiApiKey: "from-sync", defaultDeck: "Words" },
      { openaiApiKey: "from-local", geminiApiKey: "" },
    );
    expect(merged.openaiApiKey).toBe("from-local");
    expect(merged.defaultDeck).toBe("Words");
    expect(merged.ankiConnectUrl).toBe(DEFAULT_SETTINGS.ankiConnectUrl);
  });
});

describe("loadSettings / saveSettings", () => {
  beforeEach(() => {
    vi.mocked(chrome.storage.sync.get).mockReset();
    vi.mocked(chrome.storage.sync.set).mockReset();
    vi.mocked(chrome.storage.sync.remove).mockReset();
    vi.mocked(chrome.storage.local.get).mockReset();
    vi.mocked(chrome.storage.local.set).mockReset();
    vi.mocked(chrome.storage.sync.set).mockResolvedValue();
    vi.mocked(chrome.storage.sync.remove).mockResolvedValue();
    vi.mocked(chrome.storage.local.set).mockResolvedValue();
  });

  it("copies a synced key into local storage and removes it from sync", async () => {
    vi.mocked(chrome.storage.sync.get).mockResolvedValue({
      ...DEFAULT_SETTINGS,
      openaiApiKey: "sk-sync",
    });
    vi.mocked(chrome.storage.local.get).mockResolvedValue({});

    const settings = await loadSettings();

    expect(settings.openaiApiKey).toBe("sk-sync");
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      openaiApiKey: "sk-sync",
      geminiApiKey: "",
    });
    expect(chrome.storage.sync.remove).toHaveBeenCalledWith(["openaiApiKey"]);
  });

  it("writes keys to local storage and the rest to sync", async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, openaiApiKey: "sk-new", defaultDeck: "Vocab" });

    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      openaiApiKey: "sk-new",
      geminiApiKey: "",
    });
    const synced = vi.mocked(chrome.storage.sync.set).mock.calls[0][0] as Record<string, unknown>;
    expect(synced.defaultDeck).toBe("Vocab");
    expect(synced.openaiApiKey).toBeUndefined();
    expect(synced.geminiApiKey).toBeUndefined();
    expect(chrome.storage.sync.remove).toHaveBeenCalledWith(["openaiApiKey", "geminiApiKey"]);
  });
});
