import { headers } from "next/headers";
import { getDictionary, hasLocale, type Locale } from "@/app/[lang]/dictionaries";

function getLocaleFromCookie(cookieHeader: string | null): Locale | null {
  const localeCookie = cookieHeader
    ?.split("; ")
    .find((row) => row.startsWith("locale="))
    ?.split("=")[1];

  return localeCookie && hasLocale(localeCookie) ? localeCookie : null;
}

function getLocaleFromAcceptLanguage(acceptLanguage: string | null): Locale {
  const preferredLanguage = acceptLanguage
    ?.split(",")
    .map((language) => language.split(";")[0].trim())
    .find(Boolean);

  return preferredLanguage?.toLowerCase().startsWith("zh") ? "zh-CN" : "en-US";
}

export async function getNotFoundPageData() {
  const headersList = await headers();
  const locale =
    getLocaleFromCookie(headersList.get("cookie")) ??
    getLocaleFromAcceptLanguage(headersList.get("accept-language"));

  return {
    dict: await getDictionary(locale),
    locale,
  };
}
