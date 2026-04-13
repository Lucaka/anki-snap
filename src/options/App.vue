<script setup lang="ts">
import { ref, onMounted, toRaw } from "vue";
import { DEFAULT_SETTINGS, type Settings } from "@/shared/types";

const settings = ref<Settings>({ ...DEFAULT_SETTINGS });
const saved = ref(false);

const OPENAI_MODEL_OPTIONS = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini（快速、低費用）" },
  { value: "gpt-4o", label: "GPT-4o（高品質）" },
];

const GEMINI_MODEL_OPTIONS = [
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash（快速、低費用）" },
  { value: "gemini-2.5-pro-preview-03-25", label: "Gemini 2.5 Pro（高品質）" },
  { value: "gemma-4-26b-a4b-it", label: "Gemma 4 26B" },
  { value: "gemma-4-31b-it", label: "Gemma 4 31B" },
];

const LANGUAGE_OPTIONS = [
  "繁體中文",
  "簡體中文",
  "日本語",
  "한국어",
  "English",
  "Español",
  "Français",
  "Deutsch",
];

onMounted(async () => {
  const stored = await chrome.storage.sync.get(
    DEFAULT_SETTINGS as unknown as Record<string, unknown>,
  );
  settings.value = stored as unknown as Settings;
});

async function save() {
  await chrome.storage.sync.set(toRaw(settings.value));
  saved.value = true;
  setTimeout(() => (saved.value = false), 2000);
}
</script>

<template>
  <div class="max-w-xl mx-auto p-8">
    <h1 class="text-2xl font-bold text-gray-800 mb-6">Anki Snap 設定</h1>

    <form class="space-y-6" @submit.prevent="save">
      <!-- AI Provider Section -->
      <div class="border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 class="text-sm font-semibold text-gray-600 uppercase tracking-wide">AI 服務</h2>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">服務提供者</label>
          <div class="flex gap-3">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="settings.aiProvider"
                type="radio"
                value="openai"
                class="accent-blue-600"
              />
              <span class="text-sm text-gray-700">OpenAI</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="settings.aiProvider"
                type="radio"
                value="gemini"
                class="accent-blue-600"
              />
              <span class="text-sm text-gray-700">Google Gemini</span>
            </label>
          </div>
        </div>

        <!-- OpenAI fields -->
        <template v-if="settings.aiProvider === 'openai'">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">API Key</label>
            <input
              v-model="settings.openaiApiKey"
              type="password"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              placeholder="sk-..."
              autocomplete="off"
            />
            <p class="mt-1 text-xs text-gray-400">
              從 platform.openai.com 取得，存於本機瀏覽器，不會上傳。
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">模型</label>
            <select
              v-model="settings.openaiModel"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option v-for="opt in OPENAI_MODEL_OPTIONS" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
        </template>

        <!-- Gemini fields -->
        <template v-if="settings.aiProvider === 'gemini'">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">API Key</label>
            <input
              v-model="settings.geminiApiKey"
              type="password"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              placeholder="AIza..."
              autocomplete="off"
            />
            <p class="mt-1 text-xs text-gray-400">
              從 aistudio.google.com 取得，存於本機瀏覽器，不會上傳。
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">模型</label>
            <select
              v-model="settings.geminiModel"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option v-for="opt in GEMINI_MODEL_OPTIONS" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
        </template>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"> 卡片說明語言 </label>
          <select
            v-model="settings.targetLanguage"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option v-for="lang in LANGUAGE_OPTIONS" :key="lang" :value="lang">
              {{ lang }}
            </option>
          </select>
        </div>
      </div>

      <!-- UI Section -->
      <div class="border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 class="text-sm font-semibold text-gray-600 uppercase tracking-wide">介面</h2>

        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-700">選取文字後顯示浮動圖示</p>
            <p class="text-xs text-gray-400 mt-0.5">選取文字後在右下角顯示快速觸發按鈕</p>
          </div>
          <button
            type="button"
            role="switch"
            :aria-checked="settings.showFloatingIcon"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            :class="settings.showFloatingIcon ? 'bg-blue-600' : 'bg-gray-200'"
            @click="settings.showFloatingIcon = !settings.showFloatingIcon"
          >
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
              :class="settings.showFloatingIcon ? 'translate-x-6' : 'translate-x-1'"
            />
          </button>
        </div>
      </div>

      <!-- Anki Section -->
      <div class="border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 class="text-sm font-semibold text-gray-600 uppercase tracking-wide">Anki（進階）</h2>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"> AnkiConnect URL </label>
          <input
            v-model="settings.ankiConnectUrl"
            type="url"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="http://localhost:8765"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"> 預設牌組 </label>
          <input
            v-model="settings.defaultDeck"
            type="text"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="預設"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            預設標籤
            <span class="text-gray-400 font-normal">（以逗號分隔）</span>
          </label>
          <input
            :value="settings.defaultTags?.join(', ')"
            type="text"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="language, vocab"
            @input="
              settings.defaultTags = ($event.target as HTMLInputElement).value
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)
            "
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">筆記類型（modelName）</label>
          <input
            v-model="settings.ankiModelName"
            type="text"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="基本型"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">正面欄位名稱</label>
            <input
              v-model="settings.ankiFrontField"
              type="text"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="正面"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">背面欄位名稱</label>
            <input
              v-model="settings.ankiBackField"
              type="text"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="背面"
            />
          </div>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <button
          type="submit"
          class="py-2 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          儲存
        </button>
        <span v-if="saved" class="text-sm text-green-600">已儲存！</span>
      </div>
    </form>
  </div>
</template>
