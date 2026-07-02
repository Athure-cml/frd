# 报价单业务视图与导出模板

> 业务确认（2026-06）：**按进口/进入地点区分列**；**熏蒸单独一列**；**同一客户、多条线路 = 一张报价单多行**。  
> 架构约束见 [QUOTE.md](./QUOTE.md)：**只读行内快照**，不实时 join 成本库。

---

## 1. 核心概念（先读这个）

### 1.1 不是「陆运 vs 海运两套报价单」

业务给的两张 Excel 表头，差异在于 **线路/进入地点不同、费用项不同**，不是系统里的「运输方式 = 卡车 / 海运」二选一。

| 误区 | 正确理解 |
|------|----------|
| 一张陆运单、一张海运单 | 一张单可同时含海运费 + 卡车费（门到门） |
| 每个客户固定出两份方案 | 一个客户、询两条线 → **一张报价单、多行** |
| 表头按运输方式切换 | 表头按 **报价行模板 / 进入地点** 切换 |

### 1.2 一张报价单 = 多行

```text
报价单 QT-2026-0002（客户 A）
├── 第 1 行：POL 美东 → POD 上海（需显示熏蒸费）
├── 第 2 行：POL 美东 → POD 胡志明（不显示熏蒸费）
└── 第 3 行：…（另一目的地 Zip/City）
```

- **报价头**：客户、有效期、币种、备注等（一份）
- **报价行**：每行对应业务 Excel 的 **一行**，可来自成本库引用 + 手填补充
- 同一客户询两条线：**不拆两张单**，在同一单里加行

### 1.3 区分维度：进入地点（进口侧）

木材等业务按 **货物从哪个口岸/地区进入** 决定常规费用项，例如：

| 进入地点（示例） | 熏蒸费 | 说明 |
|------------------|--------|------|
| 上海 `SHA` | **要** | 单独一列展示 |
| 越南（如胡志明等） | **不要** | 该列隐藏或留空 |

实现上每行带 `entryPoint`（或直接用 `pod` / 目的港代码），由 **报价行模板** 决定显示哪些列。

---

## 2. 报价行模板（Sheet Template）

系统预置多种 **列布局模板**，编辑页与导出共用同一套列定义。

### 2.1 模板一览

| 模板 ID | 名称 | 典型场景 | 与业务 Excel 对应 |
|---------|------|----------|-------------------|
| `US_INLAND_FULL` | 美国内陆完整版 | 美东港口 + 美国内陆派送，区分 OAK / NON OAK | 15 列长表头（含 TRUCKING NON OAK/OAK、FM） |
| `SEA_TRUCK_SIMPLE` | 海运+卡车简版 | 内陆段合并一列 `TRUCKING` | 13 列短表头 |
| `*_WITH_FUMIGATION` | 含熏蒸列 | 进入上海等需熏蒸口岸 | 在对应模板基础上 **增加「熏蒸」列** |

模板可按 **进入地点规则** 自动推荐，也允许业务在行上手动改模板。

### 2.2 条件列：熏蒸（Fumigation）

| 属性 | 约定 |
|------|------|
| 表头（中） | 熏蒸费 |
| 表头（英，导出） | `Fumigation (USD)` 或与业务 Excel 对齐 |
| 字段键 | `fumigationUsd` |
| 显示规则 | `entryPoint` ∈ 需熏蒸地点列表（如 `SHA`、上海相关码）→ **显示**；越南等 → **不显示** |
| 数据来源 | 手填、杂费成本、或主数据「口岸费用」快照（二期） |

**注意**：样本 Excel 中的 `FM NON OAK` / `FM OAK` 表示 **First Mile（前置段）**，与 **熏蒸** 是不同费用项；熏蒸为业务新确认的 **独立列**。

### 2.3 模板列对比（摘要）

**公共列（各模板共有）**

| 字段键 | 表头（英） | 说明 |
|--------|------------|------|
| `zipCode` | Zip code | 目的地邮编 |
| `city` | City | 城市 |
| `state` | State | 州/省 |
| `por` | POR | 收货地 |
| `pol` | POL | 起运港 |
| `pod` | POD | 卸货港 / 进入港 |
| `oceanFreightUsd` | O/F (USD) | 海运费，多柜型用 `/` |
| `ssl` | SSL | 船公司 |
| `docUsd` | DOC (USD) | 单证费 |
| `cargoMaxWeight` | CARGO Max weight (ton) | 货重说明 |
| `remark` | REMARK | 行备注 |

**`US_INLAND_FULL` 额外列**

| `truckingNonOakUsd` | TRUCKING NON OAK (USD) |
| `truckingOakUsd` | TRUCKING OAK (USD) |
| `fmNonOak` | FM NON OAK |
| `fmOak` | FM OAK |

**`SEA_TRUCK_SIMPLE` 额外列**

| `truckingUsd` | TRUCKING (USD) | 内陆卡车合并一列 |

**条件列（按进入地点）**

| `fumigationUsd` | Fumigation (USD) / 熏蒸费 | 仅上海等需要熏蒸的口岸 |

---

## 3. 样本行（美国内陆完整版）

POD = `SHA`（进入上海），该行 **应显示熏蒸费**（样本未画该列，以业务最新要求为准）。

| 列 | 值 |
|----|-----|
| Zip code | `44287` |
| City | `west Salem` |
| State | `OH` |
| POR | `COLUMBUS` |
| POL | `NOR/NY` |
| POD | `SHA` |
| O/F (USD) | `700/750/775` |
| SSL | `YML/EMC/COSCO` |
| TRUCKING NON OAK (USD) | `1320` |
| TRUCKING OAK (USD) | `1400` |
| FM NON OAK | `960` |
| FM OAK | `1390` |
| Fumigation (USD) | （上海行填写，越南行留空/隐藏列） |
| DOC (USD) | `300/BILL` |
| CARGO Max weight (ton) | `OW MAX52000LBS` |
| REMARK | `OF SUBJECT TO GRI /BUC …` |

---

## 4. 与系统数据的关系

### 4.1 报价头 `quote_order`

| 字段 | 用途 |
|------|------|
| `customerId` / `customerName` | 客户（一张单一个客户） |
| `currency` / `baseCurrency` / `exchangeRate` | 币种与汇率快照 |
| `transportMode` | 仍表示 **主要从哪类成本库选价**（海运单以 `SEA` 为主，可引卡车成本填内陆列） |
| `remark` | 整单备注 |

### 4.2 报价行 `quote_order_line`（每行 = 业务表一行）

| 字段 | 用途 |
|------|------|
| `cost_mode` / `cost_ref_id` | 引用成本库（可多条成本拼一行，或一行对应一条主成本） |
| `extra_json.costSnapshot` | 快照 |
| `extra_json.sheetTemplate` | 行模板 ID，如 `US_INLAND_FULL` |
| `extra_json.entryPoint` | 进入地点代码，如 `SHA`、`VNSGN` |
| `extra_json.sheetFields` | 业务列手填/覆盖值（熏蒸、DOC、FM 等） |

### 4.3 成本库映射（引用时自动填入）

| 业务列 | 成本来源 |
|--------|----------|
| City / State / POR / POL | `cost_road` |
| TRUCKING NON OAK / OAK | `cost_road.allInNonOak` / `allInOak` |
| POD / O/F / SSL | `cost_sea.destination` / `unitPrice` / `carrier` |
| 熏蒸 / DOC / FM | 默认手填或行 `sheetFields`；二期可挂杂费主数据 |

### 4.4 编辑页展示（Phase 4.5）

- **业务视图表格**：列 = 当前行模板 + 条件列（熏蒸按 `entryPoint`）
- **操作**：从成本库添加、同步单价、删行、手填熏蒸等
- 底层仍保留 `quote_order_line` + 快照，满足 [QUOTE.md](./QUOTE.md) 审计要求

---

## 5. 进入地点 → 熏蒸规则（配置化）

建议主数据或配置文件维护，避免写死在代码里：

```yaml
fumigationRequired:
  - code: SHA
    name: 上海
  - code: CNSHA
    name: 上海港
# 越南等不在列表中 → 不展示熏蒸列
```

行上 `entryPoint` 未设置时，可回退用 `pod` 匹配。

---

## 6. 导出约定

| 项 | 约定 |
|----|------|
| 结构 | 一张 Excel = 一张报价单；**每行 = 一条报价行** |
| 表头 | 按该报价单出现的模板 **取列并集**，或按行模板分 Sheet（默认：单 Sheet，列并集，不适用处留空） |
| 熏蒸列 | 仅当该 **行** 的进入地点需要熏蒸时填值；越南行在并集表头下该格为空 |
| 权限 | `quote:export` |

---

## 7. 实施分期（更新）

| 阶段 | 内容 | 状态 |
|------|------|------|
| **4.4a** | 类型 + 列配置 + 快照行组装 | 已完成（需按本文升级模板/熏蒸） |
| **4.5a** | 报价编辑页 **业务视图表格**（多行、动态列） | 待做 |
| **4.5b** | 行模板 + `entryPoint` + `sheetFields` 存取 | 待做 |
| **4.5c** | 进入地点 → 熏蒸规则配置 | 待做 |
| **4.4b** | 后端 Excel 导出 | 待做 |
| **4.4c** | 导出按钮 + 权限 | 待做 |

---

## 8. 代码锚点

| 用途 | 路径 |
|------|------|
| 列配置（待升级为多模板） | `src/views/quote/shared/export-template.ts` |
| 报价编辑 | `src/views/quote/editor/` |
| 架构 | [QUOTE.md](./QUOTE.md) |

---

## 9. 仍待业务补充

- [ ] 需熏蒸的 **完整口岸/地点代码列表**（仅上海还是更多？）
- [ ] `FM NON OAK` / `FM OAK` 与成本库字段对应关系
- [ ] 越南线默认用 `SEA_TRUCK_SIMPLE` 还是另一套列？
- [ ] 多柜型 `700/750/775` 的柜型顺序
