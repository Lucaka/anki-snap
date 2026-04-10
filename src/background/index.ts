import type { Message, SnapSelection, Settings } from '@/shared/types'
import { DEFAULT_SETTINGS } from '@/shared/types'
import { createAnkiService, AnkiServiceError, type AnkiNote } from '@/shared/services/anki'

// ── Setup ─────────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'anki-snap',
    title: 'Snap to Anki',
    contexts: ['selection'],
  })
})

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS as unknown as Record<string, unknown>)
  return stored as unknown as Settings
}

async function createCard(text: string, sourceUrl: string, sourceTitle: string): Promise<number> {
  const settings = await getSettings()
  const service = createAnkiService(settings)

  const note: AnkiNote = {
    deckName: settings.defaultDeck,
    modelName: settings.defaultModel,
    fields: {
      Front: text,
      Back: `<a href="${sourceUrl}">${sourceTitle}</a>`,
    },
    tags: settings.defaultTags,
  }

  return service.addNote(note)
}

// ── Context menu ──────────────────────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'anki-snap' || !tab?.id) return

  const selection: SnapSelection = {
    text: info.selectionText ?? '',
    url: info.pageUrl ?? '',
    title: tab.title ?? '',
    timestamp: Date.now(),
  }

  try {
    await createCard(selection.text, selection.url, selection.title)
    // Notify the tab that the card was created
    await chrome.tabs.sendMessage(tab.id, {
      type: 'CREATE_CARD',
      payload: { success: true },
    } satisfies Message)
  } catch (err) {
    const message = err instanceof AnkiServiceError ? err.message : 'Unknown error'
    console.error('[background] failed to create card:', message)
    await chrome.tabs.sendMessage(tab.id, {
      type: 'CREATE_CARD',
      payload: { success: false, error: message },
    } satisfies Message)
  }
})

// ── Message bus ───────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (message: Message<SnapSelection>, _sender, sendResponse) => {
    if (message.type === 'SNAP_SELECTION' && message.payload) {
      const { text, url, title } = message.payload
      createCard(text, url, title)
        .then(noteId => sendResponse({ ok: true, noteId }))
        .catch((err: unknown) => {
          const error = err instanceof AnkiServiceError ? err.message : 'Unknown error'
          sendResponse({ ok: false, error })
        })
      return true // keep channel open for async response
    }
  },
)
