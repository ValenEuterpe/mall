/**
 * Gemini Translation Service
 *
 * Provides auto-translation for product content using Google's Gemini API.
 * Detects the source language and translates to the other two supported languages (en, ru, am).
 */

import { env } from "@/env";

// Supported locales
export type SupportedLocale = "en" | "ru" | "am";

// Language names for Gemini prompts
const LANGUAGE_NAMES: Record<SupportedLocale, string> = {
  en: "English",
  ru: "Russian",
  am: "Armenian",
};

// All supported locales
const ALL_LOCALES: SupportedLocale[] = ["en", "ru", "am"];

/**
 * Result of a translation operation
 */
export interface TranslationResult {
  en: string;
  ru: string;
  am: string;
  detectedLanguage: SupportedLocale;
}

/**
 * Batch translation input - multiple fields to translate at once
 */
export interface BatchTranslationInput {
  name?: string;
  description?: string;
  detailDescription?: string;
}

/**
 * Batch translation result - all fields translated
 */
export interface BatchTranslationResult {
  name?: TranslationResult;
  description?: TranslationResult;
  detailDescription?: TranslationResult;
}

/**
 * Detect the language of the input text
 */
async function detectLanguage(text: string): Promise<SupportedLocale> {
  // Simple heuristic detection based on character ranges
  // Armenian: Unicode range U+0530–U+058F
  // Russian: Cyrillic range U+0400–U+04FF
  
  const armenianPattern = /[\u0530-\u058F]/;
  const cyrillicPattern = /[\u0400-\u04FF]/;
  
  if (armenianPattern.test(text)) {
    return "am";
  }
  
  if (cyrillicPattern.test(text)) {
    return "ru";
  }
  
  return "en";
}

/**
 * Call Gemini API for translation
 */
async function callGeminiAPI(prompt: string): Promise<string> {
  const apiKey = env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1, // Low temperature for consistent translations
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 2048,
        },
      }),
    }
  );
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  
  // Extract text from Gemini response
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!content) {
    throw new Error("No content in Gemini response");
  }
  
  return content.trim();
}

/**
 * Translate a single text to a target language
 */
async function translateToLanguage(
  text: string,
  sourceLanguage: SupportedLocale,
  targetLanguage: SupportedLocale
): Promise<string> {
  if (sourceLanguage === targetLanguage) {
    return text;
  }
  
  const prompt = `Translate the following ${LANGUAGE_NAMES[sourceLanguage]} text to ${LANGUAGE_NAMES[targetLanguage]}. 
This is a product name/description for a wholesale marketplace. Keep it concise and professional.
Only output the translation, nothing else.

Text to translate:
${text}`;
  
  return callGeminiAPI(prompt);
}

/**
 * Translate a single text field to all supported languages
 */
export async function translateText(text: string): Promise<TranslationResult> {
  if (!text || text.trim() === "") {
    return {
      en: "",
      ru: "",
      am: "",
      detectedLanguage: "en",
    };
  }
  
  const detectedLanguage = await detectLanguage(text);
  const targetLanguages = ALL_LOCALES.filter((l) => l !== detectedLanguage);
  
  // Translate to the other two languages in parallel
  const translations = await Promise.all(
    targetLanguages.map((targetLang) =>
      translateToLanguage(text, detectedLanguage, targetLang)
    )
  );
  
  // Build result object
  const result: TranslationResult = {
    en: "",
    ru: "",
    am: "",
    detectedLanguage,
  };
  
  // Set the original text for the detected language
  result[detectedLanguage] = text;
  
  // Set translations for other languages
  targetLanguages.forEach((lang, index) => {
    result[lang] = translations[index];
  });
  
  return result;
}

/**
 * Batch translate multiple fields at once (more efficient)
 */
export async function translateBatch(
  input: BatchTranslationInput
): Promise<BatchTranslationResult> {
  const result: BatchTranslationResult = {};
  
  // Process each field that has content
  const fieldsToTranslate: Array<{
    key: keyof BatchTranslationInput;
    value: string;
  }> = [];
  
  if (input.name && input.name.trim()) {
    fieldsToTranslate.push({ key: "name", value: input.name });
  }
  if (input.description && input.description.trim()) {
    fieldsToTranslate.push({ key: "description", value: input.description });
  }
  if (input.detailDescription && input.detailDescription.trim()) {
    fieldsToTranslate.push({
      key: "detailDescription",
      value: input.detailDescription,
    });
  }
  
  if (fieldsToTranslate.length === 0) {
    return result;
  }
  
  // If only one field, use single translation
  if (fieldsToTranslate.length === 1) {
    const field = fieldsToTranslate[0];
    result[field.key] = await translateText(field.value);
    return result;
  }
  
  // For multiple fields, use batch prompt for efficiency
  const detectedLanguage = await detectLanguage(fieldsToTranslate[0].value);
  const targetLanguages = ALL_LOCALES.filter((l) => l !== detectedLanguage);
  
  // Build batch prompt
  const fieldsList = fieldsToTranslate
    .map((f, i) => `${i + 1}. [${f.key}]: ${f.value}`)
    .join("\n");
  
  const batchPrompt = `Translate the following ${LANGUAGE_NAMES[detectedLanguage]} product fields to ${targetLanguages.map((l) => LANGUAGE_NAMES[l]).join(" and ")}.
This is for a wholesale marketplace. Keep translations concise and professional.

Output format (JSON only, no markdown):
{
  "translations": {
    "${targetLanguages[0]}": { "name": "...", "description": "...", "detailDescription": "..." },
    "${targetLanguages[1]}": { "name": "...", "description": "...", "detailDescription": "..." }
  }
}

Only include fields that were provided. Here are the fields:

${fieldsList}`;
  
  try {
    const response = await callGeminiAPI(batchPrompt);
    
    // Parse JSON response (handle potential markdown code blocks)
    let jsonStr = response;
    if (response.includes("```json")) {
      jsonStr = response.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (response.includes("```")) {
      jsonStr = response.replace(/```\n?/g, "");
    }
    
    const parsed = JSON.parse(jsonStr.trim());
    
    // Build result
    for (const field of fieldsToTranslate) {
      const translationResult: TranslationResult = {
        en: "",
        ru: "",
        am: "",
        detectedLanguage,
      };
      
      // Set original text
      translationResult[detectedLanguage] = field.value;
      
      // Set translations
      for (const targetLang of targetLanguages) {
        const translation = parsed.translations?.[targetLang]?.[field.key];
        if (translation) {
          translationResult[targetLang] = translation;
        }
      }
      
      result[field.key] = translationResult;
    }
  } catch (error) {
    // Fallback to individual translations if batch fails
    console.error("Batch translation failed, falling back to individual:", error);
    
    const translations = await Promise.all(
      fieldsToTranslate.map((f) => translateText(f.value))
    );
    
    fieldsToTranslate.forEach((field, index) => {
      result[field.key] = translations[index];
    });
  }
  
  return result;
}

/**
 * Check if translation service is available
 */
export function isTranslationAvailable(): boolean {
  return !!env.GEMINI_API_KEY;
}
