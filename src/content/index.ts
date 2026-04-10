import type { Message } from '@/shared/types'

chrome.runtime.onMessage.addListener(
  (message: Message, _sender, sendResponse) => {
    console.log('[content] received message:', message.type)
    sendResponse({ ok: true })
    return true
  },
)

function getSelectedText(): string {
  return window.getSelection()?.toString().trim() ?? ''
}

document.addEventListener('keydown', (e) => {
  // Ctrl+Shift+S (or Cmd+Shift+S on Mac) to snap selection
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
    const text = getSelectedText()
    if (!text) return

    chrome.runtime.sendMessage<Message<{ text: string }>>({
      type: 'SNAP_SELECTION',
      payload: { text },
    })
  }
})
