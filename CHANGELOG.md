# Changelog

## [1.2.1](https://github.com/Lucaka/anki-snap/compare/anki-snap-v1.2.0...anki-snap-v1.2.1) (2026-04-13)


### 🛠 Code Refactoring

* [Gemini] 改用 @google/genai SDK 取代手動 fetch ([055512f](https://github.com/Lucaka/anki-snap/commit/055512f969313eeb40f7fd1c1becddee4fa5b96a))

## [1.2.0](https://github.com/Lucaka/anki-snap/compare/anki-snap-v1.1.5...anki-snap-v1.2.0) (2026-04-13)


### ✨ New Features

* [Gemini] - 新增 Gemma 4 ([#10](https://github.com/Lucaka/anki-snap/issues/10)) ([62f71fb](https://github.com/Lucaka/anki-snap/commit/62f71fbdbf20f75d23e39c8569d20754dc49defb))
* [Gemini] - 新增 Gemma 4 ([#10](https://github.com/Lucaka/anki-snap/issues/10)) ([d1a24d6](https://github.com/Lucaka/anki-snap/commit/d1a24d6b7eb75c140140b0f13f39f85a5933bee1))

## [1.1.5](https://github.com/Lucaka/anki-snap/compare/anki-snap-v1.1.4...anki-snap-v1.1.5) (2026-04-12)


### 🐛 Bug Fixes

* 修正 background 無法正常執行的問題 ([7abea45](https://github.com/Lucaka/anki-snap/commit/7abea45aa404ce15f4932c86d83d9928fe44fa79))

## [1.1.4](https://github.com/Lucaka/anki-snap/compare/anki-snap-v1.1.3...anki-snap-v1.1.4) (2026-04-12)


### 🛠 Code Refactoring

* 更新 package-lock ([2cec091](https://github.com/Lucaka/anki-snap/commit/2cec09110d30cd4d1cce55d80a024743eea1ad1a))

## [1.1.3](https://github.com/Lucaka/anki-snap/compare/anki-snap-v1.1.2...anki-snap-v1.1.3) (2026-04-12)


### 🛠 Code Refactoring

* 調整 npm 版本 ([e5faaa5](https://github.com/Lucaka/anki-snap/commit/e5faaa5683a83eb3937ca7b94a72284a9122bfc7))

## [1.1.2](https://github.com/Lucaka/anki-snap/compare/anki-snap-v1.1.1...anki-snap-v1.1.2) (2026-04-12)


### 🛠 Code Refactoring

* action 更新至 npm 11 ([e186e2f](https://github.com/Lucaka/anki-snap/commit/e186e2f769dd69e3a959f531a6097cf9955ec29f))

## [1.1.1](https://github.com/Lucaka/anki-snap/compare/anki-snap-v1.1.0...anki-snap-v1.1.1) (2026-04-12)


### 🐛 Bug Fixes

* 移除 monorepo-tags ([da05fba](https://github.com/Lucaka/anki-snap/commit/da05fba37d386b85fea2bd6ed44a23e69ebeac0b))


### 🛠 Code Refactoring

* 調整 release-please 格式 ([634601b](https://github.com/Lucaka/anki-snap/commit/634601b9852da84e5e2cb2a489a422bc3b44ea78))


### 🔧 Maintenance

* **main:** release 1.1.1 ([7389640](https://github.com/Lucaka/anki-snap/commit/7389640e24750a4a41b78f2c923a2b0374f49f37))
* **main:** release 1.1.1 ([e1c793e](https://github.com/Lucaka/anki-snap/commit/e1c793edd55a1b86c4f7d1c02f7261598f3b88dd))
* 更新 package-lock ([62489a3](https://github.com/Lucaka/anki-snap/commit/62489a3fd3a251c152405fc980b2510d8951257d))
* 移除 release-type: node ([3afa755](https://github.com/Lucaka/anki-snap/commit/3afa75591d276b6e570e81548368a100eddc8198))

## [1.1.1](https://github.com/Lucaka/anki-snap/compare/v1.1.0...v1.1.1) (2026-04-12)


### Bug Fixes

* 移除 monorepo-tags ([da05fba](https://github.com/Lucaka/anki-snap/commit/da05fba37d386b85fea2bd6ed44a23e69ebeac0b))

## [1.1.0](https://github.com/Lucaka/anki-snap/compare/v1.0.0...v1.1.0) (2026-04-12)


### Features

* 更新 icon ([6c49a6e](https://github.com/Lucaka/anki-snap/commit/6c49a6e4ff0fb412d35199d24076a62031aad6eb))

## 1.0.0 (2026-04-12)


### Features

* [AI] - 新增 Gemini ([0031f20](https://github.com/Lucaka/anki-snap/commit/0031f20a6eb5b6cd38101e34679ec59e89530185))
* [Base] - 建立卡片前增加詳細資訊 ([f4b8155](https://github.com/Lucaka/anki-snap/commit/f4b815545bf9bd2f3770b2441d0af679b089bbd6))
* 新增anki卡片欄位 (ankiModelName, ankiFrontField, ankiBackField) ([197b64a](https://github.com/Lucaka/anki-snap/commit/197b64ae1b760410a324b43ae39042fef16122bd))
* 更新 README.md ([9c4aa90](https://github.com/Lucaka/anki-snap/commit/9c4aa902a975d654d36aeb69e5b259816a26c4d0))
* 更新github action token ([534d891](https://github.com/Lucaka/anki-snap/commit/534d891e9b653e4fea8d86f1e85bae7c1eee0bc4))


### Bug Fixes

* 修正vue陣列無法正常儲存的問題 ([4c6329f](https://github.com/Lucaka/anki-snap/commit/4c6329f36fca9babf667d518b352cd2036867610))
* 透過 background 代理 AnkiConnect 請求以解決 content script 跨域限制 ([338417e](https://github.com/Lucaka/anki-snap/commit/338417e11a3eaa2abb33fb06ba3af5a9de78899d))
