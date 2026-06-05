import { describe, expect, it } from "vitest";

import { buildSearchIndex, buildSearchText } from "./tokens";

describe("buildSearchText", () => {
  it("joins tokens with spaces", () => {
    expect(buildSearchText(["jam", "berry"])).toBe("jam berry");
  });
});

describe("buildSearchIndex", () => {
  it("returns matching searchTokens and searchText", () => {
    const { searchTokens, searchText } = buildSearchIndex({
      name_en: "Strawberry Jam",
      brand: "Acme",
    });

    expect(searchTokens).toContain("strawberry");
    expect(searchTokens).toContain("jam");
    expect(searchText).toBe(searchTokens.join(" "));
  });
});
