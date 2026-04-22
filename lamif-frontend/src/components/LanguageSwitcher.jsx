import React from 'react';
import { useTranslation } from 'react-i18next';

function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (e) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <select 
      onChange={changeLanguage} 
      defaultValue={i18n.language}
      style={{
        padding: '8px 12px',
        borderRadius: '8px',
        border: '1px solid #d1d5db',
        background: 'white',
        fontSize: '14px',
        cursor: 'pointer',
        fontFamily: 'Outfit, sans-serif',
        outline: 'none',
        marginLeft: '15px'
      }}
    >
      <option value="en">English</option>
      <option value="am">አማርኛ</option>
      <option value="om">Afaan Oromoo</option>
    </select>
  );
}

export default LanguageSwitcher;
