import type { Message, SnapSelection } from '@/shared/types'

// ── Message handler ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (message: Message, _sender, sendResponse) => {
    if (message.type === 'SNAP_SELECTION') {
      const selection = buildSelection()
      sendResponse(selection)
    }
    return true
  },
)

// ── Keyboard shortcut: Ctrl/Cmd + Shift + S ───────────────────────────────────

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
    const selection = buildSelection()
    if (!selection.text) return

    chrome.runtime.sendMessage<Message<SnapSelection>>({
      type: 'SNAP_SELECTION',
      payload: selection,
    })
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildSelection(): SnapSelection {
  return {
    text: window.getSelection()?.toString().trim() ?? '',
    url: location.href,
    title: document.title,
    timestamp: Date.now(),
  }
}
