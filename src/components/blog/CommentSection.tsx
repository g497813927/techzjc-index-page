"use client";
import Giscus from '@giscus/react';
import './CommentSection.css';
import { useEffect, useState } from 'react';

export default function CommentSection() {    
    const [theme, setTheme] = useState<"light" | "dark">(
        typeof window !== "undefined" && document.documentElement.getAttribute("data-theme") === "dark"
            ? "dark"
            : "light"
    );
    const [ giscusStatus, setGiscusStatus ] = useState<"loading" | "loaded" | "error">("loading");

    useEffect(() => {
        const observer = new MutationObserver(() => {
            const currentTheme = document.documentElement.getAttribute("data-theme");
            setTheme(currentTheme === "dark" ? "dark" : "light");
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        // Try to fetch Giscus API first to check if there are any restrictions (e.g., Googlebot being blocked from accessing it)
        if (typeof window === "undefined") return;
        if (process.env.NEXT_PUBLIC_VERCEL_ENV === "true" && giscusStatus === "loading") {
        try {
            // Get the current page title for Giscus term
            const term = document.title;
            fetch(`https://giscus.app/api/discussions?repo=techzjc%2Fblog-discussions&term=${encodeURIComponent(term)}&category=Announcements&strict=false&last=1`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            }).then((response) => {
                if (response.ok) {
                    setGiscusStatus("loaded");
                } else {
                    setGiscusStatus("error");
                }
            }).catch(() => {
                setGiscusStatus("error");
            });
        // eslint-disable-next-line
        } catch (error) {
            // eslint-disable-next-line
            setGiscusStatus("error");
        }
      } else {
        setGiscusStatus("error");
      }
    }, [giscusStatus]);
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
        if (giscusStatus === "loading") {
            return null;
        } else if (giscusStatus === "error") {
            return (
                <em className='comment-section'>
                    Comment section is currently unavailable.
                </em>
            )
        }
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
}
