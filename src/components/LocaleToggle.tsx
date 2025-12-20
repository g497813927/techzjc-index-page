import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGlobe } from "@fortawesome/free-solid-svg-icons";
import './LocaleToggle.css';
import { useState } from "react";
import { usePathname, redirect } from "next/navigation";

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

//eslint-disable-next-line
export function LocaleToggle(props: {dict: any}) {
    const dict = props.dict;
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    const toggleDropdown = () => {
        setIsOpen(!isOpen);
    };

    const changeLocale = (locale: string) => {
        const pathWithoutLocale = pathname.replace(/^\/(en-US|zh-CN)/, '');
        redirect(`/${locale}${pathWithoutLocale}`);
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
