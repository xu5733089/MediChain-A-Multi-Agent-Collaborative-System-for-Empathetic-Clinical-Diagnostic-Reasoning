import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en/translation.json";
import zh from "./locales/zh/translation.json";
import ja from "./locales/ja/translation.json";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh },
    ja: { translation: ja },
  },
  lng: localStorage.getItem("medichain_lang") || "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", (lng) => {
  localStorage.setItem("medichain_lang", lng);
});

export default i18n;
