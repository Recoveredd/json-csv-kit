# json-csv-kit

[![CI](https://github.com/Recoveredd/json-csv-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/Recoveredd/json-csv-kit/actions/workflows/ci.yml)

Convert JSON records to clean CSV with TypeScript-first options.

`json-csv-kit` is a small utility for exports, admin tools, reports, support dashboards, docs generators and browser-based data tools. It keeps the common JSON-to-CSV path simple while leaving room for explicit columns, nested data and safe CSV escaping.

Demo: [packages.wasta-wocket.fr/json-csv-kit/](https://packages.wasta-wocket.fr/json-csv-kit/)

## Package quality

- TypeScript types are generated from the source.
- ESM-only package with no runtime dependencies.
- Marked as side-effect free for bundlers.
- Tested on Node.js 20 and 22 with GitHub Actions.
- Works in Node.js, browsers, Vite apps and static docs tooling.

## Install

```bash
npm install json-csv-kit
```

`json-csv-kit` is ESM-only and targets Node.js 20 or newer. It also works in browsers through modern bundlers such as Vite, Rollup, webpack and esbuild.

## Quick Start

```ts
import { jsonToCsv } from 'json-csv-kit';

const csv = jsonToCsv([
  { name: 'Ada', role: 'Engineer' },
  { name: 'Grace', role: 'Admiral' }
]);

console.log(csv);
```

```csv
name,role
Ada,Engineer
Grace,Admiral
```

Nested plain objects are flattened by default:

```ts
jsonToCsv([
  {
    customer: {
      name: 'Northwind',
      region: 'EU'
    },
    total: 120
  }
]);
```

```csv
customer.name,customer.region,total
Northwind,EU,120
```

Column order is based on the first time each key is discovered while reading your records. Use `columns` when you need a stable public export format.

## Which API should I use?

| Function | Use it when you need |
| --- | --- |
| `jsonToCsv` | convert an array of records to a CSV string |
| `toCsv` | short alias for `jsonToCsv` |
| `inferCsvColumns` | inspect the columns that would be generated |
| `flattenRecord` | flatten one nested object into dot-path keys |
| `escapeCsvCell` | escape a single cell before composing CSV yourself |

## Explicit columns

Use explicit columns when you need stable order, custom headers or a subset of fields.

```ts
jsonToCsv(rows, {
  columns: [
    { key: 'customer', header: 'Customer', path: 'customer.name' },
    { key: 'region', header: 'Region', path: 'customer.region' },
    { key: 'total', header: 'Total' }
  ]
});
```

Use an accessor for custom logic or when paths need bracket notation:

```ts
jsonToCsv(rows, {
  columns: [
    {
      key: 'city',
      header: 'City',
      accessor: (row) => row.customer?.['billing.address']?.city
    }
  ]
});
```

Format a column before CSV escaping:

```ts
jsonToCsv(rows, {
  columns: [
    {
      key: 'total',
      accessor: (row) => row.totalCents,
      formatter: (value) => `$${Number(value) / 100}`
    }
  ]
});
```

The generic API accepts normal TypeScript interfaces; your row type does not need an index signature.

```ts
interface Order {
  customer: {
    name: string;
  };
  totalCents: number;
}

const orders: Order[] = [
  { customer: { name: 'Ada' }, totalCents: 1234 }
];

const csv = jsonToCsv(orders, {
  columns: [
    { key: 'customer', path: 'customer.name' },
    {
      key: 'total',
      accessor: (row) => row.totalCents,
      formatter: (value) => `$${Number(value) / 100}`
    }
  ]
});
```

## Browser download

The package returns a string, so you can decide how to save or upload it.

```ts
import { jsonToCsv } from 'json-csv-kit';

const csv = jsonToCsv(rows);
const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
const url = URL.createObjectURL(blob);

const link = document.createElement('a');
link.href = url;
link.download = 'export.csv';
link.click();

URL.revokeObjectURL(url);
```

## Nested data and paths

With inferred columns, nested plain objects are flattened into dot-path keys. Arrays, dates and other non-plain values stay as values.

```ts
jsonToCsv([{ user: { name: 'Ada' }, tags: ['admin', 'ops'] }]);
```

```csv
user.name,tags
Ada,"[""admin"",""ops""]"
```

If a source object has a real key containing dots, direct keys are checked before dot-path traversal:

```ts
jsonToCsv([{ 'user.name': 'Ada' }]);
```

Use `accessor` when your source needs bracket notation, computed values or more control than simple dot paths.

## CSV safety

Values are escaped according to normal CSV rules:

- fields containing the delimiter are quoted
- fields containing newlines are quoted
- quotes inside quoted fields are doubled

```ts
jsonToCsv([{ name: 'Ada, Lovelace', note: 'Line 1\n"Line 2"' }]);
```

```csv
name,note
"Ada, Lovelace","Line 1
""Line 2"""
```

When exporting to spreadsheets, use `escapeFormulae` to reduce formula-injection risk. Values that start with a formula marker, even after leading whitespace, are prefixed before CSV escaping:

```ts
jsonToCsv([{ value: '=SUM(A1:A2)' }], {
  escapeFormulae: true
});
```

```csv
value
'=SUM(A1:A2)
```

## Options

```ts
interface JsonToCsvOptions<TRecord> {
  columns?: Array<string | CsvColumn<TRecord>>;
  includeHeaders?: boolean;
  flatten?: boolean;
  sortColumns?: boolean;
  delimiter?: string;
  newline?: string;
  quote?: string;
  nullValue?: string;
  arrayMode?: 'json' | 'join' | 'empty';
  arraySeparator?: string;
  escapeFormulae?: boolean | string;
  dateFormatter?: (date: Date) => string;
}
```

| Option | Default | Meaning |
| --- | --- | --- |
| `columns` | inferred | explicit column list |
| `includeHeaders` | `true` | include the first header row |
| `flatten` | `true` | flatten nested plain objects into dot paths |
| `sortColumns` | `false` | sort inferred columns alphabetically |
| `delimiter` | `','` | field delimiter |
| `newline` | `'\n'` | line separator |
| `quote` | `'"'` | quote character |
| `nullValue` | `''` | output for `null` and `undefined` |
| `arrayMode` | `'json'` | format arrays as JSON, joined text or empty |
| `arraySeparator` | `', '` | separator used by `arrayMode: 'join'` |
| `escapeFormulae` | `false` | prefix spreadsheet-like formulas |
| `dateFormatter` | ISO string | format `Date` values |

## Arrays, dates and null values

Arrays are serialized as JSON by default because that preserves the original data most safely:

```ts
jsonToCsv([{ tags: ['admin', 'ops'] }]);
```

Use `arrayMode: 'join'` for human-readable lists, or `arrayMode: 'empty'` when arrays should be skipped:

```ts
jsonToCsv([{ tags: ['admin', 'ops'] }], {
  arrayMode: 'join',
  arraySeparator: ' | '
});
```

`null` and `undefined` are exported as an empty string by default. Use `nullValue` when your downstream tool needs an explicit marker:

```ts
jsonToCsv([{ name: 'Ada', team: null }], {
  nullValue: 'NULL'
});
```

Dates use `toISOString()` by default. Use `dateFormatter` for another format.

## Ecosystem recipes

Use with `object-key-paths` to inspect columns before exporting:

```ts
import { getLeafPaths } from 'object-key-paths';
import { jsonToCsv } from 'json-csv-kit';

const columns = getLeafPaths(report).map((path) => ({
  key: path,
  header: path
}));

const csv = jsonToCsv([report], { columns });
```

Use with `object-path-kit` when source paths need bracket notation:

```ts
import { getPath } from 'object-path-kit';
import { jsonToCsv } from 'json-csv-kit';

const csv = jsonToCsv(rows, {
  columns: [
    {
      key: 'city',
      header: 'City',
      accessor: (row) => getPath(row, 'customer["billing.address"].city')
    }
  ]
});
```

Use with `array-table-kit` when you need both Markdown and CSV exports from the same records:

```ts
import { arrayToMarkdownTable } from 'array-table-kit';
import { jsonToCsv } from 'json-csv-kit';

const markdown = arrayToMarkdownTable(rows);
const csv = jsonToCsv(rows);
```

## Notes

- Input must be an array of plain objects.
- Dot paths are intentionally simple. Use `accessor` or `object-path-kit` for bracket notation, ambiguous paths or computed values.
- Arrays are serialized as JSON by default so no information is lost.
- `BigInt` values inside arrays or objects are converted to strings during JSON serialization.
- Circular references are represented as `[Circular]` instead of crashing the export.
- Class instances, `Map`, `Set` and other non-plain objects are serialized as JSON when possible.

## License

MPL-2.0
