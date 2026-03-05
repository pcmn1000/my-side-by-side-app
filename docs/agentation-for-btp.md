# BTP 開発における Agentation の適用

> [Agentation](https://benji.org/agentation) のコンセプト「UI を視覚的にポイント → 構造化フィードバック → AI エージェントで修正」を **SAP BTP / Fiori Elements** 開発に適用する3つのアプローチ。

---

## 目次

- [背景: Agentation とは](#背景-agentation-とは)
- [アプローチ 1: Fiori Agentation ツール（自作オーバーレイ）](#アプローチ-1-fiori-agentation-ツール自作オーバーレイ)
- [アプローチ 2: Chrome DevTools + 構造化フィードバック](#アプローチ-2-chrome-devtools--構造化フィードバック)
- [アプローチ 3: UI5 Inspector + AI フィードバック](#アプローチ-3-ui5-inspector--ai-フィードバック)
- [比較表](#比較表)
- [BTP/Fiori 固有の考慮事項](#btpfiori-固有の考慮事項)
- [ベストプラクティス: ハイブリッドワークフロー](#ベストプラクティス-ハイブリッドワークフロー)

---

## 背景: Agentation とは

[Agentation](https://agentation.dev/) は、AI コーディングエージェント向けの **ビジュアルフィードバックツール** です。

```
従来のワークフロー:
  ① 画面を見る → ② 「ボタンの色を変えて」と言葉で伝える → ③ AI が推測で修正

Agentation ワークフロー:
  ① 画面を見る → ② 要素をクリック → ③ セレクタ+位置+コンテキストを構造化出力
  → ④ AI に貼り付け → ⑤ AI が正確に修正
```

### 核心原理

| 原理 | 説明 |
|-----|------|
| **ポインティング > 説明** | 「3番目のボタン」より `button.submit-btn` が正確 |
| **コンテキスト量の調整** | 問題の複雑さに応じて Compact → Forensic を切替 |
| **ベストショット** | ワンショットではなく、各パスの精度を最大化する |

### BTP/Fiori での課題

Agentation は **React コンポーネント** として提供されており、SAPUI5/Fiori Elements にはそのまま使えません。
しかし、同じコンセプトを以下の3つの方法で BTP 開発に適用できます。

---

## アプローチ 1: Fiori Agentation ツール（自作オーバーレイ）

### 概要

素の JavaScript で Agentation ライクなオーバーレイを実装し、**UI5 コントロール情報**を含む構造化出力を生成します。

### セットアップ

`app/suppliers/webapp/fiori-agentation.js` が既に実装済みです。

```html
<!-- index.html に追加 -->
<script src="fiori-agentation.js"></script>
```

### 使い方

| 操作 | 説明 |
|------|------|
| `Ctrl+Shift+A` | ツールバーの表示/非表示 |
| 🖱 **クリックモード** | 要素をクリックしてアノテーション |
| 📝 **テキストモード** | テキストを選択してアノテーション |
| 🔲 **エリアモード** | ドラッグで矩形領域を選択 |
| 📋 **コピー** | 構造化 Markdown をクリップボードにコピー |

### 出力例

```markdown
# Fiori UI フィードバック

**アプリ**: サプライヤー評価ポータル
**URL**: https://...approuter.cfapps.ap21.hana.ondemand.com/suppliers/webapp/index.html
**UI5 バージョン**: 1.120.25

## 1. 総合スコアの列幅が狭い

**セレクタ**: `td.sapMListTblCell > span`
**UI5 コントロール**: `sap.m.Text`
**コントロール ID**: `...suppliers::SuppliersList-innerTable-rows-row0-cells-cell4`
**バインディング**: `{"text": ["overallScore"]}`
**Fiori Elements コントロール**: はい（CDS アノテーションで制御）

> 💡 このコントロールは Fiori Elements が CDS アノテーション (`annotations.cds`) から自動生成しています。
> 修正する場合は `@UI.LineItem`, `@UI.FieldGroup`, `@UI.HeaderInfo` 等のアノテーションを変更してください。
```

### 出力詳細度

| レベル | 内容 | 用途 |
|--------|------|------|
| **Compact** | セレクタ + コメントのみ | タイポ修正、簡単な調整 |
| **Standard** | + 位置 + UI5 コントロール情報 | 通常の UI 修正 |
| **Detailed** | + DOM パス + バウンディングボックス | レイアウト問題 |
| **Forensic** | + コンピューテッドスタイル (CSS) | アニメーション・スタイル問題 |

### Fiori Elements 固有の強み

本家 Agentation にはない、BTP 開発向けの特徴：

```
一般的な Web アプリ:            Fiori Elements:
┌──────────────────┐          ┌──────────────────┐
│ CSS セレクタ      │          │ CSS セレクタ      │
│ DOM パス          │          │ DOM パス          │
│ コンピューテッド   │          │ コンピューテッド   │
│ スタイル          │    +     │ スタイル          │
│                  │          │ UI5 コントロール型 │ ← 追加
│                  │          │ バインディング情報  │ ← 追加
│                  │          │ CDS アノテーション  │ ← 追加
│                  │          │ ヒント             │ ← 追加
└──────────────────┘          └──────────────────┘
```

### 本番デプロイ時の除外

```yaml
# mta.yaml — build-parameters で除外
- name: my-side-by-side-app-suppliers
  build-parameters:
    ignore:
      - "fiori-agentation.js"  # 開発ツールを含めない
```

---

## アプローチ 2: Chrome DevTools + 構造化フィードバック

### 概要

コードをインストールせずに、**Chrome DevTools** と **テンプレート** の組み合わせで Agentation ワークフローを実現します。

### ワークフロー

```
① Chrome DevTools を開く (F12)
② Elements タブで要素を選択 (Ctrl+Shift+C)
③ Console で以下のスニペットを実行
④ 出力を Copilot Chat に貼り付け
```

### DevTools Console スニペット

以下を Chrome DevTools の Console に貼り付けて使います：

```javascript
// Chrome DevTools Console 用 — 選択した要素の Fiori 情報を取得
(function() {
    var el = $0;  // DevTools で選択中の要素
    if (!el) { console.log("❌ 要素を選択してください"); return; }

    var info = ["## DevTools フィードバック\n"];
    
    // CSS セレクタ
    info.push("**要素**: `" + el.tagName.toLowerCase() + 
              (el.className ? "." + el.className.split(" ").slice(0,3).join(".") : "") + "`");
    
    // テキスト内容
    var text = el.textContent.trim().slice(0, 100);
    if (text) info.push("**テキスト**: \"" + text + "\"");

    // UI5 コントロール
    var ui5El = el;
    var ctrl = null;
    while (ui5El && !ctrl) {
        if (ui5El.id && sap.ui.getCore().byId(ui5El.id)) {
            ctrl = sap.ui.getCore().byId(ui5El.id);
        }
        ui5El = ui5El.parentElement;
    }
    
    if (ctrl) {
        info.push("**UI5 Control**: `" + ctrl.getMetadata().getName() + "`");
        info.push("**Control ID**: `" + ctrl.getId() + "`");
        
        // バインディング
        var bi = ctrl.mBindingInfos || {};
        Object.keys(bi).forEach(function(k) {
            if (bi[k].parts) {
                info.push("**Binding [" + k + "]**: `" + bi[k].parts.map(p => p.path).join(", ") + "`");
            }
        });
        
        // 親 
        var parent = ctrl.getParent();
        if (parent) info.push("**Parent**: `" + parent.getMetadata().getName() + "`");
    }
    
    // バウンディングボックス
    var rect = el.getBoundingClientRect();
    info.push("**Position**: " + Math.round(rect.x) + "," + Math.round(rect.y) + 
              " (" + Math.round(rect.width) + "x" + Math.round(rect.height) + ")");

    var output = info.join("\n");
    copy(output);  // クリップボードにコピー
    console.log("✅ コピーしました:\n" + output);
})();
```

### 使い方の流れ

```
1. F12 → Elements タブ
2. Ctrl+Shift+C → 画面上の要素をクリック
3. Console タブに切替
4. 上記スニペットを実行（Snippets に保存しておくと便利）
5. 出力が自動的にクリップボードにコピーされる
6. VS Code の Copilot Chat に貼り付け
7. 「このコントロールの〇〇を修正して」と指示
```

### メリット / デメリット

| メリット | デメリット |
|---------|-----------|
| コード変更不要 | 毎回 DevTools を開く必要がある |
| どのアプリでも使える | スニペットの実行が手間 |
| DOM の詳細が見れる | アノテーション（メモ）機能がない |

---

## アプローチ 3: UI5 Inspector + AI フィードバック

### 概要

SAP 公式の **UI5 Inspector** Chrome 拡張を使い、コントロールツリーとプロパティを取得して AI にフィードバックします。

### セットアップ

1. Chrome Web Store で **[UI5 Inspector](https://chrome.google.com/webstore/detail/ui5-inspector/bebecogbafbighhaildooiibipcnbngo)** をインストール
2. Fiori アプリを開く
3. F12 → **UI5** タブが追加される

### UI5 Inspector で取得できる情報

```
┌──────────────────────────────────────────────────────────────┐
│  UI5 Inspector                                                │
│  ┌─────────────────────┐  ┌────────────────────────────────┐ │
│  │  Control Tree        │  │  Properties                    │ │
│  │                      │  │                                │ │
│  │  ▼ Shell             │  │  text: "Taiwan Optics Corp."   │ │
│  │    ▼ ComponentCont.  │  │  visible: true                 │ │
│  │      ▼ XMLView       │  │  wrapping: false               │ │
│  │        ▼ Page        │  │                                │ │
│  │          ▼ Table     │  │  ── Bindings ──                │ │
│  │            ▼ Column  │  │  text: {path: 'name'}          │ │
│  │              Text ◀──│──│  model: undefined (default)    │ │
│  │            ▼ Column  │  │                                │ │
│  │              Text    │  │  ── Control ──                 │ │
│  │            ...       │  │  ID: ...suppliers::Supplier... │ │
│  └─────────────────────┘  │  Type: sap.m.Text              │ │
│                            └────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### AI フィードバックテンプレート

UI5 Inspector で情報を確認し、以下のテンプレートに貼り付けて Copilot に渡します：

```markdown
## UI5 Inspector フィードバック

**コントロール**: sap.m.Text
**ID**: __xmlview0--suppliers::SuppliersList-innerTable-rows-row0-cells-cell1
**バインディング**: text → {path: 'name'}
**親**: sap.m.ColumnListItem

### 修正要望
このカラムのテキストを太字にしたい。
Fiori Elements の annotations.cds でどう設定すればよいか教えてください。
```

### 活用パターン

| パターン | UI5 Inspector の使い方 | AI への指示例 |
|---------|----------------------|-------------|
| **プロパティ調査** | コントロールのプロパティタブを確認 | 「この Text コントロールの wrapping を true にしたい」 |
| **バインディング確認** | Binding タブでモデルパスを確認 | 「このフィールドのバインディングパス `/overallScore` のフォーマットを変更したい」 |
| **コントロールツリー調査** | ツリーを展開して構造を把握 | 「Table の中の Column の順序を変更したい」 |
| **DOM ↔ UI5 マッピング** | 要素をクリック → ツリーがハイライト | 「この DOM 要素に対応するアノテーションを教えて」 |

### メリット / デメリット

| メリット | デメリット |
|---------|-----------|
| SAP 公式ツール | Chrome 拡張のインストールが必要 |
| コントロールツリーが視覚的 | アノテーション機能がない |
| バインディング情報が詳細 | 出力のコピーが手動 |
| プロパティ編集のリアルタイムプレビュー | Fiori Elements ではアノテーション変更が必要 |

---

## 比較表

| 特徴 | アプローチ 1<br>Fiori Agentation | アプローチ 2<br>DevTools スニペット | アプローチ 3<br>UI5 Inspector |
|------|:---:|:---:|:---:|
| **セットアップ** | JS ファイル追加 | コード変更不要 | Chrome 拡張 |
| **UI5 コントロール情報** | ✅ 自動取得 | ✅ スニペットで取得 | ✅ 公式ツール |
| **バインディング情報** | ✅ | ✅ | ✅ 最も詳細 |
| **CDS アノテーションヒント** | ✅ 自動付与 | ❌ | ❌ |
| **アノテーション（メモ追加）** | ✅ | ❌ | ❌ |
| **複数要素一括** | ✅ | ❌ 1つずつ | ❌ 1つずつ |
| **クリップボード出力** | ✅ ワンクリック | ✅ 自動コピー | ❌ 手動 |
| **構造化 Markdown** | ✅ | ✅ | ❌ |
| **出力詳細度の調整** | ✅ 4段階 | ❌ 固定 | ❌ |
| **本番への影響** | ⚠️ 除外設定必要 | ✅ なし | ✅ なし |
| **どのアプリでも使える** | ❌ 組み込み必要 | ✅ | ✅ |
| **おすすめ度** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## BTP/Fiori 固有の考慮事項

### Fiori Elements ≠ 通常の Web アプリ

```
通常の Web アプリ:
  ソースコード →（直接）→ DOM → 画面

Fiori Elements:
  CDS アノテーション → OData メタデータ → テンプレートエンジン
  → UI5 コントロール生成 → DOM → 画面
```

つまり、**画面の修正 = CDS アノテーションの修正** であることが多いです。

### フィードバック → 修正先のマッピング

| 画面の問題 | 修正先 | ファイル |
|-----------|--------|---------|
| カラムの順序・表示 | `@UI.LineItem` | `annotations.cds` |
| フィルターバーの項目 | `@UI.SelectionFields` | `annotations.cds` |
| ヘッダー情報 | `@UI.HeaderInfo` | `annotations.cds` |
| フィールドグループ | `@UI.FieldGroup` | `annotations.cds` |
| ソート順 | `@UI.PresentationVariant` | `annotations.cds` |
| 色分け（Criticality） | `Criticality` プロパティ | `annotations.cds` + `schema.cds` |
| カスタムロジック | `after SAVE` ハンドラ等 | `*.js` |
| レイアウト・スタイル | カスタム CSS / コントロール拡張 | `*.css` / `*.js` |

### AI エージェントへの最適な指示方法

```markdown
## 修正依頼

【Fiori Agentation 出力を貼り付け】

### コンテキスト
- このアプリは Fiori Elements (ListReport + ObjectPage) で構築
- アノテーションは `app/suppliers/annotations.cds` で定義
- サービスは `srv/supplier-evaluation-service.cds`
- スキーマは `db/schema.cds`

### 修正してほしいこと
[具体的な修正内容]

### 制約
- Fiori Elements のアノテーションで対応可能な変更のみ
- カスタム JavaScript は最小限に
```

---

## ベストプラクティス: ハイブリッドワークフロー

3つのアプローチは排他的ではなく、組み合わせて使うのが最も効果的です。

```
┌──────────────────────────────────────────────────────────┐
│                  開発ワークフロー                          │
│                                                          │
│  ① 画面確認                                              │
│     └─ ブラウザで Fiori アプリを開く                      │
│                                                          │
│  ② 問題発見                                              │
│     ├─ 軽微な修正 → アプローチ 1 (Fiori Agentation)      │
│     │  Ctrl+Shift+A → クリック → メモ → コピー           │
│     │                                                    │
│     ├─ 深い調査 → アプローチ 3 (UI5 Inspector)           │
│     │  コントロールツリーでバインディング確認              │
│     │                                                    │
│     └─ 他アプリの調査 → アプローチ 2 (DevTools)          │
│        Console スニペットで情報取得                       │
│                                                          │
│  ③ AI に貼り付け                                         │
│     └─ VS Code Copilot Chat に構造化出力を貼り付け       │
│                                                          │
│  ④ 修正実行                                              │
│     └─ annotations.cds / schema.cds / *.js を編集        │
│                                                          │
│  ⑤ リビルド & デプロイ                                   │
│     └─ mbt build → cf deploy                             │
│                                                          │
│  ⑥ ① に戻る                                             │
└──────────────────────────────────────────────────────────┘
```

### フィードバックループの効率化

| テクニック | 効果 |
|-----------|------|
| **ローカル `cds watch`** で即時プレビュー | デプロイ待ち時間を削減 |
| **Fiori Agentation + Copilot** で並行作業 | フィードバック → 修正を同時に |
| **出力詳細度を適切に調整** | Compact=速い / Forensic=正確 |
| **CDS アノテーションのヒント** を AI に渡す | 修正先の特定が高速化 |

---

## まとめ

Agentation のコンセプト「**ポイント → 構造化出力 → AI 修正**」は、BTP/Fiori 開発でこそ威力を発揮します。

なぜなら、Fiori Elements は **CDS アノテーション → テンプレートエンジン → UI** という間接的な構造を持つため、「画面のこの要素がどの CDS アノテーションに対応するか」を特定するのが困難だからです。

Fiori Agentation は、その間接構造を橋渡しし、**UI5 コントロール情報 + バインディングパス + CDS アノテーションヒント** を AI エージェントに提供することで、修正の精度と速度を大幅に向上させます。
