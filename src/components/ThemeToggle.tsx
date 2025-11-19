"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useTheme } from "./UseTheme";
import { faPalette, faComputer, faMoon, faSun } from "@fortawesome/free-solid-svg-icons";
import { useState, useEffect } from "react";
import './ThemeToggle.css';

export function ThemeToggle() {
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
                title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            />
            <ul className="theme-dropdown">
                <li
                    onClick={() => setTheme("light")}
                >
                    <FontAwesomeIcon icon={faSun} size="1x" style={{ marginRight: '10px' }} />
                    Light
                </li>
                <li
                    onClick={() => setTheme("dark")}
                >
                    <FontAwesomeIcon icon={faMoon} size="1x" style={{ marginRight: '10px' }} />
                    Dark
                </li>
                <li
                    onClick={() => setTheme("system")}
                >
                    <FontAwesomeIcon icon={faComputer} size="1x" style={{ marginRight: '10px' }} />
                    System
                </li>
            </ul>
        </div>
    );
}
