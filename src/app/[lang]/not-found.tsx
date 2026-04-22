import { Footer } from "@/components/Footer";
import { NavBar } from "@/components/NavBar";
import { faChevronLeft, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { headers } from "next/headers";
import { getDictionary, hasLocale, type Locale } from "./dictionaries";
import "./not-found.css";

export default async function NotFoundError() {
  const headersList = await headers();
  const localeCookie = headersList
    .get("cookie")
    ?.split("; ")
    .find((row) => row.startsWith("locale="))
    ?.split("=")[1];
  const acceptLanguage = headersList.get("accept-language");

  let locale: Locale = "en-US";
  if (localeCookie && hasLocale(localeCookie)) {
    locale = localeCookie;
  } else if (acceptLanguage) {
    const preferredLanguage = acceptLanguage
      .split(",")
      .map((lang) => lang.split(";")[0].trim())
      .find(Boolean);

    if (preferredLanguage?.toLowerCase().startsWith("zh")) {
      locale = "zh-CN";
    }
  }

  const dict = await getDictionary(locale);
  return (
    <>
      <NavBar hasHero={false} dict={dict} />
      <section className="page-body container center-content column-content not-found-page">
        <FontAwesomeIcon icon={faTriangleExclamation} className="warning-icon" size="6x" width="6em" height="6em" />
        <h1 className="error-404-page-title">{dict['404_page']['page_not_found']}</h1>
        <h2>{dict['404_page']['description']}</h2>
        <br />
        <Link href="/" className="back-home-link">
        <FontAwesomeIcon icon={faChevronLeft} className="back-home-icon" size="1x" width="1em" height="1em" />
          {dict['404_page']['go_back_home']}
        </Link>
      </section>
      <Footer dict={dict} />
    </>
  );
}
