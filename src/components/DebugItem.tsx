"use client";

import { useEffect, useState } from "react";

export function DebugItem() {
    const [clickCount, setClickCount] = useState(0);
    const selectable = useState(() => {
        if (typeof window === "undefined") return true;
        return localStorage.getItem('start-debug-listener') !== 'true';
    })[0];

    useEffect(() => {
        if (localStorage.getItem('start-debug-listener') !== 'true') {
            return;
        }

        if (selectable) {
            document.getElementById('copyright')?.classList.add('disable-select');
        }

        if (clickCount === 3) {
            if (localStorage.getItem('enable-debug') !== 'true') {
                localStorage.setItem('enable-debug', 'true');
                localStorage.removeItem('start-debug-listener');
                alert('Debug mode enabled!');
                window.location.reload();
            } else {
                localStorage.setItem('enable-debug', 'false');
                localStorage.removeItem('start-debug-listener');
                alert('Debug mode disabled!');
                window.location.reload();
            }
        }
    }, [clickCount, selectable]);
    return (
    <p
        id="copyright" 
        onClick={() => {
            if (localStorage.getItem('start-debug-listener') === 'true') {
                setClickCount(prevCount => prevCount + 1);
                setTimeout(() => {
                    setClickCount(0);
                }, 1000);
            }
        }}
    >© 2016-{new Date().getFullYear()} Techzjc 版权所有</p>
    );
}