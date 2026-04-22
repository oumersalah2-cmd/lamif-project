import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslation from './locales/en.json';
import amTranslation from './locales/am.json';
import omTranslation from './locales/om.json';

const resources = {
  en: { translation: enTranslation },
  am: { translation: amTranslation },
  om: { translation: omTranslation }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes values
    }
  });

export default i18n;
