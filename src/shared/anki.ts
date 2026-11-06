import type { AnkiCardData, Settings } from "@/shared/types";

export interface AnkiAudio {
  filename: string;
  data: string;
}

export interface AnkiNoteAudio extends AnkiAudio {
  fields: string[];
}

export interface AnkiNote {
  deckName: string;
  modelName: string;
  fields: Record<string, string>;
  tags: string[];
  options: { allowDuplicate: boolean };
  audio?: AnkiNoteAudio[];
}

export interface NoteAddResult {
  ok: boolean;
  error?: string;
  audioSkipped?: boolean;
}

export type AnkiInvoker = (action: string, params?: unknown) => Promise<unknown>;

interface CanAddDetail {
  canAdd: boolean;
  error?: string;
}

export function escapeAnkiHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br>");
}

export function isAllowedAnkiConnectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:") return false;
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export function resolveAnkiConnectUrl(settings: Settings): string {
  const url = (settings.ankiConnectUrl || "http://127.0.0.1:8765").trim();
  if (!isAllowedAnkiConnectUrl(url)) {
    throw new Error("AnkiConnect URL 只接受 http://localhost 或 http://127.0.0.1（可含連接埠）。");
  }
  return url;
}

export function buildAnkiNote(
  card: AnkiCardData,
  settings: Settings,
  audio?: AnkiAudio | null,
): AnkiNote {
  const frontField = settings.ankiFrontField || "正面";
  const backField = settings.ankiBackField || "背面";
  const back = [card.back, card.example, card.related]
    .filter((part) => part.trim())
    .map(escapeAnkiHtml)
    .join("<br>");

  const note: AnkiNote = {
    deckName: settings.defaultDeck || "預設",
    modelName: settings.ankiModelName || "基本型",
    fields: {
      [frontField]: escapeAnkiHtml(card.front),
      [backField]: back,
    },
    tags: settings.defaultTags ?? [],
    options: { allowDuplicate: false },
  };

  if (audio) {
    note.audio = [{ filename: audio.filename, data: audio.data, fields: [frontField] }];
  }
  return note;
}

export function isUnsupportedAction(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /unsupported action/i.test(message);
}

function errorText(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function readCanAddDetails(result: unknown, count: number): CanAddDetail[] | null {
  if (!Array.isArray(result) || result.length !== count) return null;
  const details: CanAddDetail[] = [];
  for (const item of result) {
    if (!item || typeof item !== "object" || !("canAdd" in item)) return null;
    const record = item as { canAdd?: unknown; error?: unknown };
    details.push({
      canAdd: Boolean(record.canAdd),
      error: typeof record.error === "string" ? record.error : undefined,
    });
  }
  return details;
}

async function addOne(invoke: AnkiInvoker, note: AnkiNote): Promise<NoteAddResult> {
  try {
    const id = await invoke("addNote", { note });
    if (id == null) return { ok: false, error: "Anki 沒有建立這張卡片" };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorText(error, "AnkiConnect 失敗") };
  }
}

/**
 * Ask Anki which notes can be added, then create only those.
 * Older AnkiConnect builds lack canAddNotesWithErrorDetail; those fall back to addNote
 * so each failure still keeps its own error string.
 */
export async function addNotesWithReasons(
  invoke: AnkiInvoker,
  notes: AnkiNote[],
): Promise<NoteAddResult[]> {
  if (notes.length === 0) return [];

  let details: CanAddDetail[] | null = null;
  try {
    details = readCanAddDetails(
      await invoke("canAddNotesWithErrorDetail", { notes }),
      notes.length,
    );
  } catch (error) {
    if (!isUnsupportedAction(error)) throw error;
  }

  if (!details) {
    const results: NoteAddResult[] = [];
    for (const note of notes) results.push(await addOne(invoke, note));
    return results;
  }

  const results: NoteAddResult[] = notes.map(() => ({ ok: false, error: "無法加入這張卡片" }));
  const addable: { index: number; note: AnkiNote }[] = [];
  details.forEach((detail, index) => {
    if (detail.canAdd) addable.push({ index, note: notes[index] });
    else results[index] = { ok: false, error: detail.error || "無法加入這張卡片" };
  });
  if (addable.length === 0) return results;

  const ids = await invoke("addNotes", { notes: addable.map((item) => item.note) });
  if (!Array.isArray(ids)) {
    throw new Error("AnkiConnect 沒有回傳每張卡片的結果");
  }

  for (let i = 0; i < addable.length; i++) {
    const { index, note } = addable[i];
    if (ids[i] == null) results[index] = await addOne(invoke, note);
    else results[index] = { ok: true };
  }
  return results;
}

export async function postAnki(url: string, action: string, params?: unknown): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, version: 6, params }),
    });
  } catch {
    throw new Error(
      `無法連線到 AnkiConnect（${url}）。請確認 Anki 已開啟，且 AnkiConnect 正在監聽。`,
    );
  }

  if (!response.ok) {
    throw new Error(
      response.status === 403
        ? "AnkiConnect 拒絕了這個來源（HTTP 403）。請在 AnkiConnect 設定保留 webCorsOriginList 的 http://localhost。"
        : `AnkiConnect HTTP ${response.status}`,
    );
  }

  const data = (await response.json()) as { result?: unknown; error?: string | null };
  if (data.error) throw new Error(data.error);
  return data.result ?? null;
}
