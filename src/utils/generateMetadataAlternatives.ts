import { availableLocales } from "@/app/[lang]/dictionaries";
export function generateMetadataAlternatives(
  baseUrl: string,
  currentLang: string,
  path: string,
  onlyCanonical = false
) {
  return {
    canonical: `${baseUrl}/${currentLang}${path}`,

    languages: !onlyCanonical
      ? undefined
      : Object.fromEntries(
          availableLocales.map((locale) => [
            locale,
            `${baseUrl}/${locale}${path}`,
          ])
        ),
  };
}
