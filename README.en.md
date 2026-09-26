# dsh-chat-spacing

简体中文 | [English](README.en.md)

A browser-only DSH plugin that unifies the vertical spacing of the conversation flow — body text, reasoning rows, tool/run rows — and the indent, margins, card borders and radii of their **expanded** bodies, all routed through a handful of CSS variables you can tune live in **Settings → General → Chat spacing & expanded borders**. Removable; installing it changes no official file.

## Why it exists

The shipped bundle keeps several spacing conventions at once, so one screen shows "some tight, some loose, some misaligned":

| Location | Stock value |
| --- | --- |
| Between `ChatView` flow blocks | `16px` |
| Between `[data-turn-process-answer]` process nodes | `8px` (hard-coded exception) |
| `TurnProcessNodeView` collapsed bottom margin | `8px` |
| Expanded reasoning body (`thinkBody`) | `padding: 4px 0 4px 22px` |
| Expanded tool bodies (read/search/web/diff/image/code, seven kinds) | `margin: 4px 0 4px 4px` (indent 4px — misaligned with the 22px row text) |
| Expanded card borders | only terminal / ioCard have `0.5px`, the rest have none |
| Block component radii | `--dsl-*-radius: 12px`, written per component |
| Subcall tree (`subCalls`) | `margin: 4px 0 2px 22px; padding-left: 8px` |
| Reasoning row summary line-height | `20px` (tool rows are `24px`) |

v0.2 routes all of the above through five CSS variables, adjustable live from the settings row:

| Variable | Controls | Default | Range / step |
|---|---|---|---|
| `--dsh-csg-gap` | Conversation flow gap | `12px` | 4–32 / 2 |
| `--dsh-csg-indent` | Expanded body left indent | `22px` (aligns with row text) | 0–40 / 2 |
| `--dsh-csg-body-v` | Expanded body vertical margin | `4px` | 0–16 / 2 |
| `--dsh-csg-card-border` | Expanded card border width | `0.5px` (0 = none) | 0–2 / 0.5 |
| `--dsh-csg-card-radius` | Expanded card radius | `12px` | 0–20 / 2 |
| (not CSS) | Reasoning blank lines | `one` | keep / one / none |

Note: a `0.5px` border is rounded to a `1px` solid line on DPR=1 screens — set "Card border" to `0` for a truly borderless look.

## Reasoning blank lines (v0.2.1)

The stock `ReasoningRow` renders the model's thinking verbatim under `white-space: pre-wrap`, and DeepSeek-class models habitually leave two blank lines between paragraphs and two more at the end (`\n\n\n`) — about 20px per line of pure dead space. CSS cannot delete text, so the plugin normalizes the rendered text node of `.lcKema_thinkBody` with a MutationObserver:

| Mode | Behavior |
|---|---|
| Keep | Raw text untouched |
| One (default) | At most one blank line between paragraphs; trailing blank lines stripped |
| None | No blank lines at all; paragraphs keep their own line breaks |

Only `nodeValue` of text nodes is rewritten (React re-renders re-inject the raw text, the observer re-normalizes — streaming follows automatically); the raw text is remembered per element so switching modes restores exactly. Measured: the gap from a reasoning block to the next element drops from ~76px back to the pure flow gap of 12px.

## Empty markdown placeholder (v0.2.2)

Measurement showed the "body text → tool row" gap was 12px looser than the reverse direction. DOM digging located it: the assistant markdown body (`.hWmORq_body`) always carries a trailing empty markdown div (the step's last text block is empty), and the body is `flex-column + gap`, so the empty div eats a full gap:

```html
<div class="hWmORq_body">
  <div class="markdown"><p>…body…</p></div>
  <div class="markdown"></div>   <!-- eats 12px -->
</div>
```

Fixed with one CSS rule: `.hWmORq_body > :empty { display: none }`. A refilled div is no longer `:empty` and reappears by itself, so streaming is unaffected. Measured after the fix: all flow-gap directions uniform (12px), assistant body heights back to integer 24/48 line heights.

## Install

```bash
dsh plugin --profile web add -w dsh-chat-spacing
```

Manual equivalent: place the package at `<DSH_HOME>/profiles/node_modules/dsh-chat-spacing/` (`package.json` + `lib/index.js` host no-op carrier + `lib/client.js` browser half) and append to the profile's `cordis.patch.yml`:

```yaml
- insert:
    - id: chat-spacing
      name: 'dsh-chat-spacing'
```

After install: **fully quit DeepSeek Harness (including background processes) → restart → hard-refresh the session page with `Ctrl+Shift+R`**.
Upgrading only needs `lib/client.js` and `package.json` replaced; an existing `chat-spacing` row in `cordis.patch.yml` needs no change, and old `gap` values carry over.

Uninstall: delete the three insert lines in `cordis.patch.yml`, or comment out the `id` line. Restoring official spacing takes a restart.

## Settings

One row in **Settings → General** (title: 会话行距与展开边框 / Chat spacing & expanded borders) with steppers plus "Reset". Values are written through DSH's `settingsScope` (namespace `ui-chat-spacing`, fields `gap / indent / bodyV / cardBorder / cardRadius`) into the host user-settings document and survive restarts.

## Measured record (2026-09-26, isolated instance + real session)

- Flow gap: `margin-top` and pitch between all visible flow items are `12px` (the stock 16/8 mix is flattened).
- Expanded bodies (stock): `searchBody` has no border, `ioCard` has a 1px border, both indent 4px (misaligned with the 22px row text).
- Expanded bodies (v2 defaults): both indent `22px`, border unified `0.5px→1px`, radius unified `12px`.
- Tunability: setting indent 8px / border 0 / radius 4px / gap 20px all take effect immediately.

## Maintenance note (read after every DSH upgrade)

The CSS selectors in `lib/client.js` use CSS-Modules hash prefixes from two packages:

```
chat:  EvIC1a( ChatView )  hWmORq( AssistantMarkdown )  lcKema( ReasoningRow )
       _5OnbHa( GenericCommandCard )  XrJvXW( ContextInjectionRow )
       l_V-RG( TurnProcessNodeView )  TS9iAW( TurnTailNodeView )
tool:  o3BgMG( ToolRow )  fsXYAq( AskQuestionCard )  ztWv_q( ToolCallTree )
```

Hashes change with the bundle version. If the settings stop working after a DSH upgrade, re-check these prefixes in `<DSH_HOME>/profiles/node_modules/@deepseek-ai/dsh-client-ui-chat/lib/client.js` and `.../dsh-client-ui-tool/lib/client.js`, then replace the corresponding class names in this plugin's `css` string. One rule (`.hWmORq_body > :empty`) is hash-independent and survives upgrades.

## Known boundaries

- Only the conversation flow and expanded bodies. The composer and the task dock are out of scope.
- Block component internals (line-number column, banner padding) are untouched; only the outer frame's radius/border/position is unified.
- Implemented as CSS overrides (`!important`); no official file is modified, and an official rebuild needs no rollback.

## Compatibility

- DeepSeek Harness `0.1.5-rc.1` (web profile, browser-only)
- Client-side `require` limited to `react` / `react/jsx-runtime` (platform baseline table)

## License

MIT
