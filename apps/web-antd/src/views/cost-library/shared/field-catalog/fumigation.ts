import type { FieldCatalogEntry } from './types';

const f = (key: string) => `page.costLibrary.fumigationFields.${key}`;

export const FUMIGATION_FIELD_CATALOG: FieldCatalogEntry[] = [
  { field: 'port', labelKey: f('port'), minWidth: 110, width: 120 },
  { field: 'station', labelKey: f('station'), minWidth: 100, width: 110 },
  {
    align: 'right',
    field: 'nonOakOutdoor',
    format: 'amount',
    labelKey: f('nonOakOutdoor'),
    minWidth: 100,
    width: 110,
  },
  {
    align: 'right',
    field: 'nonOakIndoor',
    format: 'amount',
    labelKey: f('nonOakIndoor'),
    minWidth: 100,
    width: 110,
  },
  {
    field: 'nonOakQuoteSummer',
    labelKey: f('nonOakQuoteSummer'),
    minWidth: 120,
    width: 130,
  },
  {
    field: 'nonOakQuoteWinter',
    labelKey: f('nonOakQuoteWinter'),
    minWidth: 120,
    width: 130,
  },
  {
    align: 'right',
    field: 'oakOutdoor',
    format: 'amount',
    labelKey: f('oakOutdoor'),
    minWidth: 100,
    width: 110,
  },
  {
    align: 'right',
    field: 'oakIndoor',
    format: 'amount',
    labelKey: f('oakIndoor'),
    minWidth: 100,
    width: 110,
  },
  {
    field: 'oakQuoteSummer',
    labelKey: f('oakQuoteSummer'),
    minWidth: 120,
    width: 130,
  },
  {
    field: 'oakQuoteWinter',
    labelKey: f('oakQuoteWinter'),
    minWidth: 120,
    width: 130,
  },
  {
    className: 'col-remark',
    field: 'remark',
    labelKey: f('remark'),
    minWidth: 140,
    showOverflow: true,
  },
  { field: 'updatedAt', labelKey: f('updatedAt'), minWidth: 150, width: 160 },
];
