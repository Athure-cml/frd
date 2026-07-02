---
name: 福瑞多报价系统
description: 面向内部销售的现代简洁 B2B 报价管理后台
colors:
  primary: "#006FE6"
  primary-hover: "#005FCC"
  primary-active: "#004FA8"
  neutral-bg: "#FFFFFF"
  neutral-bg-deep: "#EEF1F5"
  neutral-ink: "#32383C"
  neutral-muted: "#71717A"
  neutral-border: "#E4E4E7"
  success: "#4CD080"
  warning: "#F0B429"
  destructive: "#FF4D4F"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "normal"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "normal"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FAFAFA"
    rounded: "{rounded.lg}"
    padding: "4px 15px"
    height: "32px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "#FAFAFA"
    rounded: "{rounded.lg}"
  button-default:
    backgroundColor: "{colors.neutral-bg}"
    textColor: "{colors.neutral-ink}"
    rounded: "{rounded.lg}"
    padding: "4px 15px"
    height: "32px"
  input-default:
    backgroundColor: "{colors.neutral-bg}"
    textColor: "{colors.neutral-ink}"
    rounded: "{rounded.lg}"
    padding: "4px 11px"
    height: "32px"
  card-default:
    backgroundColor: "{colors.neutral-bg}"
    textColor: "{colors.neutral-ink}"
    rounded: "{rounded.xl}"
    padding: "{spacing.md}"
---

# Design System: 福瑞多报价系统

## 1. Overview

**Creative North Star: "The Precision Workbench"（精准工作台）**

福瑞多报价系统的视觉语言建立在 Vben Admin + Ant Design Vue 之上，服务于内部销售的高频操作场景。整体气质是现代简洁的 B2B SaaS 工具：白底与冷灰分区建立清晰的工作台面感，单一品牌蓝作为行动锚点，信息密度适中但不拥挤。

系统明确拒绝 PRODUCT.md 中列出的泛 AI 审美（奶油背景、渐变文字、过度圆角卡片堆叠）、消费级 App 娱乐化视觉，以及营销落地页式的大 Hero 叙事。设计服务于「快速、准确、可预期」的报价工作流，而非视觉表演。

**Key Characteristics:**

- 克制用色：主色蓝出现在主操作、链接与选中态，屏幕占比 ≤10%
- 冷灰分区：内容区使用 `--background-deep`（#EEF1F5）与白色卡片形成层次，而非暖色奶油底
- 系统字体栈：无装饰性展示字体，保证数字与表格的可读性
- 8px 圆角基准：与 Ant Design 默认一致，圆润但不过度「胶囊化」
- 状态语义色：成功/警告/危险沿用 Vben 令牌，配合图标与文案双重编码

## 2. Colors

冷静、专业的 B2B 工具调色板：高对比正文 + 低饱和中性底 + 单一行动蓝。

### Primary

- **Action Blue** (#006FE6 / `hsl(212 100% 45%)`): 主按钮、链接（`.vben-link`）、选中菜单项、进度条。报价系统中的「提交」「保存」「新建报价」等主操作。
- **Action Blue Hover** (#005FCC / `hsl(212 100% 40%)`): 主按钮悬停与链接悬停态。
- **Action Blue Active** (#004FA8 / `hsl(212 100% 35%)`): 按下与激活态。

### Neutral

- **Canvas White** (#FFFFFF / `hsl(0 0% 100%)`): 页面底色、卡片、输入框、侧栏与顶栏背景。
- **Workbench Gray** (#EEF1F5 / `hsl(216 20% 95%)`): 主内容区背景（`--background-deep`），与白色卡片形成分区。
- **Ink Body** (#32383C / `hsl(210 6% 21%)`): 正文、表格数据、表单标签。报价金额与关键字段使用此色或更重字重。
- **Muted Label** (#71717A / `hsl(240 4% 46%)`): 辅助说明、占位符、次要元数据。禁止用于正文长段落。
- **Hairline Border** (#E4E4E7 / `hsl(240 6% 90%)`): 卡片边框、表格分割线、输入框描边。

### Semantic (Status)

- **Confirmed Green** (#4CD080): 报价已确认、操作成功。
- **Pending Amber** (#F0B429): 待审核、即将过期提醒。
- **Alert Red** (#FF4D4F): 删除、作废、校验错误。

### Named Rules

**The One Voice Rule.** 主色蓝在任意屏幕上的视觉占比不超过 10%。它的稀缺性即是强调；禁止用渐变或大面积色块稀释主色语义。

**The Cool Canvas Rule.** 工作区背景使用冷灰 `#EEF1F5`，禁止奶油/米色/暖纸色（OKLCH L 0.84–0.97, C < 0.06, hue 40–100）作为大面积底色。

## 3. Typography

**Display Font:** System UI Sans（-apple-system, Segoe UI, Roboto, Helvetica Neue, Arial）
**Body Font:** System UI Sans（同上）
**Label Font:** System UI Sans（同上，14px / 500）

**Character:** 中性、高效、无个性装饰。数字与表格优先可读性；不使用展示性衬线或几何展示字体。

### Hierarchy

- **Display** (600, 1.5rem / 24px, 1.25): 页面主标题，如「报价单列表」「新建报价」。
- **Headline** (600, 1.25rem / 20px, 1.35): 卡片标题、弹窗标题、分区标题。
- **Title** (500, 1rem / 16px, 1.4): 表头、表单分组标题、侧栏一级菜单。
- **Body** (400, 16px, 1.5): 正文、表格单元格、表单输入。长文本行宽控制在 65–75ch。
- **Label** (500, 14px, 1.4): 表单标签、按钮文字、徽章。菜单字号 `calc(16px * 0.875)` = 14px。

### Named Rules

**The Tabular Numbers Rule.** 报价金额、数量、折扣、合计等数字列使用等宽数字（`font-variant-numeric: tabular-nums`）或 Ant Design Table 默认对齐，确保纵向扫描时小数点对齐。

## 4. Elevation

本系统以**色调分层**为主、**阴影**为辅。深度通过背景色差异（白卡片浮于 `#EEF1F5` 工作区）传达，而非厚重投影。

弹层（Modal、Dropdown、Popover）使用 Ant Design 默认阴影；卡片默认仅 1px 描边（`border-border`），悬停时可叠加轻微阴影。

### Shadow Vocabulary

- **Float** (`0 6px 16px 0 rgb(0 0 0 / 8%), 0 3px 6px -4px rgb(0 0 0 / 12%), 0 9px 28px 8px rgb(0 0 0 / 5%)`): 下拉菜单、悬浮操作面板。
- **None at rest**: 表格行、列表项、静态卡片默认无阴影。

### Named Rules

**The Flat-By-Default Rule.** 表面默认平坦。阴影仅作为交互反馈（悬停、展开、弹层）出现，禁止用阴影堆叠制造假层次。

## 5. Components

整体基于 Ant Design Vue 组件 + Vben 布局封装。扩展时优先复用现有组件，保持交互模式一致。

### Buttons

- **Shape:** 适度圆角（8px / `--radius`）
- **Primary:** Action Blue 背景 + 白色文字，高度 32px，水平内边距 15px。用于「保存报价」「提交审核」。
- **Hover / Focus:** 背景加深至 #005FCC；焦点环使用 `--ring`。
- **Default:** 白底 + 描边 + Ink Body 文字。用于次要操作如「取消」「导出预览」。
- **Danger:** Alert Red 背景。用于「作废」「删除」等不可逆操作，需二次确认。

### Cards / Containers

- **Corner Style:** 12px（`rounded-xl`，`.card-box`）
- **Background:** Canvas White
- **Shadow Strategy:** 默认无阴影，1px Hairline Border
- **Internal Padding:** 16px（`spacing.md`）

### Inputs / Fields

- **Style:** 白底、Hairline Border 描边、8px 圆角、高度 32px
- **Focus:** 主色蓝描边 + 轻微外发光（Ant Design `:focus` 态）
- **Error:** Alert Red 描边 + 下方错误文案
- **Placeholder:** Muted Label 色，对比度仍须满足 WCAG AA

### Navigation

- **Sidebar:** Canvas White 背景，14px 菜单字号，选中项 Action Blue 文字/背景高亮
- **Header:** 白底 + 底部分割线，面包屑与用户信息右对齐
- **Tabs:** 用于报价单详情多分区（基本信息 / 明细 / 附件 / 历史）

### Data Tables

- **Style:** Ant Design Table，斑马纹可选，表头 Title 字重
- **Numeric columns:** 右对齐 + 等宽数字
- **Status column:** 语义色 Tag + 文字标签（不仅依赖颜色）

## 6. Do's and Don'ts

### Do:

- **Do** 使用 Vben 设计令牌（`--primary`、`--background-deep`、`--border`）保持一致性。
- **Do** 主操作使用 Primary 按钮，每屏最多一个视觉主 CTA。
- **Do** 报价金额使用等宽数字与右对齐，确保扫描效率。
- **Do** 状态反馈配合图标 + 文案 + 颜色三重编码。
- **Do** 尊重 `prefers-reduced-motion`，动画仅用于状态切换反馈。

### Don't:

- **Don't** 使用泛 AI 审美：奶油/米色大面积背景、渐变文字、过度圆角卡片堆叠、无意义装饰动效。
- **Don't** 采用消费级 App 风格：大插画、花哨转场、娱乐化视觉。
- **Don't** 套用营销落地页套路：大 Hero、滚动叙事、与后台工作流无关的视觉表演。
- **Don't** 用 `border-left` 大于 1px 的彩色竖条做卡片/列表强调。
- **Don't** 用 Muted Label 色写正文长段落（对比度不足）。
- **Don't** 嵌套卡片（card in card）；用间距与分割线区分层级。
