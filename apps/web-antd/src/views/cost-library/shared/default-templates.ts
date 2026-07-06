import type {
  CostMode,
  CostTableTemplate,
  CostTableTemplateLayout,
} from '#/api/cost';

export const BUILTIN_TEMPLATE_ID = 1;

const ROAD_DEFAULT_LAYOUT: CostTableTemplateLayout = {
  groups: [
    {
      fields: [
        'validDate',
        'supplier',
        'logYardNameAddress',
        'zipCode',
        'city',
        'state',
        'por',
        'pol',
      ],
      headerClassName: 'road-header-green',
      key: 'basic',
      labelKey: 'page.costLibrary.roadGroups.basic',
    },
    {
      fields: [
        'baseFreight',
        'fsc',
        'chassis',
        'owTriAxle',
        'split',
        'stopOff',
        'allIn',
        'allInNonOak',
        'allInOak',
      ],
      headerClassName: 'road-header-freight',
      key: 'freight',
      labelKey: 'page.costLibrary.roadGroups.freight',
    },
    {
      fields: ['waitingFee', 'redelivery', 'prepull', 'nsLift', 'remark'],
      headerClassName: 'road-header-green',
      key: 'surcharge',
      labelKey: 'page.costLibrary.roadGroups.surcharge',
    },
  ],
};

/** 海运标准列：Excel 七列 + 备注、有效期、状态 */
const SEA_DEFAULT_LAYOUT: CostTableTemplateLayout = {
  fieldOrder: [
    'origin',
    'destination',
    'unitPrice',
    'buc',
    'surchargeValidDate',
    'allIn',
    'carrier',
    'remark',
    'validDate',
    'status',
  ],
  fields: [
    'origin',
    'destination',
    'unitPrice',
    'buc',
    'surchargeValidDate',
    'allIn',
    'carrier',
    'remark',
    'validDate',
    'status',
  ],
};

/** 熏蒸成本库默认列顺序，与业务 Excel 二级表头一致 */
const FUMIGATION_DEFAULT_LAYOUT: CostTableTemplateLayout = {
  fieldOrder: [
    'port',
    'station',
    'nonOakOutdoor',
    'nonOakIndoor',
    'nonOakQuoteSummer',
    'nonOakQuoteWinter',
    'oakOutdoor',
    'oakIndoor',
    'oakQuoteSummer',
    'oakQuoteWinter',
    'remark',
    'updatedAt',
  ],
  fields: [
    'port',
    'station',
    'nonOakOutdoor',
    'nonOakIndoor',
    'nonOakQuoteSummer',
    'nonOakQuoteWinter',
    'oakOutdoor',
    'oakIndoor',
    'oakQuoteSummer',
    'oakQuoteWinter',
    'remark',
    'updatedAt',
  ],
  groups: [
    {
      fields: [
        'nonOakOutdoor',
        'nonOakIndoor',
        'nonOakQuoteSummer',
        'nonOakQuoteWinter',
      ],
      headerClassName: 'fumigation-header-primary',
      key: 'nonOak',
      labelKey: 'page.costLibrary.fumigationGroups.nonOak',
    },
    {
      fields: ['oakOutdoor', 'oakIndoor', 'oakQuoteSummer', 'oakQuoteWinter'],
      headerClassName: 'fumigation-header-primary',
      key: 'oak',
      labelKey: 'page.costLibrary.fumigationGroups.oak',
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
  return getBuiltinTemplates(mode)[0]!;
}
