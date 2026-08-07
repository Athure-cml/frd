import type {
  CostMode,
  CostTableTemplate,
  CostTableTemplateLayout,
} from '#/api/cost';

export const BUILTIN_TEMPLATE_ID = 1;

const ROAD_DEFAULT_LAYOUT: CostTableTemplateLayout = {
  fieldOrder: [
    'zipCode',
    'city',
    'state',
    'por',
    'pol',
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
    'redelivery',
    'prepull',
    'nsLift',
    'otherFee',
    'remark',
    'validDate',
    'logYardNameAddress',
  ],
  fieldOverrides: {
    allInFmOneWay: { required: true },
    allInFmRound: { required: true },
    allInNoFm: { required: true },
    city: { required: true },
    pol: { required: true },
    por: { required: true },
    state: { required: true },
    supplier: { required: true },
    zipCode: { required: true },
  },
  groups: [
    {
      fields: [
        'zipCode',
        'city',
        'state',
        'por',
        'pol',
        'supplier',
        'baseFreight',
        'fsc',
        'chassis',
        'triTandemAxle',
        'split',
        'stopOff',
      ],
      headerClassName: 'road-header-route',
      key: 'route',
      labelKey: 'page.costLibrary.roadGroups.route',
    },
    {
      fields: ['allInNoFm', 'allInFmOneWay', 'allInFmRound'],
      headerClassName: 'road-header-freight',
      key: 'freight',
      labelKey: 'page.costLibrary.roadGroups.freight',
    },
    {
      fields: [
        'waitingFee',
        'redelivery',
        'prepull',
        'nsLift',
        'otherFee',
        'remark',
      ],
      headerClassName: 'road-header-extra',
      key: 'extra',
      labelKey: 'page.costLibrary.roadGroups.extra',
    },
    {
      fields: ['validDate', 'logYardNameAddress'],
      headerClassName: 'road-header-meta',
      key: 'meta',
      labelKey: 'page.costLibrary.roadGroups.meta',
    },
  ],
};

/** 海运成本库默认列：对齐业务 Excel（含附加费分组） */
const SEA_DEFAULT_LAYOUT: CostTableTemplateLayout = {
  fieldOrder: [
    'por',
    'pol',
    'pod',
    'cnShortName',
    'enProductName',
    'containerType',
    'freight',
    'freightValidDate',
    'buc',
    'bucValidDate',
    'ebs',
    'ebsValidDate',
    'gri',
    'griValidDate',
    'others',
    'othersValidDate',
    'allIn',
    'ssl',
    'agent',
    'remark',
  ],
  fieldOverrides: {
    containerType: { required: true },
    enProductName: { required: true },
    freight: { required: true },
    freightValidDate: { required: true },
    pod: { required: true },
    pol: { required: true },
    por: { required: true },
  },
  fields: [
    'por',
    'pol',
    'pod',
    'cnShortName',
    'enProductName',
    'containerType',
    'freight',
    'freightValidDate',
    'buc',
    'bucValidDate',
    'ebs',
    'ebsValidDate',
    'gri',
    'griValidDate',
    'others',
    'othersValidDate',
    'allIn',
    'ssl',
    'agent',
    'remark',
  ],
  groups: [
    {
      fields: [
        'buc',
        'bucValidDate',
        'ebs',
        'ebsValidDate',
        'gri',
        'griValidDate',
        'others',
        'othersValidDate',
      ],
      headerClassName: 'sea-header-surcharge',
      key: 'surcharge',
      labelKey: 'page.costLibrary.seaGroups.surcharge',
    },
  ],
};

/** 熏蒸成本库默认列顺序，对齐业务 Excel：REGION / STATION / FM-OUTDOOR / FM-INDOOR / ADDRESS */
const FUMIGATION_DEFAULT_LAYOUT: CostTableTemplateLayout = {
  fieldOrder: [
    'region',
    'station',
    'outdoorNonOak',
    'outdoorOak',
    'outdoorValidity',
    'indoorNonOak',
    'indoorOak',
    'indoorValidity',
    'address',
  ],
  fieldOverrides: {
    address: { required: true },
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
    'outdoorValidity',
    'indoorNonOak',
    'indoorOak',
    'indoorValidity',
    'address',
  ],
  groups: [
    {
      fields: ['outdoorNonOak', 'outdoorOak', 'outdoorValidity'],
      headerClassName: 'fumigation-header-primary',
      key: 'outdoor',
      labelKey: 'page.costLibrary.fumigationGroups.outdoor',
    },
    {
      fields: ['indoorNonOak', 'indoorOak', 'indoorValidity'],
      headerClassName: 'fumigation-header-primary',
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
