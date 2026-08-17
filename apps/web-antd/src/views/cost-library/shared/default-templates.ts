import type {
  CostMode,
  CostTableTemplate,
  CostTableTemplateLayout,
} from '#/api/cost';

export const BUILTIN_TEMPLATE_ID = 1;

const ROAD_YARD_STORAGE = 'cf_road_yard_storage';
const ROAD_EXTRA_CHASSIS = 'cf_road_extra_chassis';
const ROAD_WAITING_UNIT = 'cf_road_waiting_unit';
const ROAD_YARD_STORAGE_UNIT = 'cf_road_yard_storage_unit';
const ROAD_EXTRA_CHASSIS_UNIT = 'cf_road_extra_chassis_unit';
const ROAD_EFF = 'cf_road_eff';

/** 卡车默认列：单行英文表头，对齐业务 Excel */
const ROAD_DEFAULT_LAYOUT: CostTableTemplateLayout = {
  customFields: [
    {
      dataType: 'number',
      field: ROAD_YARD_STORAGE,
      title: 'YARD STORAGE',
    },
    {
      dataType: 'text',
      field: ROAD_YARD_STORAGE_UNIT,
      title: 'YARD STORAGE UNIT',
    },
    {
      dataType: 'number',
      field: ROAD_EXTRA_CHASSIS,
      title: 'EXTRA CHASSIS',
    },
    {
      dataType: 'text',
      field: ROAD_EXTRA_CHASSIS_UNIT,
      title: 'EXTRA CHASSIS UNIT',
    },
    {
      dataType: 'text',
      field: ROAD_WAITING_UNIT,
      title: 'WAITING UNIT',
    },
    {
      dataType: 'date',
      field: ROAD_EFF,
      title: 'EFFECTIVE TIME',
    },
  ],
  fieldOrder: [
    'zipCode',
    'city',
    'state',
    'por',
    'supplier',
    'baseFreight',
    'fsc',
    'chassis',
    'triTandemAxle',
    'split',
    'stopOff',
    'allInNoFm',
    'allInFmOneWay',
    'allInFmRound',
    'waitingFee',
    ROAD_WAITING_UNIT,
    'redelivery',
    ROAD_YARD_STORAGE,
    ROAD_YARD_STORAGE_UNIT,
    ROAD_EXTRA_CHASSIS,
    ROAD_EXTRA_CHASSIS_UNIT,
    'prepull',
    'nsLift',
    'otherFee',
    'remark',
    ROAD_EFF,
    'validDate',
    'logYardNameAddress',
  ],
  fieldOverrides: {
    allInFmOneWay: { bgColor: '#E8F1FC', title: 'ALL IN FM NON OAK' },
    allInFmRound: { bgColor: '#E8F1FC', title: 'ALL IN FM OAK' },
    allInNoFm: { bgColor: '#E8F1FC', title: 'ALL IN' },
    baseFreight: { title: 'BASE' },
    chassis: { title: 'CHASSIS' },
    city: { required: true, title: 'CITY' },
    [ROAD_EFF]: { title: 'EFFECTIVE TIME' },
    [ROAD_EXTRA_CHASSIS]: { title: 'EXTRA CHASSIS' },
    [ROAD_EXTRA_CHASSIS_UNIT]: { title: 'EXTRA CHASSIS UNIT' },
    [ROAD_WAITING_UNIT]: { title: 'WAITING UNIT' },
    [ROAD_YARD_STORAGE]: { title: 'YARD STORAGE' },
    [ROAD_YARD_STORAGE_UNIT]: { title: 'YARD STORAGE UNIT' },
    fsc: { title: 'FSC' },
    logYardNameAddress: { title: 'PICK UP ADDRESS' },
    nsLift: { title: 'LIFT' },
    otherFee: { title: 'OTHERS' },
    por: { required: true, title: 'POR' },
    prepull: { title: 'PREPULL' },
    redelivery: { title: 'REDELIVERY' },
    remark: { title: 'REMARK' },
    split: { title: 'SPLIT' },
    state: { required: true, title: 'STATE' },
    stopOff: { title: 'STOP OFF' },
    supplier: { required: true, title: 'SUPPLIER' },
    triTandemAxle: { title: 'OW' },
    validDate: { title: 'VALID TIME' },
    waitingFee: { title: 'WAITING' },
    zipCode: { required: true, title: 'ZIP CODE' },
  },
  /** 单行表头，与业务 Excel 一致 */
  groups: [],
};

/** 海运成本库默认列：严格对齐业务 Excel 底层表头
 * 橙区左固定：POR/POL/POD/运费/箱型/生效期/有效期
 * 附加费：燃油附加费+生效期+有效期 + OTHERS+生效期+有效期
 * ALL IN 绿色；尾部 SSL/AGENT/REMARK/英文品名
 * 生效期无独立库字段，用模板自定义列写入 extraFields
 */
const SEA_FREIGHT_EFF = 'cf_sea_freight_eff';
const SEA_BUNKER_EFF = 'cf_sea_bunker_eff';
const SEA_OTHERS_EFF = 'cf_sea_others_eff';

const SEA_DEFAULT_FIELD_ORDER = [
  'por',
  'pol',
  'pod',
  'freight',
  'containerType',
  SEA_FREIGHT_EFF,
  'freightValidDate',
  'buc',
  SEA_BUNKER_EFF,
  'bucValidDate',
  'others',
  SEA_OTHERS_EFF,
  'othersValidDate',
  'allIn',
  'ssl',
  'agent',
  'remark',
  'enProductName',
];

const SEA_DEFAULT_LAYOUT: CostTableTemplateLayout = {
  customFields: [
    {
      dataType: 'date',
      field: SEA_FREIGHT_EFF,
      title: '生效期',
    },
    {
      dataType: 'date',
      field: SEA_BUNKER_EFF,
      title: '生效期',
    },
    {
      dataType: 'date',
      field: SEA_OTHERS_EFF,
      title: '生效期',
    },
  ],
  fieldOrder: SEA_DEFAULT_FIELD_ORDER,
  fieldOverrides: {
    allIn: { bgColor: '#EAF7F0' },
    buc: { title: '燃油附加费' },
    bucValidDate: { title: '有效期' },
    containerType: { fixed: 'left', required: true },
    enProductName: { required: true },
    freight: { fixed: 'left', required: true },
    freightValidDate: { fixed: 'left', required: true, title: '有效期' },
    othersValidDate: { title: '有效期' },
    pod: { fixed: 'left', required: true },
    pol: { fixed: 'left', required: true },
    por: { fixed: 'left', required: true },
    [SEA_FREIGHT_EFF]: { fixed: 'left' },
  },
  fields: SEA_DEFAULT_FIELD_ORDER,
  groups: [
    {
      fields: [
        'buc',
        SEA_BUNKER_EFF,
        'bucValidDate',
        'others',
        SEA_OTHERS_EFF,
        'othersValidDate',
      ],
      headerClassName: 'sea-header-surcharge',
      key: 'surcharge',
      labelKey: 'page.costLibrary.seaGroups.surcharge',
    },
  ],
};

/** 熏蒸成本库默认列顺序，对齐业务 Excel：REGION / STATION / FM-OUTDOOR / FM-INDOOR / ADDRESS
 * 生效期无独立库字段，用模板自定义列写入 extraFields
 */
const FUM_OUTDOOR_EFF = 'cf_fum_outdoor_eff';
const FUM_INDOOR_EFF = 'cf_fum_indoor_eff';

const FUMIGATION_DEFAULT_LAYOUT: CostTableTemplateLayout = {
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
      required: true,
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
  ],
  fieldOverrides: {
    address: { required: true },
    [FUM_INDOOR_EFF]: { required: true },
    [FUM_OUTDOOR_EFF]: { required: true },
    indoorNonOak: { required: true },
    indoorOak: { required: true },
    indoorValidity: { required: true },
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

function createBuiltinTemplate(
  mode: CostMode,
  layout: CostTableTemplateLayout,
): CostTableTemplate {
  return {
    code: `${mode}_default`,
    id: BUILTIN_TEMPLATE_ID,
    isDefault: true,
    layout,
    mode,
    name: 'page.costLibrary.template.defaultName',
  };
}

export function getBuiltinTemplates(mode: CostMode): CostTableTemplate[] {
  const layoutByMode: Record<CostMode, CostTableTemplateLayout> = {
    fumigation: FUMIGATION_DEFAULT_LAYOUT,
    road: ROAD_DEFAULT_LAYOUT,
    sea: SEA_DEFAULT_LAYOUT,
  };
  return [createBuiltinTemplate(mode, layoutByMode[mode])];
}

export function getDefaultTemplate(mode: CostMode) {
  const [template] = getBuiltinTemplates(mode);
  if (!template) {
    throw new Error(`No default template for mode: ${mode}`);
  }
  return template;
}
