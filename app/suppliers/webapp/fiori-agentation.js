/**
 * BTP Agentation v5.0 — BTP/Fiori Elements 用ビジュアルフィードバックツール
 *
 * v5.0 変更点:
 *   - 「SAP Agentation」→「BTP Agentation」へリネーム
 *   - GitHub Pages + Bookmarklet による公開対応
 *
 * v4.0 変更点:
 *   - ダークテーマへ全面刷新（benji.org/agentation インスパイア）
 *   - ツールバー: 右下フローティングピル型、サークルアイコンボタン
 *   - ホバーハイライト: グリーン破線ボーダー
 *   - ポップオーバー/ダイアログ: ダークテーマ
 *   - Copilot ボタン: GitHub Copilot アイコンのみ（テキスト無し）
 *   - 「Fiori Agentation」→「SAP Agentation」へリネーム
 *
 * 使い方:
 *   Ctrl+Shift+A でツール起動 → 要素クリック → ポップオーバーで注記入力
 *   → リストボタンで一覧確認 → Copilot アイコンで送信
 *
 * 開発時専用。本番デプロイには含めないこと。
 */
(function() {
    "use strict";

    if (typeof sap === "undefined" || !sap.ui || !sap.ui.require) {
        console.warn("BTP Agentation: SAPUI5 が読み込まれていません");
        return;
    }

    sap.ui.require([
        "sap/m/Button",
        "sap/m/Popover",
        "sap/m/Dialog",
        "sap/m/Input",
        "sap/m/Text",
        "sap/m/VBox",
        "sap/m/HBox",
        "sap/m/List",
        "sap/m/CustomListItem",
        "sap/m/MessageToast",
        "sap/m/ObjectStatus",
        "sap/m/TextArea",
        "sap/m/Label",
        "sap/m/FlexItemData",
        "sap/m/MessageStrip",
        "sap/ui/core/IconPool",
        "sap/ui/core/HTML"
    ], function(Button, Popover, Dialog, Input, Text, VBox, HBox, List,
        CustomListItem, MessageToast, ObjectStatus, TextArea, Label,
        FlexItemData, MessageStrip, IconPool, HTML) {

        // ============================================================
        // 設定
        // ============================================================
        var CONFIG = {
            MARKER_COLOR: "#3b82f6",
            HIGHLIGHT_COLOR: "#4ade80",
            DARK_BG: "#1a1a2e",
            DARK_SURFACE: "#252538",
            DARK_INPUT: "#12121e",
            TEXT_PRIMARY: "#e0e0f0",
            TEXT_SECONDARY: "#a0a0b0",
            OUTPUT_DETAIL: "standard",
            HOTKEY: { ctrl: true, shift: true, key: "A" },
            MAX_ANNOTATIONS: 50
        };

        var state = {
            active: false,
            mode: "click",
            annotations: [],
            lockedEl: null,
            toolbarEl: null,
            markerLayer: null,
            annotPopover: null,
            listPopover: null,
            copilotDialog: null
        };

        // GitHub Copilot SVG アイコン
        var COPILOT_SVG = '<svg viewBox="0 0 16 16" width="18" height="18" style="vertical-align:middle"><path fill="currentColor" d="M7.998 15.035c-4.562 0-7.873-2.914-7.998-3.749V9.338c.085-.628.677-1.686 1.588-2.065.013-.07.024-.143.036-.218.029-.183.06-.384.126-.612-.201-.508-.254-1.084-.254-1.656 0-.87.463-1.735 1.05-2.317C3.15 1.861 3.87 1.449 4.5 1.449c.75 0 1.5.5 2 1h3c.5-.5 1.25-1 2-1 .63 0 1.35.412 1.952 1.021.587.582 1.05 1.447 1.05 2.317 0 .572-.053 1.148-.254 1.656.066.228.097.429.126.612.012.076.023.148.036.218.911.379 1.503 1.437 1.588 2.065v1.948c-.125.835-3.436 3.749-7.998 3.749l-.002 0ZM12.5 10c-.166 0-.33.056-.5.167-.481.312-1.458.833-4 .833s-3.519-.521-4-.833A1.093 1.093 0 0 0 3.5 10c-.828 0-1.5.224-1.5 1 0 .5.5 1.5 2.5 2.5 1.5.75 3 1 3.5 1s2-.25 3.5-1c2-1 2.5-2 2.5-2.5 0-.776-.672-1-1.5-1Zm-6.584-2.482a.63.63 0 0 0-.606.453l-.264.959a.63.63 0 0 0 .077.533.63.63 0 0 0 .457.268h.212a.63.63 0 0 0 .457-.268.63.63 0 0 0 .077-.533l-.264-.959a.63.63 0 0 0-.605-.453h-.541Zm4.168 0a.63.63 0 0 0-.606.453l-.263.959a.63.63 0 0 0 .077.533.63.63 0 0 0 .456.268h.213a.63.63 0 0 0 .456-.268.63.63 0 0 0 .078-.533l-.264-.959a.63.63 0 0 0-.606-.453h-.541Z"/></svg>';

        // ============================================================
        // SAP アイコンヘルパー
        // ============================================================
        function iconHTML(name, size) {
            try {
                var info = IconPool.getIconInfo(name);
                if (!info) return "";
                var s = size || 16;
                return '<span class="fa-sap-icon" style="font-family:\'' + info.fontFamily +
                    "';font-size:" + s + 'px">' + info.content + "</span>";
            } catch (e) { return ""; }
        }

        // ============================================================
        // UI5 コントロール情報取得
        // ============================================================
        function getUI5ControlInfo(domElement) {
            var info = { isUI5: false };
            try {
                if (typeof sap !== "undefined" && sap.ui && sap.ui.getCore) {
                    var core = sap.ui.getCore();
                    var el = domElement;
                    var ui5Control = null;
                    while (el && !ui5Control) {
                        if (el.id) {
                            ui5Control = core.byId(el.id);
                            if (!ui5Control && sap.ui.require) {
                                try {
                                    var ER = sap.ui.require("sap/ui/core/Element");
                                    if (ER && ER.getElementById) ui5Control = ER.getElementById(el.id);
                                } catch (ex) {}
                            }
                        }
                        el = el.parentElement;
                    }
                    if (ui5Control) {
                        info.isUI5 = true;
                        info.controlId = ui5Control.getId();
                        info.controlType = ui5Control.getMetadata().getName();
                        var bindings = {};
                        var bi = ui5Control.mBindingInfos || {};
                        Object.keys(bi).forEach(function(k) {
                            if (bi[k].parts) bindings[k] = bi[k].parts.map(function(p) { return p.path; });
                            else if (bi[k].path) bindings[k] = bi[k].path;
                        });
                        if (Object.keys(bindings).length > 0) info.bindings = bindings;
                        var props = {};
                        ["text", "value", "title", "label", "type", "visible"].forEach(function(p) {
                            try {
                                var g = "get" + p.charAt(0).toUpperCase() + p.slice(1);
                                if (typeof ui5Control[g] === "function") {
                                    var v = ui5Control[g]();
                                    if (v !== undefined && v !== null && v !== "") props[p] = v;
                                }
                            } catch (ex) {}
                        });
                        if (Object.keys(props).length > 0) info.properties = props;
                        var parent = ui5Control.getParent();
                        if (parent) info.parentType = parent.getMetadata().getName();
                        if (info.controlType.indexOf("sap.fe") === 0 || info.controlType.indexOf("sap.ui.mdc") === 0) {
                            info.isFioriElement = true;
                        }
                    }
                }
            } catch (e) { info.error = e.message; }
            return info;
        }

        function getSelector(el) {
            if (!el || el === document.body) return "body";
            var parts = [], current = el, depth = 0;
            while (current && current !== document.body && depth < 5) {
                var tag = current.tagName.toLowerCase();
                if (current.id) {
                    var id = current.id.length > 60 ? "..." + current.id.slice(-40) : current.id;
                    parts.unshift("#" + id);
                    break;
                } else if (current.className && typeof current.className === "string") {
                    var cls = current.className.trim().split(/\s+/).filter(function(c) {
                        return c && (!c.startsWith("sapUi") || c.startsWith("sapM") || c.startsWith("sapFe"));
                    }).slice(0, 3);
                    parts.unshift(cls.length > 0 ? tag + "." + cls.join(".") : tag);
                } else {
                    parts.unshift(tag);
                }
                current = current.parentElement;
                depth++;
            }
            return parts.join(" > ");
        }

        function getBoundingInfo(el) {
            var r = el.getBoundingClientRect();
            return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
        }

        function getComputedInfo(el) {
            var c = window.getComputedStyle(el);
            return { fontSize: c.fontSize, color: c.color, backgroundColor: c.backgroundColor, padding: c.padding, margin: c.margin, display: c.display };
        }

        // ============================================================
        // 構造化 Markdown 出力
        // ============================================================
        function generateOutput(extra) {
            if (state.annotations.length === 0) return "アノテーションがありません。";
            var L = [];
            L.push("# Fiori UI フィードバック\n");
            L.push("**アプリ**: " + document.title);
            L.push("**URL**: " + window.location.href);
            L.push("**日時**: " + new Date().toLocaleString("ja-JP"));
            L.push("**UI5 バージョン**: " + (sap.ui && sap.ui.version ? sap.ui.version : "不明"));
            L.push("");
            state.annotations.forEach(function(ann, i) {
                L.push("## " + (i + 1) + ". " + (ann.note || "（コメントなし）"));
                L.push("");
                if (ann.selector) L.push("**セレクタ**: `" + ann.selector + "`");
                if (ann.ui5 && ann.ui5.isUI5) {
                    L.push("**UI5 コントロール**: `" + ann.ui5.controlType + "`");
                    L.push("**コントロール ID**: `" + ann.ui5.controlId + "`");
                    if (ann.ui5.parentType) L.push("**親コントロール**: `" + ann.ui5.parentType + "`");
                    if (ann.ui5.bindings) L.push("**バインディング**: `" + JSON.stringify(ann.ui5.bindings) + "`");
                    if (ann.ui5.properties) L.push("**プロパティ**: `" + JSON.stringify(ann.ui5.properties) + "`");
                    if (ann.ui5.isFioriElement) L.push("**Fiori Elements コントロール**: はい（CDS アノテーション制御）");
                }
                if (ann.selectedText) L.push("**選択テキスト**: \"" + ann.selectedText + "\"");
                if (ann.area) L.push("**選択エリア**: x=" + ann.area.x + " y=" + ann.area.y + " w=" + ann.area.width + " h=" + ann.area.height);
                if (CONFIG.OUTPUT_DETAIL !== "compact" && ann.bounds) {
                    L.push("**位置**: x=" + ann.bounds.x + " y=" + ann.bounds.y + " " + ann.bounds.width + "x" + ann.bounds.height);
                }
                if (CONFIG.OUTPUT_DETAIL === "forensic" && ann.computed) {
                    L.push("**CSS**:");
                    L.push("```css");
                    Object.keys(ann.computed).forEach(function(k) {
                        if (ann.computed[k] && ann.computed[k] !== "normal") L.push("  " + k + ": " + ann.computed[k] + ";");
                    });
                    L.push("```");
                }
                if (ann.ui5 && ann.ui5.isFioriElement) {
                    L.push("\n> CDS アノテーション (annotations.cds) で制御。@UI.LineItem, @UI.FieldGroup 等を変更してください。");
                }
                L.push("\n---\n");
            });
            if (extra) {
                L.push("## 修正指示\n");
                L.push(extra);
            }
            return L.join("\n");
        }

        // ============================================================
        // CSS 注入 — ダークテーマ
        // ============================================================
        function injectStyles() {
            if (document.getElementById("fa-v4-styles")) return;
            var style = document.createElement("style");
            style.id = "fa-v4-styles";
            style.textContent = [
                /* ---- Dark Floating Toolbar (pill, bottom-right) ---- */
                "#fa-toolbar {",
                "  position:fixed; bottom:20px; right:20px;",
                "  z-index:100003; display:flex; align-items:center; gap:4px;",
                "  background:" + CONFIG.DARK_BG + "; border-radius:28px; padding:6px 10px;",
                "  box-shadow:0 4px 24px rgba(0,0,0,0.5);",
                "  border:1px solid rgba(255,255,255,0.08);",
                "  font-family:'72','72full',Arial,Helvetica,sans-serif;",
                "}",

                /* ---- Circular Icon Buttons ---- */
                ".fa-tbtn {",
                "  display:inline-flex; align-items:center; justify-content:center;",
                "  width:36px; height:36px; border:none; border-radius:50%;",
                "  background:transparent; color:" + CONFIG.TEXT_SECONDARY + "; cursor:pointer;",
                "  font-size:0; line-height:1; position:relative;",
                "  transition:background 0.15s, color 0.15s;",
                "}",
                ".fa-tbtn:hover { background:rgba(255,255,255,0.1); color:" + CONFIG.TEXT_PRIMARY + "; }",
                ".fa-tbtn:active { background:rgba(255,255,255,0.15); }",
                ".fa-tbtn:focus-visible { outline:2px solid " + CONFIG.HIGHLIGHT_COLOR + "; outline-offset:1px; }",

                /* ---- Emphasized (Copilot/Copy) ---- */
                ".fa-tbtn-emp { background:transparent; color:" + CONFIG.TEXT_PRIMARY + "; }",
                ".fa-tbtn-emp:hover { background:rgba(74,222,128,0.15); color:" + CONFIG.HIGHLIGHT_COLOR + "; }",

                /* ---- Separator ---- */
                ".fa-sep { width:1px; height:24px; background:rgba(255,255,255,0.1); margin:0 2px; flex-shrink:0; }",

                /* ---- Icon ---- */
                ".fa-sap-icon { speak:none; -webkit-font-smoothing:antialiased; line-height:1; }",

                /* ---- Badge (overlay on button) ---- */
                ".fa-badge {",
                "  position:absolute; top:-2px; right:-2px;",
                "  display:inline-flex; align-items:center; justify-content:center;",
                "  min-width:16px; height:16px; border-radius:8px;",
                "  background:" + CONFIG.MARKER_COLOR + "; color:#fff;",
                "  font-size:0.575rem; font-weight:700; padding:0 3px;",
                "  font-family:'72','72full',Arial,sans-serif;",
                "  pointer-events:none;",
                "}",
                ".fa-badge:empty, .fa-badge[data-count='0'] { display:none; }",

                /* ---- Markers ---- */
                ".fa-marker {",
                "  position:fixed; border:2px solid " + CONFIG.MARKER_COLOR + ";",
                "  background:" + CONFIG.MARKER_COLOR + "15;",
                "  pointer-events:none; z-index:5; transition:opacity 0.2s;",
                "}",
                ".fa-marker-badge {",
                "  position:absolute; top:-10px; left:-10px;",
                "  width:20px; height:20px; border-radius:50%;",
                "  background:" + CONFIG.MARKER_COLOR + "; color:#fff;",
                "  font-size:11px; display:flex; align-items:center; justify-content:center;",
                "  font-weight:700; pointer-events:none;",
                "  font-family:'72','72full',Arial,Helvetica,sans-serif;",
                "}",

                /* ---- Hover Highlight (GREEN dashed) ---- */
                "#fa-hover-hl {",
                "  position:fixed; border:2px dashed " + CONFIG.HIGHLIGHT_COLOR + ";",
                "  background:" + CONFIG.HIGHLIGHT_COLOR + "12;",
                "  pointer-events:none; z-index:4; transition:all 0.1s;",
                "}",
                ".fa-hover-tip {",
                "  position:absolute; bottom:-26px; left:0;",
                "  background:" + CONFIG.DARK_BG + "; color:" + CONFIG.TEXT_PRIMARY + ";",
                "  font-size:0.6875rem; padding:3px 10px; border-radius:4px;",
                "  white-space:nowrap; pointer-events:none;",
                "  font-family:'72','72full',Arial,sans-serif;",
                "  border:1px solid rgba(255,255,255,0.1);",
                "}",

                /* ---- Dark Popover Overrides ---- */
                ".faDarkPop .sapMPopoverCont,",
                ".faDarkPop .sapMPopoverScroll { background:" + CONFIG.DARK_BG + " !important; }",
                ".faDarkPop .sapMPopoverArr::after { border-color:" + CONFIG.DARK_BG + " !important; background:" + CONFIG.DARK_BG + " !important; }",
                ".faDarkPop .sapMPopoverHeader,",
                ".faDarkPop .sapMPopoverSubHeader {",
                "  background:" + CONFIG.DARK_SURFACE + " !important;",
                "  border-bottom:1px solid rgba(255,255,255,0.08) !important;",
                "}",
                ".faDarkPop .sapMPopoverHeader .sapMTitle,",
                ".faDarkPop .sapMPopoverHeader .sapMBarChild,",
                ".faDarkPop .sapMBarChild { color:" + CONFIG.TEXT_PRIMARY + " !important; }",
                ".faDarkPop .sapMPopoverFooter,",
                ".faDarkPop .sapMBar {",
                "  background:" + CONFIG.DARK_BG + " !important;",
                "  border-top:1px solid rgba(255,255,255,0.08) !important;",
                "}",
                ".faDarkPop .sapMObjStatusText { color:" + CONFIG.TEXT_SECONDARY + " !important; }",
                ".faDarkPop .sapMObjStatusIcon { color:" + CONFIG.TEXT_SECONDARY + " !important; }",
                ".faDarkPop .sapMInputBaseInner {",
                "  background:" + CONFIG.DARK_INPUT + " !important; color:" + CONFIG.TEXT_PRIMARY + " !important;",
                "  border-color:rgba(255,255,255,0.15) !important;",
                "}",
                ".faDarkPop .sapMLabel { color:" + CONFIG.TEXT_SECONDARY + " !important; }",
                ".faDarkPop .sapMText { color:#c0c0d0 !important; }",
                ".faDarkPop .sapMMsgStrip { background:" + CONFIG.DARK_SURFACE + " !important; }",
                ".faDarkPop .sapMMsgStripMessage { color:" + CONFIG.TEXT_SECONDARY + " !important; }",
                ".faDarkPop .sapMSLI,",
                ".faDarkPop .sapMLIB { background:" + CONFIG.DARK_BG + " !important; border-bottom:1px solid rgba(255,255,255,0.06) !important; }",
                ".faDarkPop .sapMSLI:hover,",
                ".faDarkPop .sapMLIB:hover { background:" + CONFIG.DARK_SURFACE + " !important; }",

                /* ---- Dark Dialog Overrides ---- */
                ".faDarkDlg .sapMDialogSection,",
                ".faDarkDlg .sapMDialogScroll { background:" + CONFIG.DARK_BG + " !important; }",
                ".faDarkDlg .sapMDialogSubHeader,",
                ".faDarkDlg .sapMIBar,",
                ".faDarkDlg .sapMBar { background:" + CONFIG.DARK_SURFACE + " !important; }",
                ".faDarkDlg .sapMTitle { color:" + CONFIG.TEXT_PRIMARY + " !important; }",
                ".faDarkDlg .sapMLabel { color:" + CONFIG.TEXT_SECONDARY + " !important; }",
                ".faDarkDlg .sapMText { color:#c0c0d0 !important; }",
                ".faDarkDlg .sapMInputBaseInner,",
                ".faDarkDlg .sapMTextAreaInner {",
                "  background:" + CONFIG.DARK_INPUT + " !important; color:" + CONFIG.TEXT_PRIMARY + " !important;",
                "  border-color:rgba(255,255,255,0.15) !important;",
                "}",
                ".faDarkDlg .sapMMsgStrip { background:" + CONFIG.DARK_SURFACE + " !important; }",
                ".faDarkDlg .sapMMsgStripMessage { color:" + CONFIG.TEXT_SECONDARY + " !important; }",

                /* ---- Copilot Step Circle ---- */
                ".faStepCircle {",
                "  display:inline-flex; align-items:center; justify-content:center;",
                "  min-width:1.75rem; height:1.75rem; border-radius:50%;",
                "  background:" + CONFIG.MARKER_COLOR + "; color:#fff; font-weight:700; font-size:0.8125rem;",
                "  margin-right:0.75rem; flex-shrink:0;",
                "  font-family:'72','72full',Arial,Helvetica,sans-serif;",
                "}",

                /* ---- Green Accept Button ---- */
                ".faGreenBtn .sapMBtnInner {",
                "  background:" + CONFIG.HIGHLIGHT_COLOR + " !important; color:#111 !important;",
                "  border-color:" + CONFIG.HIGHLIGHT_COLOR + " !important; font-weight:700;",
                "}",
                ".faGreenBtn:hover .sapMBtnInner {",
                "  background:#22c55e !important;",
                "}"
            ].join("\n");
            document.head.appendChild(style);
        }

        // ============================================================
        // フローティングツールバー（ダークピル型）
        // ============================================================
        function createToolbar() {
            injectStyles();
            var tb = document.createElement("div");
            tb.id = "fa-toolbar";

            // --- アノテーション一覧 ---
            var listBtn = document.createElement("button");
            listBtn.id = "fa-count-btn";
            listBtn.className = "fa-tbtn";
            listBtn.title = "アノテーション一覧";
            listBtn.innerHTML = iconHTML("list", 16) + '<span class="fa-badge" id="fa-badge">0</span>';
            listBtn.addEventListener("click", function(e) {
                e.stopPropagation();
                showAnnotationListPopover();
            });
            tb.appendChild(listBtn);

            // --- コピー (Copilot に送る) ---
            var copyBtn = document.createElement("button");
            copyBtn.className = "fa-tbtn fa-tbtn-emp";
            copyBtn.title = "コピーして Copilot に送る";
            copyBtn.innerHTML = iconHTML("copy", 16);
            copyBtn.addEventListener("click", function(e) {
                e.stopPropagation();
                handleSendToCopilot();
            });
            tb.appendChild(copyBtn);

            // --- 全クリア ---
            var clearBtn = document.createElement("button");
            clearBtn.className = "fa-tbtn";
            clearBtn.title = "全クリア";
            clearBtn.innerHTML = iconHTML("delete", 16);
            clearBtn.addEventListener("click", function(e) {
                e.stopPropagation();
                clearAll();
            });
            tb.appendChild(clearBtn);

            // --- 詳細度切替 ---
            var detailLevels = ["compact", "standard", "detailed", "forensic"];
            var detailLabels = { compact: "Compact", standard: "Standard", detailed: "Detailed", forensic: "Forensic" };
            var settingsBtn = document.createElement("button");
            settingsBtn.className = "fa-tbtn";
            settingsBtn.title = "詳細レベル: " + detailLabels[CONFIG.OUTPUT_DETAIL];
            settingsBtn.innerHTML = iconHTML("action-settings", 16);
            settingsBtn.addEventListener("click", function(e) {
                e.stopPropagation();
                var idx = detailLevels.indexOf(CONFIG.OUTPUT_DETAIL);
                CONFIG.OUTPUT_DETAIL = detailLevels[(idx + 1) % detailLevels.length];
                settingsBtn.title = "詳細レベル: " + detailLabels[CONFIG.OUTPUT_DETAIL];
                MessageToast.show("詳細レベル: " + detailLabels[CONFIG.OUTPUT_DETAIL]);
            });
            tb.appendChild(settingsBtn);
            tb.appendChild(makeSep());

            // --- 閉じる ---
            var closeBtn = document.createElement("button");
            closeBtn.className = "fa-tbtn";
            closeBtn.title = "閉じる (Ctrl+Shift+A)";
            closeBtn.innerHTML = iconHTML("decline", 16);
            closeBtn.addEventListener("click", function(e) {
                e.stopPropagation();
                toggleAgentation();
            });
            tb.appendChild(closeBtn);

            document.body.appendChild(tb);
            state.toolbarEl = tb;
        }

        function makeSep() {
            var s = document.createElement("div");
            s.className = "fa-sep";
            return s;
        }

        function updateToolbarCount() {
            var badge = document.getElementById("fa-badge");
            if (badge) {
                var count = state.annotations.length;
                badge.textContent = count;
                badge.dataset.count = count;
            }
        }

        // ============================================================
        // アノテーション入力ポップオーバー (ダークテーマ sap.m.Popover)
        // ============================================================
        function showAnnotationPopover(elementInfo, domRef) {
            if (state.annotPopover) {
                try { state.annotPopover.close(); } catch (e) {}
                try { state.annotPopover.destroy(); } catch (e) {}
                state.annotPopover = null;
            }
            removeTempAnchor();

            var controlLabel = "要素";
            if (elementInfo.ui5 && elementInfo.ui5.isUI5) {
                controlLabel = elementInfo.ui5.controlType;
            } else if (elementInfo.selectedText) {
                var txt = elementInfo.selectedText;
                controlLabel = "テキスト: \"" + (txt.length > 40 ? txt.slice(0, 37) + "..." : txt) + "\"";
            } else if (elementInfo.selector) {
                controlLabel = elementInfo.selector.length > 50 ? "..." + elementInfo.selector.slice(-45) : elementInfo.selector;
            }

            var noteInput = new Input({
                placeholder: "修正内容をメモ...  Enter で追加",
                width: "100%"
            }).addStyleClass("sapUiSmallMarginTop");

            noteInput.attachSubmit(function() {
                addAnnotation(elementInfo, noteInput.getValue());
                popover.close();
            });

            var contentItems = [
                new ObjectStatus({
                    text: controlLabel,
                    icon: (elementInfo.ui5 && elementInfo.ui5.isUI5) ? "sap-icon://sys-help-2" : "sap-icon://border",
                    state: (elementInfo.ui5 && elementInfo.ui5.isFioriElement) ? "Warning" : "Information"
                })
            ];

            if (elementInfo.ui5 && elementInfo.ui5.isFioriElement) {
                contentItems.push(
                    new MessageStrip({
                        text: "CDS アノテーション (annotations.cds) で制御されます",
                        type: "Warning",
                        showIcon: true,
                        showCloseButton: false
                    }).addStyleClass("sapUiSmallMarginTop")
                );
            }

            if (elementInfo.ui5 && elementInfo.ui5.bindings) {
                contentItems.push(
                    new ObjectStatus({
                        text: "Bindings: " + Object.keys(elementInfo.ui5.bindings).join(", "),
                        icon: "sap-icon://chain-link",
                        state: "None"
                    }).addStyleClass("sapUiSmallMarginTop")
                );
            }

            contentItems.push(noteInput);

            var addButton = new Button({
                text: "追加",
                icon: "sap-icon://add",
                type: "Accept",
                press: function() {
                    addAnnotation(elementInfo, noteInput.getValue());
                    popover.close();
                }
            });
            addButton.addStyleClass("faGreenBtn");

            var popover = new Popover({
                title: controlLabel.length > 30 ? controlLabel.slice(0, 28) + "..." : controlLabel,
                placement: "Auto",
                contentWidth: "22rem",
                content: [
                    new VBox({ items: contentItems }).addStyleClass("sapUiSmallMargin")
                ],
                beginButton: addButton,
                endButton: new Button({
                    text: "キャンセル",
                    press: function() { popover.close(); }
                }),
                afterOpen: function() {
                    setTimeout(function() { noteInput.focus(); }, 100);
                },
                afterClose: function() {
                    removeTempAnchor();
                    if (state.annotPopover === popover) {
                        popover.destroy();
                        state.annotPopover = null;
                    }
                }
            });

            popover.addStyleClass("faDarkPop");
            state.annotPopover = popover;
            popover.openBy(domRef);
        }

        function addAnnotation(elementInfo, note) {
            var annotation = {};
            Object.keys(elementInfo).forEach(function(k) { annotation[k] = elementInfo[k]; });
            annotation.note = (note || "").trim() || null;
            annotation.type = elementInfo.type || "click";
            state.annotations.push(annotation);
            drawMarker(annotation);
            updateToolbarCount();
            var typeMap = { click: "クリック", text: "テキスト", area: "エリア" };
            MessageToast.show("[" + (typeMap[annotation.type] || annotation.type) + "] #" + state.annotations.length + " 追加");
        }

        // ============================================================
        // アノテーション一覧ポップオーバー (ダークテーマ)
        // ============================================================
        function showAnnotationListPopover() {
            if (state.listPopover) {
                try { state.listPopover.close(); } catch (e) {}
                try { state.listPopover.destroy(); } catch (e) {}
                state.listPopover = null;
            }

            if (state.annotations.length === 0) {
                MessageToast.show("アノテーションはありません");
                return;
            }

            var list = new List({ mode: "None" });

            state.annotations.forEach(function(ann, idx) {
                var ctrlText = ann.ui5 && ann.ui5.isUI5
                    ? ann.ui5.controlType
                    : (ann.selector ? (ann.selector.length > 40 ? "..." + ann.selector.slice(-35) : ann.selector) : "要素");

                var item = new CustomListItem({
                    content: [
                        new HBox({
                            alignItems: "Center",
                            width: "100%",
                            items: [
                                new VBox({
                                    items: [
                                        new Text({ text: "#" + (idx + 1) + "  " + (ann.note || "コメントなし") }),
                                        new ObjectStatus({
                                            text: ctrlText,
                                            icon: ann.ui5 && ann.ui5.isUI5 ? "sap-icon://sys-help-2" : "sap-icon://border",
                                            state: ann.ui5 && ann.ui5.isFioriElement ? "Warning" : "Information"
                                        }).addStyleClass("sapUiTinyMarginTop")
                                    ],
                                    layoutData: new FlexItemData({ growFactor: 1 })
                                }),
                                new Button({
                                    icon: "sap-icon://delete",
                                    type: "Transparent",
                                    tooltip: "削除",
                                    press: (function(i) {
                                        return function() {
                                            if (state.annotations[i] && state.annotations[i]._marker) {
                                                state.annotations[i]._marker.remove();
                                            }
                                            state.annotations.splice(i, 1);
                                            redrawAllMarkers();
                                            updateToolbarCount();
                                            if (state.listPopover) state.listPopover.close();
                                        };
                                    })(idx)
                                })
                            ]
                        })
                    ]
                });
                list.addItem(item);
            });

            var popover = new Popover({
                title: "アノテーション一覧 (" + state.annotations.length + ")",
                placement: "Top",
                contentWidth: "24rem",
                content: [list],
                endButton: new Button({
                    text: "全クリア",
                    icon: "sap-icon://delete",
                    type: "Reject",
                    press: function() {
                        clearAll();
                        popover.close();
                    }
                }),
                afterClose: function() {
                    if (state.listPopover === popover) {
                        popover.destroy();
                        state.listPopover = null;
                    }
                }
            });

            popover.addStyleClass("faDarkPop");
            state.listPopover = popover;
            var anchor = document.getElementById("fa-count-btn");
            if (anchor) popover.openBy(anchor);
        }

        // ============================================================
        // Copilot 送信
        // ============================================================
        function handleSendToCopilot() {
            if (state.annotations.length === 0) {
                MessageToast.show("アノテーションを追加してください");
                return;
            }
            var output = generateOutput(null);
            navigator.clipboard.writeText(output).then(function() {
                showCopilotDialog(output);
            });
        }

        function showCopilotDialog(output) {
            if (state.copilotDialog) {
                try { state.copilotDialog.close(); } catch (e) {}
                try { state.copilotDialog.destroy(); } catch (e) {}
                state.copilotDialog = null;
            }

            function stepRow(num, title, desc) {
                return new HBox({
                    alignItems: "Start",
                    items: [
                        new HTML({ content: '<div class="faStepCircle">' + num + "</div>" }),
                        new VBox({
                            items: [
                                new Label({ text: title, design: "Bold" }),
                                new Text({ text: desc }).addStyleClass("sapUiTinyMarginTop")
                            ]
                        })
                    ]
                }).addStyleClass("sapUiSmallMarginBottom");
            }

            var preview = new TextArea({
                value: output,
                rows: 8,
                width: "100%",
                editable: false,
                growing: false
            });

            var dialog = new Dialog({
                title: "Copilot に送信",
                icon: "sap-icon://collaborate",
                contentWidth: "32rem",
                content: [
                    new VBox({
                        items: [
                            new MessageStrip({
                                text: "フィードバックがクリップボードにコピーされました",
                                type: "Success",
                                showIcon: true,
                                showCloseButton: false
                            }).addStyleClass("sapUiSmallMarginBottom"),

                            stepRow(1, "VS Code に切替", "下のボタンで VS Code を開くか、Alt+Tab で切り替え"),
                            stepRow(2, "Copilot Chat を開く", "Ctrl+Shift+I でチャットを開く"),
                            stepRow(3, "貼り付けて送信", "Ctrl+V で貼り付け → Enter で送信"),

                            new Label({ text: "クリップボードの内容（プレビュー）", design: "Bold" })
                                .addStyleClass("sapUiSmallMarginTop sapUiTinyMarginBottom"),
                            preview
                        ]
                    }).addStyleClass("sapUiContentPadding")
                ],
                beginButton: new Button({
                    text: "VS Code を開く",
                    icon: "sap-icon://action",
                    type: "Emphasized",
                    press: function() {
                        window.open("vscode://file/c:/Users/taigaito/my-side-by-side-app/app/suppliers/annotations.cds", "_blank");
                        setTimeout(function() { dialog.close(); }, 500);
                    }
                }),
                endButton: new Button({
                    text: "閉じる",
                    press: function() { dialog.close(); }
                }),
                afterClose: function() {
                    if (state.copilotDialog === dialog) {
                        dialog.destroy();
                        state.copilotDialog = null;
                    }
                }
            });

            dialog.addStyleClass("faDarkDlg");
            state.copilotDialog = dialog;
            dialog.open();
        }

        // ============================================================
        // マーカー描画
        // ============================================================
        function drawMarker(ann, idx) {
            if (!state.markerLayer) return;
            var marker = document.createElement("div");
            marker.className = "fa-marker";
            if (ann.bounds) {
                marker.style.left = ann.bounds.x + "px";
                marker.style.top = ann.bounds.y + "px";
                marker.style.width = ann.bounds.width + "px";
                marker.style.height = ann.bounds.height + "px";
            } else if (ann.area) {
                marker.style.left = ann.area.x + "px";
                marker.style.top = ann.area.y + "px";
                marker.style.width = ann.area.width + "px";
                marker.style.height = ann.area.height + "px";
            }
            var badge = document.createElement("div");
            badge.className = "fa-marker-badge";
            badge.textContent = typeof idx === "number" ? idx + 1 : state.annotations.length;
            marker.appendChild(badge);
            state.markerLayer.appendChild(marker);
            ann._marker = marker;
        }

        function redrawAllMarkers() {
            if (!state.markerLayer) return;
            state.markerLayer.innerHTML = "";
            state.annotations.forEach(function(ann, i) { drawMarker(ann, i); });
        }

        // ============================================================
        // ホバーハイライト（グリーン破線）
        // ============================================================
        function showHoverHL(el) {
            removeHoverHL();
            if (!el || !state.active) return;
            var r = el.getBoundingClientRect();
            var hl = document.createElement("div");
            hl.id = "fa-hover-hl";
            hl.style.left = r.x + "px";
            hl.style.top = r.y + "px";
            hl.style.width = r.width + "px";
            hl.style.height = r.height + "px";
            var tip = document.createElement("div");
            tip.className = "fa-hover-tip";
            var ui5 = getUI5ControlInfo(el);
            tip.textContent = ui5.isUI5 ? ui5.controlType : getSelector(el);
            hl.appendChild(tip);
            document.body.appendChild(hl);
        }

        function removeHoverHL() {
            var e = document.getElementById("fa-hover-hl");
            if (e) e.remove();
        }

        // ============================================================
        // テンポラリアンカー
        // ============================================================
        function createTempAnchor(x, y) {
            removeTempAnchor();
            var a = document.createElement("div");
            a.id = "fa-temp-anchor";
            a.style.cssText = "position:fixed;left:" + x + "px;top:" + y + "px;width:1px;height:1px;pointer-events:none;z-index:100002";
            document.body.appendChild(a);
            return a;
        }

        function removeTempAnchor() {
            var e = document.getElementById("fa-temp-anchor");
            if (e) e.remove();
        }

        // ============================================================
        // 全クリア
        // ============================================================
        function clearAll() {
            state.annotations.forEach(function(ann) { if (ann._marker) ann._marker.remove(); });
            state.annotations = [];
            redrawAllMarkers();
            updateToolbarCount();
            MessageToast.show("全クリアしました");
        }

        // ============================================================
        // イベントハンドラ
        // ============================================================
        function isToolUI(el) {
            return el.closest("#fa-toolbar") || el.closest("#sap-ui-static") || el.closest("#fa-marker-layer");
        }

        function handleClick(e) {
            if (!state.active) return;
            if (isToolUI(e.target)) return;
            // テキスト選択中はクリック処理をスキップ
            if (window.getSelection().toString().trim()) return;
            e.preventDefault();
            e.stopPropagation();

            var el = e.target;
            state.lockedEl = el;
            showHoverHL(el);

            var info = {
                selector: getSelector(el),
                ui5: getUI5ControlInfo(el),
                bounds: getBoundingInfo(el),
                type: "click"
            };
            if (CONFIG.OUTPUT_DETAIL === "forensic") info.computed = getComputedInfo(el);
            showAnnotationPopover(info, el);
        }

        function handleTextSelect() {
            if (!state.active) return;
            var sel = window.getSelection();
            var text = sel.toString().trim();
            if (!text) return;
            var range = sel.getRangeAt(0);
            var rect = range.getBoundingClientRect();
            var container = range.commonAncestorContainer;
            var el = container.nodeType === 3 ? container.parentElement : container;
            var anchor = createTempAnchor(rect.x + rect.width / 2, rect.y);
            showAnnotationPopover({
                selectedText: text,
                selector: getSelector(el),
                ui5: getUI5ControlInfo(el),
                bounds: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
                type: "text"
            }, anchor);
        }

        function handleDblClick(e) {
            if (!state.active) return;
            if (isToolUI(e.target)) return;
            e.preventDefault();
            e.stopPropagation();
            state.lockedEl = null;
            removeHoverHL();
        }

        function onHover(e) {
            if (state.active && !state.lockedEl && !isToolUI(e.target)) {
                showHoverHL(e.target);
            }
        }

        // ============================================================
        // マーカーレイヤー
        // ============================================================
        function createMarkerLayer() {
            var layer = document.createElement("div");
            layer.id = "fa-marker-layer";
            layer.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5";
            document.body.appendChild(layer);
            state.markerLayer = layer;
        }

        // ============================================================
        // 起動 / 停止
        // ============================================================
        function toggleAgentation() {
            state.active = !state.active;
            if (state.active) {
                createToolbar();
                createMarkerLayer();
                document.addEventListener("click", handleClick, true);
                document.addEventListener("dblclick", handleDblClick, true);
                document.addEventListener("mouseup", handleTextSelect, true);
                document.addEventListener("mousemove", onHover);
                document.body.style.cursor = "crosshair";
                state.annotations.forEach(function(ann, i) { drawMarker(ann, i); });
                updateToolbarCount();
            } else {
                if (state.annotPopover) {
                    try { state.annotPopover.close(); } catch (e) {}
                    try { state.annotPopover.destroy(); } catch (e) {}
                    state.annotPopover = null;
                }
                if (state.listPopover) {
                    try { state.listPopover.close(); } catch (e) {}
                    try { state.listPopover.destroy(); } catch (e) {}
                    state.listPopover = null;
                }
                if (state.copilotDialog) {
                    try { state.copilotDialog.close(); } catch (e) {}
                    try { state.copilotDialog.destroy(); } catch (e) {}
                    state.copilotDialog = null;
                }
                if (state.toolbarEl) { state.toolbarEl.remove(); state.toolbarEl = null; }
                if (state.markerLayer) { state.markerLayer.remove(); state.markerLayer = null; }
                removeHoverHL();
                removeTempAnchor();
                state.lockedEl = null;
                document.removeEventListener("click", handleClick, true);
                document.removeEventListener("dblclick", handleDblClick, true);
                document.removeEventListener("mouseup", handleTextSelect, true);
                document.removeEventListener("mousemove", onHover);
                document.body.style.cursor = "";
            }
        }

        // ============================================================
        // キーボードショートカット
        // ============================================================
        document.addEventListener("keydown", function(e) {
            if (e.ctrlKey === CONFIG.HOTKEY.ctrl && e.shiftKey === CONFIG.HOTKEY.shift && e.key.toUpperCase() === CONFIG.HOTKEY.key) {
                e.preventDefault();
                toggleAgentation();
            }
        });

        console.log(
            "%cBTP Agentation v5.0 %c Ctrl+Shift+A で起動 | ダークテーマ + Copilot 連携",
            "background:#1a1a2e;color:#4ade80;padding:4px 8px;border-radius:4px;font-weight:bold",
            "color:#4ade80;font-weight:bold"
        );
    });
})();
