<script setup lang="ts">
import { ref } from 'vue'

const status = ref<'idle' | 'loading' | 'success' | 'error'>('idle')

async function snapCurrentTab() {
  status.value = 'loading'
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab.id) throw new Error('No active tab')

    await chrome.tabs.sendMessage(tab.id, { type: 'SNAP_SELECTION' })
    status.value = 'success'
  } catch {
    status.value = 'error'
  }
}
</script>

<template>
  <div class="w-72 p-4 bg-white">
    <h1 class="text-lg font-bold text-gray-800 mb-4">Anki Snap</h1>

    <button
      class="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
      :disabled="status === 'loading'"
      @click="snapCurrentTab"
    >
      {{ status === 'loading' ? 'Snapping...' : 'Snap Selection' }}
    </button>

    <p v-if="status === 'success'" class="mt-2 text-sm text-green-600">
      Card created successfully!
    </p>
    <p v-if="status === 'error'" class="mt-2 text-sm text-red-600">
      Failed to snap. Is AnkiConnect running?
    </p>

    <div class="mt-4 pt-4 border-t border-gray-200">
      <a
        href="#"
        class="text-xs text-gray-500 hover:text-gray-700"
        @click.prevent="chrome.runtime.openOptionsPage()"
      >
        Settings
      </a>
    </div>
  </div>
</template>
