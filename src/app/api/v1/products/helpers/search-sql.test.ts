import { describe, expect, it } from "vitest";

import {
  buildFilterSqlAndParams,
  buildSearchJoinSql,
  buildSearchMatchSql,
  getSearchSqlPlaceholders,
  shouldUseTrigram,
} from "./search-sql";

describe("shouldUseTrigram", () => {
  it("disables trigram for queries shorter than 4 characters", () => {
    expect(shouldUseTrigram("ab")).toBe(false);
    expect(shouldUseTrigram("jam")).toBe(false);
  });

  it("enables trigram for queries of 4+ characters", () => {
    expect(shouldUseTrigram("jams")).toBe(true);
    expect(shouldUseTrigram("apple")).toBe(true);
  });
});

describe("buildFilterSqlAndParams", () => {
  it("strips invalid tagIds before adding the EXISTS clause", () => {
    const validId = "clh1234567890123456789012";
    const { sql, params } = buildFilterSqlAndParams({
      tagIds: `bogus,${validId},also-bad`,
    });

    expect(sql).toContain("product_tags");
    expect(params).toEqual([[validId]]);
  });

  it("omits tag filter when every tagId is invalid", () => {
    const { sql, params } = buildFilterSqlAndParams({
      tagIds: "bogus,also-bad",
    });

    expect(sql).not.toContain("product_tags");
    expect(params).toEqual([]);
  });
});

describe("buildSearchJoinSql", () => {
  it("joins categories and subcategories for name matching", () => {
    const sql = buildSearchJoinSql();
    expect(sql).toContain("categories c");
    expect(sql).toContain("subcategories sc");
  });
});

describe("getSearchSqlPlaceholders", () => {
  it("omits $2 query param for short queries so Postgres can infer types", () => {
    const short = getSearchSqlPlaceholders(false);
    expect(short.q).toBeNull();
    expect(short.prefix).toBe("$2");
    expect(short.filterStartIdx).toBe(3);

    const long = getSearchSqlPlaceholders(true);
    expect(long.q).toBe("$2");
    expect(long.prefix).toBe("$3");
    expect(long.filterStartIdx).toBe(4);
  });
});

describe("buildSearchMatchSql", () => {
  it("uses searchText ILIKE instead of per-row unnest for short queries", () => {
    const sql = buildSearchMatchSql(getSearchSqlPlaceholders(false));
    expect(sql).toContain('"searchText" ILIKE $2');
    expect(sql).toContain("c.name_en ILIKE $2");
    expect(sql).not.toContain("unnest");
    expect(sql).not.toContain("name_en %");
  });

  it("includes trigram branches for longer queries", () => {
    const sql = buildSearchMatchSql(getSearchSqlPlaceholders(true));
    expect(sql).toContain('"searchText" % $2');
    expect(sql).toContain("name_en % $2");
    expect(sql).toContain("c.name_en % $2");
    expect(sql).not.toContain("unnest");
  });
});
