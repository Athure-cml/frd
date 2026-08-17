export type FieldFormat =
  | 'amount'
  | 'dateMd'
  | 'percent'
  | 'price'
  | 'tag'
  | 'text';

export interface FieldCatalogEntry {
  align?: 'center' | 'left' | 'right';
  className?: string;
  field: string;
  format?: FieldFormat;
  group?: string;
  headerClassName?: string;
  labelKey: string;
  minWidth?: number;
  showOverflow?: boolean;
  width?: number;
}
