import { buildTransliterations } from "./transliterate";

export function computeTagTransliteration(names: {
  name_ru: string | null;
  name_am: string | null;
}): string | null {
  return (
    buildTransliterations([names.name_ru, names.name_am]).join(" ") || null
  );
}
