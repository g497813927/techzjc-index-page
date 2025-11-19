"use client";
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

function isBot(ua: string) {
    return /(bot|yandex|spider|slurp|Google-InspectionTool)/i.test(ua);
}

export default function CommentComponent() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [Giscus, setGiscusStatus] = useState<any>(null);
    const [theme, setTheme] = useState<"light" | "dark">(
        typeof window !== "undefined" && document.documentElement.getAttribute("data-theme") === "dark"
            ? "dark"
            : "light"
    );


    useEffect(() => {
        const observer = new MutationObserver(() => {
            const currentTheme = document.documentElement.getAttribute("data-theme");
            setTheme(currentTheme === "dark" ? "dark" : "light");
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);

    if (process.env.NODE_ENV !== "production") {
        return null;
    } else if (process.env.NEXT_PUBLIC_ENABLE_COMMENTS !== "true") {
        return null;
    } else {
        const userAgent = typeof window !== "undefined" ? navigator.userAgent : "";
        const is_bot_ua = isBot(userAgent);
        if (is_bot_ua) {
            return null;
        } else {
            const loadComments = async () => {
                const { default: Giscus } = await import('@giscus/react');
                setGiscusStatus(() => Giscus);
                dynamic(() => import('./CommentComponentCSS'), { ssr: false });
            };

            // eslint-disable-next-line
            useEffect(() => {
                loadComments();
            }, [loadComments]);
            
            if (!Giscus) {
                return (
                    <em className='comment-section'>
                        Loading comments...
                    </em>
                )
            }

            return (
                <>
                    <hr />
                    <Giscus
                        id="comments"
                        repo="techzjc/blog-discussions"
                        repoId="R_kgDOQYYKNw"
                        category="Announcements"
                        categoryId="DIC_kwDOQYYKN84Cx8L7"
                        mapping="title"
                        reactionsEnabled="1"
                        emitMetadata="1"
                        inputPosition="top"
                        theme={theme === "dark" ? "transparent_dark" : "light"}
                        loading="lazy"
                    />
                </>
            );
        }
    };
}
