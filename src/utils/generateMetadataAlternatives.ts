import { availableLocales } from "@/app/[lang]/dictionaries";
export function generateMetadataAlternatives(baseUrl: string, currentLang: string, path: string) {
    return {
            canonical: `${baseUrl}/${currentLang}${path}`,
            languages: Object.fromEntries(
                availableLocales.map((locale) => [
                    locale,
                    `${baseUrl}/${locale}${path}`,
                ])
            ),
    };
}