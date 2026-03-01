import { getDictionary, hasLocale } from "@/app/[lang]/dictionaries";
import { getAllPosts } from "@/lib/blog";
import { NextRequest } from "next/server";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ lang: string; slugOrYear: string; month: string; day: string }> }): Promise<Response> {
    const { lang, slugOrYear, month, day } = await params;
    if (!hasLocale(lang)) {
        return new Response("Locale not supported", {
            status: 400,
            headers: {
                "Content-Type": "text/plain; charset=utf-8"
            },
        });
    }
    const posts = getAllPosts(lang);
    const dict = await getDictionary(lang);
    if (!/^\d{4}$/.test(slugOrYear) || !/^\d{2}$/.test(month) || !/^\d{2}$/.test(day)) {
        return new Response("Invalid slug or year or month or day", {
            status: 400,
            headers: {
                "Content-Type": "text/plain; charset=utf-8"
            },
        });
    }
    const markdownContent = `---
title: ${dict['metadata']['blog']['day']['title'].replace('{year}', slugOrYear).replace('{month}', month).replace('{day}', day)}
description: ${dict['metadata']['blog']['day']['description'].replace('{year}', slugOrYear).replace('{month}', month).replace('{day}', day)}
keywords: ${[...dict['metadata']['blog']['day']['keywords'], slugOrYear, month, day].join(", ")}
image: https://techzjc.com/opengraph-image?title=Techzjc&subtitle=${encodeURIComponent(dict['metadata']['blog']['day']['opengraph_image_subtitle'].replace('{year}', slugOrYear).replace('{month}', month).replace('{day}', day))}
lang: ${lang}
---

# ${dict['metadata']['blog']['day']['title'].replace('{year}', slugOrYear).replace('{month}', month).replace('{day}', day)}

${dict['blog']['title']}:

${posts.filter(post => post.year === slugOrYear && post.month === month && post.day === day).map(post => `- [${post.title}](/${lang}/blog/${post.year}/${post.month}/${post.day}/${post.slug})`).join("\n")}
`
    return new Response(markdownContent, {
        headers: {
            "Content-Type": "text/markdown; charset=utf-8"
        },
    });
}
