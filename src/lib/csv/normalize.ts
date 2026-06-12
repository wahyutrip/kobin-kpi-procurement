const DATE_RE = /^(\d{2})\.(\d{2})\.(\d{2})$/;

/** "-", "" and whitespace-only become null. */
export function emptyToNull(raw: string | undefined): string | null {
  if (raw === undefined) return null;
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "-") return null;
  return trimmed;
}

/** Parse "DD.MM.YY" → "YYYY-MM-DD" (yy ≥ 50 → 19xx, else 20xx). Returns null for empty, throws on malformed/invalid dates. */
export function parseDdMmYy(raw: string | undefined): string | null {
  const value = emptyToNull(raw);
  if (value === null) return null;
  const m = DATE_RE.exec(value);
  if (!m) throw new Error(`invalid date "${value}" (expected DD.MM.YY)`);
  const [, dd, mm, yy] = m;
  const year = Number(yy) >= 50 ? 1900 + Number(yy) : 2000 + Number(yy);
  const month = Number(mm);
  const day = Number(dd);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`invalid calendar date "${value}"`);
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Parse "3,400.00" / "100" / "-" → number | null. Comma = thousands separator, dot = decimal. */
export function parseNumber(raw: string | undefined): number | null {
  const value = emptyToNull(raw);
  if (value === null) return null;
  const cleaned = value.replace(/,/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) {
    throw new Error(`invalid number "${value}"`);
  }
  return Number(cleaned);
}

/** Parse integer (e.g. day counts; may be negative). */
export function parseInteger(raw: string | undefined): number | null {
  const num = parseNumber(raw);
  if (num === null) return null;
  return Math.trunc(num);
}

/** Strip UTF-8 mojibake artifacts (e.g. "Â" before µ/° from Latin-1 misdecoding). */
export function cleanText(raw: string | undefined): string | null {
  const value = emptyToNull(raw);
  if (value === null) return null;
  return value.replace(/Â(?=[ -ÿ])/g, "").replace(/\s+/g, " ").trim();
}
