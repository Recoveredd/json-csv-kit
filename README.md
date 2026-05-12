# json-csv-kit

[![CI](https://github.com/Recoveredd/json-csv-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/Recoveredd/json-csv-kit/actions/workflows/ci.yml)

Convert JSON records to clean CSV with TypeScript-first options.

`json-csv-kit` is a small utility for exports, admin tools, reports, support dashboards, docs generators and browser-based data tools. It keeps the common JSON-to-CSV path simple while leaving room for explicit columns, nested data and safe CSV escaping.

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

When exporting to spreadsheets, use `escapeFormulae` to reduce formula-injection risk:

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
- Dot paths are intentionally simple. Use `accessor` or `object-path-kit` for bracket notation and keys containing dots.
- Arrays are serialized as JSON by default so no information is lost.
- `BigInt` values inside arrays or objects are converted to strings during JSON serialization.
- Circular references are represented as `[Circular]` instead of crashing the export.
- Class instances, `Map`, `Set` and other non-plain objects are serialized as JSON when possible.

## License

MIT
