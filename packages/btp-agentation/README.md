# BTP Agentation

SAP BTP / Fiori Elements 用ビジュアルフィードバックツール

[![npm version](https://img.shields.io/npm/v/btp-agentation.svg)](https://www.npmjs.com/package/btp-agentation)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

> UI 要素をクリックして注記を追加し、構造化された Markdown で GitHub Copilot に送信できます。

## インストール

```bash
npm install btp-agentation
```

### npx で即座に使う

```bash
npx btp-agentation
```

## 使い方

### 1. ブックマークレット（推奨）

[公式ページ](https://pcmn1000.github.io/my-side-by-side-app/) からブックマークレットをブックマークバーにドラッグ&ドロップ。

### 2. script タグ

```html
<script src="https://pcmn1000.github.io/my-side-by-side-app/btp-agentation.js"></script>
```

### 3. DevTools コンソール

```javascript
var s=document.createElement('script');s.src='https://pcmn1000.github.io/my-side-by-side-app/btp-agentation.js';document.head.appendChild(s);
```

### 4. ローカルサーバー

```bash
npx btp-agentation --serve
```

### 5. Node.js から利用

```javascript
const btpAgentation = require('btp-agentation');

// script タグを取得
console.log(btpAgentation.getScriptTag());

// ブックマークレットコードを取得
console.log(btpAgentation.getBookmarklet());

// CDN URL を取得
console.log(btpAgentation.getCdnUrl());
```

## CLI オプション

| コマンド | 説明 |
|---------|------|
| `npx btp-agentation` | 使い方を表示 |
| `npx btp-agentation --script-tag` | `<script>` タグを出力 |
| `npx btp-agentation --bookmarklet` | ブックマークレットコードを出力 |
| `npx btp-agentation --console` | DevTools コンソール用コードを出力 |
| `npx btp-agentation --url` | CDN URL を出力 |
| `npx btp-agentation --serve [port]` | ローカルサーバーで起動（デフォルト: 3939） |

## 操作方法

1. **Ctrl+Shift+A** でツール起動
2. UI 要素を **クリック** して選択（または **テキストをドラッグ** で選択）
3. ポップオーバーで **注記を入力**
4. **コピーボタン** で構造化 Markdown をクリップボードにコピー
5. **VS Code** に切り替えて Copilot Chat に貼り付け

## 機能

- 🎯 **UI5 コントロール検出** — バインディング、プロパティ、親コントロールを自動識別
- 📝 **テキスト選択** — ドラッグで特定のテキストにフィードバック
- 🌙 **ダークテーマ** — 美しいダークモード UI
- 🤖 **Copilot 連携** — 構造化 Markdown で Copilot に直接送信
- 📊 **CDS アノテーション検出** — Fiori Elements コントロールを識別
- ⚡ **ゼロ依存** — SAPUI5 が読み込まれたページで即動作

## 動作環境

- SAP Fiori Elements
- SAPUI5 / OpenUI5
- SAP BTP
- SAP S/4HANA
- SAP Fiori Launchpad
- Chrome / Edge / Firefox

## ライセンス

MIT
