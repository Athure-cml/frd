import type { CostHighlightView, CostStatus } from '#/api/cost';

import {
  contrastTextColorForBg,
  normalizeColumnBgColor,
} from './column-bg-style';

type RowWithHighlight = {
  highlight?: CostHighlightView | null;
  status?: CostStatus | null;
};

export function isCostRowExpired(row: RowWithHighlight) {
  return row.status === 'expired';
}

export function createCostRowHighlightStyleHandlers() {
  return {
    rowClassName: ({ row }: { row: RowWithHighlight }) => {
      const classes: string[] = [];
      if (isCostRowExpired(row)) {
        classes.push('cost-row-expired');
        return classes.join(' ');
      }
      const color = normalizeColumnBgColor(row?.highlight?.color);
      if (!color) {
        return '';
      }
      classes.push('cost-row-highlight');
      if ((row.highlight?.deptCount ?? 0) > 1) {
        classes.push('cost-row-multi-dept');
      }
      return classes.join(' ');
    },
    rowStyle: ({ row }: { row: RowWithHighlight }) => {
      if (isCostRowExpired(row)) {
        return null;
      }
      const color = normalizeColumnBgColor(row?.highlight?.color);
      if (!color) {
        return null;
      }
      return {
        '--cost-row-highlight-bg': color,
        '--cost-row-highlight-fg': contrastTextColorForBg(color),
        backgroundColor: color,
        color: contrastTextColorForBg(color),
      };
    },
  };
}

export function formatHighlightRowTitle(row: RowWithHighlight) {
  const h = row.highlight;
  if (!h?.color || isCostRowExpired(row)) {
    return undefined;
  }
  const parts: string[] = [];
  if (h.deptName) {
    parts.push(h.deptName);
  }
  if ((h.deptCount ?? 0) > 1) {
    parts.push(`${h.deptCount} 个部门已标记`);
  }
  if (h.remark) {
    parts.push(h.remark);
  }
  return parts.length > 0 ? parts.join(' · ') : undefined;
}
