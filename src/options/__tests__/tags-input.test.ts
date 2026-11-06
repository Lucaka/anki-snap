import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App.vue";
import { DEFAULT_SETTINGS } from "@/shared/types";

describe("options tag field", () => {
  beforeEach(() => {
    vi.mocked(chrome.storage.sync.get).mockReset();
    vi.mocked(chrome.storage.sync.set).mockReset();
    vi.mocked(chrome.storage.sync.remove).mockReset();
    vi.mocked(chrome.storage.local.get).mockReset();
    vi.mocked(chrome.storage.local.set).mockReset();
    vi.mocked(chrome.storage.sync.get).mockResolvedValue({
      ...DEFAULT_SETTINGS,
      defaultTags: ["language"],
    });
    vi.mocked(chrome.storage.local.get).mockResolvedValue({});
    vi.mocked(chrome.storage.sync.set).mockResolvedValue();
    vi.mocked(chrome.storage.sync.remove).mockResolvedValue();
    vi.mocked(chrome.storage.local.set).mockResolvedValue();
  });

  it("keeps a trailing comma while the user is still typing", async () => {
    const wrapper = mount(App);
    await flushPromises();

    const input = wrapper.get('input[placeholder="language, vocab"]');
    await input.setValue("language, ");

    expect((input.element as HTMLInputElement).value).toBe("language, ");
  });

  it("parses tags when saving and does not put the API key in sync", async () => {
    const wrapper = mount(App);
    await flushPromises();

    await wrapper.get('input[placeholder="sk-..."]').setValue("sk-test");
    await wrapper.get('input[placeholder="language, vocab"]').setValue("language, vocab");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    const synced = vi.mocked(chrome.storage.sync.set).mock.calls.at(-1)?.[0] as {
      defaultTags?: string[];
      openaiApiKey?: string;
    };
    expect(synced.defaultTags).toEqual(["language", "vocab"]);
    expect(synced.openaiApiKey).toBeUndefined();
    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({ openaiApiKey: "sk-test" }),
    );
  });
});
