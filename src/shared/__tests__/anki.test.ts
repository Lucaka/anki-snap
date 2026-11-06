import { describe, expect, it, vi } from "vitest";
import {
  addNotesWithReasons,
  buildAnkiNote,
  isAllowedAnkiConnectUrl,
  resolveAnkiConnectUrl,
  type AnkiInvoker,
} from "../anki";
import { DEFAULT_SETTINGS } from "../types";

const card = {
  front: "R&D",
  back: "名詞 / 研發",
  example: "line one\nline two",
  related: "",
};

describe("AnkiConnect URL", () => {
  it("allows localhost and 127.0.0.1 on any port", () => {
    expect(isAllowedAnkiConnectUrl("http://localhost:8765")).toBe(true);
    expect(isAllowedAnkiConnectUrl("http://127.0.0.1:8765")).toBe(true);
    expect(isAllowedAnkiConnectUrl("https://127.0.0.1:8765")).toBe(false);
    expect(isAllowedAnkiConnectUrl("http://192.168.1.2:8765")).toBe(false);
    expect(isAllowedAnkiConnectUrl("not a url")).toBe(false);
  });

  it("rejects a disallowed settings URL", () => {
    expect(() =>
      resolveAnkiConnectUrl({ ...DEFAULT_SETTINGS, ankiConnectUrl: "http://example.com" }),
    ).toThrow("127.0.0.1");
  });
});

describe("buildAnkiNote", () => {
  it("escapes HTML and skips an empty related field", () => {
    const note = buildAnkiNote(card, DEFAULT_SETTINGS);
    expect(note.fields["正面"]).toBe("R&amp;D");
    expect(note.fields["背面"]).toBe("名詞 / 研發<br>line one<br>line two");
    expect(note.audio).toBeUndefined();
    expect(note.options.allowDuplicate).toBe(false);
  });

  it("attaches audio to the front field", () => {
    const note = buildAnkiNote(card, DEFAULT_SETTINGS, {
      filename: "anki-snap-abc.mp3",
      data: "QQ==",
    });
    expect(note.audio).toEqual([{ filename: "anki-snap-abc.mp3", data: "QQ==", fields: ["正面"] }]);
  });
});

describe("addNotesWithReasons", () => {
  const notes = [
    buildAnkiNote(card, DEFAULT_SETTINGS),
    buildAnkiNote({ ...card, front: "yield" }, DEFAULT_SETTINGS),
  ];

  it("adds only the notes Anki says it can add, and keeps the rejection reason", async () => {
    const invoke = vi.fn<AnkiInvoker>(async (action, params) => {
      if (action === "canAddNotesWithErrorDetail") {
        return [
          { canAdd: true },
          { canAdd: false, error: "cannot create note because it is a duplicate" },
        ];
      }
      if (action === "addNotes") {
        const body = params as { notes: unknown[] };
        expect(body.notes).toHaveLength(1);
        return [101];
      }
      throw new Error(`unexpected ${action}`);
    });

    await expect(addNotesWithReasons(invoke, notes)).resolves.toEqual([
      { ok: true },
      { ok: false, error: "cannot create note because it is a duplicate" },
    ]);
  });

  it("asks addNote for the reason when addNotes returns null", async () => {
    const invoke = vi.fn<AnkiInvoker>(async (action) => {
      if (action === "canAddNotesWithErrorDetail") return [{ canAdd: true }];
      if (action === "addNotes") return [null];
      if (action === "addNote") throw new Error("deck was not found: 預設");
      throw new Error(`unexpected ${action}`);
    });

    await expect(addNotesWithReasons(invoke, [notes[0]])).resolves.toEqual([
      { ok: false, error: "deck was not found: 預設" },
    ]);
  });

  it("falls back to addNote when the detail action is unsupported", async () => {
    const invoke = vi.fn<AnkiInvoker>(async (action) => {
      if (action === "canAddNotesWithErrorDetail") throw new Error("unsupported action");
      if (action === "addNote") return action === "addNote" ? 7 : null;
      throw new Error(`unexpected ${action}`);
    });

    await expect(addNotesWithReasons(invoke, [notes[0]])).resolves.toEqual([{ ok: true }]);
    expect(invoke).toHaveBeenCalledWith("addNote", { note: notes[0] });
  });

  it("does not hide a connection failure as an unsupported action", async () => {
    const invoke = vi.fn<AnkiInvoker>(async () => {
      throw new Error("無法連線到 AnkiConnect（http://127.0.0.1:8765）。");
    });
    await expect(addNotesWithReasons(invoke, [notes[0]])).rejects.toThrow("無法連線");
  });
});
