const FORMULA_INJECTION_REGEX = /^[\s\u00A0]*[=+\-@\t\r]/;

/**
 * Neutraliza potenciais payloads de CSV/Formula Injection (SECURITY.md § 13.4)
 * prefixando apóstrofo antes de caracteres interpretados como fórmula por Excel/Calc.
 */
export function sanitizeCsvCell(value: unknown): string {
    if (value === null || value === undefined) {
        return "";
    }

    const raw =
        value instanceof Date
            ? value.toISOString()
            : typeof value === "bigint"
              ? value.toString()
              : String(value);

    const neutralized = FORMULA_INJECTION_REGEX.test(raw) ? `'${raw}` : raw;
    const escaped = neutralized.replace(/"/g, '""');
    return `"${escaped}"`;
}

/**
 * Gera CSV UTF-8 (com BOM para Excel PT-BR) e células sanitizadas.
 */
export function buildCsv(
    headers: string[],
    rows: unknown[][],
    delimiter = ";",
): string {
    const headerLine = headers.map(sanitizeCsvCell).join(delimiter);
    const bodyLines = rows.map((row) =>
        row.map(sanitizeCsvCell).join(delimiter),
    );
    return `\uFEFF${[headerLine, ...bodyLines].join("\r\n")}\r\n`;
}
