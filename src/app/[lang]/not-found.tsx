import { getNotFoundPageData } from "../not-found-locale";
import { NotFoundContent } from "../not-found-shared";
import "./not-found.css";

export default async function NotFoundError() {
  const { dict, locale } = await getNotFoundPageData();

  return <NotFoundContent dict={dict} homeHref={`/${locale}`} />;
}
