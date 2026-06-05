import { describe, expect, it } from "vitest";

import { computeTagTransliteration } from "./tag-transliteration";

describe("computeTagTransliteration", () => {
  it("returns null when there is no transliteratable text", () => {
    expect(
      computeTagTransliteration({ name_ru: "jam", name_am: null })
    ).toBeNull();
  });

  it("joins transliterations from Russian and Armenian names", () => {
    const result = computeTagTransliteration({
      name_ru: "варенье",
      name_am: null,
    });
    expect(result).toBeTruthy();
    expect(result).toMatch(/varene|varen/);
  });
});
