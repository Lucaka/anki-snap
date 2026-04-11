<script setup lang="ts">
import { ref } from 'vue'

const status = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const errorMsg = ref('')

async function snapCurrentTab() {
  status.value = 'loading'
  errorMsg.value = ''
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab.id) throw new Error('No active tab')

    await chrome.tabs.sendMessage(tab.id, { type: 'SHOW_SNAP_PANEL' })
    status.value = 'success'
    // Close popup so user can see the panel on the page
    window.close()
  } catch {
    status.value = 'error'
    errorMsg.value = '無法連接到頁面，請重新整理後再試。'
  }
}

function openOptions() {
  chrome.runtime.openOptionsPage()
}
</script>

<template>
  <div class="w-72 p-4 bg-white">
    <h1 class="text-lg font-bold text-gray-800 mb-1">Anki Snap</h1>
    <p class="text-xs text-gray-400 mb-4">選取網頁文字後點選下方按鈕或使用浮動圖示</p>

    <button
      class="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
      :disabled="status === 'loading'"
      @click="snapCurrentTab"
    >
      {{ status === 'loading' ? '處理中...' : '✦ Snap 選取文字' }}
    </button>

    <p v-if="status === 'error'" class="mt-2 text-xs text-red-600">
      {{ errorMsg }}
    </p>

    <div class="mt-4 pt-4 border-t border-gray-200">
      <a
        href="#"
        class="text-xs text-gray-500 hover:text-gray-700"
        @click.prevent="openOptions()"
      >
        ⚙ 設定（API Key、語言...）
      </a>
    </div>
  </div>
</template>
