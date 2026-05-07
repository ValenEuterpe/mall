/**
 * Translation Module
 * 
 * Provides AI-powered translation services using Google Gemini.
 */

export { 
  translateText, 
  translateBatch,
  isTranslationAvailable,
  type SupportedLocale,
  type TranslationResult,
  type BatchTranslationInput,
  type BatchTranslationResult,
} from './gemini';
