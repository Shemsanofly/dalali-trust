import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../translations';

const LanguageContext = createContext();

export function useLanguage() {
    return useContext(LanguageContext);
}

export function LanguageProvider({ children }) {
    const [lang, setLang] = useState(() => {
        const stored = localStorage.getItem('sahashares_lang');
        return stored === 'SW' ? 'SW' : 'EN';
    });

    useEffect(() => {
        localStorage.setItem('sahashares_lang', lang);
        document.documentElement.lang = lang === 'SW' ? 'sw' : 'en';
    }, [lang]);

    const toggleLang = () => {
        setLang(l => (l === 'EN' ? 'SW' : 'EN'));
    };

    const t = (key) => {
        return translations[lang]?.[key] || key;
    };

    return (
        <LanguageContext.Provider value={{ lang, toggleLang, t }}>
            {children}
        </LanguageContext.Provider>
    );
}
