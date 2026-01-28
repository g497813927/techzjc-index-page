"use client";
import { useEffect } from "react";

const coreValues = ["富强", "民主", "文明", "和谐", "自由", "平等", "公正", "法治", "爱国", "敬业", "诚信", "友善"];
const colors = ["red", "orange", "gold"];

export function CnCoreValuesMouseClickHelper() {
    function createCoreValueElement(value: string, x: number, y: number) {
        const el = document.createElement("div");
        el.textContent = value;
        el.style.fontSize = "16px";
        el.style.fontWeight = "bold";
        el.style.color = colors[Math.floor(Math.random() * colors.length)];
        el.style.position = "fixed";
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.userSelect = "none";
        el.style.pointerEvents = "none";
        el.style.zIndex = "1000";
        el.style.transition = "transform 1s ease-out, opacity 1s ease-out";
        document.body.appendChild(el);

        requestAnimationFrame(() => {
            el.style.transform = "translateY(-50px)";
            el.style.opacity = "0";
        });

        setTimeout(() => {
            if (el && el.parentNode === document.body) {
                document.body.removeChild(el);
            }
        }, 1000);
    }

    useEffect(() => {
        let index = 0;
        const storedIndex = localStorage.getItem("cn-core-values-click-index");
        if (storedIndex !== null) {
            index = 0;
        }
        function handleClick(event: MouseEvent) {
            index = (index) % coreValues.length;
            localStorage.setItem("cn-core-values-click-index", index.toString());
            const value = coreValues[index];
            createCoreValueElement(value, event.clientX, event.clientY);
            index += 1;
        }

        document.addEventListener("click", handleClick);
        return () => {
            document.removeEventListener("click", handleClick);
        };
    }, []);

    return null;
}