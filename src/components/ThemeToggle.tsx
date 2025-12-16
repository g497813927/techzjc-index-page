"use client";
import './ThemeToggle.css';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useTheme } from "./UseTheme";
import { faPalette, faComputer, faMoon, faSun } from "@fortawesome/free-solid-svg-icons";
import { useState, useEffect } from "react";


//eslint-disable-next-line
export function ThemeToggle(props: {dict: any}) {
    const dict = props.dict;
    const { theme, setTheme } = useTheme();
    const [icon, setIcon] = useState(faPalette);

    useEffect(() => {
        if (theme === "light") {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIcon(faSun);
        } else if (theme === "dark") {
            setIcon(faMoon);
        } else {
            setIcon(faPalette);
        }
    }, [theme]);


    return (
        <div className="theme-toggle">
            <FontAwesomeIcon icon={icon} size="1x" style={{ marginRight: '10px' }} className="theme-icon"
                onClick={() => {
                    const newTheme = theme === "light" ? "dark" : "light";
                    setTheme(newTheme);
                }}
                title={dict['navbar']['toggle_theme']['title']}
            />
            <ul className="theme-dropdown">
                <li
                    onClick={() => setTheme("light")}
                >
                    <FontAwesomeIcon icon={faSun} size="1x" style={{ marginRight: '10px' }} />
                    {dict['navbar']['toggle_theme']['children']['light']}
                </li>
                <li
                    onClick={() => setTheme("dark")}
                >
                    <FontAwesomeIcon icon={faMoon} size="1x" style={{ marginRight: '10px' }} />
                    {dict['navbar']['toggle_theme']['children']['dark']}
                </li>
                <li
                    onClick={() => setTheme("system")}
                >
                    <FontAwesomeIcon icon={faComputer} size="1x" style={{ marginRight: '10px' }} />
                    {dict['navbar']['toggle_theme']['children']['system']}
                </li>
            </ul>
        </div>
    );
}
