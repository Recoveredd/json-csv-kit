import { describe, expect, test } from 'vitest';
import {
  escapeCsvCell,
  flattenRecord,
  inferCsvColumns,
  jsonToCsv,
  toCsv
} from '../src/index.js';

describe('json-csv-kit', () => {
  test('converts records to CSV with inferred headers', () => {
    expect(
      jsonToCsv([
        { name: 'Ada', role: 'Engineer' },
        { name: 'Grace', role: 'Admiral' }
      ])
    ).toBe('name,role\nAda,Engineer\nGrace,Admiral');
  });

  test('escapes quotes, delimiters and newlines', () => {
    expect(
      jsonToCsv([
        { name: 'Ada, Lovelace', note: 'Line 1\n"Line 2"' }
      ])
    ).toBe('name,note\n"Ada, Lovelace","Line 1\n""Line 2"""');
  });

  test('supports explicit columns and headers', () => {
    const csv = jsonToCsv(
      [{ user: { name: 'Ada' }, score: 98 }],
      {
        columns: [
          { key: 'name', header: 'Name', path: 'user.name' },
          { key: 'score', header: 'Score' }
        ]
      }
    );

    expect(csv).toBe('Name,Score\nAda,98');
  });

  test('supports accessors and formatters', () => {
    const csv = jsonToCsv(
      [{ cents: 1234 }],
      {
        columns: [
          {
            key: 'total',
            accessor: (row) => row.cents,
            formatter: (value) => `$${Number(value) / 100}`
          }
        ]
      }
    );

    expect(csv).toBe('total\n$12.34');
  });

  test('accepts typed interfaces without an index signature', () => {
    interface Order {
      customer: {
        name: string;
      };
      totalCents: number;
    }

    const orders: Order[] = [{ customer: { name: 'Ada' }, totalCents: 1234 }];

    expect(
      jsonToCsv(orders, {
        columns: [
          { key: 'customer', path: 'customer.name' },
          {
            key: 'total',
            accessor: (row) => row.totalCents,
            formatter: (value) => `$${Number(value) / 100}`
          }
        ]
      })
    ).toBe('customer,total\nAda,$12.34');
  });

  test('flattens nested plain objects by default', () => {
    expect(jsonToCsv([{ user: { name: 'Ada' } }])).toBe('user.name\nAda');
  });

  test('supports keys containing dots during inferred export', () => {
    expect(jsonToCsv([{ 'user.name': 'Ada' }])).toBe('user.name\nAda');
  });

  test('can disable flattening', () => {
    expect(jsonToCsv([{ user: { name: 'Ada' } }], { flatten: false })).toBe(
      'user\n"{""name"":""Ada""}"'
    );
  });

  test('formats arrays as JSON by default', () => {
    expect(jsonToCsv([{ tags: ['admin', 'ops'] }])).toBe('tags\n"[""admin"",""ops""]"');
  });

  test('formats arrays containing bigint values', () => {
    expect(jsonToCsv([{ values: [1n, 2n] }])).toBe('values\n"[""1"",""2""]"');
  });

  test('marks circular flattened objects', () => {
    const record: { id: number; self?: unknown } = { id: 1 };
    record.self = record;

    expect(jsonToCsv([record])).toBe('id,self\n1,[Circular]');
  });

  test('does not mark shared nested references as circular', () => {
    const shared = { name: 'Ada' };

    expect(
      jsonToCsv([{ payload: { primary: shared, secondary: shared } }], {
        flatten: false
      })
    ).toBe('payload\n"{""primary"":{""name"":""Ada""},""secondary"":{""name"":""Ada""}}"');
  });

  test('can join arrays', () => {
    expect(jsonToCsv([{ tags: ['admin', 'ops'] }], { arrayMode: 'join' })).toBe(
      'tags\n"admin, ops"'
    );
  });

  test('can omit headers', () => {
    expect(jsonToCsv([{ name: 'Ada' }], { includeHeaders: false })).toBe('Ada');
  });

  test('supports custom delimiter and newline', () => {
    expect(
      jsonToCsv([{ name: 'Ada', role: 'Engineer' }], {
        delimiter: ';',
        newline: '\r\n'
      })
    ).toBe('name;role\r\nAda;Engineer');
  });

  test('can prefix CSV output with a UTF-8 BOM', () => {
    expect(jsonToCsv([{ name: 'Ada' }], { bom: true })).toBe('\uFEFFname\nAda');
  });

  test('supports null values and dates', () => {
    expect(
      jsonToCsv(
        [{ value: null, date: new Date('2026-05-12T00:00:00.000Z') }],
        { nullValue: 'NULL' }
      )
    ).toBe('value,date\nNULL,2026-05-12T00:00:00.000Z');
  });

  test('escapes spreadsheet formula values when requested', () => {
    expect(jsonToCsv([{ value: '=SUM(A1:A2)' }], { escapeFormulae: true })).toBe(
      "value\n'=SUM(A1:A2)"
    );
  });

  test('escapes spreadsheet formula values after leading whitespace', () => {
    expect(jsonToCsv([{ value: '  =SUM(A1:A2)' }], { escapeFormulae: true })).toBe(
      "value\n'  =SUM(A1:A2)"
    );
  });

  test('sorts inferred columns when requested', () => {
    expect(jsonToCsv([{ b: 2, a: 1 }], { sortColumns: true })).toBe('a,b\n1,2');
  });

  test('exports a toCsv alias', () => {
    expect(toCsv([{ name: 'Ada' }])).toBe('name\nAda');
  });

  test('infers CSV columns', () => {
    expect(inferCsvColumns([{ user: { name: 'Ada' }, active: true }])).toEqual([
      { key: 'user.name', header: 'user.name', path: 'user.name' },
      { key: 'active', header: 'active', path: 'active' }
    ]);
  });

  test('flattens records', () => {
    expect(flattenRecord({ user: { name: 'Ada' }, empty: {} })).toEqual({
      'user.name': 'Ada',
      empty: {}
    });
  });

  test('escapes individual cells', () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
  });

  test('validates options and records', () => {
    expect(() => jsonToCsv({ name: 'Ada' } as never)).toThrow('array of records');
    expect(() => jsonToCsv([null] as never)).toThrow('plain object');
    expect(() => jsonToCsv([], { delimiter: '' })).toThrow('delimiter');
    expect(() => jsonToCsv([], { quote: '""' })).toThrow('quote');
    expect(() => jsonToCsv([], { arrayMode: 'csv' as never })).toThrow('arrayMode');
  });
});
