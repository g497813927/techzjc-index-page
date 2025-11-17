"use client";

import { Footer } from "@/components/Footer";
import { NavBar } from "@/components/NavBar";
import { faChevronLeft, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import "./not-found.css";

export default function NotFoundError({ error, _ }: { error: Error; _: () => void }) {
  return (
    <>
    <NavBar hasHero={false} />
    <section className="page-body center-content column-content not-found-page">
      <FontAwesomeIcon icon={faTriangleExclamation} className="warning-icon" size="6x" width="6em" height="6em" />
      <h1 className="error-404-page-title">Page Not Found!</h1>
      <h2>The page you are looking for does not exist.</h2>
      <br />
      <Link href="/" className="back-home-link">
      <FontAwesomeIcon icon={faChevronLeft} className="back-home-icon" size="1x" width="1em" height="1em" />
      Go back to Home Page</Link>
    </section>
    <Footer />
    </>
  );
}
