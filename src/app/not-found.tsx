import { getNotFoundPageData } from "./not-found-locale";
import { NotFoundContent } from "./not-found-shared";
import "./globals.css";
import "./[lang]/not-found.css";

export default async function RootNotFound() {
  const { dict, locale } = await getNotFoundPageData();

  return <NotFoundContent dict={dict} homeHref={`/${locale}`} />;
}
