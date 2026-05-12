import { escapeCsvCell } from './escape.js';
import { flattenRecord, isPlainObject } from './flatten.js';
import type {
  CsvColumnInput,
  CsvPrimitive,
  JsonToCsvOptions,
  ResolvedCsvColumn,
  ResolvedJsonToCsvOptions
} from './types.js';

export type {
  ArrayValueMode,
  CsvColumn,
  CsvColumnInput,
  CsvPrimitive,
  CsvRecord,
  JsonToCsvOptions,
  ResolvedCsvColumn
} from './types.js';

export { escapeCsvCell } from './escape.js';
export { flattenRecord } from './flatten.js';

export function jsonToCsv<TRecord extends object>(
  records: readonly TRecord[],
  options: JsonToCsvOptions<TRecord> = {}
): string {
  const resolved = resolveOptions(options);
  const normalizedRecords = assertRecords(records);
  const columns = resolveColumns(normalizedRecords, resolved);
  const lines: string[] = [];

  if (resolved.includeHeaders) {
    lines.push(formatRow(columns.map((column) => column.header), resolved));
  }

  for (let index = 0; index < normalizedRecords.length; index += 1) {
    const record = normalizedRecords[index];

    if (!record) {
      continue;
    }

    const sourceRecord =
      !resolved.columns && resolved.flatten ? (flattenRecord(record) as TRecord) : record;

    const row = columns.map((column) => {
      const rawValue = readColumnValue(sourceRecord, column, index);
      const formatted = column.formatter
        ? column.formatter(rawValue, sourceRecord, index)
        : formatValue(rawValue, resolved);
      return String(formatValue(formatted, resolved));
    });

    lines.push(formatRow(row, resolved));
  }

  const csv = lines.join(resolved.newline);
  return resolved.bom ? `\uFEFF${csv}` : csv;
}

export const toCsv = jsonToCsv;

export function inferCsvColumns<TRecord extends object>(
  records: readonly TRecord[],
  options: Pick<JsonToCsvOptions<TRecord>, 'flatten' | 'sortColumns'> = {}
): Array<ResolvedCsvColumn<TRecord>> {
  const resolved = resolveOptions(options);
  return resolveColumns(assertRecords(records), resolved);
}

function resolveOptions<TRecord extends object>(
  options: JsonToCsvOptions<TRecord>
): ResolvedJsonToCsvOptions<TRecord> {
  const delimiter = options.delimiter ?? ',';
  const newline = options.newline ?? '\n';
  const quote = options.quote ?? '"';
  const arrayMode = options.arrayMode ?? 'json';
  const arraySeparator = options.arraySeparator ?? ', ';
  const escapeFormulae =
    options.escapeFormulae === true ? "'" : options.escapeFormulae || false;

  if (delimiter.length === 0) {
    throw new TypeError('delimiter must be a non-empty string.');
  }

  if (newline.length === 0) {
    throw new TypeError('newline must be a non-empty string.');
  }

  if (quote.length !== 1) {
    throw new TypeError('quote must be a single character.');
  }

  if (arrayMode !== 'json' && arrayMode !== 'join' && arrayMode !== 'empty') {
    throw new TypeError('arrayMode must be "json", "join", or "empty".');
  }

  return {
    ...(options.columns ? { columns: options.columns } : {}),
    includeHeaders: options.includeHeaders ?? true,
    flatten: options.flatten ?? true,
    sortColumns: options.sortColumns ?? false,
    delimiter,
    newline,
    quote,
    nullValue: options.nullValue ?? '',
    arrayMode,
    arraySeparator,
    escapeFormulae,
    bom: options.bom ?? false,
    dateFormatter: options.dateFormatter ?? ((date) => date.toISOString())
  };
}

function assertRecords<TRecord extends object>(records: readonly TRecord[]): readonly TRecord[] {
  if (!Array.isArray(records)) {
    throw new TypeError('json-csv-kit expects an array of records.');
  }

  for (const record of records) {
    if (!isPlainObject(record)) {
      throw new TypeError('json-csv-kit expects each record to be a plain object.');
    }
  }

  return records;
}

function resolveColumns<TRecord extends object>(
  records: readonly TRecord[],
  options: ResolvedJsonToCsvOptions<TRecord>
): Array<ResolvedCsvColumn<TRecord>> {
  if (options.columns) {
    return options.columns.map(resolveColumn);
  }

  const keys = new Set<string>();

  for (const record of records) {
    const source: object = options.flatten ? flattenRecord(record) : record;

    for (const key of Object.keys(source)) {
      keys.add(key);
    }
  }

  const columnKeys = [...keys];

  if (options.sortColumns) {
    columnKeys.sort((a, b) => a.localeCompare(b));
  }

  return columnKeys.map((key) => ({
    key,
    header: key,
    path: key
  }));
}

function resolveColumn<TRecord extends object>(
  column: CsvColumnInput<TRecord>
): ResolvedCsvColumn<TRecord> {
  if (typeof column === 'string') {
    return {
      key: column,
      header: column,
      path: column
    };
  }

  return {
    key: column.key,
    header: column.header ?? column.key,
    path: column.path ?? column.key,
    ...(column.accessor ? { accessor: column.accessor } : {}),
    ...(column.formatter ? { formatter: column.formatter } : {})
  };
}

function readColumnValue<TRecord extends object>(
  record: TRecord,
  column: ResolvedCsvColumn<TRecord>,
  index: number
): unknown {
  if (column.accessor) {
    return column.accessor(record, index);
  }

  return getPath(record, column.path);
}

function getPath(record: object, path: string): unknown {
  if (Object.hasOwn(record, path)) {
    return (record as Record<string, unknown>)[path];
  }

  const segments = path.split('.');
  let current: unknown = record;

  for (const segment of segments) {
    if (!current || typeof current !== 'object') {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function formatRow<TRecord extends object>(
  values: readonly string[],
  options: ResolvedJsonToCsvOptions<TRecord>
): string {
  return values
    .map((value) =>
      escapeCsvCell(value, {
        delimiter: options.delimiter,
        quote: options.quote,
        escapeFormulae: options.escapeFormulae
      })
    )
    .join(options.delimiter);
}

function formatValue<TRecord extends object>(
  value: unknown,
  options: ResolvedJsonToCsvOptions<TRecord>
): string {
  if (value === null || value === undefined) {
    return options.nullValue;
  }

  if (value instanceof Date) {
    return options.dateFormatter(value);
  }

  if (Array.isArray(value)) {
    if (options.arrayMode === 'empty') {
      return '';
    }

    if (options.arrayMode === 'join') {
      return value.map((item) => formatValue(item, options)).join(options.arraySeparator);
    }

    return safeJsonStringify(value);
  }

  if (typeof value === 'object') {
    return safeJsonStringify(value);
  }

  return String(value as CsvPrimitive);
}

function safeJsonStringify(value: unknown): string {
  return JSON.stringify(toJsonSafe(value, new WeakSet<object>())) ?? '';
}

function toJsonSafe(value: unknown, seen: WeakSet<object>): unknown {
  if (typeof value === 'bigint') {
    return String(value);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (seen.has(value)) {
    return '[Circular]';
  }

  seen.add(value);

  if (Array.isArray(value)) {
    const output = value.map((item) => toJsonSafe(item, seen));
    seen.delete(value);
    return output;
  }

  const output: Record<string, unknown> = {};

  for (const [key, child] of Object.entries(value)) {
    output[key] = toJsonSafe(child, seen);
  }

  seen.delete(value);
  return output;
}
