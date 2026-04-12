# Anki Snap

一個 Chrome 瀏覽器擴充功能，讓你直接從網頁選取文字，透過 AI 自動生成 Anki 單字卡並一鍵加入。

## 功能

- **浮動圖示**：選取網頁文字後，游標附近會出現閃電圖示，點擊後開啟 Snap 面板（可在設定關閉）
- **右鍵選單**：選取文字後右鍵，點選「Snap to Anki」開啟 Snap 面板
- **擴充功能彈出視窗**：點選工具列圖示，手動觸發 Snap
- **設定頁面**：自訂 AI 服務、AnkiConnect 網址、預設牌組與預設標籤

### Snap 面板互動

1. 開啟後 AI 自動分析選取文字並生成卡片（顯示正面、翻譯、例句、相關詞）
2. 以核取方塊選擇要加入的卡片，底部顯示「已選 X / Y 張」
3. 點「加入 Anki」後自動加入，按鈕顯示「已加入 X 張」並在 1.2 秒後關閉面板
4. 若有失敗，顯示失敗筆數並提供重試選項

## AI 自動生成卡片

選取文字後，擴充功能會將內容送至你選擇的 AI 服務（OpenAI 或 Google Gemini），AI 會自動生成包含以下欄位的卡片：

- **正面**：單字或詞彙
- **背面**：翻譯
- **例句**：情境例句
- **相關詞**：延伸詞彙

卡片會以你在設定中指定的目標語言生成，預設為繁體中文。

## 前置需求

- [Anki](https://apps.ankiweb.net/) 桌面應用程式（需在背景執行）
- [AnkiConnect](https://ankiweb.net/shared/info/2055492159) 插件（預設監聽 `http://localhost:8765`）
- AI API Key（擇一申請）：
  - [OpenAI Platform](https://platform.openai.com/api-keys)（使用 GPT 模型）
  - [Google AI Studio](https://aistudio.google.com/app/apikey)（使用 Gemini 模型）

## 開發環境設定

### 安裝依賴

```bash
npm install
```

### 開發模式（含 HMR）

```bash
npm run dev
```

### 建置正式版本

```bash
npm run build
```

建置產物會輸出至 `dist/` 資料夾。

### 執行測試

```bash
npm test
```

## 載入擴充功能

1. 執行 `npm run build` 產生 `dist/` 資料夾
2. 開啟 Chrome，前往 `chrome://extensions/`
3. 開啟右上角的「開發人員模式」
4. 點選「載入未封裝項目」，選取 `dist/` 資料夾

## 技術架構

| 技術                                                      | 用途                           |
| --------------------------------------------------------- | ------------------------------ |
| [Vue 3](https://vuejs.org/)                               | UI 框架（Popup、Options 頁面） |
| [TypeScript](https://www.typescriptlang.org/)             | 型別安全                       |
| [Vite](https://vitejs.dev/) + [CRXJS](https://crxjs.dev/) | 建置工具與擴充功能熱更新       |
| [Tailwind CSS](https://tailwindcss.com/)                  | 樣式                           |
| [Vitest](https://vitest.dev/)                             | 單元測試                       |
| OpenAI API / Google Gemini API                            | AI 卡片內容生成                |
| Manifest V3                                               | Chrome 擴充功能規範            |

## 專案結構

```
src/
├── background/     # Service Worker（右鍵選單事件處理、AnkiConnect 代理）
├── content/        # Content Script（浮動圖示、Snap 面板、頁面互動）
├── popup/          # 擴充功能彈出視窗
├── options/        # 設定頁面
└── shared/         # 共用型別與常數
```

## 設定

透過擴充功能設定頁面可調整以下選項：

### AI 服務

| 設定          | 預設值            | 說明                                         |
| ------------- | ----------------- | -------------------------------------------- |
| AI 服務       | `OpenAI`          | 選擇 OpenAI 或 Google Gemini                 |
| API Key       | （無）            | 對應服務的 API Key                           |
| 模型          | `gpt-4o-mini`     | OpenAI 預設；Gemini 預設為 `gemini-2.5-flash` |
| 目標語言      | `繁體中文`        | 卡片生成的語言（共 8 種語言可選）            |

### 介面

| 設定              | 預設值  | 說明                                 |
| ----------------- | ------- | ------------------------------------ |
| 顯示浮動圖示      | 開啟    | 選取文字後是否顯示閃電浮動圖示       |

### Anki（進階）

| 設定              | 預設值                  | 說明                     |
| ----------------- | ----------------------- | ------------------------ |
| AnkiConnect URL   | `http://localhost:8765` | AnkiConnect 服務位址     |
| 預設牌組          | `預設`                  | 新卡片加入的牌組         |
| 預設標籤          | （無）                  | 每張卡片自動套用的標籤   |
| 筆記類型          | `基本型`                | Anki 筆記類型名稱        |
| 正面欄位名稱      | `正面`                  | 對應筆記類型的正面欄位   |
| 背面欄位名稱      | `背面`                  | 對應筆記類型的背面欄位   |

> **注意：** 筆記類型、正面欄位名稱、背面欄位名稱會依 **Anki Desktop 的語系**不同而有所差異。請開啟 Anki → 工具 → 管理筆記類型，確認你的欄位名稱後再填入設定。
