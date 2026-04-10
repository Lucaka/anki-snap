<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { DEFAULT_SETTINGS, type Settings } from '@/shared/types'
import { AnkiWebService, AnkiServiceError } from '@/shared/services/anki'

// ── Settings ──────────────────────────────────────────────────────────────────

const settings = ref<Settings>({ ...DEFAULT_SETTINGS })
const saved = ref(false)

onMounted(async () => {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS as unknown as Record<string, unknown>)
  settings.value = stored as unknown as Settings

  // Restore logged-in email for display
  const svc = new AnkiWebService()
  loggedInEmail.value = await svc.getLoggedInEmail()
})

async function save() {
  await chrome.storage.sync.set(settings.value)
  saved.value = true
  setTimeout(() => (saved.value = false), 2000)
}

// ── AnkiWeb login ─────────────────────────────────────────────────────────────

const ankiWebEmail = ref('')
const ankiWebPassword = ref('')
const loggedInEmail = ref<string | null>(null)
const loginStatus = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const loginError = ref('')

const isAnkiWeb = computed(() => settings.value.ankiProvider === 'ankiweb')

async function loginAnkiWeb() {
  loginStatus.value = 'loading'
  loginError.value = ''
  try {
    const svc = new AnkiWebService()
    await svc.login(ankiWebEmail.value, ankiWebPassword.value)
    loggedInEmail.value = ankiWebEmail.value
    ankiWebPassword.value = ''
    loginStatus.value = 'success'
  } catch (err) {
    loginError.value = err instanceof AnkiServiceError
      ? err.message
      : 'Login failed. Please try again.'
    loginStatus.value = 'error'
  }
}

async function logoutAnkiWeb() {
  const svc = new AnkiWebService()
  await svc.logout()
  loggedInEmail.value = null
  loginStatus.value = 'idle'
}
</script>

<template>
  <div class="max-w-xl mx-auto p-8 space-y-8">
    <h1 class="text-2xl font-bold text-gray-800">Anki Snap Settings</h1>

    <form class="space-y-6" @submit.prevent="save">

      <!-- ── Provider selector ─────────────────────────────────────────── -->
      <fieldset>
        <legend class="text-sm font-medium text-gray-700 mb-2">Card Provider</legend>
        <div class="flex gap-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              v-model="settings.ankiProvider"
              type="radio"
              value="ankiconnect"
              class="accent-blue-600"
            />
            <span class="text-sm">AnkiConnect <span class="text-gray-400">(local)</span></span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              v-model="settings.ankiProvider"
              type="radio"
              value="ankiweb"
              class="accent-blue-600"
            />
            <span class="text-sm">AnkiWeb <span class="text-gray-400">(cloud)</span></span>
          </label>
        </div>
      </fieldset>

      <!-- ── AnkiConnect URL ───────────────────────────────────────────── -->
      <div v-if="!isAnkiWeb">
        <label class="block text-sm font-medium text-gray-700 mb-1">
          AnkiConnect URL
        </label>
        <input
          v-model="settings.ankiConnectUrl"
          type="url"
          class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="http://localhost:8765"
        />
        <p class="mt-1 text-xs text-gray-400">
          Requires Anki desktop to be open with the
          <a href="https://ankiweb.net/shared/info/2055492159" target="_blank" class="underline">AnkiConnect</a>
          add-on installed.
        </p>
      </div>

      <!-- ── AnkiWeb login ─────────────────────────────────────────────── -->
      <div v-if="isAnkiWeb" class="space-y-4">
        <div class="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-700">
          AnkiWeb syncs cards to the cloud — no local Anki required.
        </div>

        <!-- Already logged in -->
        <template v-if="loggedInEmail">
          <div class="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
            <div>
              <p class="text-sm font-medium text-gray-800">Logged in as</p>
              <p class="text-sm text-gray-500">{{ loggedInEmail }}</p>
            </div>
            <button
              type="button"
              class="text-sm text-red-500 hover:text-red-700"
              @click="logoutAnkiWeb"
            >
              Log out
            </button>
          </div>
        </template>

        <!-- Login form -->
        <template v-else>
          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">AnkiWeb Email</label>
              <input
                v-model="ankiWebEmail"
                type="email"
                autocomplete="username"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                v-model="ankiWebPassword"
                type="password"
                autocomplete="current-password"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="button"
              :disabled="loginStatus === 'loading' || !ankiWebEmail || !ankiWebPassword"
              class="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              @click="loginAnkiWeb"
            >
              {{ loginStatus === 'loading' ? 'Logging in…' : 'Log in to AnkiWeb' }}
            </button>
            <p v-if="loginError" class="text-sm text-red-600">{{ loginError }}</p>
          </div>
        </template>
      </div>

      <!-- ── Shared card defaults ──────────────────────────────────────── -->
      <hr class="border-gray-200" />
      <h2 class="text-base font-semibold text-gray-700">Card Defaults</h2>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Default Deck</label>
        <input
          v-model="settings.defaultDeck"
          type="text"
          class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Default"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Default Note Type</label>
        <input
          v-model="settings.defaultModel"
          type="text"
          class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Basic"
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
          @input="settings.defaultTags = ($event.target as HTMLInputElement).value
            .split(',').map(t => t.trim()).filter(Boolean)"
        />
      </div>

      <!-- ── Save ──────────────────────────────────────────────────────── -->
      <div class="flex items-center gap-3 pt-2">
        <button
          type="submit"
          class="py-2 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          Save
        </button>
        <span v-if="saved" class="text-sm text-green-600">Saved!</span>
      </div>
    </form>
  </div>
</template>
