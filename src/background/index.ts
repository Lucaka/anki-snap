import type { AnkiCardData, Message, Settings } from '@/shared/types'

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'anki-snap',
    title: 'Snap to Anki',
    contexts: ['selection'],
  })
})

// Context menu → trigger panel in content script
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'anki-snap' || !tab?.id) return
  const text = info.selectionText ?? ''
  if (!text) return

  await chrome.tabs.sendMessage(tab.id, {
    type: 'SHOW_SNAP_PANEL',
    payload: { text },
  })
})

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  if (message.type === 'GENERATE_CARDS') {
    const { text, settings } = message.payload as { text: string; settings: Settings }
    handleGenerateCards(text, settings)
      .then(cards => sendResponse({ ok: true, cards }))
      .catch((err: Error & { status?: number }) =>
        sendResponse({ ok: false, error: err.message, status: err.status }),
      )
    return true // keep channel open for async response
  }

  if (message.type === 'OPEN_OPTIONS') {
    chrome.runtime.openOptionsPage()
    sendResponse({ ok: true })
    return true
  }

  sendResponse({ ok: true })
  return true
})

async function handleGenerateCards(text: string, settings: Settings): Promise<AnkiCardData[]> {
  if (!settings.openaiApiKey) {
    const err = Object.assign(new Error('未設定 OpenAI API Key，請前往設定頁面'), { status: 401 })
    throw err
  }

  const lang = settings.targetLanguage || '繁體中文'
  const systemPrompt = `你是一個 Anki 單字卡片生成器。根據用戶輸入的文字，生成單字學習卡片。

規則：
- 若輸入是單一單字或短片語：生成一張卡片
- 若輸入是句子或多個單字：提取每個重要單字，各生成一張卡片

每張卡片以 JSON 物件表示，包含以下欄位：
- front：單字（原形）
- back：詞性 / ${lang}翻譯（例如：動詞 / 抵抗、抗拒）
- example：自然的例句（使用單字的原文句子）
- related：相關字形（例如：resistant（形容詞）），若無則為空字串

只回傳 JSON 陣列，不要 markdown code block，不要任何說明文字。`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.openaiApiKey}`,
    },
    body: JSON.stringify({
      model: settings.openaiModel || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      temperature: 0.3,
    }),
  })

  if (!response.ok) {
    const msg = response.status === 401 ? '無效的 API Key，請至設定頁面更新' : `OpenAI API 錯誤（${response.status}）`
    throw Object.assign(new Error(msg), { status: response.status })
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>
  }
  const content = data.choices[0]?.message?.content ?? '[]'

  try {
    return JSON.parse(content) as AnkiCardData[]
  } catch {
    throw Object.assign(new Error('無法解析 API 回應，請重試'), { status: 500 })
  }
}
