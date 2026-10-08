<script lang="ts" setup>
import type { SheetRuleField } from '../shared/quote-rule-hints';
import type { SslRemarkLookup } from '../shared/quote-sea-ssl-remark';
import type {
  CostImportContext,
  CostLibraryRecord,
} from '../shared/sheet-cost-import';
import type { OceanFreightEntry } from '../shared/sheet-ocean-freight';

import type { FreightCostRecord, RoadCostRecord } from '#/api/cost';
import type { GlobalPortNameOption } from '#/api/master-data/global-port';
import type {
  QuoteApi,
  QuoteCostType,
  QuoteOakType,
  QuoteServiceType,
  QuoteStatus,
} from '#/api/quote';
import type { QuoteRuleApi } from '#/api/quote-rule';

import {
  computed,
  h,
  nextTick,
  onActivated,
  onMounted,
  onUnmounted,
  reactive,
  ref,
  watch,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';
import { ArrowLeft, Copy, IconifyIcon, Save } from '@vben/icons';

import { useDebounceFn } from '@vueuse/core';
import {
  Button,
  Card,
  DatePicker,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Menu,
  message,
  Modal,
  Select,
  Tag,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import { fumigationCostApi, getRoadCost, seaCostApi } from '#/api/cost';
import { getEnabledCurrencyOptions } from '#/api/currency';
import { getCustomerList } from '#/api/customer';
import { searchGlobalPortNameOptions } from '#/api/master-data/global-port';
import {
  applyQuoteCostImport,
  cancelQuoteApproval,
  createQuote,
  deleteQuote,
  generateQuoteSheet,
  getQuoteDetail,
  previewQuoteDocFee,
  reviseQuote,
  submitQuote,
  updateQuote,
  voidQuote,
  wonQuote,
} from '#/api/quote';
import { getQuoteRuleList } from '#/api/quote-rule';
import { getShippingLineList } from '#/api/shipping-line';
import { $t } from '#/locales';

import { getServiceTypeOptions, resolveQuoteStatusTag } from '../list/data';
import CostLibraryPickerModal from '../shared/cost-library-picker-modal.vue';
import CostSourceTables from '../shared/cost-source-tables.vue';
import { formatQuoteCostRiskHint } from '../shared/format-cost-risk-hint';
import QuoteAuditLogs from '../shared/quote-audit-logs.vue';
import QuoteCitySelect from '../shared/quote-city-select.vue';
import {
  stashQuoteCopySource,
  takeQuoteCopySourceId,
} from '../shared/quote-copy';
import QuoteFumigationStationSelect from '../shared/quote-fumigation-station-select.vue';
import { printQuoteSheet } from '../shared/quote-print';
import QuotePrintSheet from '../shared/quote-print-sheet.vue';
import {
  buildQuoteRuleHintMap,
  buildQuoteRuleSelectOptions,
  hintForSheetField,
} from '../shared/quote-rule-hints';
import QuoteRuleLabel from '../shared/quote-rule-label.vue';
import {
  buildShippingLineRemarkLookup,
  resolveSeaRemarkForRecord,
  resolveSeaSslRemark,
} from '../shared/quote-sea-ssl-remark';
import QuoteSheetEditorSkeleton from '../shared/quote-sheet-editor-skeleton.vue';
import { normalizeUsdFieldValue } from '../shared/quote-sheet-format';
import QuoteStateSelect from '../shared/quote-state-select.vue';
import {
  canDraftCostActions,
  canShowQuoteVoid,
  canShowQuoteWon,
  isQuoteDeletable,
  isQuoteEditable,
  normalizeQuoteStatus,
} from '../shared/quote-status';
import { takeRoadQuoteIntroduceId } from '../shared/road-quote-introduce';
import {
  fetchCostImportFields,
  isActiveCostRecord,
  mergeFumigationCostImport,
  mergeRoadCostImport,
  mergeSeaCostImport,
  pickRoadSheetFields,
  recordToCostMatchItem,
  resolveValidUntilFromSeaRecords,
} from '../shared/sheet-cost-import';
import {
  buildOceanFreightEntries,
  entryFromSeaRecord,
  MAX_OCEAN_FREIGHT_LINES,
  resolveOceanFreightEntries,
  syncSeaMatchRemarks,
  syncSheetFromOceanFreightEntries,
} from '../shared/sheet-ocean-freight';

import '../shared/quote.css';

/** 美国林场→中国固定多式联运，后端字段保留默认值，前端不展示 */
const DEFAULT_TRANSPORT_MODE = 'SEA' as const;

type AiApplyPayload = {
  id: number;
  type: 'fumigation' | 'road' | 'sea';
};

const route = useRoute();
const router = useRouter();
const { hasAccessByCodes } = useAccess();
const canCreate = hasAccessByCodes(['quote:create']);
const canEdit = hasAccessByCodes(['quote:edit']);
const canSubmit = hasAccessByCodes(['quote:submit']);
const canApprove = hasAccessByCodes(['quote:approve']);
const canDelete = hasAccessByCodes(['quote:delete']);

const loading = ref(false);
const actionsReady = ref(false);
const saving = ref(false);
const generating = ref(false);
/** 最近一次加载/保存后的表单内容快照（规范化后），用于判断是否真有未保存改动 */
const savedFormSnapshot = ref('');
const costPickerRef = ref<InstanceType<typeof CostLibraryPickerModal>>();
const auditLogsRef = ref<{ reload: () => Promise<void> }>();
const quoteId = ref<number>();
const quoteNo = ref('');
const operable = ref(false);
const costRiskActive = ref(false);
const costRiskReason = ref('');
const costRiskModes = ref<string[]>([]);
const costRiskModalShown = ref(false);
const status = ref<QuoteStatus>('DRAFT');
const revisionNo = ref(0);
const revisionLabel = ref('');
const changeReason = ref('');
const parentQuoteId = ref<number>();
const currentVersion = ref(true);
const reviseReasonDraft = ref('');
const revising = ref(false);
const customerId = ref<number>();
const customerName = ref('');
const customerOptions = ref<Array<{ label: string; value: number }>>([]);
const serviceTypes = ref<QuoteServiceType[]>([]);
const serviceTypeOptions = computed(() => getServiceTypeOptions());
const oakType = ref<QuoteOakType>();
const hydratingSheet = ref(false);
const oakTypeOptions = computed(() => [
  { label: $t('page.quote.sheet.oak'), value: 'OAK' as const },
  { label: $t('page.quote.sheet.nonOak'), value: 'NON_OAK' as const },
]);
const validUntil = ref<dayjs.Dayjs>();
const currency = ref('USD');
const currencyOptions = ref<Array<{ label: string; value: string }>>([]);
const remark = ref('');
const costMatches = ref<QuoteApi.QuoteCostMatchItem[]>([]);
const portOptions = ref<GlobalPortNameOption[]>([]);
const quoteDate = ref(dayjs());
const quoteRules = ref<QuoteRuleApi.QuoteRule[]>([]);
const ruleHintMap = computed(() =>
  buildQuoteRuleHintMap(quoteRules.value, { por: sheet.por }),
);
const oceanFreightEntries = ref<OceanFreightEntry[]>([]);
const sheetPreviewOpen = ref(false);
const withdrawOpen = ref(false);
const withdrawSubmitting = ref(false);
const withdrawComment = ref('');
const sslRemarkByName = ref<SslRemarkLookup>(new Map());

const cargoInsuranceOptions = ref<Array<{ label: string; value: string }>>([]);
const cargoAgentFeeOptions = ref<Array<{ label: string; value: string }>>([]);

const sheet = reactive<QuoteApi.QuoteSheetFields>({
  zipCode: '',
  city: '',
  state: '',
  pickUpAddress: '',
  por: '',
  pol: '',
  pod: '',
  oceanFreight: '',
  ssl: '',
  truckingFee: undefined,
  truckingNonOakUsd: undefined,
  truckingOakUsd: undefined,
  nsLift: undefined,
  chassis: undefined,
  waiting: undefined,
  redeliveryFee: undefined,
  truckRemark: '',
  fmNonOak: undefined,
  fmOak: undefined,
  fumigationPoint: '',
  docUsd: '',
  cargoInsurancePremium: '',
  cargoAgentFee: '',
  sheetRemark: '',
  cifAmount: undefined,
});

const isCreate = computed(() => route.name === 'QuoteCreate');
const showToolbarActions = computed(() => actionsReady.value);
const canOperate = computed(
  () => showToolbarActions.value && (isCreate.value || operable.value),
);
const readOnly = computed(() => {
  if (isCreate.value) return false;
  if (!canEdit || !canOperate.value) return true;
  return !isQuoteEditable(status.value);
});
const canSave = computed(
  () =>
    canOperate.value &&
    ((isCreate.value && canCreate) ||
      (!isCreate.value && canEdit && !readOnly.value)),
);
const showWorkflowActions = computed(() => !isCreate.value && !!quoteId.value);
const workflowStatus = computed(() => normalizeQuoteStatus(status.value));
const isPendingApproval = computed(
  () => workflowStatus.value === 'PENDING_APPROVAL',
);
const isConfirmedQuote = computed(() => workflowStatus.value === 'SENT');
const showDraftWorkflowActions = computed(
  () =>
    isCreate.value ||
    (showWorkflowActions.value && workflowStatus.value === 'DRAFT'),
);
const showConfirmedToolbar = computed(
  () => showWorkflowActions.value && isConfirmedQuote.value,
);
/** 仅「已确认」且存在成本异常（风险）的当前版本可发起变更 */
const canReviseAction = computed(
  () =>
    canOperate.value &&
    canEdit &&
    canCreate &&
    isConfirmedQuote.value &&
    costRiskActive.value &&
    currentVersion.value !== false,
);
const showPendingApprovalToolbar = computed(
  () => showWorkflowActions.value && isPendingApproval.value,
);
const showReadonlyWorkflowToolbar = computed(
  () =>
    showWorkflowActions.value &&
    !isPendingApproval.value &&
    workflowStatus.value !== 'DRAFT' &&
    !isConfirmedQuote.value,
);
const canCopyAction = computed(() => canCreate);
const canVoidAction = computed(
  () =>
    canOperate.value &&
    canApprove &&
    canShowQuoteVoid(status.value) &&
    !costRiskActive.value,
);
const canConfirmWonAction = computed(
  () => canApprove && canShowQuoteWon(status.value) && !costRiskActive.value,
);
const isSavedDraft = computed(
  () => !isCreate.value && !!quoteId.value && workflowStatus.value === 'DRAFT',
);
const canDeleteAction = computed(
  () =>
    isSavedDraft.value &&
    canOperate.value &&
    canDelete &&
    isQuoteDeletable(status.value),
);
const canUseCostLibrary = computed(
  () =>
    canOperate.value &&
    !readOnly.value &&
    (isCreate.value ? canCreate : canEdit) &&
    canDraftCostActions(isCreate.value, status.value),
);
const canSubmitAction = computed(
  () =>
    isSavedDraft.value &&
    canOperate.value &&
    canSubmit &&
    !costRiskActive.value,
);
const canRollbackAction = computed(
  () => canOperate.value && canSubmit && isPendingApproval.value,
);

const pageTitle = computed(() => {
  if (isCreate.value) {
    return $t('page.quote.createTitle');
  }
  return readOnly.value
    ? $t('page.quote.viewTitle')
    : $t('page.quote.editTitle');
});

const backLabel = computed(() => $t('page.quote.actions.backToList'));

const headerStatusTag = computed(() => {
  const normalized = normalizeQuoteStatus(status.value);
  // 变更中优先正式状态；恢复已确认后若仍有成本风险再显示异常
  if (costRiskActive.value && normalized !== 'REVISING') {
    return {
      color: 'error',
      label: $t('page.quote.risk.tag'),
    };
  }
  const tag = resolveQuoteStatusTag(status.value);
  return {
    className: tag.className,
    color: tag.color,
    label: tag.label,
  };
});

function showCostRiskModalIfNeeded() {
  if (
    !costRiskActive.value ||
    costRiskModalShown.value ||
    normalizeQuoteStatus(status.value) === 'REVISING'
  ) {
    return;
  }
  costRiskModalShown.value = true;
  Modal.warning({
    centered: true,
    title: $t('page.quote.risk.modalTitle'),
    content: formatQuoteCostRiskHint({
      modes: costRiskModes.value,
      reason: costRiskReason.value,
    }),
    okText: $t('common.confirm'),
  });
}

const matchKeys = computed(() => ({
  zipCode: sheet.zipCode,
  city: sheet.city,
  state: sheet.state,
  por: sheet.por,
  pol: sheet.pol,
  pod: sheet.pod,
  ssl: sheet.ssl,
  fumigationPoint: sheet.fumigationPoint,
}));

const fumigationEnabled = computed(
  () =>
    Boolean(sheet.fumigationPoint?.trim()) || sheet.fumigationEnabled === true,
);

const previewCustomerName = computed(() => {
  const customer = customerOptions.value.find(
    (item) => item.value === customerId.value,
  );
  return customer?.label ?? customerName.value;
});

const portSelectOptions = computed(() =>
  portOptions.value.map((opt) => ({ label: opt.label, value: opt.value })),
);

const importMenuItems = computed(() => [
  { key: 'ROAD', label: $t('page.quote.actions.importCostRoad') },
  { key: 'SEA', label: $t('page.quote.actions.importCostSea') },
  { key: 'FUMIGATION', label: $t('page.quote.actions.importCostFumigation') },
]);

const loadPortOptions = useDebounceFn(async (keyword?: string) => {
  portOptions.value = await searchGlobalPortNameOptions({
    keyword,
    limit: 50,
    portTypes: ['SEAPORT', 'RAIL', 'INLAND'],
  });
}, 280);

function ruleHint(field: SheetRuleField) {
  return hintForSheetField(ruleHintMap.value, field);
}

async function loadQuoteRuleHints() {
  try {
    const rules = await getQuoteRuleList({ status: 1 });
    quoteRules.value = rules;
    cargoInsuranceOptions.value = buildQuoteRuleSelectOptions(
      rules,
      'CARGO_INSURANCE',
    );
    cargoAgentFeeOptions.value = buildQuoteRuleSelectOptions(
      rules,
      'CARGO_AGENT',
    );
  } catch {
    quoteRules.value = [];
    cargoInsuranceOptions.value = [];
    cargoAgentFeeOptions.value = [];
  }
}

function onFumigationPointChange(value?: string) {
  sheet.fumigationPoint = value ?? '';
  sheet.fumigationEnabled = Boolean(value?.trim());
  if (value?.trim()) {
    if (!oakType.value) {
      sheet.truckingFee = undefined;
    }
  } else {
    oakType.value = undefined;
    sheet.fmNonOak = 0;
    sheet.fmOak = 0;
    sheet.truckingNonOakUsd = undefined;
    sheet.truckingOakUsd = undefined;
    costMatches.value = costMatches.value.filter(
      (item) => item.costType !== 'FUMIGATION',
    );
  }
  void refreshRoadTruckingFromMatch();
}

function onOakTypeChange(value?: QuoteOakType) {
  oakType.value = value;
  void refreshRoadTruckingFromMatch();
}

function syncOceanFreightToSheet() {
  syncSheetFromOceanFreightEntries(sheet, oceanFreightEntries.value);
  costMatches.value = syncSeaMatchRemarks(
    costMatches.value,
    oceanFreightEntries.value,
  );
}

function loadOceanFreightEntriesFromSheet(options?: { syncSheet?: boolean }) {
  const seaMatches = costMatches.value.filter(
    (item) => item.costType === 'SEA',
  );
  const built = buildOceanFreightEntries(
    sheet,
    seaMatches,
    sslRemarkByName.value,
  );
  oceanFreightEntries.value = resolveOceanFreightEntries(
    sheet,
    seaMatches,
    sslRemarkByName.value,
  );
  if (options?.syncSheet !== false && built.length > 0) {
    syncSheetFromOceanFreightEntries(sheet, oceanFreightEntries.value);
  }
}

async function loadShippingLineRemarks() {
  try {
    const result = await getShippingLineList({
      page: 1,
      pageSize: 500,
      status: 1,
    });
    sslRemarkByName.value = buildShippingLineRemarkLookup(result.items);
  } catch {
    sslRemarkByName.value = new Map();
  }
  if (
    oceanFreightEntries.value.length > 0 ||
    sheet.ssl?.trim() ||
    sheet.oceanFreight?.trim() ||
    sheet.ofUsd?.trim()
  ) {
    loadOceanFreightEntriesFromSheet();
  }
}

function oceanFreightLabel(index: number) {
  if (oceanFreightEntries.value.length <= 1) {
    return $t('page.quote.sheet.oceanFreight');
  }
  return $t('page.quote.sheet.oceanFreightN', [index + 1]);
}

function updateOceanFreightEntry(
  index: number,
  field: keyof OceanFreightEntry,
  value: string,
) {
  if (oceanFreightEntries.value.length === 0) {
    oceanFreightEntries.value = resolveOceanFreightEntries(
      sheet,
      costMatches.value.filter((item) => item.costType === 'SEA'),
      sslRemarkByName.value,
    );
  }
  const entries = [...oceanFreightEntries.value];
  const current = entries[index] ?? {
    rate: '',
    remark: '',
    ssl: '',
  };
  const nextValue = String(value);
  entries[index] = {
    ...current,
    [field]: nextValue,
    ...(field === 'ssl'
      ? {
          remark: resolveSeaSslRemark(
            { ssl: nextValue },
            sslRemarkByName.value,
          ),
        }
      : {}),
  };
  oceanFreightEntries.value = entries;
  syncOceanFreightToSheet();
}

function buildCostImportContext(): CostImportContext {
  return {
    cifAmount: sheet.cifAmount,
    fumigationEnabled: fumigationEnabled.value,
    fumigationPoint: sheet.fumigationPoint,
    oakType: oakType.value,
    pod: sheet.pod,
    por: sheet.por,
    quoteDate: quoteDate.value.format('YYYY-MM-DD'),
  };
}

async function refreshRoadTruckingFromMatch() {
  if (hydratingSheet.value) {
    return;
  }
  if (fumigationEnabled.value && !oakType.value) {
    sheet.truckingFee = undefined;
    return;
  }
  const roadMatch = costMatches.value.find((item) => item.costType === 'ROAD');
  if (!roadMatch) {
    return;
  }
  try {
    if (roadMatch.snapshot && Object.keys(roadMatch.snapshot).length > 0) {
      const { fields } = await applyQuoteCostImport({
        costRefId: roadMatch.costRefId,
        costType: 'ROAD',
        snapshot: roadMatch.snapshot,
        ...buildCostImportContext(),
      });
      mergeRoadCostImport(
        sheet,
        fields,
        fumigationEnabled.value,
        roadMatch.snapshot as RoadCostRecord,
      );
      return;
    }
    const record = await getRoadCost(roadMatch.costRefId);
    const fields = await fetchCostImportFields(
      'ROAD',
      record,
      buildCostImportContext(),
    );
    mergeRoadCostImport(sheet, fields, fumigationEnabled.value, record);
  } catch {
    // 无卡车成本或接口失败时保留当前卡车费
  }
}

const applyDocFeeFromPod = useDebounceFn(async (pod?: string) => {
  if (hydratingSheet.value || readOnly.value) {
    return;
  }
  const value = pod?.trim();
  if (!value) {
    return;
  }
  try {
    const result = await previewQuoteDocFee(value);
    if (
      result?.docUsd !== undefined &&
      result?.docUsd !== null &&
      result.docUsd !== ''
    ) {
      sheet.docUsd = normalizeUsdFieldValue(result.docUsd);
    }
  } catch {
    // 未选择港口或规则未配置时跳过
  }
}, 280);

async function applySeaFreightRecords(records: FreightCostRecord[]) {
  const context = buildCostImportContext();
  const limited = records.slice(0, MAX_OCEAN_FREIGHT_LINES);
  const entries: OceanFreightEntry[] = [];
  for (const record of limited) {
    const fields = await fetchCostImportFields('SEA', record, context);
    mergeSeaCostImport(sheet, fields, record);
    entries.push({
      costRefId: record.id,
      rate:
        fields.oceanFreight?.trim() ||
        entryFromSeaRecord(record, sslRemarkByName.value).rate,
      remark: resolveSeaRemarkForRecord(record, sslRemarkByName.value),
      ssl: record.ssl?.trim() ?? '',
    });
  }
  const nonSea = costMatches.value.filter((item) => item.costType !== 'SEA');
  costMatches.value = [
    ...nonSea,
    ...limited.map((record) =>
      recordToCostMatchItem('SEA', record, matchKeys.value),
    ),
  ];
  oceanFreightEntries.value = entries;
  syncOceanFreightToSheet();
  const nextValidUntil = resolveValidUntilFromSeaRecords(limited);
  if (nextValidUntil) {
    validUntil.value = dayjs(nextValidUntil);
  }
}

function syncFumigationFromSheet() {
  if (sheet.fumigationPoint?.trim()) {
    sheet.fumigationEnabled = true;
    return;
  }
  if (sheet.fumigationEnabled === true || sheet.fumigationEnabled === false) {
    return;
  }
  sheet.fumigationEnabled =
    Number(sheet.fmNonOak ?? 0) > 0 || Number(sheet.fmOak ?? 0) > 0;
}

function normalizeSheetUsdFields() {
  const fields = [
    'oceanFreight',
    'ofUsd',
    'docUsd',
    'cargoInsurancePremium',
    'cargoAgentFee',
  ] as const;
  for (const field of fields) {
    const value = sheet[field];
    if (typeof value === 'string' && value.trim()) {
      sheet[field] = normalizeUsdFieldValue(value);
    }
  }
}

function mergeCostMatch(item: QuoteApi.QuoteCostMatchItem) {
  if (item.costType === 'SEA') {
    const nonSea = costMatches.value.filter(
      (match) => match.costType !== 'SEA',
    );
    const seaItems = costMatches.value.filter(
      (match) => match.costType === 'SEA',
    );
    const withoutDup = seaItems.filter(
      (match) => match.costRefId !== item.costRefId,
    );
    costMatches.value = [
      ...nonSea,
      ...[...withoutDup, item].slice(-MAX_OCEAN_FREIGHT_LINES),
    ];
    return;
  }
  costMatches.value = [
    ...costMatches.value.filter((m) => m.costType !== item.costType),
    item,
  ];
}

async function loadCustomers() {
  const result = await getCustomerList({ page: 1, pageSize: 200, status: 1 });
  customerOptions.value = result.items.map((item) => ({
    label: item.name,
    value: item.id,
  }));
}

async function loadCurrencies() {
  currencyOptions.value = await getEnabledCurrencyOptions();
}

async function applyDetailToForm(
  detail: QuoteApi.QuoteDetail,
  options?: { hydrateOnly?: boolean; includeIdentity?: boolean },
) {
  const includeIdentity = options?.includeIdentity ?? true;
  const hydrateOnly = options?.hydrateOnly ?? false;
  hydratingSheet.value = true;
  try {
    if (includeIdentity) {
      quoteId.value = detail.id;
      quoteNo.value = detail.quoteNo;
      status.value = detail.status;
      operable.value = detail.operable;
      costRiskActive.value = detail.costRiskActive === true;
      costRiskReason.value = detail.costRiskReason ?? '';
      costRiskModes.value = detail.costRiskModes ?? [];
      revisionNo.value = detail.revisionNo ?? 0;
      revisionLabel.value = detail.revisionLabel ?? '';
      changeReason.value = detail.changeReason ?? '';
      parentQuoteId.value = detail.parentQuoteId;
      currentVersion.value = detail.currentVersion !== false;
    } else {
      quoteId.value = undefined;
      quoteNo.value = '';
      status.value = 'DRAFT';
      costRiskActive.value = false;
      costRiskReason.value = '';
      costRiskModes.value = [];
      revisionNo.value = 0;
      revisionLabel.value = '';
      changeReason.value = '';
      parentQuoteId.value = undefined;
      currentVersion.value = true;
    }
    customerId.value = detail.customerId;
    customerName.value = detail.customerName;
    serviceTypes.value = [...(detail.serviceTypes ?? [])];
    oakType.value = detail.oakType;
    validUntil.value = detail.validUntil ? dayjs(detail.validUntil) : undefined;
    currency.value = detail.currency;
    remark.value = detail.remark ?? '';
    Object.assign(sheet, detail.sheet ?? {});
    if (!sheet.oceanFreight && sheet.ofUsd) {
      sheet.oceanFreight = sheet.ofUsd;
    }
    if (
      !hydrateOnly &&
      sheet.truckingFee === undefined &&
      sheet.truckingNonOakUsd !== undefined
    ) {
      sheet.truckingFee = sheet.truckingNonOakUsd;
    }
    if (!hydrateOnly && !sheet.pickUpAddress && (sheet.city || sheet.state)) {
      sheet.pickUpAddress = [sheet.city, sheet.state]
        .filter(Boolean)
        .join(', ');
    }
    normalizeSheetUsdFields();
    syncFumigationFromSheet();
    costMatches.value = normalizeCostMatches(detail.costSnapshots ?? []);
    loadOceanFreightEntriesFromSheet({ syncSheet: !hydrateOnly });
  } finally {
    await nextTick();
    hydratingSheet.value = false;
  }
}

async function loadDetail() {
  if (isCreate.value) {
    return;
  }
  const id = Number(route.params.id);
  if (!id) {
    return;
  }
  actionsReady.value = false;
  loading.value = true;
  try {
    const detail = await getQuoteDetail(id);
    await applyDetailToForm(detail, { hydrateOnly: true });
    showCostRiskModalIfNeeded();
    await nextTick();
    // 控件可能回写后再拍基线，避免空值形态差异造成误判
    await nextTick();
    captureFormSnapshot();
    await auditLogsRef.value?.reload();
  } finally {
    loading.value = false;
    actionsReady.value = true;
    captureFormSnapshot();
  }
}

async function consumeCopyFromStorage() {
  if (!isCreate.value) {
    return;
  }
  const sourceId = takeQuoteCopySourceId();
  if (!sourceId) {
    return;
  }
  loading.value = true;
  try {
    const detail = await getQuoteDetail(sourceId);
    await applyDetailToForm(detail, {
      includeIdentity: false,
      hydrateOnly: true,
    });
    message.success($t('page.quote.message.copyPrefilled'));
  } catch {
    message.error($t('page.ai.requestFailed'));
  } finally {
    loading.value = false;
  }
}

async function consumeRoadIntroduceFromStorage() {
  if (!isCreate.value) {
    return;
  }
  const roadId = takeRoadQuoteIntroduceId();
  if (!roadId) {
    return;
  }
  try {
    const record = await getRoadCost(roadId);
    await applyImportedRoadCost(record);
  } catch {
    message.error($t('page.ai.requestFailed'));
  }
}

function normalizeCostMatches(items: QuoteApi.QuoteCostMatchItem[]) {
  const result: QuoteApi.QuoteCostMatchItem[] = [];
  const seenTypes = new Set<QuoteCostType>();
  const seaIds = new Set<number>();
  for (const item of items) {
    if (item.costType === 'SEA') {
      if (
        seaIds.has(item.costRefId) ||
        seaIds.size >= MAX_OCEAN_FREIGHT_LINES
      ) {
        continue;
      }
      seaIds.add(item.costRefId);
      result.push(item);
      continue;
    }
    if (!seenTypes.has(item.costType)) {
      seenTypes.add(item.costType);
      result.push(item);
    }
  }
  return result;
}

function openCostImport(type: QuoteCostType) {
  if (!canUseCostLibrary.value) {
    return;
  }
  const selectedIds =
    type === 'SEA'
      ? costMatches.value
          .filter((item) => item.costType === 'SEA')
          .map((item) => item.costRefId)
      : undefined;
  costPickerRef.value?.open(type, matchKeys.value, { selectedIds });
}

function onImportCostType({ key }: { key: string }) {
  openCostImport(key as QuoteCostType);
}

async function applyImportedRoadCost(record: RoadCostRecord) {
  if (
    !isActiveCostRecord('ROAD', record as unknown as Record<string, unknown>)
  ) {
    message.error($t('page.quote.message.costExpired'));
    return;
  }
  const label =
    importMenuItems.value.find((item) => item.key === 'ROAD')?.label ?? 'ROAD';
  const context = buildCostImportContext();
  const hideLoading = message.loading(
    $t('page.quote.message.costImporting'),
    0,
  );
  try {
    mergeCostMatch(recordToCostMatchItem('ROAD', record, matchKeys.value));
    const fields = await fetchCostImportFields('ROAD', record, context);
    mergeRoadCostImport(sheet, fields, fumigationEnabled.value, record);
    message.success($t('page.quote.message.costImportedType', [label]));
  } catch {
    message.error($t('page.ai.requestFailed'));
  } finally {
    hideLoading();
  }
}

async function onCostsConfirmed(
  type: QuoteCostType,
  records: CostLibraryRecord[],
) {
  if (!canUseCostLibrary.value || records.length === 0) {
    return;
  }
  for (const record of records) {
    if (
      !isActiveCostRecord(type, record as unknown as Record<string, unknown>)
    ) {
      message.error($t('page.quote.message.costExpired'));
      return;
    }
  }
  if (type === 'ROAD') {
    const record = records[0];
    if (record) {
      await applyImportedRoadCost(record as RoadCostRecord);
    }
    return;
  }
  const label =
    importMenuItems.value.find((item) => item.key === type)?.label ?? type;
  const hideLoading = message.loading(
    $t('page.quote.message.costImporting'),
    0,
  );
  try {
    if (type === 'SEA') {
      await applySeaFreightRecords(records as FreightCostRecord[]);
      normalizeSheetUsdFields();
      message.success($t('page.quote.message.costImportedType', [label]));
      return;
    }
    const record = records[0];
    if (!record) {
      return;
    }
    mergeCostMatch(recordToCostMatchItem(type, record, matchKeys.value));
    const fields = await fetchCostImportFields(
      type,
      record,
      buildCostImportContext(),
    );
    mergeFumigationCostImport(sheet, fields);
    message.success($t('page.quote.message.costImportedType', [label]));
  } catch {
    message.error($t('page.ai.requestFailed'));
  } finally {
    hideLoading();
  }
}

async function applyAiCitedCost(payload: AiApplyPayload) {
  try {
    if (payload.type === 'road') {
      const record = await getRoadCost(payload.id);
      await (canUseCostLibrary.value
        ? onCostsConfirmed('ROAD', [record])
        : applyImportedRoadCost(record));
      return;
    }
    if (!canUseCostLibrary.value) {
      return;
    }
    if (payload.type === 'sea') {
      const record = await seaCostApi.get(payload.id);
      await onCostsConfirmed('SEA', [record]);
      return;
    }
    const record = await fumigationCostApi.get(payload.id);
    await onCostsConfirmed('FUMIGATION', [record]);
  } catch {
    message.error($t('page.ai.requestFailed'));
  }
}

function onAiApplyEvent(event: Event) {
  const detail = (event as CustomEvent<AiApplyPayload>).detail;
  if (!detail?.id || !detail.type) {
    return;
  }
  void applyAiCitedCost(detail);
}

function consumeAiApplyFromStorage() {
  const raw = sessionStorage.getItem('ai-apply-cost');
  if (!raw) {
    return;
  }
  sessionStorage.removeItem('ai-apply-cost');
  try {
    const payload = JSON.parse(raw) as AiApplyPayload;
    if (payload?.id && payload.type) {
      void applyAiCitedCost(payload);
    }
  } catch {
    // ignore
  }
}

function buildPayload(): QuoteApi.QuoteSave {
  const customer = customerOptions.value.find(
    (c) => c.value === customerId.value,
  );
  const payload: QuoteApi.QuoteSave = {
    customerId: customerId.value,
    customerName: customer?.label ?? customerName.value,
    serviceTypes: [...serviceTypes.value],
    oakType: fumigationEnabled.value ? oakType.value : undefined,
    transportMode: DEFAULT_TRANSPORT_MODE,
    currency: currency.value,
    validUntil: validUntil.value?.format('YYYY-MM-DD'),
    remark: remark.value,
    lines: [],
    ...sheet,
    fumigationEnabled: fumigationEnabled.value,
  };
  if (canUseCostLibrary.value) {
    syncOceanFreightToSheet();
    payload.costMatches = costMatches.value;
  }
  return payload;
}

/** 空串 / null / undefined 视为相同；数字与数字字符串视为相同 */
function normalizeDirtyText(value: unknown): null | string {
  if (value === undefined || value === null) {
    return null;
  }
  const text = String(value).trim();
  return text === '' ? null : text;
}

function normalizeDirtyNumber(value: unknown): null | number {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalizeDirtyBool(value: unknown): boolean {
  return value === true;
}

/** 只取会影响保存结果的字段，做规范化后再比对 */
function buildFormSnapshot(): string {
  const sheetSnapshot = {
    cargoAgentFee: normalizeDirtyText(sheet.cargoAgentFee),
    cargoInsurancePremium: normalizeDirtyText(sheet.cargoInsurancePremium),
    cargoMaxWeightTon: normalizeDirtyText(sheet.cargoMaxWeightTon),
    chassis: normalizeDirtyNumber(sheet.chassis),
    cifAmount: normalizeDirtyNumber(sheet.cifAmount),
    city: normalizeDirtyText(sheet.city),
    docUsd: normalizeDirtyText(sheet.docUsd),
    fmNonOak: normalizeDirtyNumber(sheet.fmNonOak),
    fmOak: normalizeDirtyNumber(sheet.fmOak),
    fumigationEnabled: normalizeDirtyBool(sheet.fumigationEnabled),
    fumigationPoint: normalizeDirtyText(sheet.fumigationPoint),
    nsLift: normalizeDirtyNumber(sheet.nsLift),
    oceanFreight: normalizeDirtyText(sheet.oceanFreight || sheet.ofUsd),
    pickUpAddress: normalizeDirtyText(sheet.pickUpAddress),
    pod: normalizeDirtyText(sheet.pod),
    pol: normalizeDirtyText(sheet.pol),
    por: normalizeDirtyText(sheet.por),
    redeliveryFee: normalizeDirtyNumber(sheet.redeliveryFee),
    sheetRemark: normalizeDirtyText(sheet.sheetRemark),
    ssl: normalizeDirtyText(sheet.ssl),
    state: normalizeDirtyText(sheet.state),
    supplier: normalizeDirtyText(sheet.supplier),
    truckRemark: normalizeDirtyText(sheet.truckRemark),
    truckingFee: normalizeDirtyNumber(sheet.truckingFee),
    truckingNonOakUsd: normalizeDirtyNumber(sheet.truckingNonOakUsd),
    truckingOakUsd: normalizeDirtyNumber(sheet.truckingOakUsd),
    waiting: normalizeDirtyNumber(sheet.waiting),
    zipCode: normalizeDirtyText(sheet.zipCode),
  };
  const oceanSnapshot = oceanFreightEntries.value.map((entry) => ({
    costRefId: entry.costRefId ?? null,
    rate: normalizeDirtyText(entry.rate),
    remark: normalizeDirtyText(entry.remark),
    ssl: normalizeDirtyText(entry.ssl),
  }));
  const costSnapshot = [...costMatches.value]
    .map((item) => ({
      costRefId: item.costRefId,
      costType: item.costType,
      costVersion: normalizeDirtyText(item.costVersion),
    }))
    .toSorted((a, b) => {
      const typeCmp = a.costType.localeCompare(b.costType);
      return typeCmp === 0 ? a.costRefId - b.costRefId : typeCmp;
    });
  return JSON.stringify({
    costMatches: costSnapshot,
    currency: normalizeDirtyText(currency.value),
    customerId: customerId.value ?? null,
    fumigationEnabled: fumigationEnabled.value === true,
    oakType: oakType.value ?? null,
    oceanFreightEntries: oceanSnapshot,
    quoteDate: quoteDate.value?.format('YYYY-MM-DD') ?? null,
    remark: normalizeDirtyText(remark.value),
    serviceTypes: [...serviceTypes.value].slice().toSorted(),
    sheet: sheetSnapshot,
    validUntil: validUntil.value?.format('YYYY-MM-DD') ?? null,
  });
}

function captureFormSnapshot() {
  if (!quoteId.value) {
    savedFormSnapshot.value = '';
    return;
  }
  savedFormSnapshot.value = buildFormSnapshot();
}

function hasUnsavedChanges() {
  if (!quoteId.value || !savedFormSnapshot.value) {
    return false;
  }
  return buildFormSnapshot() !== savedFormSnapshot.value;
}

function validateRouteFields(): boolean {
  if (!sheet.por?.trim()) {
    message.error($t('page.quote.validation.porRequired'));
    return false;
  }
  if (!sheet.pod?.trim()) {
    message.error($t('page.quote.validation.podRequired'));
    return false;
  }
  return true;
}

function validateBasicSheetFields(): boolean {
  if (serviceTypes.value.length === 0) {
    message.error($t('page.quote.validation.serviceTypeRequired'));
    return false;
  }
  if (fumigationEnabled.value && !oakType.value) {
    message.error($t('page.quote.validation.oakTypeRequired'));
    return false;
  }
  return validateRouteFields();
}

async function onGenerateSheet(options?: { auto?: boolean }) {
  if (options?.auto && !isCreate.value) {
    return;
  }
  if (!canUseCostLibrary.value) {
    return;
  }
  if (!validateRouteFields()) {
    return;
  }

  generating.value = true;
  try {
    const keepFumigationPoint = sheet.fumigationPoint;
    const keepFumigationEnabled = fumigationEnabled.value;
    const keepOakType = oakType.value;
    const existingRoadMatch = costMatches.value.find(
      (item) => item.costType === 'ROAD',
    );
    const preservedRoadSheet = existingRoadMatch
      ? pickRoadSheetFields(sheet)
      : null;
    const result = await generateQuoteSheet({
      por: sheet.por,
      pol: sheet.pol,
      pod: sheet.pod,
      zipCode: sheet.zipCode,
      city: sheet.city,
      state: sheet.state,
      pickUpAddress: sheet.pickUpAddress,
      cifAmount: sheet.cifAmount,
      fumigationPoint: keepFumigationPoint,
      fumigationEnabled: keepFumigationEnabled,
      oakType: keepOakType,
      quoteDate: quoteDate.value.format('YYYY-MM-DD'),
      skipRoadMatch: Boolean(existingRoadMatch),
    });
    if (result.quoteDate) {
      quoteDate.value = dayjs(result.quoteDate);
    }
    Object.assign(sheet, result.sheet);
    if (sheet.ofUsd) {
      sheet.oceanFreight = sheet.oceanFreight || sheet.ofUsd;
    }
    normalizeSheetUsdFields();
    sheet.fumigationPoint = keepFumigationPoint ?? sheet.fumigationPoint;
    sheet.fumigationEnabled = keepFumigationEnabled;
    oakType.value = keepOakType;
    if (!keepFumigationEnabled) {
      sheet.fmNonOak = 0;
      sheet.fmOak = 0;
      sheet.truckingNonOakUsd = undefined;
      sheet.truckingOakUsd = undefined;
    }
    if (preservedRoadSheet) {
      Object.assign(sheet, preservedRoadSheet);
    }
    let nextMatches = (result.costMatches ?? []).filter(
      (item) => keepFumigationEnabled || item.costType !== 'FUMIGATION',
    );
    if (existingRoadMatch) {
      nextMatches = nextMatches.filter((item) => item.costType !== 'ROAD');
      nextMatches.push(existingRoadMatch);
    }
    costMatches.value = normalizeCostMatches(nextMatches);
    if (existingRoadMatch) {
      await refreshRoadTruckingFromMatch();
    }
    loadOceanFreightEntriesFromSheet();
    message.success($t('page.quote.message.sheetGenerated'));
  } catch (error: any) {
    message.error(error?.message ?? $t('page.ai.requestFailed'));
  } finally {
    generating.value = false;
  }
}

async function onSave() {
  if (!validateBasicSheetFields()) {
    return;
  }
  saving.value = true;
  try {
    if (isCreate.value) {
      const created = await createQuote(buildPayload());
      message.success(
        $t('page.quote.message.createSuccess', [created.quoteNo]),
      );
      await router.replace({
        name: 'QuoteEdit',
        params: { id: created.id },
      });
      await loadDetail();
      return;
    }
    const id = quoteId.value;
    if (!id) {
      return;
    }
    const updated = await updateQuote(id, buildPayload());
    message.success($t('page.quote.message.saveSuccess', [updated.quoteNo]));
    await loadDetail();
  } finally {
    saving.value = false;
  }
}

function onSubmit() {
  const id = quoteId.value;
  if (!id) return;
  if (hasUnsavedChanges()) {
    Modal.warning({
      centered: true,
      title: $t('page.quote.actions.submit'),
      content: $t('page.quote.confirm.submitNeedSave'),
    });
    return;
  }
  Modal.confirm({
    centered: true,
    title: $t('page.quote.actions.submit'),
    content: $t('page.quote.confirm.submit', [quoteNo.value]),
    onOk: async () => {
      await submitQuote(id);
      message.success($t('page.quote.message.submitSuccess'));
      await loadDetail();
    },
  });
}

function onRollback() {
  const id = quoteId.value;
  if (!id) return;
  withdrawComment.value = '';
  withdrawOpen.value = true;
}

async function onWithdrawOk() {
  const id = quoteId.value;
  if (!id) return;
  const comment = withdrawComment.value.trim();
  if (!comment) {
    message.warning($t('page.approval.withdrawReasonRequired'));
    throw new Error('withdraw reason required');
  }
  withdrawSubmitting.value = true;
  try {
    await cancelQuoteApproval(id, comment);
    message.success($t('page.quote.message.withdrawSuccess'));
    withdrawOpen.value = false;
    await loadDetail();
  } finally {
    withdrawSubmitting.value = false;
  }
}

async function onWon() {
  const id = quoteId.value;
  if (!id) return;
  Modal.confirm({
    centered: true,
    title: $t('page.quote.actions.confirmWon'),
    content: $t('page.quote.confirm.confirmWon'),
    onOk: async () => {
      await wonQuote(id);
      message.success($t('page.quote.message.wonSuccess'));
      await loadDetail();
    },
  });
}

async function onVoid() {
  const id = quoteId.value;
  if (!id) return;
  Modal.confirm({
    centered: true,
    title: $t('page.quote.actions.void'),
    content: $t('page.quote.confirm.void', [quoteNo.value]),
    okType: 'danger',
    onOk: async () => {
      await voidQuote(id);
      message.success($t('page.quote.message.voidSuccess'));
      await loadDetail();
    },
  });
}

async function onDelete() {
  const id = quoteId.value;
  if (!id) return;
  Modal.confirm({
    centered: true,
    title: $t('common.delete'),
    content: $t('page.quote.confirm.delete', [quoteNo.value]),
    okType: 'danger',
    onOk: async () => {
      await deleteQuote(id);
      message.success($t('page.quote.message.deleteSuccess', [quoteNo.value]));
      router.push({ name: 'QuoteList' });
    },
  });
}

function onCopy() {
  const id = quoteId.value;
  if (!id) {
    return;
  }
  stashQuoteCopySource(id);
  router.push({ name: 'QuoteCreate' });
}

function onRevise() {
  const id = quoteId.value;
  if (!id) {
    return;
  }
  reviseReasonDraft.value = changeReason.value || '';
  Modal.confirm({
    centered: true,
    width: 640,
    title: $t('page.quote.actions.revise'),
    content: () =>
      h('div', { class: 'space-y-3' }, [
        h(
          'p',
          { class: 'm-0 text-sm text-gray-600' },
          $t('page.quote.confirm.revise'),
        ),
        h(Input.TextArea, {
          value: reviseReasonDraft.value,
          rows: 6,
          maxlength: 512,
          showCount: true,
          placeholder: $t('page.quote.message.reviseNeedReason'),
          'onUpdate:value': (value: string) => {
            reviseReasonDraft.value = value;
          },
        }),
      ]),
    okText: $t('page.quote.actions.revise'),
    okButtonProps: { loading: revising.value },
    async onOk() {
      const reason = reviseReasonDraft.value.trim();
      if (!reason) {
        message.warning($t('page.quote.message.reviseNeedReason'));
        throw new Error('reason required');
      }
      revising.value = true;
      try {
        const detail = await reviseQuote(id, reason);
        message.success(
          $t('page.quote.message.reviseSuccess', [
            detail.revisionLabel || detail.quoteNo,
          ]),
        );
        await router.push({
          name: 'QuoteEdit',
          params: { id: String(detail.id) },
        });
      } finally {
        revising.value = false;
      }
    },
  });
}

function goParentQuote() {
  if (!parentQuoteId.value) {
    return;
  }
  router.push({
    name: 'QuoteEdit',
    params: { id: String(parentQuoteId.value) },
  });
}

function goBack() {
  router.push({ name: 'QuoteList' });
}

function openPrintPreview() {
  syncOceanFreightToSheet();
  sheetPreviewOpen.value = true;
}

function onPrint() {
  printQuoteSheet();
}

onMounted(async () => {
  window.addEventListener('ai-apply-cost', onAiApplyEvent);
  await Promise.all([
    loadShippingLineRemarks(),
    loadCustomers(),
    loadCurrencies(),
    loadPortOptions(),
    loadQuoteRuleHints(),
  ]);
  await loadDetail();
  if (isCreate.value) {
    actionsReady.value = true;
    consumeAiApplyFromStorage();
    await consumeCopyFromStorage();
    await consumeRoadIntroduceFromStorage();
    if (oceanFreightEntries.value.length === 0) {
      oceanFreightEntries.value = resolveOceanFreightEntries(
        sheet,
        costMatches.value.filter((item) => item.costType === 'SEA'),
        sslRemarkByName.value,
      );
    }
  } else {
    sessionStorage.removeItem('ai-apply-cost');
  }
});

onActivated(async () => {
  if (isCreate.value) {
    await consumeRoadIntroduceFromStorage();
  }
});

watch(
  () => route.name,
  async (name) => {
    if (name === 'QuoteCreate') {
      actionsReady.value = true;
      await consumeCopyFromStorage();
      await consumeRoadIntroduceFromStorage();
      return;
    }
    if (name === 'QuoteEdit') {
      costRiskModalShown.value = false;
      await loadDetail();
    }
  },
);

watch(
  () => route.params.id,
  () => {
    costRiskModalShown.value = false;
  },
);

watch(
  () => sheet.pod,
  (pod) => {
    if (hydratingSheet.value) {
      return;
    }
    void applyDocFeeFromPod(pod);
  },
);

onUnmounted(() => {
  window.removeEventListener('ai-apply-cost', onAiApplyEvent);
});
</script>

<template>
  <Page
    auto-content-height
    class="quote-editor-page"
    content-class="quote-editor-page__content"
  >
    <div class="quote-editor-shell">
      <header class="quote-editor-nav quote-card">
        <div class="quote-editor-nav__top">
          <div class="quote-editor-nav__leading">
            <Button class="quote-editor-nav__back" @click="goBack">
              <ArrowLeft class="size-4" />
              {{ backLabel }}
            </Button>
            <div class="quote-editor-nav__heading">
              <h2 class="quote-editor-nav__title">{{ pageTitle }}</h2>
              <Tag
                v-if="quoteNo && (isCreate || actionsReady)"
                class="quote-editor-nav__quote-no"
                color="processing"
              >
                {{ quoteNo }}
              </Tag>
              <Tag
                v-if="!isCreate && actionsReady && revisionLabel"
                color="purple"
              >
                {{ revisionLabel }}
              </Tag>
              <Tag
                v-if="!isCreate && actionsReady && parentQuoteId"
                color="purple"
              >
                {{ $t('page.quote.revision.fromChange') }}
              </Tag>
              <Tag
                v-if="!isCreate && actionsReady"
                :class="headerStatusTag.className"
                :color="headerStatusTag.color"
              >
                {{ headerStatusTag.label }}
              </Tag>
              <Button
                v-if="!isCreate && actionsReady && parentQuoteId"
                type="link"
                class="!px-1"
                @click="goParentQuote"
              >
                {{ $t('page.quote.revision.viewParent') }}
              </Button>
            </div>
          </div>
          <div
            v-if="showToolbarActions"
            class="quote-editor-nav__actions quote-editor-actions"
          >
            <template v-if="showDraftWorkflowActions">
              <Button
                v-if="!isCreate && canCopyAction"
                class="quote-action-btn quote-action-btn--copy"
                @click="onCopy"
              >
                <Copy class="mr-1 size-4" />
                {{ $t('page.quote.actions.copy') }}
              </Button>
              <Button
                v-if="canUseCostLibrary"
                class="quote-action-btn quote-action-btn--generate"
                :loading="generating"
                @click="onGenerateSheet"
              >
                <IconifyIcon
                  class="mr-1 size-4"
                  icon="lucide:file-spreadsheet"
                />
                {{ $t('page.quote.actions.matchQuote') }}
              </Button>
              <Dropdown v-if="canUseCostLibrary" :trigger="['click']">
                <Button class="quote-action-btn quote-action-btn--import">
                  <IconifyIcon class="mr-1 size-4" icon="lucide:database" />
                  {{ $t('page.quote.actions.importQuote') }}
                </Button>
                <template #overlay>
                  <Menu :items="importMenuItems" @click="onImportCostType" />
                </template>
              </Dropdown>
              <Button
                class="quote-action-btn quote-action-btn--print"
                @click="openPrintPreview"
              >
                <IconifyIcon class="mr-1 size-4" icon="lucide:printer" />
                {{ $t('page.quote.actions.printQuote') }}
              </Button>
              <Button
                v-if="canSubmitAction"
                class="quote-action-btn quote-action-btn--submit"
                @click="onSubmit"
              >
                <IconifyIcon class="mr-1 size-4" icon="lucide:send" />
                {{ $t('page.quote.actions.submit') }}
              </Button>
              <Button
                v-if="canDeleteAction"
                class="quote-action-btn quote-action-btn--delete"
                danger
                type="primary"
                @click="onDelete"
              >
                {{ $t('common.delete') }}
              </Button>
              <Button
                v-if="canSave"
                class="quote-action-btn quote-action-btn--save"
                :loading="saving"
                type="primary"
                @click="onSave"
              >
                <template #icon>
                  <Save class="size-4" />
                </template>
                {{ $t('page.quote.actions.save') }}
              </Button>
            </template>

            <template v-else-if="showPendingApprovalToolbar">
              <Button
                v-if="canCopyAction"
                class="quote-action-btn quote-action-btn--copy"
                @click="onCopy"
              >
                <Copy class="mr-1 size-4" />
                {{ $t('page.quote.actions.copy') }}
              </Button>
              <Button
                class="quote-action-btn quote-action-btn--print"
                @click="openPrintPreview"
              >
                <IconifyIcon class="mr-1 size-4" icon="lucide:printer" />
                {{ $t('page.quote.actions.print') }}
              </Button>
              <Button
                v-if="canRollbackAction"
                class="quote-action-btn quote-action-btn--rollback"
                danger
                type="primary"
                @click="onRollback"
              >
                <IconifyIcon class="mr-1 size-4" icon="lucide:undo-2" />
                {{ $t('page.quote.actions.withdraw') }}
              </Button>
            </template>

            <template v-else-if="showConfirmedToolbar">
              <Button
                v-if="canReviseAction"
                class="quote-action-btn quote-action-btn--revise"
                type="primary"
                ghost
                :loading="revising"
                @click="onRevise"
              >
                <IconifyIcon
                  class="mr-1 size-4"
                  icon="lucide:git-branch-plus"
                />
                {{ $t('page.quote.actions.revise') }}
              </Button>
              <Button
                v-if="canCopyAction"
                class="quote-action-btn quote-action-btn--copy"
                @click="onCopy"
              >
                <Copy class="mr-1 size-4" />
                {{ $t('page.quote.actions.copy') }}
              </Button>
              <Button
                class="quote-action-btn quote-action-btn--print"
                @click="openPrintPreview"
              >
                <IconifyIcon class="mr-1 size-4" icon="lucide:printer" />
                {{ $t('page.quote.actions.print') }}
              </Button>
              <Button
                v-if="canConfirmWonAction"
                class="quote-action-btn quote-action-btn--won"
                type="primary"
                @click="onWon"
              >
                <IconifyIcon
                  class="mr-1 size-4"
                  icon="lucide:circle-check-big"
                />
                {{ $t('page.quote.actions.confirmWon') }}
              </Button>
              <Button
                v-if="canVoidAction"
                class="quote-action-btn quote-action-btn--void"
                danger
                type="primary"
                @click="onVoid"
              >
                <IconifyIcon class="mr-1 size-4" icon="lucide:ban" />
                {{ $t('page.quote.actions.void') }}
              </Button>
            </template>

            <template v-else-if="showReadonlyWorkflowToolbar">
              <Button
                v-if="canCopyAction"
                class="quote-action-btn quote-action-btn--copy"
                @click="onCopy"
              >
                <Copy class="mr-1 size-4" />
                {{ $t('page.quote.actions.copy') }}
              </Button>
              <Button
                class="quote-action-btn quote-action-btn--print"
                @click="openPrintPreview"
              >
                <IconifyIcon class="mr-1 size-4" icon="lucide:printer" />
                {{ $t('page.quote.actions.print') }}
              </Button>
            </template>
          </div>
        </div>
      </header>

      <Card class="quote-editor-card quote-card">
        <QuoteSheetEditorSkeleton v-if="loading" />
        <div v-else class="quote-editor-body">
          <!-- 1. 基础信息区 -->
          <section class="quote-editor-section">
            <div class="quote-editor-section__head">
              <span class="quote-editor-section__title">{{
                $t('page.quote.sections.basic')
              }}</span>
            </div>
            <div class="quote-editor-section__body">
              <Form layout="vertical">
                <div class="quote-sheet-fields">
                  <div class="quote-sheet-basic-row quote-sheet-basic-row--4">
                    <Form.Item
                      :label="$t('page.quote.sheet.serviceType')"
                      required
                    >
                      <Select
                        v-model:value="serviceTypes"
                        :disabled="readOnly"
                        max-tag-count="responsive"
                        :options="serviceTypeOptions"
                        :placeholder="
                          readOnly
                            ? '—'
                            : $t('page.quote.placeholders.serviceType')
                        "
                        allow-clear
                        class="w-full"
                        mode="multiple"
                        show-search
                      />
                    </Form.Item>
                    <Form.Item :label="$t('page.quote.sheet.client')">
                      <Select
                        v-model:value="customerId"
                        :disabled="readOnly"
                        :options="customerOptions"
                        :placeholder="
                          readOnly
                            ? '—'
                            : $t('page.quote.placeholders.customer')
                        "
                        allow-clear
                        class="w-full"
                        show-search
                      />
                    </Form.Item>
                    <Form.Item :label="$t('page.quote.sheet.date')">
                      <DatePicker
                        v-if="!readOnly"
                        v-model:value="quoteDate"
                        class="w-full"
                        format="YYYY-MM-DD"
                      />
                      <Input
                        v-else
                        class="w-full"
                        readonly
                        :value="quoteDate.format('YYYY-MM-DD')"
                      />
                    </Form.Item>
                    <Form.Item :label="$t('page.quote.sheet.validUntil')">
                      <DatePicker
                        v-if="!readOnly"
                        v-model:value="validUntil"
                        allow-clear
                        class="w-full"
                        format="YYYY-MM-DD"
                      />
                      <Input
                        v-else
                        class="w-full"
                        readonly
                        :value="
                          validUntil ? validUntil.format('YYYY-MM-DD') : '—'
                        "
                      />
                    </Form.Item>
                  </div>
                  <div class="quote-sheet-basic-row quote-sheet-basic-row--3">
                    <Form.Item :label="$t('page.quote.sheet.por')" required>
                      <Select
                        v-model:value="sheet.por"
                        :disabled="readOnly"
                        :filter-option="false"
                        :options="portSelectOptions"
                        :show-search="true"
                        allow-clear
                        class="w-full"
                        option-label-prop="value"
                        :placeholder="
                          readOnly ? '—' : $t('page.quote.sheet.selectPort')
                        "
                        @search="loadPortOptions"
                      />
                    </Form.Item>
                    <Form.Item :label="$t('page.quote.sheet.pol')">
                      <Select
                        v-model:value="sheet.pol"
                        :disabled="readOnly"
                        :filter-option="false"
                        :options="portSelectOptions"
                        :show-search="true"
                        allow-clear
                        class="w-full"
                        option-label-prop="value"
                        :placeholder="
                          readOnly ? '—' : $t('page.quote.sheet.selectPort')
                        "
                        @search="loadPortOptions"
                      />
                    </Form.Item>
                    <Form.Item :label="$t('page.quote.sheet.pod')" required>
                      <Select
                        v-model:value="sheet.pod"
                        :disabled="readOnly"
                        :filter-option="false"
                        :options="portSelectOptions"
                        :show-search="true"
                        allow-clear
                        class="w-full"
                        option-label-prop="value"
                        :placeholder="
                          readOnly ? '—' : $t('page.quote.sheet.selectPort')
                        "
                        @search="loadPortOptions"
                      />
                    </Form.Item>
                  </div>
                  <div
                    class="quote-sheet-location-row"
                    :class="{
                      'quote-sheet-location-row--4': fumigationEnabled,
                    }"
                  >
                    <Form.Item :label="$t('page.quote.sheet.city')">
                      <QuoteCitySelect
                        v-model="sheet.city"
                        :disabled="readOnly"
                      />
                    </Form.Item>
                    <Form.Item :label="$t('page.quote.sheet.state')">
                      <QuoteStateSelect
                        v-model="sheet.state"
                        :disabled="readOnly"
                      />
                    </Form.Item>
                    <Form.Item :label="$t('page.quote.sheet.fumigationPoint')">
                      <QuoteFumigationStationSelect
                        :disabled="readOnly"
                        :model-value="sheet.fumigationPoint"
                        @update:model-value="
                          onFumigationPointChange($event as string | undefined)
                        "
                      />
                    </Form.Item>
                    <Form.Item
                      v-if="fumigationEnabled"
                      :label="$t('page.quote.sheet.oakType')"
                      required
                    >
                      <Select
                        :disabled="readOnly"
                        :options="oakTypeOptions"
                        :placeholder="
                          readOnly ? '—' : $t('page.quote.placeholders.oakType')
                        "
                        allow-clear
                        class="w-full"
                        :value="oakType"
                        @update:value="
                          onOakTypeChange($event as QuoteOakType | undefined)
                        "
                      />
                    </Form.Item>
                  </div>
                  <Form.Item
                    class="quote-sheet-field--full"
                    :label="$t('page.quote.sheet.pickUpAddress')"
                  >
                    <Input.TextArea
                      v-model:value="sheet.pickUpAddress"
                      class="w-full"
                      :disabled="readOnly"
                      :rows="2"
                    />
                  </Form.Item>
                </div>
              </Form>
            </div>
          </section>

          <!-- 2. SERVICE FEES — 主费用列表 -->
          <section class="quote-editor-section">
            <div class="quote-editor-section__head">
              <span class="quote-editor-section__title">{{
                $t('page.quote.sections.serviceFees')
              }}</span>
            </div>
            <div class="quote-editor-section__body">
              <Form layout="vertical">
                <div class="quote-sheet-fields">
                  <div
                    v-for="(entry, index) in oceanFreightEntries"
                    :key="`ocean-freight-${index}`"
                    class="quote-sheet-sea-row"
                  >
                    <Form.Item>
                      <template #label>
                        <QuoteRuleLabel
                          v-if="index === 0"
                          :hint="ruleHint('oceanFreight')"
                          :label="oceanFreightLabel(index)"
                        />
                        <span v-else>{{ oceanFreightLabel(index) }}</span>
                      </template>
                      <Input
                        :disabled="readOnly"
                        class="w-full"
                        :value="entry.rate"
                        @update:value="
                          (value) =>
                            updateOceanFreightEntry(
                              index,
                              'rate',
                              String(value),
                            )
                        "
                      />
                    </Form.Item>
                    <Form.Item :label="$t('page.quote.sheet.seaSsl')">
                      <Input
                        :disabled="readOnly"
                        class="w-full"
                        :value="entry.ssl"
                        @update:value="
                          (value) =>
                            updateOceanFreightEntry(index, 'ssl', String(value))
                        "
                      />
                    </Form.Item>
                    <Form.Item :label="$t('page.quote.sheet.seaRemark')">
                      <Input class="w-full" readonly :value="entry.remark" />
                    </Form.Item>
                  </div>
                  <Form.Item>
                    <template #label>
                      <QuoteRuleLabel
                        :hint="ruleHint('truckingFee')"
                        :label="$t('page.quote.sheet.truckingFee')"
                      />
                    </template>
                    <InputNumber
                      v-model:value="sheet.truckingFee"
                      class="w-full"
                      :disabled="readOnly"
                      :min="0"
                      :precision="0"
                    />
                  </Form.Item>
                </div>
              </Form>
            </div>
          </section>

          <!-- 3. 卡车额外费用 -->
          <section class="quote-editor-section">
            <div class="quote-editor-section__head">
              <span class="quote-editor-section__title">{{
                $t('page.quote.sections.truckExtras')
              }}</span>
            </div>
            <div class="quote-editor-section__body">
              <Form layout="vertical">
                <div class="quote-sheet-fields">
                  <Form.Item :label="$t('page.quote.sheet.nsLift')">
                    <InputNumber
                      v-model:value="sheet.nsLift"
                      class="w-full"
                      :disabled="readOnly"
                      :min="0"
                      :precision="2"
                    />
                  </Form.Item>
                  <Form.Item :label="$t('page.quote.sheet.chassis')">
                    <InputNumber
                      v-model:value="sheet.chassis"
                      class="w-full"
                      :disabled="readOnly"
                      :min="0"
                      :precision="2"
                    />
                  </Form.Item>
                  <Form.Item :label="$t('page.quote.sheet.waiting')">
                    <InputNumber
                      v-model:value="sheet.waiting"
                      class="w-full"
                      :disabled="readOnly"
                      :min="0"
                      :precision="2"
                    />
                  </Form.Item>
                  <Form.Item :label="$t('page.quote.sheet.redelivery')">
                    <InputNumber
                      v-model:value="sheet.redeliveryFee"
                      class="w-full"
                      :disabled="readOnly"
                      :min="0"
                      :precision="2"
                    />
                  </Form.Item>
                  <Form.Item
                    class="quote-sheet-field--full"
                    :label="$t('page.quote.sheet.truckRemark')"
                  >
                    <Input.TextArea
                      v-model:value="sheet.truckRemark"
                      class="w-full"
                      :disabled="readOnly"
                      :rows="2"
                    />
                  </Form.Item>
                </div>
              </Form>
            </div>
          </section>

          <!-- 4. 熏蒸费 -->
          <section v-if="fumigationEnabled" class="quote-editor-section">
            <div class="quote-editor-section__head">
              <span class="quote-editor-section__title">{{
                $t('page.quote.sections.fumigation')
              }}</span>
            </div>
            <div class="quote-editor-section__body">
              <Form layout="vertical">
                <div class="quote-sheet-fields">
                  <Form.Item>
                    <template #label>
                      <QuoteRuleLabel
                        :hint="ruleHint('fmNonOak')"
                        :label="$t('page.quote.sheet.fmNonOak')"
                      />
                    </template>
                    <InputNumber
                      v-model:value="sheet.fmNonOak"
                      class="w-full"
                      :disabled="readOnly"
                      :min="0"
                      :precision="2"
                    />
                  </Form.Item>
                  <Form.Item>
                    <template #label>
                      <QuoteRuleLabel
                        :hint="ruleHint('fmOak')"
                        :label="$t('page.quote.sheet.fmOak')"
                      />
                    </template>
                    <InputNumber
                      v-model:value="sheet.fmOak"
                      class="w-full"
                      :disabled="readOnly"
                      :min="0"
                      :precision="2"
                    />
                  </Form.Item>
                </div>
              </Form>
            </div>
          </section>

          <!-- 5. 单证、保险、代理费用 -->
          <section class="quote-editor-section">
            <div class="quote-editor-section__head">
              <span class="quote-editor-section__title">{{
                $t('page.quote.sections.docInsuranceAgent')
              }}</span>
            </div>
            <div class="quote-editor-section__body">
              <Form layout="vertical">
                <div class="quote-sheet-fields">
                  <Form.Item>
                    <template #label>
                      <QuoteRuleLabel
                        :hint="ruleHint('docUsd')"
                        :label="$t('page.quote.sheet.docFee')"
                      />
                    </template>
                    <Input
                      v-model:value="sheet.docUsd"
                      class="w-full"
                      :disabled="readOnly"
                    />
                  </Form.Item>
                  <Form.Item>
                    <template #label>
                      <QuoteRuleLabel
                        :hint="ruleHint('cargoInsurancePremium')"
                        :label="$t('page.quote.sheet.cargoInsurance')"
                      />
                    </template>
                    <Select
                      v-model:value="sheet.cargoInsurancePremium"
                      allow-clear
                      class="w-full"
                      :disabled="readOnly"
                      :options="cargoInsuranceOptions"
                      :placeholder="
                        readOnly
                          ? '—'
                          : $t('page.quote.sheet.selectCargoInsurance')
                      "
                    />
                  </Form.Item>
                  <Form.Item>
                    <template #label>
                      <QuoteRuleLabel
                        :hint="ruleHint('cargoAgentFee')"
                        :label="$t('page.quote.sheet.cargoAgent')"
                      />
                    </template>
                    <Select
                      v-model:value="sheet.cargoAgentFee"
                      allow-clear
                      class="w-full"
                      :disabled="readOnly"
                      :options="cargoAgentFeeOptions"
                      :placeholder="
                        readOnly
                          ? '—'
                          : $t('page.quote.sheet.selectCargoAgentFee')
                      "
                    />
                  </Form.Item>
                </div>
              </Form>
            </div>
          </section>

          <!-- 6. 底部备注 -->
          <section class="quote-editor-section">
            <div class="quote-editor-section__head">
              <span class="quote-editor-section__title">{{
                $t('page.quote.sections.sheetRemark')
              }}</span>
            </div>
            <div class="quote-editor-section__body">
              <Form layout="vertical">
                <div class="quote-sheet-fields">
                  <Form.Item
                    class="quote-sheet-field--full"
                    :label="$t('page.quote.sheet.remark')"
                  >
                    <Input.TextArea
                      v-model:value="sheet.sheetRemark"
                      class="w-full"
                      :disabled="readOnly"
                      :rows="4"
                    />
                  </Form.Item>
                </div>
              </Form>
            </div>
          </section>

          <section class="quote-editor-section">
            <div class="quote-editor-section__head">
              <span class="quote-editor-section__title">{{
                $t('page.quote.sections.dataSource')
              }}</span>
            </div>
            <div class="quote-editor-section__body">
              <CostSourceTables
                :can-import="canUseCostLibrary"
                :matches="costMatches"
                @import="openCostImport"
              />
            </div>
          </section>
          <QuoteAuditLogs ref="auditLogsRef" :quote-id="quoteId" />
        </div>
      </Card>
      <CostLibraryPickerModal ref="costPickerRef" @confirm="onCostsConfirmed" />
      <Modal
        v-model:open="withdrawOpen"
        centered
        :confirm-loading="withdrawSubmitting"
        :title="$t('page.approval.withdrawModalTitle')"
        width="560px"
        @ok="onWithdrawOk"
      >
        <Form layout="vertical">
          <Form.Item :label="$t('page.approval.withdrawReason')" required>
            <Input.TextArea
              v-model:value="withdrawComment"
              :maxlength="500"
              :placeholder="$t('page.approval.withdrawPlaceholder')"
              :rows="4"
              show-count
            />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        v-model:open="sheetPreviewOpen"
        centered
        class="quote-print-modal"
        :title="$t('page.quote.sections.printPreview')"
        width="1040px"
      >
        <QuotePrintSheet
          :cost-snapshots="costMatches"
          :customer-name="previewCustomerName"
          :quote-date="quoteDate.format('YYYY-MM-DD')"
          :sheet="sheet"
        />
        <template #footer>
          <Button @click="sheetPreviewOpen = false">
            {{ $t('common.cancel') }}
          </Button>
          <Button type="primary" @click="onPrint">
            <IconifyIcon class="mr-1 size-4" icon="lucide:printer" />
            {{ $t('page.quote.actions.print') }}
          </Button>
        </template>
      </Modal>
    </div>
  </Page>
</template>
