import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

function LanguageSwitcher() {
  const { i18n } = useTranslation();

  // Force english for now since other languages are temporarily disabled
  useEffect(() => {
    if (i18n.language !== 'en') {
      i18n.changeLanguage('en');
    }
  }, [i18n]);

  return null;
}

export default LanguageSwitcher;
