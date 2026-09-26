# dsh-chat-spacing

[English](README.en.md) | 简体中文

DSH 会话行距与展开边框插件：把对话流里**正文、思考（沉思）、工具/运行行**之间的垂直间距，
以及这些行**展开后** Bodies 的左缩进、上下边距、卡片边框与圆角，全部统一到少数几个值，
并在「设置 → 通用 → 会话行距与展开边框」里实时调节。

纯浏览器端 UI 插件，装卸即回到官方默认，不改动任何官方文件。

## 为什么需要它

官方 bundle 的间距分多套口径，同一屏里「有的挤、有的空、有的没对齐」：

| 位置 | 官方值 |
| --- | --- |
| `ChatView` 会话流块之间 | `16px` |
| `[data-turn-process-answer]` 过程节点之间 | `8px`（硬编码例外） |
| `TurnProcessNodeView` 折叠态自身下边距 | `8px` |
| 思考行展开体（`thinkBody`） | `padding: 4px 0 4px 22px` |
| 工具行展开体（read/search/web/diff/image/code 七类 body） | `margin: 4px 0 4px 4px`（缩进 4px，与行文本 22px 没对齐） |
| 展开体卡片边框 | 只有 terminal / ioCard 有 `0.5px`，其余没有 |
| Block 组件圆角 | `--dsl-*-radius: 12px` 各写各的 |
| 子调用树（subCalls） | `margin: 4px 0 2px 22px; padding-left: 8px` |
| 思考行摘要行高 | `20px`（工具行是 `24px`） |

v0.2 把以上全部收归到五个 CSS 变量，设置行可实时改：

| 变量 | 控制 | 默认 | 范围/步长 |
| --- | --- | --- | --- |
| `--dsh-csg-gap` | 会话流间隙 | `12px` | 4–32 / 2 |
| `--dsh-csg-indent` | 展开体左缩进 | `22px`（与行文本对齐） | 0–40 / 2 |
| `--dsh-csg-body-v` | 展开体上下边距 | `4px` | 0–16 / 2 |
| `--dsh-csg-card-border` | 展开体卡片边框宽 | `0.5px`（0 = 无边框） | 0–2 / 0.5 |
| `--dsh-csg-card-radius` | 展开体卡片圆角 | `12px` | 0–20 / 2 |
| （非 CSS） | 思考空行 | `留1个` | 保留 / 留1个 / 全删 |

注：`0.5px` 边框在 DPR=1 的屏幕上会被浏览器取整成 `1px` 实线；想要真正无边框请把
「卡片边框」调到 `0`。

## 思考空行（v0.2.1 新增）

官方 `ReasoningRow` 用 `white-space: pre-wrap` 原样渲染模型思考，而 DeepSeek 系模型
习惯在思考**段间和结尾各留 2 个空行**（`\n\n\n`）——每行约 20px，结尾那段纯属死白。
CSS 删不掉文本，所以插件用 MutationObserver 对 `.lcKema_thinkBody` 的文本节点做规整：

| 模式 | 行为 |
| --- | --- |
| 保留 | 不动原文 |
| 留1个（默认） | 段间最多 1 个空行，**结尾空行全删** |
| 全删 | 没有任何空行，段落各自换行 |

实现要点：只改文本节点的 `nodeValue`（React 重渲染会重新代入原文，observer 再次规整，
流式输出自动跟随）；每个元素记住原文，切模式可精确还原。实测：沉思块到下一个元素的
间隙从约 76px 回到纯流间隙 12px。

## 空 markdown 占位（v0.2.2 新增）

实测发现「正文段 → 工具行」间隙比反方向大 12px。DOM 挖掘定位：助手正文块
（`.hWmORq_body`）末尾**总挂着一个空 markdown div**（assistant-step 最后一个 text
block 为空），body 是 `flex-column + gap`，空 div 白吃一整个 gap：

```html
<div class="hWmORq_body">
  <div class="markdown"><p>…正文…</p></div>
  <div class="markdown"></div>   <!-- 空吃 12px -->
</div>
```

修复一行 CSS：`.hWmORq_body > :empty { display: none }`。空 div 被填满时自动不再
`:empty` 而恢复，流式输出不受影响。实测修复后所有方向流间隙一致（12px），助手正文块
高度回到 24/48 的整数行高。

## 安装

```bash
dsh plugin --profile web add -w dsh-chat-spacing
```

等价的手动方式：把包装到 `<DSH_HOME>/profiles/node_modules/dsh-chat-spacing/`（`package.json` + `lib/index.js` 宿主 no-op 载体 + `lib/client.js` 浏览器端），并在 profile 的 `cordis.patch.yml` 追加：

```yaml
- insert:
    - id: chat-spacing
      name: 'dsh-chat-spacing'
```

安装后需**完全退出 DeepSeek Harness（含后台进程）→ 重新启动 → 会话页 `Ctrl+Shift+R` 强刷**。
升级只需覆盖 `lib/client.js` 与 `package.json`；`cordis.patch.yml` 里已有
`chat-spacing` 行的无需改动，旧的 `gap` 设置值自动沿用。

卸载：删掉 `cordis.patch.yml` 里那三行 insert，或把 `id` 一行改成注释。重启即恢复官方间距。

## 设置项

「设置 → 通用」中一行（标题：会话行距与展开边框），五个步进器 + 「恢复默认」。
取值通过 DSH 的 `settingsScope`（namespace `ui-chat-spacing`，字段
`gap / indent / bodyV / cardBorder / cardRadius`）写入 Host 用户设置文档，重启后保留。

## 实测记录（2026-09-26，隔离实例 + 真实会话）

- 流间隙：可见 flowItem 之间 `margin-top` 全部 `12px`、pitch 全部 `12px`（官方 16/8 混合被抹平）。
- 展开体（stock）：`searchBody` 无边框、`ioCard` 有 1px 边框，两者左缩进都是 `4px`（与行文本 22px 错位）。
- 展开体（v2 默认）：两者左缩进 `22px`、边框统一 `0.5px→1px`、圆角统一 `12px`。
- 可调性：把 indent 改 `8px`、border 改 `0`、radius 改 `4px`、gap 改 `20px` 后全部即时跟随。

## 维护提示（升级 DSH 后必看）

`lib/client.js` 里的 CSS 选择器用了两个包的 CSS Modules 哈希前缀：

```
chat:  EvIC1a( ChatView )  hWmORq( AssistantMarkdown )  lcKema( ReasoningRow )
       _5OnbHa( GenericCommandCard )  XrJvXW( ContextInjectionRow )
       l_V-RG( TurnProcessNodeView )  TS9iAW( TurnTailNodeView )
tool:  o3BgMG( ToolRow )  fsXYAq( AskQuestionCard )  ztWv_q( ToolCallTree )
```

哈希随 bundle 版本变化。DSH 升级后如果设置"失灵"，到
`<DSH_HOME>/profiles/node_modules/@deepseek-ai/dsh-client-ui-chat/lib/client.js`
与 `.../dsh-client-ui-tool/lib/client.js` 里重新确认这些前缀，替换本插件 `css`
字符串中对应的类名即可。

## 已知边界

- 只调整会话流与展开体。输入区（composer）、任务清单 dock 不在覆盖范围内。
- Block 组件（ReadBlock/SearchBlock/…）的内部结构（行号列、banner 内边距）不改，
  只统一外框的圆角/边框/位置。
- 走 CSS 覆盖（`!important`），不修改官方文件；官方重新构建时无需回滚。
