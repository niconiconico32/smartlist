import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "../../locals/en.json";
import es from "../../locals/es.json";
import fr from "../../locals/fr.json";
import it from "../../locals/it.json";
import pt from "../../locals/pt.json";
import de from "../../locals/de.json";

export const SUPPORTED_LANGUAGES = ["en", "es", "fr", "it", "pt", "de"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Normalizes any device language (e.g. "en-US", "en-GB", "en-CA", "es-MX",
 * "es-US", "es-ES", "pt-BR", "pt-PT", "fr-CA", "it-IT") to its base
 * language code, so every English and Spanish variant maps to the same
 * bundled translation.
 */
export function getAppLanguage(languageCodeOrTag?: string | null): SupportedLanguage {
  const lang = (languageCodeOrTag ?? "en").toLowerCase().split("-")[0];
  if (SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)) {
    return lang as SupportedLanguage;
  }
  return "en";
}

const deviceLocale = Localization.getLocales()[0];
const deviceLang = getAppLanguage(deviceLocale?.languageCode ?? deviceLocale?.languageTag);

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    fr: { translation: fr },
    it: { translation: it },
    pt: { translation: pt },
    de: { translation: de },
  },
  lng: deviceLang,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
  // No async backend — translations are bundled
  compatibilityJSON: "v4",
});

export const i18nReady = i18n.isInitialized;
export default i18n;
