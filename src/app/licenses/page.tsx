import { Footer } from "@/components/Footer";
import { NavBar } from "@/components/NavBar";
import fs from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { Metadata } from 'next';
import Image from "next/image";
import "./page.css";

export const metadata: Metadata = {
    title: "Techzjc - Licenses",
    keywords: ["techzjc", "科技ZJC网", "ZJC科技网", "Techzjc", "ZJC", "赵佳成", "g497813927", "Jiacheng Zhao", "John Zhao", "licenses", "open source licenses"],
    description: "Open Source Licenses for projects used within Techzjc website.",
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
    openGraph: {
        title: "Techzjc - Licenses",
        description: "Open Source Licenses for projects used within Techzjc website.",
        url: "https://techzjc.com/licenses",
        siteName: "Techzjc",
        images: [
            {
                url: "/opengraph-image?title=Techzjc&subtitle=Open%20Source%20Licenses",
                alt: "Hero Image for Techzjc Licenses Page"
            }
        ],
        locale: "en-US",
        type: "website",
    },
    alternates: {
        canonical: "https://techzjc.com/licenses"
    }
};

export default async function LicensesPage() {
    const licenseFilePath = path.join(process.cwd(), 'public/LICENSES.json');
    let rawData;
    let licenses;
    try {
        rawData = await fs.readFile(licenseFilePath, 'utf-8');
        licenses = JSON.parse(rawData);
    } catch (error) {
        console.error("Error reading LICENSES.json:", error);
        return (
            <>
                <NavBar hasHero={false} />
                <section className="page-body container center-content column-content">
                    <h1 className="page-title">Open Source Projects used within this Site:</h1>
                    <p>Unable to load license information at this time. Please try again later or contact the site owner.</p>
                </section>
                <Footer />
            </>
        );
    }
    return (
        <>
            <Image alt="WeChat Share Image" src="/opengraph-image?title=Techzjc&subtitle=Open%20Source%20Licenses&width=800&height=800" width={800} height={800} className="hidden" />
            <NavBar hasHero={false} />
            <section className="page-body container center-content column-content">
                <h1 className="page-title">Open Source Projects used within this Site:</h1>
                <div className="license-list">
                    {
                        licenses.map((
                            pkg: { id: string; name: string; licenses: string; repository: string; licenseFile: string; licenseText: string },
                            index: number
                        ) => (
                            <div key={pkg.id} className="license-item">
                                <div className="package-header">
                                    <div className="package-name">Package: {pkg.id.startsWith('@') ? '@' + pkg.id.split('@')[1] : pkg.id.split('@')[0]}</div>
                                    <div className="package-version">Version: {pkg.id.includes('@') ? pkg.id.split('@')[2] || pkg.id.split('@')[1] : 'N/A'}</div>
                                    <div className="package-licenses">License: {pkg.licenses}</div>
                                    <div className="package-repo">
                                        Source: {pkg.repository ? (
                                            <Link href={
                                                pkg.repository
                                            } target="_blank" rel="noopener noreferrer" className="repo-link">
                                                {pkg.repository}
                                            </Link>
                                        ) : (
                                            "N/A"
                                        )}
                                    </div>
                                </div>
                                <div className="license-text">
                                    {
                                        pkg.licenseText ?
                                            pkg.licenseText.split('\n').map((line, index) => (
                                                <div key={index} className="license-line">
                                                    <pre>{line.replace(/\s$/g, '\u00A0')}</pre>
                                                </div>
                                            ))
                                            : "No license text available."
                                    }
                                </div>
                                {
                                    index < licenses.length - 1 && <hr className="license-separator" />
                                }
                            </div>

                        )
                        )}
                </div>
            </section>
            <Footer />
        </>
    );
}