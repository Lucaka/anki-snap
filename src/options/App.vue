<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { DEFAULT_SETTINGS, type Settings } from '@/shared/types'

const settings = ref<Settings>({ ...DEFAULT_SETTINGS })
const saved = ref(false)

onMounted(async () => {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS as unknown as Record<string, unknown>)
  settings.value = stored as unknown as Settings
})

async function save() {
  await chrome.storage.sync.set(settings.value)
  saved.value = true
  setTimeout(() => (saved.value = false), 2000)
}
</script>

<template>
  <div class="max-w-xl mx-auto p-8">
    <h1 class="text-2xl font-bold text-gray-800 mb-6">Anki Snap Settings</h1>

    <form class="space-y-5" @submit.prevent="save">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          AnkiConnect URL
        </label>
        <input
          v-model="settings.ankiConnectUrl"
          type="url"
          class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="http://localhost:8765"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Default Deck
        </label>
        <input
          v-model="settings.defaultDeck"
          type="text"
          class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Default"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Default Tags
          <span class="text-gray-400 font-normal">(comma-separated)</span>
        </label>
        <input
          :value="settings.defaultTags.join(', ')"
          type="text"
          class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="language, vocab"
          @input="settings.defaultTags = ($event.target as HTMLInputElement).value.split(',').map(t => t.trim()).filter(Boolean)"
        />
      </div>

      <button
        type="submit"
        class="py-2 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
      >
        Save
      </button>

      <span v-if="saved" class="ml-3 text-sm text-green-600">Saved!</span>
    </form>
  </div>
</template>
