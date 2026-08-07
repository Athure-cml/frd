/** 卡车 ALL IN 公式求值：表头别名 + 四则运算与括号（禁止 eval）。 */

export const ROAD_FORMULA_VARIABLE_FIELDS = [
  'baseFreight',
  'fsc',
  'chassis',
  'triTandemAxle',
  'split',
  'stopOff',
  'waitingFee',
  'redelivery',
  'prepull',
  'nsLift',
  'otherFee',
] as const;

export type RoadFormulaVariableField =
  (typeof ROAD_FORMULA_VARIABLE_FIELDS)[number];

/** 打包价引用（后两条公式可引用前一条结果） */
export const ROAD_FORMULA_PACKAGE_REF_FIELDS = [
  'allInNoFm',
  'allInFmOneWay',
] as const;

export type RoadFormulaPackageRefField =
  (typeof ROAD_FORMULA_PACKAGE_REF_FIELDS)[number];

export type RoadFormulaEvalField =
  | RoadFormulaPackageRefField
  | RoadFormulaVariableField;

export type RoadFormulaFeeValues = Partial<
  Record<RoadFormulaEvalField, null | number | undefined>
>;

export type FormulaBuilderVariant =
  | 'fumigationNonOak'
  | 'fumigationOak'
  | 'nonFumigation';

export interface SupplierAllInFormulas {
  fumigationNonOakPackageFormula?: null | string;
  fumigationOakPackageFormula?: null | string;
  nonFumigationPackageFormula?: null | string;
}

/** 别名按长度降序，避免短词抢先匹配。 */
const FIELD_ALIAS_ENTRIES: Array<[string, RoadFormulaEvalField]> = [
  ['熏蒸打包价（非橡木）', 'allInFmOneWay'],
  ['熏蒸打包价价（非橡木）', 'allInFmOneWay'],
  ['ALL IN - FM (NON OAK)', 'allInFmOneWay'],
  ['ALL IN - FM ONE WAY', 'allInFmOneWay'],
  ['ALL IN - NO FM', 'allInNoFm'],
  ['非熏蒸打包价', 'allInNoFm'],
  ['TRI/TANDEM AXLE', 'triTandemAxle'],
  ['TRI TANDEM AXLE', 'triTandemAxle'],
  ['OW/TRI-AXCEL', 'triTandemAxle'],
  ['OW/TRI-AXLE', 'triTandemAxle'],
  ['OW/TRI AXLE', 'triTandemAxle'],
  ['OW TRI AXLE', 'triTandemAxle'],
  ['BASE FREIGHT', 'baseFreight'],
  ['WAITING FEE', 'waitingFee'],
  ['OTHER FEE', 'otherFee'],
  ['STOP OFF', 'stopOff'],
  ['NS LIFT', 'nsLift'],
  ['TO LIFT', 'nsLift'],
  ['CHASSIS', 'chassis'],
  ['REDELIVERY', 'redelivery'],
  ['PREPULL', 'prepull'],
  ['SPLIT', 'split'],
  ['FSC', 'fsc'],
  ...ROAD_FORMULA_VARIABLE_FIELDS.map(
    (field) => [field, field] as [string, RoadFormulaEvalField],
  ),
  ...ROAD_FORMULA_PACKAGE_REF_FIELDS.map(
    (field) => [field, field] as [string, RoadFormulaEvalField],
  ),
].toSorted((a, b) => b[0].length - a[0].length);

export const ROAD_FORMULA_HINT_TOKENS = [
  'BASE FREIGHT',
  'FSC',
  'CHASSIS',
  'OW/TRI-AXCEL',
  'TRI/TANDEM AXLE',
  'SPLIT',
  'STOP OFF',
  'WAITING FEE',
  'REDELIVERY',
  'PREPULL',
  'NS LIFT',
  'OTHER FEE',
] as const;

/** 公式构建器可选费用字段 */
export const ROAD_FORMULA_BUILDER_FIELDS = [
  'BASE FREIGHT',
  'FSC',
  'CHASSIS',
  'OW/TRI-AXCEL',
  'SPLIT',
  'STOP OFF',
  'WAITING FEE',
  'REDELIVERY',
  'PREPULL',
  'NS LIFT',
  'OTHER FEE',
] as const;

export const PACKAGE_REF_TOKEN_NON_FUMIGATION = '非熏蒸打包价';
export const PACKAGE_REF_TOKEN_FUMIGATION_NON_OAK = '熏蒸打包价（非橡木）';

export function builderFieldsForVariant(
  variant: FormulaBuilderVariant = 'nonFumigation',
): string[] {
  if (variant === 'fumigationNonOak') {
    return [...ROAD_FORMULA_BUILDER_FIELDS, PACKAGE_REF_TOKEN_NON_FUMIGATION];
  }
  if (variant === 'fumigationOak') {
    return [
      ...ROAD_FORMULA_BUILDER_FIELDS,
      PACKAGE_REF_TOKEN_FUMIGATION_NON_OAK,
    ];
  }
  return [...ROAD_FORMULA_BUILDER_FIELDS];
}

export const ROAD_FORMULA_EXAMPLE =
  'BASE FREIGHT+FSC+CHASSIS+OW/TRI-AXCEL+SPLIT+STOP OFF';

export class FormulaEvalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FormulaEvalError';
  }
}

function matchFieldAt(
  src: string,
  index: number,
): undefined | { field: RoadFormulaEvalField; length: number } {
  const slice = src.slice(index);
  for (const [alias, field] of FIELD_ALIAS_ENTRIES) {
    if (slice.length < alias.length) {
      continue;
    }
    if (slice.slice(0, alias.length).toUpperCase() !== alias.toUpperCase()) {
      continue;
    }
    const next = slice[alias.length];
    if (
      next &&
      /[A-Za-z0-9_]/.test(next) &&
      !alias.includes(' ') &&
      !alias.includes('/') &&
      ![...alias].some((ch) => (ch.codePointAt(0) ?? 0) > 0x7f)
    ) {
      continue;
    }
    return { field, length: alias.length };
  }
  return undefined;
}

type Token =
  | { type: 'field'; value: RoadFormulaEvalField }
  | { type: 'number'; value: number }
  | { type: 'op'; value: '*' | '+' | '-' | '/' }
  | { type: 'paren'; value: '(' | ')' };

function tokenize(formula: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const src = formula.trim();
  while (i < src.length) {
    const ch = src[i];
    if (ch === undefined) {
      break;
    }
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if ('+-*/()'.includes(ch)) {
      tokens.push(
        ch === '(' || ch === ')'
          ? { type: 'paren', value: ch }
          : { type: 'op', value: ch as '*' | '+' | '-' | '/' },
      );
      i += 1;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let j = i + 1;
      while (j < src.length) {
        const digit = src[j];
        if (digit === undefined || !/[0-9.]/.test(digit)) {
          break;
        }
        j += 1;
      }
      const num = Number(src.slice(i, j));
      if (Number.isNaN(num)) {
        throw new FormulaEvalError(`无效数字: ${src.slice(i, j)}`);
      }
      tokens.push({ type: 'number', value: num });
      i = j;
      continue;
    }
    const matched = matchFieldAt(src, i);
    if (matched) {
      tokens.push({ type: 'field', value: matched.field });
      i += matched.length;
      continue;
    }
    let j = i;
    while (j < src.length) {
      const c = src[j];
      if (c === undefined || /\s/.test(c) || '+-*/()'.includes(c)) {
        break;
      }
      j += 1;
    }
    const unknown = src.slice(i, Math.max(j, i + 1)).trim();
    throw new FormulaEvalError(`未知字段: ${unknown || ch}`);
  }
  return tokens;
}

class Parser {
  private index = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly values: RoadFormulaFeeValues,
  ) {}

  parse(): number {
    if (this.tokens.length === 0) {
      throw new FormulaEvalError('公式为空');
    }
    const result = this.parseExpr();
    if (this.index < this.tokens.length) {
      throw new FormulaEvalError('公式存在多余内容');
    }
    return result;
  }

  private next(): Token {
    const token = this.tokens[this.index];
    if (!token) {
      throw new FormulaEvalError('公式不完整');
    }
    this.index += 1;
    return token;
  }

  private parseExpr(): number {
    let left = this.parseTerm();
    while (true) {
      const token = this.peek();
      if (
        !token ||
        token.type !== 'op' ||
        (token.value !== '+' && token.value !== '-')
      ) {
        break;
      }
      this.next();
      const right = this.parseTerm();
      left = token.value === '+' ? left + right : left - right;
    }
    return left;
  }

  private parsePrimary(): number {
    const token = this.next();
    if (token.type === 'number') {
      return token.value;
    }
    if (token.type === 'field') {
      const raw = this.values[token.value];
      if (raw === null || raw === undefined || Number.isNaN(Number(raw))) {
        return 0;
      }
      const num = Number(raw);
      // FSC 存的是百分比数值（如 35 表示 35%），参与运算时转成小数
      return token.value === 'fsc' ? num / 100 : num;
    }
    if (token.type === 'paren' && token.value === '(') {
      const value = this.parseExpr();
      const close = this.next();
      if (close.type !== 'paren' || close.value !== ')') {
        throw new FormulaEvalError('缺少右括号');
      }
      return value;
    }
    throw new FormulaEvalError('公式语法错误');
  }

  private parseTerm(): number {
    let left = this.parseUnary();
    while (true) {
      const token = this.peek();
      if (
        !token ||
        token.type !== 'op' ||
        (token.value !== '*' && token.value !== '/')
      ) {
        break;
      }
      this.next();
      const right = this.parseUnary();
      if (token.value === '*') {
        left *= right;
      } else {
        if (right === 0) {
          throw new FormulaEvalError('除数不能为 0');
        }
        left /= right;
      }
    }
    return left;
  }

  private parseUnary(): number {
    const token = this.peek();
    if (token?.type === 'op' && (token.value === '+' || token.value === '-')) {
      this.next();
      const value = this.parseUnary();
      return token.value === '-' ? -value : value;
    }
    return this.parsePrimary();
  }

  private peek(): Token | undefined {
    return this.tokens[this.index];
  }
}

export function evaluateRoadFormula(
  formula: null | string | undefined,
  values: RoadFormulaFeeValues,
): null | number {
  if (formula === null || formula === undefined || !String(formula).trim()) {
    return null;
  }
  const tokens = tokenize(String(formula));
  const result = new Parser(tokens, values).parse();
  if (!Number.isFinite(result)) {
    throw new FormulaEvalError('计算结果无效');
  }
  return Math.round(result * 100) / 100;
}

export function feeValuesFromForm(
  values: Record<string, unknown>,
): RoadFormulaFeeValues {
  const out: RoadFormulaFeeValues = {};
  for (const field of ROAD_FORMULA_VARIABLE_FIELDS) {
    const raw = values[field];
    out[field] =
      raw === null || raw === undefined || raw === '' ? 0 : Number(raw);
  }
  return out;
}

export function resolveAllInFromFormulas(
  formulas: null | SupplierAllInFormulas | undefined,
  values: RoadFormulaFeeValues,
): {
  allInFmOneWay: null | number;
  allInFmRound: null | number;
  allInNoFm: null | number;
} {
  const allInNoFm = evaluateRoadFormula(
    formulas?.nonFumigationPackageFormula,
    values,
  );
  const withNoFm: RoadFormulaFeeValues = {
    ...values,
    allInNoFm: allInNoFm ?? 0,
  };
  const allInFmOneWay = evaluateRoadFormula(
    formulas?.fumigationNonOakPackageFormula,
    withNoFm,
  );
  const withNonOak: RoadFormulaFeeValues = {
    ...withNoFm,
    allInFmOneWay: allInFmOneWay ?? 0,
  };
  const allInFmRound = evaluateRoadFormula(
    formulas?.fumigationOakPackageFormula,
    withNonOak,
  );
  return {
    allInFmOneWay,
    allInFmRound,
    allInNoFm,
  };
}

export function formulaForAllInField(
  formulas: null | SupplierAllInFormulas | undefined,
  field: 'allInFmOneWay' | 'allInFmRound' | 'allInNoFm',
): string | undefined {
  if (!formulas) {
    return undefined;
  }
  let raw: null | string | undefined;
  if (field === 'allInNoFm') {
    raw = formulas.nonFumigationPackageFormula;
  } else if (field === 'allInFmOneWay') {
    raw = formulas.fumigationNonOakPackageFormula;
  } else {
    raw = formulas.fumigationOakPackageFormula;
  }
  const text = raw?.trim();
  return text || undefined;
}

export function validateRoadFormula(formula: null | string | undefined): {
  message?: string;
  ok: boolean;
} {
  if (formula === null || formula === undefined || !String(formula).trim()) {
    return { ok: true };
  }
  try {
    evaluateRoadFormula(String(formula), {});
    return { ok: true };
  } catch (error) {
    return {
      message:
        error instanceof FormulaEvalError
          ? error.message
          : String((error as Error)?.message ?? error),
      ok: false,
    };
  }
}
