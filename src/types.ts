export type CsvPrimitive = string | number | boolean | bigint | Date | null | undefined;

export type CsvRecord = Record<string, unknown>;

export type ArrayValueMode = 'json' | 'join' | 'empty';

export interface CsvColumn<TRecord extends CsvRecord = CsvRecord> {
  /**
   * Stable column id and default source path.
   */
  key: string;

  /**
   * Header label written in the first CSV row.
   *
   * Defaults to `key`.
   */
  header?: string;

  /**
   * Dot path used to read a value from the record.
   *
   * Defaults to `key`.
   */
  path?: string;

  /**
   * Custom accessor. Use this when paths need bracket notation or custom logic.
   */
  accessor?: (record: TRecord, index: number) => unknown;

  /**
   * Per-column formatter applied before CSV escaping.
   */
  formatter?: (value: unknown, record: TRecord, index: number) => CsvPrimitive;
}

export type CsvColumnInput<TRecord extends CsvRecord = CsvRecord> =
  | string
  | CsvColumn<TRecord>;

export interface JsonToCsvOptions<TRecord extends CsvRecord = CsvRecord> {
  /**
   * Explicit columns. When omitted, columns are inferred from records.
   */
  columns?: Array<CsvColumnInput<TRecord>>;

  /**
   * Include the header row.
   *
   * @default true
   */
  includeHeaders?: boolean;

  /**
   * Flatten nested plain objects into dot paths.
   *
   * @default true
   */
  flatten?: boolean;

  /**
   * Sort inferred columns alphabetically.
   *
   * @default false
   */
  sortColumns?: boolean;

  /**
   * Field delimiter.
   *
   * @default ','
   */
  delimiter?: string;

  /**
   * Line ending.
   *
   * @default '\n'
   */
  newline?: string;

  /**
   * Quote character.
   *
   * @default '"'
   */
  quote?: string;

  /**
   * String used for null and undefined values.
   *
   * @default ''
   */
  nullValue?: string;

  /**
   * How arrays should be formatted.
   *
   * @default 'json'
   */
  arrayMode?: ArrayValueMode;

  /**
   * Separator used when `arrayMode` is `join`.
   *
   * @default ', '
   */
  arraySeparator?: string;

  /**
   * Prefix strings that could be interpreted as spreadsheet formulas.
   *
   * @default false
   */
  escapeFormulae?: boolean | string;

  /**
   * Format Date instances.
   *
   * @default date.toISOString()
   */
  dateFormatter?: (date: Date) => string;
}

export interface ResolvedJsonToCsvOptions<TRecord extends CsvRecord = CsvRecord> {
  columns?: Array<CsvColumnInput<TRecord>>;
  includeHeaders: boolean;
  flatten: boolean;
  sortColumns: boolean;
  delimiter: string;
  newline: string;
  quote: string;
  nullValue: string;
  arrayMode: ArrayValueMode;
  arraySeparator: string;
  escapeFormulae: false | string;
  dateFormatter: (date: Date) => string;
}

export interface ResolvedCsvColumn<TRecord extends CsvRecord = CsvRecord> {
  key: string;
  header: string;
  path: string;
  accessor?: (record: TRecord, index: number) => unknown;
  formatter?: (value: unknown, record: TRecord, index: number) => CsvPrimitive;
}
