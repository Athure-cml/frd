import type { CostTableTemplate, CostTableTemplateLayout } from '#/api/cost';

/** 与 default-templates 内置 ID 对齐，本文件不反向依赖 default-templates */
const BUILTIN_TEMPLATE_ID = 1;

/** 旧版熏蒸：FM-OUTDOOR / FM-INDOOR 二级表头（仅历史快照展示） */
export const FUM_OUTDOOR_EFF = 'cf_fum_outdoor_eff';
export const FUM_INDOOR_EFF = 'cf_fum_indoor_eff';
/** 新版单级表头生效期（写入 extraFields） */
export const FUM_EFF = 'cf_fum_eff';

/** 快照 schemaVersion：缺省或非 2 视为旧版 */
export const FUMIGATION_SNAPSHOT_SCHEMA_V2 = 2;

export const FUMIGATION_LEGACY_LAYOUT: CostTableTemplateLayout = {
  customFields: [
    {
      dataType: 'date',
      field: FUM_OUTDOOR_EFF,
      required: true,
      title: '生效期',
    },
    {
      dataType: 'date',
      field: FUM_INDOOR_EFF,
      required: false,
      title: '生效期',
    },
  ],
  fieldOrder: [
    'region',
    'station',
    'outdoorNonOak',
    'outdoorOak',
    FUM_OUTDOOR_EFF,
    'outdoorValidity',
    'indoorNonOak',
    'indoorOak',
    FUM_INDOOR_EFF,
    'indoorValidity',
    'address',
    'remark',
  ],
  fieldOverrides: {
    remark: { title: '备注' },
    [FUM_OUTDOOR_EFF]: { required: true },
    outdoorNonOak: { required: true },
    outdoorOak: { required: true },
    outdoorValidity: { required: true },
    region: { required: true },
    station: { required: true },
  },
  fields: [
    'region',
    'station',
    'outdoorNonOak',
    'outdoorOak',
    FUM_OUTDOOR_EFF,
    'outdoorValidity',
    'indoorNonOak',
    'indoorOak',
    FUM_INDOOR_EFF,
    'indoorValidity',
    'address',
    'remark',
  ],
  groups: [
    {
      fields: [
        'outdoorNonOak',
        'outdoorOak',
        FUM_OUTDOOR_EFF,
        'outdoorValidity',
      ],
      key: 'outdoor',
      labelKey: 'page.costLibrary.fumigationGroups.outdoor',
    },
    {
      fields: ['indoorNonOak', 'indoorOak', FUM_INDOOR_EFF, 'indoorValidity'],
      key: 'indoor',
      labelKey: 'page.costLibrary.fumigationGroups.indoor',
    },
  ],
};

/** 新版熏蒸：单级表头（REGION / STATION / FM NON OAK / FM OAK / 生效期 / 有效期 …） */
export const FUMIGATION_V2_LAYOUT: CostTableTemplateLayout = {
  customFields: [
    {
      dataType: 'date',
      field: FUM_EFF,
      required: true,
      title: '生效期',
    },
  ],
  fieldOrder: [
    'region',
    'station',
    'outdoorNonOak',
    'outdoorOak',
    FUM_EFF,
    'outdoorValidity',
    'address',
    'remark',
  ],
  fieldOverrides: {
    address: { title: 'ADDRESS' },
    [FUM_EFF]: { required: true, title: '生效期' },
    outdoorNonOak: { required: true, title: 'FM NON OAK' },
    outdoorOak: { required: true, title: 'FM OAK' },
    outdoorValidity: { required: true, title: '有效期' },
    region: { required: true, title: 'REGION' },
    remark: { title: '备注' },
    station: { required: true, title: 'STATION' },
  },
  fields: [
    'region',
    'station',
    'outdoorNonOak',
    'outdoorOak',
    FUM_EFF,
    'outdoorValidity',
    'address',
    'remark',
  ],
  groups: [],
};

export function getFumigationLegacyTemplate(): CostTableTemplate {
  return {
    code: 'fumigation_legacy',
    id: BUILTIN_TEMPLATE_ID,
    isDefault: false,
    layout: FUMIGATION_LEGACY_LAYOUT,
    mode: 'fumigation',
    name: 'page.costLibrary.template.fumigationLegacyName',
  };
}

export function getFumigationV2Template(): CostTableTemplate {
  return {
    code: 'fumigation_v2',
    id: BUILTIN_TEMPLATE_ID,
    isDefault: true,
    layout: FUMIGATION_V2_LAYOUT,
    mode: 'fumigation',
    name: 'page.costLibrary.template.defaultName',
  };
}

/** 根据快照判断是否旧版（缺 schemaVersion 或非 2，或含室内字段） */
export function isFumigationLegacySnapshot(
  snapshot?: null | Record<string, unknown>,
) {
  if (!snapshot) {
    return true;
  }
  const version = Number(snapshot.schemaVersion);
  if (version === FUMIGATION_SNAPSHOT_SCHEMA_V2) {
    return false;
  }
  if (Number.isFinite(version) && version >= FUMIGATION_SNAPSHOT_SCHEMA_V2) {
    return false;
  }
  return true;
}
