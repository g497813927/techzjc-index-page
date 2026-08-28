"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGlobe } from "@fortawesome/free-solid-svg-icons";
import './LocaleToggle.css';
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const availableLocales = [
    {
        lang: 'en-US',
        name: 'English (US)'
    },
    {
        lang: 'zh-CN',
        name: '简体中文'
    }
]

function persistLocalePreference(locale: string) {
    const secureAttribute = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `locale=${encodeURIComponent(locale)}; Path=/; Max-Age=31536000; SameSite=Lax${secureAttribute}`;
}

//eslint-disable-next-line
export function LocaleToggle(props: {dict: any}) {
    const dict = props.dict;
    const pathname = usePathname();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const localeFromPath = pathname.match(/^\/(en-US|zh-CN)(?:\/|$)/)?.[1];
        if (localeFromPath) {
            // Persist explicit localized URLs in the browser without adding a
            // cache-busting Set-Cookie header to the server response.
            persistLocalePreference(localeFromPath);
        }
    }, [pathname]);

    const toggleDropdown = () => {
        setIsOpen(!isOpen);
    };

    const changeLocale = (locale: string) => {
        const pathWithoutLocale = pathname.replace(/^\/(en-US|zh-CN)/, '');
        // Persist the preference in the browser so the server can keep static
        // locale responses free of Set-Cookie and therefore CDN-cacheable.
        persistLocalePreference(locale);
        setIsOpen(false);
        router.push(`/${locale}${pathWithoutLocale}`);
    };
    

    return (
        <div className="locale-toggle">
            <FontAwesomeIcon 
                icon={faGlobe} 
                size="1x" 
                className="locale-icon" 
                onClick={toggleDropdown}
                title={dict['navbar']['toggle_locale']['title']}
            />
            {isOpen && (
                <ul className="locale-dropdown">
                    {availableLocales.map((locale) => (
                        <li 
                            key={locale.lang}
                            onClick={() => changeLocale(locale.lang)}
                        >
                            {locale.name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
