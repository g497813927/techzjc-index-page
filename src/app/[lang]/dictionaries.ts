import 'server-only';

const dictionaries = {
    'en-US': () => import('./dictionaries/en-US.json').then((mod) => mod.default),
    'zh-CN': () => import('./dictionaries/zh-CN.json').then((mod) => mod.default),
};

export const availableLocales = Object.keys(dictionaries);

export type Locale = keyof typeof dictionaries;

export const hasLocale = (locale: string): locale is Locale =>
  locale in dictionaries;

export const getDictionary = async (locale: Locale) => dictionaries[locale]();
