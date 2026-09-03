import { createI18n } from 'vue-i18n';

import en from './en';
import fr from './fr';
import ru from './ru';

export type SupportedLocale = 'fr' | 'en' | 'ru';

const STORAGE_KEY = 'orbis-fidei.locale';
const SUPPORTED: SupportedLocale[] = ['fr', 'en', 'ru'];

function detectLocale(): SupportedLocale {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (SUPPORTED as string[]).includes(stored)) {
        return stored as SupportedLocale;
    }
    const browser = navigator.language.slice(0, 2).toLowerCase();
    if ((SUPPORTED as string[]).includes(browser)) {
        return browser as SupportedLocale;
    }
    return 'fr';
}

export const i18n = createI18n({
    legacy: false,
    locale: detectLocale(),
    fallbackLocale: 'fr',
    messages: { fr, en, ru },
});

export function setLocale(locale: SupportedLocale): void {
    i18n.global.locale.value = locale;
    localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale;
}
