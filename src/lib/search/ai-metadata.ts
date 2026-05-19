import { callGeminiJsonAPI } from "@/lib/translation/gemini";
import { logger } from "@/lib/utils/logger";

const MAX_TAGS_FOR_AI = 80;

export interface SearchMetadataInput {
  name: string;
  description: string | null;
  categoryId: string;
  availableTags: { id: string; key: string; name_en: string }[];
}

export interface SearchMetadata {
  tagIds: string[];
  keywords: string[];
  brand: string | null;
  productType: string | null;
}

const SEARCH_METADATA_SCHEMA = {
  type: "object",
  properties: {
    tagKeys: {
      type: "array",
      items: { type: "string" },
      description: "Array of tag keys from the available vocabulary",
    },
    keywords: {
      type: "array",
      items: { type: "string" },
      description: "Array of search keywords in English, max 10",
    },
    brand: {
      type: "string",
      description: "Brand name if detected, null otherwise",
    },
    productType: {
      type: "string",
      description: "Product type/category for search, null if not applicable",
    },
  },
  required: ["tagKeys", "keywords", "brand", "productType"],
};

export async function generateSearchMetadata(
  input: SearchMetadataInput
): Promise<SearchMetadata> {
  const { name, description, availableTags } = input;

  if (availableTags.length === 0) {
    return { tagIds: [], keywords: [], brand: null, productType: null };
  }

  const tagsForPrompt = availableTags
    .slice()
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(0, MAX_TAGS_FOR_AI);

  if (availableTags.length > MAX_TAGS_FOR_AI) {
    logger.warn("AI tag input truncated", {
      total: availableTags.length,
      cap: MAX_TAGS_FOR_AI,
    });
  }

  const tagsList = tagsForPrompt
    .map((t) => `{ "key": "${t.key}", "name": "${t.name_en}" }`)
    .join(", ");

  const prompt = `Analyze this product and extract search metadata.

PRODUCT:
- Name: ${name}
- Description: ${description || "N/A"}

AVAILABLE TAGS (choose up to 5 most relevant):
[${tagsList}]

INSTRUCTIONS:
1. Select up to 5 relevant tag keys from the available tags
2. Extract up to 10 English search keywords (brand names, product types, styles, materials)
3. Identify the brand if mentioned
4. Determine the product type

Output valid JSON matching this schema:
{
  "tagKeys": ["tag_key1", "tag_key2"],
  "keywords": ["keyword1", "keyword2"],
  "brand": "brand name or null",
  "productType": "type or null"
}`;

  try {
    const result = await callGeminiJsonAPI<{
      tagKeys: string[];
      keywords: string[];
      brand: string | null;
      productType: string | null;
    }>(prompt, SEARCH_METADATA_SCHEMA);

    const validKeys = new Set(availableTags.map((t) => t.key));
    const validTagIds =
      result.tagKeys
        ?.filter((key: string) => validKeys.has(key))
        .slice(0, 5)
        .map((key: string) => availableTags.find((t) => t.key === key)!.id) ??
      [];

    if (result.tagKeys && validTagIds.length !== result.tagKeys.length) {
      logger.warn("AI returned invalid tag keys, dropped", {
        returned: result.tagKeys,
        valid: validTagIds,
      });
    }

    return {
      tagIds: validTagIds,
      keywords: result.keywords?.slice(0, 10) ?? [],
      brand: result.brand ?? null,
      productType: result.productType ?? null,
    };
  } catch (error) {
    logger.error("AI metadata generation failed", { error, name });
    return { tagIds: [], keywords: [], brand: null, productType: null };
  }
}
