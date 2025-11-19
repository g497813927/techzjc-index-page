"use client";
import { headers } from 'next/headers';
import Giscus from '@giscus/react';
import './CommentSection.css';
import { useEffect, useState } from 'react';

function isBot(ua: string) {
    return /(bot|yandex|spider|slurp)/i.test(ua);
}

export default function CommentSection() {
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
        return (
            <em className='comment-section'>
                Comments are disabled in development mode.
            </em>
        )
    } else if (process.env.NEXT_PUBLIC_VERCEL_ENV !== "true") {
        return (
            <em className='comment-section'>
                由于相关政策，您当前访问的网络环境无法使用评论功能，敬请谅解。
            </em>
        )
    } else {
        return headers().then((headers) => {
            const ua = headers.get('user-agent') || '';
            return isBot(ua);
        }).then((is_bot_ua) => {
            if (is_bot_ua) {
                return (
                    <em className='comment-section'>
                        Comment section is unavailable
                    </em>
                )
            } else {
                return (
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
                );
            }
        });
    }
}
