import { DEFAULT_SETTINGS, type Settings } from "@/shared/types";

export const SECRET_KEYS = ["openaiApiKey", "geminiApiKey"] as const;
export type SecretKey = (typeof SECRET_KEYS)[number];
export type SecretSettings = Pick<Settings, SecretKey>;
export type PublicSettings = Omit<Settings, SecretKey>;

function nonempty(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function secretsFrom(
  sync: Partial<Settings>,
  local: Partial<Settings>,
): {
  secrets: SecretSettings;
  removeFromSync: SecretKey[];
} {
  const secrets: SecretSettings = {
    openaiApiKey: nonempty(local.openaiApiKey) || nonempty(sync.openaiApiKey),
    geminiApiKey: nonempty(local.geminiApiKey) || nonempty(sync.geminiApiKey),
  };
  const removeFromSync = SECRET_KEYS.filter((key) => nonempty(sync[key]));
  return { secrets, removeFromSync };
}

export function mergeSettings(sync: Partial<Settings>, secrets: Partial<SecretSettings>): Settings {
  const { openaiApiKey: _openai, geminiApiKey: _gemini, ...publicSettings } = sync;
  return {
    ...DEFAULT_SETTINGS,
    ...publicSettings,
    openaiApiKey: secrets.openaiApiKey ?? "",
    geminiApiKey: secrets.geminiApiKey ?? "",
  };
}

export function toPlainSettings(settings: Settings): Settings {
  return {
    ...settings,
    defaultTags: [...(settings.defaultTags ?? [])],
  };
}

export function publicSettingsOf(settings: Settings): PublicSettings {
  const {
    openaiApiKey: _openai,
    geminiApiKey: _gemini,
    ...publicSettings
  } = toPlainSettings(settings);
  return publicSettings;
}

export async function loadSettings(): Promise<Settings> {
  const sync = (await chrome.storage.sync.get(
    DEFAULT_SETTINGS as unknown as Record<string, unknown>,
  )) as Partial<Settings>;
  const local = (await chrome.storage.local.get([...SECRET_KEYS])) as Partial<SecretSettings>;
  const { secrets, removeFromSync } = secretsFrom(sync, local);
  if (removeFromSync.length > 0) {
    await chrome.storage.local.set(secrets);
    await chrome.storage.sync.remove(removeFromSync);
  }
  return mergeSettings(sync, secrets);
}

export async function saveSettings(settings: Settings): Promise<void> {
  const plain = toPlainSettings(settings);
  const secrets: SecretSettings = {
    openaiApiKey: plain.openaiApiKey.trim(),
    geminiApiKey: plain.geminiApiKey.trim(),
  };
  await chrome.storage.local.set(secrets);
  await chrome.storage.sync.set(publicSettingsOf(plain));
  await chrome.storage.sync.remove([...SECRET_KEYS]);
}
