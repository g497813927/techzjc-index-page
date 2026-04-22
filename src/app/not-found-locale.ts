import { cookies, headers } from "next/headers";
import { getDictionary, hasLocale, type Locale } from "@/app/[lang]/dictionaries";

function getLocaleFromAcceptLanguage(acceptLanguage: string | null): Locale {
  const preferredLanguage = acceptLanguage
    ?.split(",")
    .map((language) => language.split(";")[0].trim())
    .find(Boolean);

  return preferredLanguage?.toLowerCase().startsWith("zh") ? "zh-CN" : "en-US";
}

export async function getNotFoundPageData() {
  const cookieStore = await cookies();
  const headersList = await headers();
  const localeCookie = cookieStore.get("locale")?.value;
  const locale =
    (localeCookie && hasLocale(localeCookie) ? localeCookie : null) ??
    getLocaleFromAcceptLanguage(headersList.get("accept-language"));

  return {
    dict: await getDictionary(locale),
    locale,
  };
}
