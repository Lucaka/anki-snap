<script setup lang="ts">
import { ref } from 'vue'
import type { Message, SnapSelection } from '@/shared/types'

const status = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const errorMsg = ref('')

async function snapCurrentTab() {
  status.value = 'loading'
  errorMsg.value = ''

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab.id) throw new Error('No active tab')

    // Ask the content script for the current selection
    const selection = await chrome.tabs.sendMessage<Message, SnapSelection>(
      tab.id,
      { type: 'SNAP_SELECTION' },
    )

    if (!selection?.text) {
      errorMsg.value = 'No text selected on this page.'
      status.value = 'error'
      return
    }

    // Delegate card creation to the background service worker
    const result = await chrome.runtime.sendMessage<Message<SnapSelection>, { ok: boolean; error?: string }>({
      type: 'SNAP_SELECTION',
      payload: selection,
    })

    if (result?.ok) {
      status.value = 'success'
    } else {
      errorMsg.value = result?.error ?? 'Failed to create card.'
      status.value = 'error'
    }
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Unexpected error.'
    status.value = 'error'
  }
}

function openOptions() {
  chrome.runtime.openOptionsPage()
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
      {{ status === 'loading' ? 'Snapping…' : 'Snap Selection' }}
    </button>

    <p v-if="status === 'success'" class="mt-2 text-sm text-green-600">
      Card created successfully!
    </p>
    <p v-if="status === 'error'" class="mt-2 text-sm text-red-600">
      {{ errorMsg }}
    </p>

    <div class="mt-4 pt-4 border-t border-gray-200">
      <a
        href="#"
        class="text-xs text-gray-500 hover:text-gray-700"
        @click.prevent="openOptions()"
      >
        Settings
      </a>
    </div>
  </div>
</template>
