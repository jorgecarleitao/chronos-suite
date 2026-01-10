import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en_us from './locales/en-US/translation.json';
import pt_pt from './locales/pt-PT/translation.json';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            "en-US": { translation: en_us },
            "pt-PT": { translation: pt_pt },
        },
        fallbackLng: 'en-US',
        load: 'currentOnly',
        nonExplicitSupportedLngs: false,
        interpolation: {
            escapeValue: false,
        },
        detection: {
            // optional: customize detection settings if needed
            order: ['navigator', 'htmlTag', 'querystring', 'cookie', 'localStorage', 'sessionStorage', 'path', 'subdomain'],
            caches: ['localStorage', 'cookie'],
        }
    });


export default i18n;
