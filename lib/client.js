window.__ModuleLoader__.load({
	id: "dsh-chat-spacing",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		// Peer modules resolved through the browser module table (all shipped by the web profile).
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		// #region constants
		/** Locale namespace owned by this plugin (dictionary keys + slot `t`). */
		const NS = "chatSpacing";
		/** Host user-settings namespace owned by this plugin. */
		const SETTINGS_NAMESPACE = "ui-chat-spacing";
		/**
		 * Every spacing knob the stylesheet reads. One entry per CSS custom
		 * property: the field name is the settings-scope key, `cssVar` the
		 * property the package stylesheet consumes, `def` the stock-official
		 * value the row resets to.
		 *
		 * `gap` is the v1 conversation-flow gap (default 12, between the
		 * official 16 and the 8px process exception). The rest govern the
		 * EXPANDED bodies of reasoning rows and tool rows, which the stock
		 * bundle leaves on four different indents (4px tool bodies, 22px
		 * reasoning/context bodies) and two border widths (0.5px on
		 * terminal/io cards only).
		 */
		const CONTROLS = [
			{ field: "gap", cssVar: "--dsh-csg-gap", min: 4, max: 32, step: 2, def: 12 },
			{ field: "indent", cssVar: "--dsh-csg-indent", min: 0, max: 40, step: 2, def: 22 },
			{ field: "bodyV", cssVar: "--dsh-csg-body-v", min: 0, max: 16, step: 2, def: 4 },
			{ field: "cardBorder", cssVar: "--dsh-csg-card-border", min: 0, max: 2, step: 0.5, def: 0.5 },
			{ field: "cardRadius", cssVar: "--dsh-csg-card-radius", min: 0, max: 20, step: 2, def: 12 },
			// No CSS variable: the reasoning blank-line mode is applied to the DOM
			// text itself (CSS cannot remove pre-wrap blank lines).
			{ field: "thinkBlank", cssVar: null, min: 0, max: 2, step: 1, def: 1, labels: ["thinkBlank.keep", "thinkBlank.one", "thinkBlank.none"] }
		];
		const DEFAULTS = Object.fromEntries(CONTROLS.map((c) => [c.field, c.def]));
		const clampOne = (control, value) => {
			const raw = typeof value === "number" && Number.isFinite(value) ? value : control.def;
			const stepped = Math.round(raw / control.step) * control.step;
			const fixed = Number(stepped.toFixed(2));
			return Math.min(control.max, Math.max(control.min, fixed));
		};
		// #endregion
		// #region reasoning blank-line normaliser
		/**
		 * The stock `ReasoningRow` renders the model's thinking verbatim under
		 * `white-space: pre-wrap`, and DeepSeek-class models habitually end the
		 * reasoning with `\n\n\n` and separate paragraphs with `\n\n\n` too —
		 * two dead blank lines each, measured at 20px per line on screen. CSS
		 * cannot delete text, so this module normalises the rendered text node:
		 *
		 *   mode 0 保留  — leave the raw text untouched
		 *   mode 1 留1个 — at most one blank line between paragraphs, trailing
		 *                  blank lines stripped (default)
		 *   mode 2 全删  — no blank lines at all, paragraphs stay on their own
		 *                  lines (single hard break)
		 *
		 * React owns the text node; we only rewrite its `nodeValue` after each
		 * render, so streaming re-renders simply re-trigger the pass. The raw
		 * text is remembered per element so switching modes restores exactly.
		 */
		const THINK_BODY_SEL = ".lcKema_thinkBody";
		/** element -> { raw, out } so a mode switch can re-derive from the original. */
		const thinkRecords = /* @__PURE__ */ new WeakMap();
		let thinkMode = DEFAULTS.thinkBlank;
		const normalizeThink = (raw, mode) => {
			if (mode === 0) return raw;
			let text = mode === 2 ? raw.replace(/\n{2,}/gu, "\n") : raw.replace(/\n{3,}/gu, "\n\n");
			return text.replace(/\s+$/u, "");
		};
		const setThinkText = (el, next) => {
			const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
			const first = walker.nextNode();
			if (first === null) {
				el.textContent = next;
				return;
			}
			first.nodeValue = next;
			let extra;
			while ((extra = walker.nextNode()) !== null) extra.nodeValue = "";
		};
		const normalizeOne = (el, force) => {
			const current = el.textContent || "";
			const record = thinkRecords.get(el);
			if (record === void 0) {
				const out = normalizeThink(current, thinkMode);
				thinkRecords.set(el, { raw: current, out });
				if (out !== current) setThinkText(el, out);
				return;
			}
			if (current !== record.out) {
				// React re-rendered (streaming or remount): treat as fresh raw text.
				const out = normalizeThink(current, thinkMode);
				record.raw = current;
				record.out = out;
				if (out !== current) setThinkText(el, out);
				return;
			}
			if (force) {
				const out = normalizeThink(record.raw, thinkMode);
				record.out = out;
				if (out !== current) setThinkText(el, out);
			}
		};
		const thinkPass = (force = false) => {
			if (typeof document === "undefined") return;
			for (const el of document.querySelectorAll(THINK_BODY_SEL)) normalizeOne(el, force);
		};
		// #endregion
		// #region styles
		// Package-owned stylesheet: one <style> tag, keyed by package+module so a
		// hot reload replaces rather than duplicates it.
		//
		// The rules below neutralise every spacing axis the stock chat bundle
		// keeps at different values and route all of them through the five
		// --dsh-csg-* variables, which the Settings row rewrites live:
		//
		//   A. conversation flow gap (16px official, 8px `data-turn-process-answer`
		//      exception, 8px collapsed process row)            -> --dsh-csg-gap
		//   B. expanded reasoning body padding (4px / 22px)      -> --dsh-csg-body-v + --dsh-csg-indent
		//   C. expanded tool bodies (margin 4px 0 4px 4px)       -> the same two variables
		//   D. expanded card borders/radii (0.5px on terminal/io cards only,
		//      none on read/search/web/diff/image bodies)        -> --dsh-csg-card-border + --dsh-csg-card-radius
		//   E. Block component radius variables (--dsl-*-radius: 12px each)
		//   F. subcall tree indent/margins
		//   G. reasoning row summary line-height (20px vs tool rows' 24px)
		//   H. reasoning blank lines (`thinkBlank`, DOM text pass — see the
		//      normaliser region below; not a CSS variable)
		//
		// NOTE: the selectors are CSS-Modules hashes of dsh-client-ui-chat and
		// dsh-client-ui-tool. They are stable for a given bundle version; after a
		// DSH upgrade, re-check the hash prefixes against the installed
		// packages' lib/client.js:
		//   chat:  EvIC1a hWmORq lcKema _5OnbHa XrJvXW l_V-RG TS9iAW
		//   tool:  o3BgMG fsXYAq ztWv_q
		const INDENT = "calc(var(--dsh-csg-indent) + var(--dsh-content-font-delta, 0px))";
		const css = `
:root{--dsh-csg-gap:${DEFAULTS.gap}px;--dsh-csg-indent:${DEFAULTS.indent}px;--dsh-csg-body-v:${DEFAULTS.bodyV}px;--dsh-csg-card-border:${DEFAULTS.cardBorder}px;--dsh-csg-card-radius:${DEFAULTS.cardRadius}px}
/* A. Conversation flow: one uniform gap between every visible flow block. */
.EvIC1a_column>:not([hidden]):not(.EvIC1a_flowItem:empty)~:not([hidden]):not(.EvIC1a_flowItem:empty){margin-top:var(--dsh-csg-gap)!important}
/* Process nodes used to shadow the gap with a hard 8px; fold them back in. */
.EvIC1a_flowItem[data-turn-process-answer]{--dsh-chat-flow-gap:var(--dsh-csg-gap)!important}
/* Assistant markdown body: paragraph/block rhythm. */
.hWmORq_body{gap:var(--dsh-csg-gap)!important}
.hWmORq_body>[data-turn-process-inline][hidden]{margin-bottom:calc(-1 * var(--dsh-csg-gap))!important}
/* Assistant message hover-actions row. */
.hWmORq_actions{margin-top:var(--dsh-csg-gap)!important}
/* Collapsed run/tool row carried its own bottom margin. */
.l_V-RG_root:not([data-open]){margin-bottom:var(--dsh-csg-gap)!important}
/* Turn tail container. */
.TS9iAW_root{gap:var(--dsh-csg-gap)!important}
/* B. Expanded reasoning (沉思) body: one indent + one vertical padding. */
.lcKema_thinkBody{padding:var(--dsh-csg-body-v) 0 var(--dsh-csg-body-v) ${INDENT}!important}
/* C. Expanded tool bodies: the seven o3BgMG bodies share one stock rule. */
.o3BgMG_codeBody,.o3BgMG_terminalBody,.o3BgMG_diffBody,.o3BgMG_readBody,.o3BgMG_imageBody,.o3BgMG_searchBody,.o3BgMG_webBody{margin:var(--dsh-csg-body-v) 0 var(--dsh-csg-body-v) ${INDENT}!important}
.o3BgMG_searchRecovery{margin:var(--dsh-csg-body-v) 0 var(--dsh-csg-body-v) ${INDENT}!important}
.o3BgMG_imageLabel{margin-bottom:var(--dsh-csg-body-v)!important}
.o3BgMG_inspectButton{margin:var(--dsh-csg-body-v) 0 0 ${INDENT}!important}
.o3BgMG_ioCard{margin:var(--dsh-csg-body-v) 0 var(--dsh-csg-body-v) ${INDENT}!important}
/* D. Expanded cards: one border width + one radius across every body family. */
.o3BgMG_ioCard,.o3BgMG_terminalBody{border-width:var(--dsh-csg-card-border)!important;border-radius:var(--dsh-csg-card-radius)!important}
.o3BgMG_readBody,.o3BgMG_searchBody,.o3BgMG_webBody,.o3BgMG_diffBody,.o3BgMG_imageBody{border:var(--dsh-csg-card-border) solid var(--dsw-alias-border-l1)!important;border-radius:var(--dsh-csg-card-radius)!important}
.fsXYAq_card{border-width:var(--dsh-csg-card-border)!important;border-radius:var(--dsh-csg-card-radius)!important;margin:var(--dsh-csg-body-v) 0 var(--dsh-csg-body-v) ${INDENT}!important}
._5OnbHa_body{border-width:var(--dsh-csg-card-border)!important;border-radius:var(--dsh-csg-card-radius)!important;margin:var(--dsh-csg-body-v) 0 var(--dsh-csg-body-v) ${INDENT}!important}
.XrJvXW_body{border-radius:var(--dsh-csg-card-radius)!important;margin:var(--dsh-csg-body-v) 0 var(--dsh-csg-body-v) ${INDENT}!important}
/* E. Block component radius variables (consumer className lands on the block root). */
.o3BgMG_readBody{--dsl-read-radius:var(--dsh-csg-card-radius)!important}
.o3BgMG_searchBody{--dsl-search-radius:var(--dsh-csg-card-radius)!important}
.o3BgMG_webBody{--dsl-web-radius:var(--dsh-csg-card-radius)!important}
.o3BgMG_diffBody{--dsl-diff-radius:var(--dsh-csg-card-radius)!important}
.o3BgMG_terminalBody{--dsl-terminal-radius:var(--dsh-csg-card-radius)!important}
/* F. Subcall tree: same indent axis, same vertical margins. */
.ztWv_q_subCalls{margin:var(--dsh-csg-body-v) 0 var(--dsh-csg-body-v) ${INDENT}!important}
/* G. Reasoning row summary: 20px line-height -> the tool rows' 24px pitch. */
.lcKema_summary{line-height:calc(24px + var(--dsh-content-font-delta,0px))!important}
/* I. Assistant markdown bodies carry a trailing EMPTY markdown div (the step's
   last text block is empty); the body's flex gap then charges a full gap for
   nothing, which is why text->tool transitions measured ~12px looser than
   tool->text. Hide empty direct children: refilled ones reappear by themselves
   (no longer :empty), so streaming is unaffected. */
.hWmORq_body>:empty{display:none!important}
/* H. Settings row (this package's own surface, DSH-consistent tokens). */
.csg-row{border-bottom:.5px solid var(--dsw-alias-border-l2);align-items:flex-start;gap:8px 16px;padding:16px 0;display:flex;flex-wrap:wrap}
.csg-rowText{flex-direction:column;flex:1 1 240px;gap:4px;min-width:0;display:flex}
.csg-title{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:400;line-height:22px}
.csg-desc{color:var(--dsw-alias-label-tertiary);font-size:12px;font-weight:400;line-height:18px}
.csg-controls{flex:0 1 auto;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:8px 16px;display:flex}
.csg-ctl{align-items:center;gap:6px;display:inline-flex}
.csg-ctlLabel{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;white-space:nowrap}
.csg-stepper{background:var(--dsw-alias-bg-module-platform);border-radius:18px;align-items:center;height:36px;padding:0 4px;display:inline-flex}
.csg-btn{width:28px;height:28px;color:var(--dsw-alias-label-primary);cursor:pointer;background:0 0;border:none;border-radius:50%;justify-content:center;align-items:center;padding:0;font-size:16px;line-height:1;display:inline-flex}
.csg-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.csg-btn:disabled{color:var(--dsw-alias-label-caption);cursor:default}
.csg-value{text-align:center;font-variant-numeric:tabular-nums;min-width:34px;color:var(--dsw-alias-label-primary);font-size:14px;line-height:22px}
.csg-unit{color:var(--dsw-alias-label-secondary);font-size:14px;line-height:22px}
.csg-reset{color:var(--dsw-alias-state-business-primary);cursor:pointer;background:0 0;border:none;border-radius:8px;padding:4px 6px;font-size:13px;line-height:20px}
.csg-reset:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.csg-reset:disabled{color:var(--dsw-alias-label-caption);cursor:default}
`;
		const styleTagId = "dsh-chat-spacing/styles";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(styleTagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-chat-spacing";
			tag.dataset.pluginCss = styleTagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		// #endregion
		// #region locale
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"title": "会话行距与展开边框",
			"description": "统一对话流间隙，以及思考（沉思）/工具调用展开体的缩进、边距与卡片边框",
			"gap": "流间隙",
			"indent": "展开缩进",
			"bodyV": "展开边距",
			"cardBorder": "卡片边框",
			"cardRadius": "卡片圆角",
			"thinkBlank": "思考空行",
			"thinkBlank.keep": "保留",
			"thinkBlank.one": "留1个",
			"thinkBlank.none": "全删",
			"increase": "增大",
			"decrease": "减小",
			"reset": "恢复默认",
			"unit": "px"
		};
		const en = {
			"title": "Chat spacing & expanded borders",
			"description": "Unify the conversation flow gap and the indent, margins and card borders of expanded reasoning / tool-call bodies",
			"gap": "Flow gap",
			"indent": "Body indent",
			"bodyV": "Body margin",
			"cardBorder": "Card border",
			"cardRadius": "Card radius",
			"thinkBlank": "Thinking blanks",
			"thinkBlank.keep": "Keep",
			"thinkBlank.one": "One",
			"thinkBlank.none": "None",
			"increase": "Increase",
			"decrease": "Decrease",
			"reset": "Reset",
			"unit": "px"
		};
		// #endregion
		// #region settings row
		/** Compact numeric display: integers bare, half-steps with one decimal. */
		const formatValue = (control, value, t) => {
			if (control.labels !== void 0) return t(control.labels[value] ?? String(value));
			return Number.isInteger(value) ? String(value) : value.toFixed(1);
		};
		/**
		 * General Settings row for all five spacing knobs: one stepper per
		 * control plus a reset. Reads live values from the plugin (never from an
		 * optimistic echo) so the displayed numbers always match what the
		 * transcript is actually using.
		 * @param props - composed Settings slot props.
		 * @returns the preference row.
		 */
		function SpacingRow(props) {
			const t = props.t;
			const [values, setValues] = (0, react.useState)(() => props.getValues());
			(0, react.useEffect)(() => props.subscribe(() => setValues(props.getValues())), [props]);
			const isDefault = CONTROLS.every((c) => values[c.field] === c.def);
			const nudge = (field, delta) => {
				props.setValue(field, values[field] + delta);
			};
			return (0, react_jsx_runtime.jsxs)("div", {
				className: "csg-row",
				children: [(0, react_jsx_runtime.jsxs)("div", {
					className: "csg-rowText",
					children: [(0, react_jsx_runtime.jsx)("div", {
						className: "csg-title",
						children: t("title")
					}), (0, react_jsx_runtime.jsx)("div", {
						className: "csg-desc",
						children: t("description")
					})]
				}), (0, react_jsx_runtime.jsxs)("div", {
					className: "csg-controls",
					children: [CONTROLS.map((control) => (0, react_jsx_runtime.jsxs)("div", {
						className: "csg-ctl",
						children: [(0, react_jsx_runtime.jsx)("span", {
							className: "csg-ctlLabel",
							children: t(control.field)
						}), (0, react_jsx_runtime.jsxs)("div", {
							className: "csg-stepper",
							children: [(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "csg-btn",
								"aria-label": `${t("decrease")} ${t(control.field)}`,
								disabled: values[control.field] <= control.min,
								onClick: () => nudge(control.field, -control.step),
								children: "−"
							}), (0, react_jsx_runtime.jsx)("span", {
								className: "csg-value",
								children: formatValue(control, values[control.field], t)
							}), (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "csg-btn",
								"aria-label": `${t("increase")} ${t(control.field)}`,
								disabled: values[control.field] >= control.max,
								onClick: () => nudge(control.field, control.step),
								children: "+"
							})]
						})]
					}, control.field)), (0, react_jsx_runtime.jsx)("span", {
						className: "csg-unit",
						children: t("unit")
					}), (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "csg-reset",
						disabled: isDefault,
						onClick: () => props.reset(),
						children: t("reset")
					})]
				})]
			});
		}
		// #endregion
		// #region plugin
		const inject = [
			"slots",
			"locale",
			"settingsScope",
			"remote"
		];
		/**
		 * Client plugin body: own every spacing preference and write the values
		 * onto the document root so the package stylesheet follows them live.
		 * @param ctx - client cordis context.
		 */
		function apply(ctx) {
			/** Durable preference scope; absent compositions fall back to process-local. */
			let host;
			try {
				host = ctx.settingsScope.bind({ namespace: SETTINGS_NAMESPACE });
			} catch (error) {
				host = void 0;
			}
			/** Live values — the single source the Settings row and the stylesheet read. */
			let current = { ...DEFAULTS };
			/** Subscribers notified whenever any live value changes. */
			const listeners = /* @__PURE__ */ new Set();
			const writeVars = () => {
				if (typeof document === "undefined") return;
				for (const control of CONTROLS) {
					if (control.cssVar === null) continue;
					document.documentElement.style.setProperty(control.cssVar, current[control.field] + "px");
				}
			};
			const publish = () => {
				for (const listener of [...listeners]) {
					try {
						listener();
					} catch (error) {}
				}
			};
			/** Adopt the scope's accepted durable values without writing them back. */
			const adopt = () => {
				const section = host === void 0 ? void 0 : host.getSnapshot().value;
				const next = { ...DEFAULTS };
				if (section !== void 0 && section !== null) {
					for (const control of CONTROLS) {
						const raw = section[control.field];
						if (typeof raw === "number" && Number.isFinite(raw)) next[control.field] = clampOne(control, raw);
					}
				}
				const changed = CONTROLS.some((c) => next[c.field] !== current[c.field]);
				if (!changed) return;
				current = next;
				writeVars();
				if (next.thinkBlank !== thinkMode) {
					thinkMode = next.thinkBlank;
					thinkPass(true);
				}
				publish();
			};
			// Publish the defaults immediately so the stylesheet is live even before
			// the host settings document resolves.
			writeVars();
			thinkMode = current.thinkBlank;
			if (host !== void 0) {
				ctx.effect(() => host.subscribe(adopt), "chat-spacing: settings scope adoption");
				adopt();
			}
			// Reasoning text is owned by React; re-normalise after every render.
			if (typeof document !== "undefined" && typeof MutationObserver !== "undefined") {
				const observer = new MutationObserver(() => thinkPass(false));
				observer.observe(document.body, { childList: true, subtree: true, characterData: true });
				ctx.effect(() => () => observer.disconnect(), "chat-spacing: reasoning normaliser");
				thinkPass(false);
			}
			/**
			 * Change one knob. The live value publishes before the durable write
			 * starts; writes go through the settings scope when one is composed.
			 * @param field - control field name.
			 * @param value - requested px value; clamped and stepped.
			 */
			const setValue = (field, value) => {
				const control = CONTROLS.find((c) => c.field === field);
				if (control === void 0) return;
				const next = clampOne(control, value);
				if (next === current[field]) return;
				current = { ...current, [field]: next };
				writeVars();
				if (field === "thinkBlank") {
					thinkMode = next;
					thinkPass(true);
				}
				publish();
				if (host !== void 0) {
					try {
						host.set(field, next);
					} catch (error) {}
				}
			};
			const getValues = () => ({ ...current });
			const subscribe = (listener) => {
				listeners.add(listener);
				return () => listeners.delete(listener);
			};
			/** Restore every knob to its stock-official default. */
			const reset = () => {
				for (const control of CONTROLS) setValue(control.field, control.def);
			};
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "chat-spacing: dictionaries");
			ctx.slots.inject("settings.general.item", () => ctx.slots.register({
				name: "settings.general.item",
				id: "chat-spacing",
				order: 12,
				locale: NS,
				inject: () => ({
					getValues,
					subscribe,
					setValue,
					reset
				})
			}, SpacingRow));
		}
		// #endregion
		exports.SpacingRow = SpacingRow;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
