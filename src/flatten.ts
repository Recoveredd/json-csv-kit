import type { CsvRecord } from './types.js';

export function flattenRecord(record: object, separator = '.'): CsvRecord {
  const output: CsvRecord = {};
  flattenInto(record, '', output, separator, new WeakSet<object>());
  return output;
}

function flattenInto(
  value: unknown,
  prefix: string,
  output: CsvRecord,
  separator: string,
  seen: WeakSet<object>
): void {
  if (!isPlainObject(value)) {
    if (prefix) {
      output[prefix] = value;
    }
    return;
  }

  if (seen.has(value)) {
    if (prefix) {
      output[prefix] = '[Circular]';
    }
    return;
  }

  seen.add(value);

  const entries = Object.entries(value);

  if (entries.length === 0 && prefix) {
    output[prefix] = value;
    seen.delete(value);
    return;
  }

  for (const [key, child] of entries) {
    const path = prefix ? `${prefix}${separator}${key}` : key;

    if (isPlainObject(child)) {
      flattenInto(child, path, output, separator, seen);
    } else {
      output[path] = child;
    }
  }

  seen.delete(value);
}

export function isPlainObject(value: unknown): value is CsvRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value instanceof Date) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
