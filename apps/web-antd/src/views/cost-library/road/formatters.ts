function isEmptyNumber(value: unknown): value is null | undefined {
  return value === null || value === undefined || value === '';
}

export function formatAmount(value: null | number | undefined) {
  if (isEmptyNumber(value)) {
    return '—';
  }
  return value.toLocaleString('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
  });
}

export function formatPercent(value: null | number | undefined) {
  if (isEmptyNumber(value)) {
    return '—';
  }
  return `${value}%`;
}
