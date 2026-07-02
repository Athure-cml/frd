import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { CostMode } from '#/api/cost';
import type { QuoteCostType } from '#/api/quote';

import { $t } from '#/locales';

import { buildColumnsFromTemplate } from '../../cost-library/shared/build-columns';
import { getDefaultTemplate } from '../../cost-library/shared/default-templates';

export const QUOTE_COST_TYPE_TO_MODE: Record<QuoteCostType, CostMode> = {
  ROAD: 'road',
  SEA: 'sea',
  FUMIGATION: 'fumigation',
};

export function quoteCostTypeToMode(type: QuoteCostType): CostMode {
  return QUOTE_COST_TYPE_TO_MODE[type];
}

export function buildQuoteCostPickerColumns(
  mode: CostMode,
): VxeTableGridOptions['columns'] {
  const template = getDefaultTemplate(mode);
  const nameField =
    mode === 'road' ? 'supplier' : mode === 'sea' ? 'origin' : 'port';
  const nameTitle =
    mode === 'road'
      ? $t('page.costLibrary.roadFields.supplier')
      : mode === 'sea'
        ? $t('page.costLibrary.seaFields.pol')
        : $t('page.costLibrary.fumigationFields.port');

  const dataColumns =
    buildColumnsFromTemplate({
      canEdit: false,
      includeOperation: false,
      mode,
      nameField,
      nameTitle,
      onActionClick: () => {},
      template,
    }) ?? [];

  return [{ fixed: 'left', type: 'radio', width: 48 }, ...dataColumns];
}
