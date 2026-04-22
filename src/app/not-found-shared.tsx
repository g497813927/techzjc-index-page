import { Footer } from "@/components/Footer";
import { NavBar } from "@/components/NavBar";
import { faChevronLeft, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";

export function NotFoundContent({
  dict,
  homeHref,
}: {
  dict: any;
  homeHref: string;
}) {
  return (
    <>
      <NavBar hasHero={false} dict={dict} />
      <section className="page-body container center-content column-content not-found-page">
        <FontAwesomeIcon icon={faTriangleExclamation} className="warning-icon" size="6x" width="6em" height="6em" />
        <h1 className="error-404-page-title">{dict["404_page"]["page_not_found"]}</h1>
        <h2>{dict["404_page"]["description"]}</h2>
        <br />
        <Link href={homeHref} className="back-home-link">
          <FontAwesomeIcon icon={faChevronLeft} className="back-home-icon" size="1x" width="1em" height="1em" />
          {dict["404_page"]["go_back_home"]}
        </Link>
      </section>
      <Footer dict={dict} />
    </>
  );
}
