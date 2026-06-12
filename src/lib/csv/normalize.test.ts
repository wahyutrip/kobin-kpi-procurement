import { describe, expect, it } from "vitest";
import {
  cleanText,
  emptyToNull,
  parseDdMmYy,
  parseInteger,
  parseNumber,
} from "./normalize";

describe("emptyToNull", () => {
  it("converts '-', '' and whitespace to null", () => {
    expect(emptyToNull("-")).toBeNull();
    expect(emptyToNull("")).toBeNull();
    expect(emptyToNull("   ")).toBeNull();
    expect(emptyToNull(undefined)).toBeNull();
  });
  it("trims regular values", () => {
    expect(emptyToNull(" S0465 ")).toBe("S0465");
  });
});

describe("parseDdMmYy", () => {
  it("parses DD.MM.YY into ISO", () => {
    expect(parseDdMmYy("20.11.24")).toBe("2024-11-20");
    expect(parseDdMmYy("02.01.25")).toBe("2025-01-02");
    expect(parseDdMmYy("29.02.24")).toBe("2024-02-29"); // leap year
  });
  it("maps yy>=50 to 19xx (legacy outliers like 03.09.03 stay 2003)", () => {
    expect(parseDdMmYy("03.09.03")).toBe("2003-09-03");
    expect(parseDdMmYy("01.01.99")).toBe("1999-01-01");
  });
  it("returns null for empty / '-'", () => {
    expect(parseDdMmYy("-")).toBeNull();
    expect(parseDdMmYy("")).toBeNull();
  });
  it("throws on malformed or impossible dates", () => {
    expect(() => parseDdMmYy("2024-11-20")).toThrow(/invalid date/);
    expect(() => parseDdMmYy("31.02.25")).toThrow(/invalid calendar date/);
    expect(() => parseDdMmYy("99.99.99")).toThrow();
  });
});

describe("parseNumber", () => {
  it("strips comma thousand separators", () => {
    expect(parseNumber("3,400.00")).toBe(3400);
    expect(parseNumber("223,788,000.00")).toBe(223788000);
    expect(parseNumber("23,000.00")).toBe(23000);
  });
  it("handles plain integers and negatives", () => {
    expect(parseNumber("4")).toBe(4);
    expect(parseNumber("-1")).toBe(-1);
  });
  it("returns null for '-' and empty", () => {
    expect(parseNumber("-")).toBeNull();
    expect(parseNumber("")).toBeNull();
  });
  it("throws on non-numeric garbage", () => {
    expect(() => parseNumber("N/A")).toThrow(/invalid number/);
  });
});

describe("parseInteger", () => {
  it("truncates decimals and keeps negatives", () => {
    expect(parseInteger("3")).toBe(3);
    expect(parseInteger("-11")).toBe(-11);
    expect(parseInteger("2.7")).toBe(2);
  });
});

describe("cleanText", () => {
  it("removes mojibake Â before special chars", () => {
    expect(cleanText("S.1,2ÂµA")).toBe("S.1,2µA");
  });
  it("collapses whitespace", () => {
    expect(cleanText("FOO   BAR")).toBe("FOO BAR");
  });
});
