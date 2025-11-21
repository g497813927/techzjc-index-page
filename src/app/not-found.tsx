"use client";

import { Footer } from "@/components/Footer";
import { NavBar } from "@/components/NavBar";
import { faChevronLeft, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { Metadata } from 'next';
import "./not-found.css";

export const metadata: Metadata = {
  title: "Page Not Found - Techzjc",
  description: "The page you are looking for does not exist.",
  keywords: ["techzjc", "科技ZJC网", "ZJC科技网", "Techzjc", "ZJC", "赵佳成", "g497813927", "Jiacheng Zhao", "John Zhao", "404", "page not found"],
  icons: {
    icon: "https://static.techzjc.com/icon/favicon_index_page.ico",
    apple: [
      {
        url: "https://static.techzjc.com/icon/bookmark_icon_index_page.png",
        sizes: "180x180",
        type: "image/png"
      }
    ],
    shortcut: "https://static.techzjc.com/icon/favicon_index_page.ico"
  },
  alternates: {
    canonical: `https://techzjc.com/404`,
  },
}

export default function NotFoundError({  }: { error: Error; _: () => void }) {
  return (
    <>
      <NavBar hasHero={false} />
      <section className="page-body container center-content column-content not-found-page">
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
