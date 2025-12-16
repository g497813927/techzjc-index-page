import { Footer } from "@/components/Footer";
import { NavBar } from "@/components/NavBar";
import { faChevronLeft, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { headers } from "next/headers";
import "./not-found.css";

export default async function NotFoundError() {
  const headersList = await headers();
  let locale = 'en-US';
  // Check cookies for locale
  const localeCookie = headersList.get('cookie')?.split('; ').find(row => row.startsWith('locale='))?.split('=')[1];
  if (!localeCookie) {
    // If no locale cookie, check Accept-Language header
    const acceptLanguage = headersList.get('accept-language');
    if (acceptLanguage) {
      const acceptedLanguages = acceptLanguage.split(',').map(lang => lang.split(';')[0].trim());
      if (acceptedLanguages.length > 0) {
        locale = acceptedLanguages[0];
      }
    }
  } else {
    locale = localeCookie;
  }
  //eslint-disable-next-line
  let dict: any = {};
  try {
    dict = await (await import(`./dictionaries/${locale}.json`)).default;
  //eslint-disable-next-line
  } catch (error) {
    dict = await (await import(`./dictionaries/${locale}.json`)).default;
  }
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
