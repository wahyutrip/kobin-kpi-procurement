import { describe, expect, it } from "vitest";
import { withLineSeq } from "./line-seq";

describe("withLineSeq", () => {
  it("assigns 0 to unique keys", () => {
    const rows = withLineSeq([{ k: "a" }, { k: "b" }], (r) => r.k);
    expect(rows.map((r) => r.lineSeq)).toEqual([0, 0]);
  });

  it("increments per repeated key in file order", () => {
    const rows = withLineSeq(
      [{ k: "a" }, { k: "a" }, { k: "b" }, { k: "a" }],
      (r) => r.k,
    );
    expect(rows.map((r) => r.lineSeq)).toEqual([0, 1, 0, 2]);
  });

  it("does not mutate input rows", () => {
    const input = [{ k: "a" }];
    withLineSeq(input, (r) => r.k);
    expect(input[0]).toEqual({ k: "a" });
  });
});
