# 报价模块架构原则（QUOTE）

> 福瑞多报价系统的核心模型：**内部费率库 + 引用 + 快照 + 状态机**。  
> 与 `PRODUCT.md`（产品定位）、`DESIGN.md`（视觉规范）、`quote-api/docs/AUTHZ.md`（权限）配套使用。  
> 后续 Phase 4.2+ 功能扩展须符合本文约束，避免架构漂移。

---

## 1. 四支柱总览

| 支柱 | 含义 | 一句话 |
|------|------|--------|
| **内部费率库** | 成本侧单一数据源 | 订舱/操作维护，销售只读引用 |
| **引用** | 明细行与成本行的指向关系 | 记「来自哪条成本」，可追溯、可重选 |
| **快照** | 引用时刻的价格固化 | 成本库改价不自动改已保存报价 |
| **状态机** | 报价生命周期与操作边界 | 草稿可改，发出后冻结 |

```text
维护费率库 → 建报价(DRAFT) → 从库引用(记 ref) → 写入快照(记价)
     ↑                              │
     └── 草稿可「同步单价」──────────┘

DRAFT ──提交──▶ PENDING ──审批──▶ SENT ──结果──▶ WON / LOST
                                    └── 过期 ──▶ EXPIRED
```

---

## 2. 内部费率库（Source of Truth for Cost）

### 2.1 是什么

三张成本表构成**内部费率库**，承载公司维护的标价/成本价：

| 运输方式 | 数据表 | API 前缀 | 维护角色（典型） |
|----------|--------|----------|------------------|
| 卡车 `ROAD` | `cost_road` | `/cost-library/road` | 运营、卡车采购 |
| 海运 `SEA` | `cost_sea` | `/cost-library/sea` | 订舱部 |
| 铁路 `RAIL` | `cost_rail` | `/cost-library/rail` | 订舱部 |

### 2.2 边界

- 费率库管**成本侧**数据；报价管**给客户的方案与成交价**。
- 销售在报价页**不得**修改费率库记录（需 `cost:{mode}:edit`，见 AUTHZ）。
- 报价头 `transport_mode` 决定只能从对应成本库选型（`ROAD` 不能引用海运行）。

### 2.3 与模板的关系

成本库**表格模板**仅影响成本列表的列展示与筛选，不改变报价明细结构。成本 Picker 沿用当前模式的 active template 即可。

---

## 3. 引用（Reference）

### 3.1 字段约定

报价明细 `quote_order_line`：

| 字段 | 说明 |
|------|------|
| `cost_mode` | `MANUAL` 手填；`ROAD_REF` / `SEA_REF` / `RAIL_REF` 来自费率库 |
| `cost_ref_id` | 对应 `cost_road.id` / `cost_sea.id` / `cost_rail.id` |
| `cost_mode = MANUAL` 时 | `cost_ref_id` 必须为 `null` |

### 3.2 作用

- **可追溯**：知道该行单价源自哪条成本。
- **可重选**（仅草稿）：替换 `cost_ref_id` 并刷新快照。
- **可检测变更**：对比快照时间与成本行 `updatedAt`，提示「成本已更新」。

### 3.3 软引用

成本行被删除后，报价行**不级联删除**；保留快照价格，UI 提示「原成本已删除」，禁止同步，允许改价或重选。

---

## 4. 快照（Snapshot）

### 4.1 原则

| 时机 | 行为 |
|------|------|
| 首次从费率库添加 | 写入引用 + 写入快照 |
| 草稿内「同步单价」 | 按 `cost_ref_id` 拉最新成本，更新行价与 `extra_json` |
| 提交 / 审批 / 发送后 | 快照即历史凭证，不跟费率库联动 |
| 导出 PDF / Excel | 只读行内数据与快照，不实时查成本库 |

### 4.2 行上字段

除 `cost_ref_id` 外，以下字段参与展示与计价，引用时由映射规则填入，之后可在草稿内微调：

- `item_name`、`spec`、`unit`、`quantity`、`unit_price`、`amount`

### 4.3 `extra_json` 推荐结构

```json
{
  "costSnapshot": {
    "id": 42,
    "updatedAt": "2026-06-30 10:00",
    "supplier": "ABC Trucking",
    "origin": "上海",
    "destination": "洛杉矶"
  },
  "priceSource": "allIn",
  "quotedUnitPrice": 1200.00,
  "currency": "USD"
}
```

| 键 | 说明 |
|----|------|
| `costSnapshot` | 引用时成本行关键字段副本 |
| `priceSource` | 卡车等多费项场景：计价取自哪一列（如 `allIn`、`baseFreight`） |
| `quotedUnitPrice` | 写入快照时的单价，便于审计对比 |
| `currency` | 快照币种（与头 `currency` 不一致时用于警告，见待确认项） |

海运/铁路快照至少包含：`origin`、`destination`、`carrier`、`spec`、`validFrom`、`validTo`、`updatedAt`。

---

## 5. 状态机（Lifecycle）

### 5.1 状态枚举

| 状态 | 含义 |
|------|------|
| `DRAFT` | 草稿 |
| `PENDING` | 待审批 |
| `SENT` | 已发送客户 |
| `WON` | 已成交 |
| `LOST` | 已丢失 |
| `EXPIRED` | 已过期 |

### 5.2 操作矩阵

| 状态 | 改头信息 | 改明细 | 引用/同步成本 | 删除 | 提交 | 审批 | 导出 |
|------|----------|--------|---------------|------|------|------|------|
| `DRAFT` | ✓ | ✓ | ✓ | ✓ | ✓ | — | 可选 |
| `PENDING` | — | — | — | — | — | ✓ | 可选 |
| `SENT` | — | — | — | — | — | — | ✓ |
| `WON` / `LOST` | — | — | — | — | — | — | ✓ |
| `EXPIRED` | — | — | — | — | — | — | 只读 |

> Phase 4.1 已实现：`DRAFT` 可编辑/删除；其余状态只读查看。  
> 提交、审批、过期流转在 Phase 4.3+ 按上表接入。

### 5.3 状态迁移（规划）

```text
DRAFT ──quote:submit──▶ PENDING
PENDING ──quote:approve──▶ SENT  (或驳回回 DRAFT)
SENT ──业务结果──▶ WON | LOST
SENT ──valid_until 到期──▶ EXPIRED
```

已发出报价若要改价：**复制为新草稿**或走正式变更流程，不直接改 `SENT` 行内价格。

---

## 6. 费率库 → 报价明细映射

### 6.1 海运 / 铁路（1:1）

一条成本 → 一条报价明细：

| 成本字段 | 报价字段 |
|----------|----------|
| `origin` + `destination` | `item_name` |
| `spec` | `spec` |
| `unit` | `unit` |
| `unitPrice` | `unit_price` |
| `currency` | 写入快照；可与头 `currency` 对齐 |

### 6.2 卡车（多费项）

`cost_road` 一行含多列费用（`baseFreight`、`fsc`、`allIn` 等）。

**Phase 4.2b（默认）**：选一条成本 + 选一个计价字段（默认 `allIn`）→ 生成 **1 条**明细，`extra_json.priceSource` 记录来源列。

**Phase 4.2d（可选）**：「展开费用项」→ 非空费项列各生成一条明细。

### 6.3 手动明细

杂费、折扣、费率库未覆盖项：`cost_mode = MANUAL`，始终保留入口。

---

## 7. 权限边界

| 能力 | 权限码 |
|------|--------|
| 查看报价 | `quote:view` |
| 新建 / 编辑草稿 | `quote:create` / `quote:edit` |
| 打开成本 Picker | `cost:{mode}:view` |
| 修改费率库 | `cost:{mode}:edit`（不在报价页提供） |
| 提交 | `quote:submit` |
| 审批 | `quote:approve` |
| 导出 | `quote:export` |
| 删除草稿 | `quote:delete` |

数据范围与 AUTHZ 一致：报价列表按 `effective_data_scope`（ALL / DEPT / SELF）过滤。

---

## 8. 实施分期

| 阶段 | 范围 | 状态 |
|------|------|------|
| **4.1** | 列表、草稿 CRUD、菜单、权限按钮 | 已完成 |
| **4.2a** | 海运/铁路成本 Picker + 1:1 映射 + 来源 Tag | 已完成 |
| **4.2b** | 卡车 Picker + 计价字段 + 快照 | 已完成 |
| **4.2c** | 成本变更检测 + 「同步单价」 | 已完成 |
| **4.2d** | 卡车费用展开多行 | 可选 |
| **4.3** | 提交 / 审批、状态迁移 | 待做 |
| **4.5** | 报价业务视图表格（多模板、多行、熏蒸条件列） | 待做（见 [QUOTE-EXPORT.md](./QUOTE-EXPORT.md)） |
| **4.4** | 导出 Excel | 待做 |
| **5.1** | 企业微信邮件：发报价 + 收客户回复挂到报价单 | 待做 |

**4.2 技术倾向**：优先前端 Picker + 现有成本 API + 现有 `PUT /quotes` 保存；必要时再增加 `GET /quotes/cost-preview`。

### 5.1 企业微信邮件（待开发）

通过企业微信自建应用邮件 API，实现报价外发与客户回复回流，回复自动关联到对应报价单。

| 子项 | 说明 |
|------|------|
| **发报价** | 报价详情「发送邮件」→ `compose_send` 将 PDF/Excel 附件发至 `customer.email`；发件人为应用邮箱 |
| **收回复** | 定时轮询 `get_mail_list` + `read_mail` 读取应用收件箱；解析 EML，挂到报价单跟进/邮件线程 |
| **关联规则** | 优先邮件主题/正文中的报价单号；辅以发件人邮箱与 `customer.email` 匹配 |
| **前端** | 发送弹窗（收件人/抄送/预览）；报价详情展示客户回复时间线 |
| **后端** | `WeComTokenService`、`WeComMailService`、发送/收件记录表、异步发送与去重 |
| **权限** | 管理后台：协作 → 邮件 → 可调用接口的应用；应用可见范围覆盖业务员 |
| **参考** | [发送普通邮件](https://developer.work.weixin.qq.com/document/path/97504)、[获取收件箱邮件列表](https://developer.work.weixin.qq.com/document/path/97516)、[获取邮件内容](https://developer.work.weixin.qq.com/document/path/97983) |

**范围外（本期不做）**：读取业务员个人邮箱全量收件、系统内完整邮箱客户端、IMAP 代收。

---

## 9. 反模式（禁止）

- 报价明细**仅**存 `cost_ref_id`，展示时实时 join 成本库单价（破坏快照与审计）。
- 在报价编辑页提供「改成本库」入口（混淆成本维护与报价职责）。
- 非 `DRAFT` 状态静默改价或自动跟成本库同步。
- 为省事去掉 `MANUAL` 行类型，迫使所有费用必须来自费率库。
- 跨 `transport_mode` 引用（如海运单引用卡车成本行）。

---

## 10. 待产品确认

- [x] 同一客户多条线路：**一张报价单多行**（见 [QUOTE-EXPORT.md](./QUOTE-EXPORT.md) §1.2）
- [x] **熏蒸**为独立列；按 **进入地点** 显示（上海要、越南不要）（见 QUOTE-EXPORT §1.3、§2.2）
- [ ] 卡车默认计价字段：固定 `allIn` 还是每次必选？
- [ ] 头 `currency` 与成本 `currency` 不一致：禁止引用、警告、还是记录汇率（二期）？
- [ ] 是否区分**成本价**与**售价**（加价规则、毛利）？
- [ ] 需熏蒸口岸完整列表、`FM` 字段映射、越南线默认表头模板（见 QUOTE-EXPORT §9）

确认后更新本节并进入 Phase 4.5（业务视图表格）开发。

---

## 11. 代码锚点

| 层级 | 路径 |
|------|------|
| 后端实体 | `quote-api/.../quote/entity/QuoteOrder.java`、`QuoteOrderLine.java` |
| 后端 API | `quote-api/.../quote/controller/QuoteController.java` |
| 成本 API | `quote-api/.../cost/controller/Cost*Controller.java` |
| 前端 API | `apps/web-antd/src/api/quote/`、`api/cost/` |
| 列表 / 编辑 | `apps/web-antd/src/views/quote/list/`、`editor/` |
| Excel 导出模板 | [QUOTE-EXPORT.md](./QUOTE-EXPORT.md)、`views/quote/shared/export-template.ts` |
| 权限种子 | `quote-api/.../sys/seed/DataSeeder.java` |
