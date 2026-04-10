# Anki Snap

一個 Chrome 瀏覽器擴充功能，讓你直接從網頁選取文字，一鍵建立 Anki 單字卡。

## 功能

- **右鍵選單**：選取文字後右鍵，點選「Snap to Anki」即可建立卡片
- **鍵盤快捷鍵**：選取文字後按 `Ctrl+Shift+S`（Mac 為 `Cmd+Shift+S`）快速 snap
- **擴充功能彈出視窗**：點選工具列圖示，手動觸發 Snap
- **設定頁面**：自訂 AnkiConnect 網址、預設牌組與預設標籤

## 前置需求

- [Anki](https://apps.ankiweb.net/) 桌面應用程式（需在背景執行）
- [AnkiConnect](https://ankiweb.net/shared/info/2055492159) 插件（預設監聽 `http://localhost:8765`）

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

| 技術 | 用途 |
|------|------|
| [Vue 3](https://vuejs.org/) | UI 框架（Popup、Options 頁面） |
| [TypeScript](https://www.typescriptlang.org/) | 型別安全 |
| [Vite](https://vitejs.dev/) + [CRXJS](https://crxjs.dev/) | 建置工具與擴充功能熱更新 |
| [Tailwind CSS](https://tailwindcss.com/) | 樣式 |
| [Vitest](https://vitest.dev/) | 單元測試 |
| Manifest V3 | Chrome 擴充功能規範 |

## 專案結構

```
src/
├── background/     # Service Worker（右鍵選單事件處理）
├── content/        # Content Script（鍵盤快捷鍵、頁面互動）
├── popup/          # 擴充功能彈出視窗
├── options/        # 設定頁面
└── shared/         # 共用型別與常數
```

## 設定

透過擴充功能設定頁面可調整以下選項：

| 設定 | 預設值 | 說明 |
|------|--------|------|
| AnkiConnect URL | `http://localhost:8765` | AnkiConnect 服務位址 |
| 預設牌組 | `Default` | 新卡片加入的牌組 |
| 預設標籤 | （無） | 每張卡片自動套用的標籤 |
