export interface EscapeCsvCellOptions {
  delimiter?: string;
  quote?: string;
  escapeFormulae?: false | string;
}

export function escapeCsvCell(value: string, options: EscapeCsvCellOptions = {}): string {
  const delimiter = options.delimiter ?? ',';
  const quote = options.quote ?? '"';
  const formulaPrefix = options.escapeFormulae ?? false;
  const safeValue = formulaPrefix && startsLikeFormula(value) ? `${formulaPrefix}${value}` : value;
  const needsQuoting =
    safeValue.includes(delimiter) ||
    safeValue.includes(quote) ||
    safeValue.includes('\n') ||
    safeValue.includes('\r');

  if (!needsQuoting) {
    return safeValue;
  }

  return `${quote}${safeValue.replaceAll(quote, quote + quote)}${quote}`;
}

function startsLikeFormula(value: string): boolean {
  return /^[=+\-@\t\r]/.test(value);
}
