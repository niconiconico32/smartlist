import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "../../locals/en.json";
import es from "../../locals/es.json";

const SUPPORTED = ["en", "es"];
const deviceLang = Localization.getLocales()[0]?.languageCode ?? "en";
const lng = SUPPORTED.includes(deviceLang) ? deviceLang : "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  lng,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
  // No async backend — translations are bundled
  compatibilityJSON: "v4",
});

export const i18nReady = i18n.isInitialized;
export default i18n;
