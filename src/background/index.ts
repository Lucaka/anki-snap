import type { Message, SnapSelection } from '@/shared/types'

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'anki-snap',
    title: 'Snap to Anki',
    contexts: ['selection'],
  })
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'anki-snap' || !tab?.id) return

  const selection: SnapSelection = {
    text: info.selectionText ?? '',
    url: info.pageUrl ?? '',
    title: tab.title ?? '',
    timestamp: Date.now(),
  }

  chrome.runtime.sendMessage<Message<SnapSelection>>({
    type: 'SNAP_SELECTION',
    payload: selection,
  })
})

chrome.runtime.onMessage.addListener(
  (message: Message, _sender, sendResponse) => {
    console.log('[background] received message:', message.type)
    sendResponse({ ok: true })
    return true
  },
)
