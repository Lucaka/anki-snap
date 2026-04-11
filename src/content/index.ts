import type { AnkiCardData, Message, Settings } from '@/shared/types'
import { DEFAULT_SETTINGS } from '@/shared/types'

// ==================== State ====================

let settings: Settings = { ...DEFAULT_SETTINGS }
let shadowRoot: ShadowRoot | null = null
let iconEl: HTMLElement | null = null
let panelEl: HTMLElement | null = null
let selectionTimer: ReturnType<typeof setTimeout> | null = null
let pendingText = ''
let currentCards: AnkiCardData[] = []
let selectedIndices = new Set<number>()

// ==================== Bootstrap ====================

async function init() {
  const stored = await chrome.storage.sync.get(Object.keys(DEFAULT_SETTINGS))
  settings = { ...DEFAULT_SETTINGS, ...(stored as Partial<Settings>) }

  const host = document.createElement('div')
  host.style.cssText =
    'all:initial;position:fixed;top:0;left:0;z-index:2147483647;pointer-events:none;'
  document.documentElement.appendChild(host)
  shadowRoot = host.attachShadow({ mode: 'open' })

  const style = document.createElement('style')
  style.textContent = STYLES
  shadowRoot.appendChild(style)

  document.addEventListener('mouseup', handleMouseUp)
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAll()
  })
  document.addEventListener('mousedown', handleDocumentMouseDown)

  chrome.storage.onChanged.addListener(changes => {
    for (const [k, { newValue }] of Object.entries(changes)) {
      if (k in settings) (settings as unknown as Record<string, unknown>)[k] = newValue
    }
  })
}

// ==================== Selection → Icon ====================

function handleMouseUp() {
  if (selectionTimer) clearTimeout(selectionTimer)
  selectionTimer = setTimeout(() => {
    const text = window.getSelection()?.toString().trim() ?? ''
    if (text && settings.showFloatingIcon) {
      pendingText = text
      placeIcon()
    } else if (!text) {
      hideIcon()
    }
  }, 300)
}

function placeIcon() {
  const sel = window.getSelection()
  if (!sel?.rangeCount) return
  const rect = sel.getRangeAt(0).getBoundingClientRect()

  const S = 32
  const M = 8
  let x = rect.right + 6
  let y = rect.bottom + 6
  if (x + S > window.innerWidth - M) x = rect.left - S - M
  if (y + S > window.innerHeight - M) y = rect.top - S - M

  if (!iconEl) {
    iconEl = document.createElement('button')
    iconEl.className = 'as-icon'
    iconEl.title = '點擊生成 Anki 卡片'
    iconEl.innerHTML = ICON_SVG
    iconEl.addEventListener('click', onIconClick)
    shadowRoot!.appendChild(iconEl)
  }

  iconEl.style.cssText = `left:${x}px;top:${y}px;display:flex;pointer-events:auto;`
}

function hideIcon() {
  if (iconEl) iconEl.style.display = 'none'
}

// ==================== Icon → Panel ====================

function onIconClick() {
  const text = pendingText
  hideIcon()
  openPanel(text)
}

// ==================== Panel ====================

function openPanel(text: string) {
  if (!shadowRoot) return
  pendingText = text
  currentCards = []
  selectedIndices = new Set()

  const sel = window.getSelection()
  let x = window.innerWidth - 404
  let y = 80
  if (sel?.rangeCount) {
    const r = sel.getRangeAt(0).getBoundingClientRect()
    x = clamp(r.left, 16, window.innerWidth - 404)
    y = r.bottom + 12
    if (y + 460 > window.innerHeight) y = Math.max(16, r.top - 472)
  }

  if (panelEl) panelEl.remove()
  panelEl = document.createElement('div')
  panelEl.className = 'as-panel'
  panelEl.style.cssText = `left:${x}px;top:${y}px;pointer-events:auto;`
  panelEl.innerHTML = PANEL_SHELL
  panelEl.querySelector('.as-close')!.addEventListener('click', closeAll)
  shadowRoot.appendChild(panelEl)

  showLoading()
  fetchCards(text)
}

// ==================== Panel states ====================

function getBody(): HTMLElement | null {
  return panelEl?.querySelector<HTMLElement>('.as-body') ?? null
}

function showLoading() {
  const b = getBody()
  if (b) b.innerHTML = `<div class="as-loading"><div class="as-spinner"></div><span>正在生成卡片...</span></div>`
}

function showError(msg: string, isAuth: boolean) {
  const b = getBody()
  if (!b) return
  b.innerHTML = `
    <div class="as-error">
      <p class="as-error-msg">${esc(msg)}</p>
      <div class="as-error-btns">
        <button class="as-retry">重試</button>
        ${isAuth ? '<button class="as-go-settings">設定 API Key</button>' : ''}
      </div>
    </div>`
  b.querySelector('.as-retry')?.addEventListener('click', () => {
    showLoading()
    fetchCards(pendingText)
  })
  b.querySelector('.as-go-settings')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' })
  })
}

function showCards(cards: AnkiCardData[]) {
  currentCards = cards
  selectedIndices = new Set(cards.map((_, i) => i))

  const b = getBody()
  if (!b) return
  b.innerHTML = ''

  cards.forEach((card, i) => {
    const el = document.createElement('div')
    el.className = 'as-card'
    el.innerHTML = `
      <label class="as-card-label">
        <input type="checkbox" class="as-cb" data-i="${i}" checked />
        <div class="as-card-info">
          <div class="as-front">${esc(card.front)}</div>
          <div class="as-back">${esc(card.back)}</div>
          ${card.example ? `<div class="as-ex">例句：${esc(card.example)}</div>` : ''}
          ${card.related ? `<div class="as-rel">同家族：${esc(card.related)}</div>` : ''}
        </div>
      </label>`
    el.querySelector('.as-cb')?.addEventListener('change', e => {
      const cb = e.target as HTMLInputElement
      cb.checked ? selectedIndices.add(i) : selectedIndices.delete(i)
      updateFooter()
    })
    b.appendChild(el)
  })

  const footer = panelEl?.querySelector<HTMLElement>('.as-footer')
  if (footer) footer.style.display = 'flex'
  updateFooter()
}

function updateFooter() {
  const count = panelEl?.querySelector('.as-count')
  if (count) count.textContent = `已選 ${selectedIndices.size} / ${currentCards.length} 張`
  const btn = panelEl?.querySelector<HTMLButtonElement>('.as-add-btn')
  if (btn) btn.disabled = selectedIndices.size === 0
}

// ==================== OpenAI via background ====================

async function fetchCards(text: string) {
  try {
    const resp = (await chrome.runtime.sendMessage({
      type: 'GENERATE_CARDS',
      payload: { text, settings },
    })) as { ok: boolean; cards?: AnkiCardData[]; error?: string; status?: number }

    if (!resp?.ok) {
      showError(resp?.error ?? '生成失敗，請稍後再試', resp?.status === 401)
      return
    }
    showCards(resp.cards ?? [])
  } catch {
    showError('連線失敗，請稍後再試', false)
  }
}

// ==================== Close ====================

function closeAll() {
  hideIcon()
  panelEl?.remove()
  panelEl = null
}

function handleDocumentMouseDown(e: MouseEvent) {
  if (!panelEl) return
  const path = e.composedPath()
  if (!path.includes(panelEl as EventTarget) && !path.includes(iconEl as EventTarget)) {
    closeAll()
  }
}

// ==================== Message listener (context menu / popup) ====================

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  if (message.type === 'SHOW_SNAP_PANEL') {
    const text =
      (message.payload as { text?: string } | undefined)?.text ||
      window.getSelection()?.toString().trim() ||
      ''
    if (text) openPanel(text)
    sendResponse({ ok: true })
    return true
  }
  sendResponse({ ok: true })
  return true
})

// ==================== Utils ====================

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ==================== Templates ====================

const ICON_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`

const PANEL_SHELL = `
<div class="as-header">
  <span class="as-title">Anki 卡片預覽</span>
  <button class="as-close" title="關閉">✕</button>
</div>
<div class="as-body"></div>
<div class="as-footer" style="display:none">
  <span class="as-count"></span>
  <button class="as-add-btn" disabled>加入 Anki（即將支援）</button>
</div>`

const STYLES = `
*, *::before, *::after { box-sizing: border-box; }

/* ── Floating Icon ─────────────────────────────── */
.as-icon {
  position: fixed;
  display: none;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #2563eb;
  border: none;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.28);
  transition: transform 0.15s, box-shadow 0.15s;
  padding: 0;
}
.as-icon:hover {
  transform: scale(1.12);
  box-shadow: 0 4px 14px rgba(0,0,0,0.36);
}

/* ── Panel ─────────────────────────────────────── */
.as-panel {
  position: fixed;
  width: 388px;
  max-height: 480px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 14px;
  color: #111827;
}

.as-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 14px;
  border-bottom: 1px solid #f0f0f0;
  background: #f9fafb;
  flex-shrink: 0;
}
.as-title {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}
.as-close {
  background: none;
  border: none;
  cursor: pointer;
  color: #9ca3af;
  font-size: 13px;
  padding: 2px 5px;
  border-radius: 4px;
  line-height: 1;
  transition: background 0.1s, color 0.1s;
}
.as-close:hover {
  background: #e5e7eb;
  color: #374151;
}

.as-body {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}
.as-body::-webkit-scrollbar { width: 4px; }
.as-body::-webkit-scrollbar-track { background: transparent; }
.as-body::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }

.as-footer {
  align-items: center;
  justify-content: space-between;
  padding: 9px 14px;
  border-top: 1px solid #f0f0f0;
  background: #f9fafb;
  flex-shrink: 0;
}
.as-count {
  font-size: 12px;
  color: #6b7280;
}
.as-add-btn {
  padding: 6px 14px;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}
.as-add-btn:not(:disabled):hover { background: #1d4ed8; }
.as-add-btn:disabled { opacity: 0.45; cursor: not-allowed; }

/* ── Loading ───────────────────────────────────── */
.as-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 28px 16px;
  color: #6b7280;
  font-size: 13px;
}
.as-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid #e5e7eb;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: as-spin 0.65s linear infinite;
  flex-shrink: 0;
}
@keyframes as-spin { to { transform: rotate(360deg); } }

/* ── Error ─────────────────────────────────────── */
.as-error { padding: 16px; }
.as-error-msg {
  font-size: 13px;
  color: #dc2626;
  margin: 0 0 12px;
  line-height: 1.5;
}
.as-error-btns { display: flex; gap: 8px; flex-wrap: wrap; }
.as-retry, .as-go-settings {
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid;
  transition: opacity 0.15s;
}
.as-retry:hover, .as-go-settings:hover { opacity: 0.8; }
.as-retry { background: #2563eb; color: #fff; border-color: #2563eb; }
.as-go-settings { background: #fff; color: #374151; border-color: #d1d5db; }

/* ── Cards ─────────────────────────────────────── */
.as-card {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 7px;
  overflow: hidden;
}
.as-card:last-child { margin-bottom: 0; }
.as-card-label {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 11px 12px;
  cursor: pointer;
}
.as-cb {
  margin-top: 3px;
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  cursor: pointer;
  accent-color: #2563eb;
}
.as-card-info { flex: 1; min-width: 0; }
.as-front {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 2px;
}
.as-back {
  font-size: 13px;
  color: #374151;
  margin-bottom: 3px;
}
.as-ex, .as-rel {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
  line-height: 1.5;
}
`

// ==================== Start ====================
init()
