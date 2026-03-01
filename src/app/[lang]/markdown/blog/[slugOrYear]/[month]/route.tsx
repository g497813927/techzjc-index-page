import { getDictionary, hasLocale } from "@/app/[lang]/dictionaries";
import { getAllPosts } from "@/lib/blog";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ lang: string; slugOrYear: string; month: string }> }): Promise<Response> {
    const { lang, slugOrYear, month } = await params;
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
    if (!/^\d{4}$/.test(slugOrYear) || !/^\d{2}$/.test(month)) {
        return new Response("Invalid slug or year or month", {
            status: 400,
            headers: {
                "Content-Type": "text/plain; charset=utf-8"
            },
        });
    }
    const markdownContent = `---
title: ${dict['metadata']['blog']['slug_or_year']['title'].replace('{slugOrYear}', slugOrYear)}
description: ${dict['metadata']['blog']['slug_or_year']['description'].replace('{slugOrYear}', slugOrYear)}
keywords: ${[...dict['metadata']['blog']['slug_or_year']['keywords'], slugOrYear].join(", ")}
image: https://techzjc.com/opengraph-image?title=Techzjc&subtitle=${encodeURIComponent(dict['metadata']['blog']['slug_or_year']['opengraph_image_subtitle'].replace('{slugOrYear}', slugOrYear))}
lang: ${lang}
---

# ${dict['metadata']['blog']['month']['title'].replace('{year}', slugOrYear).replace('{month}', month)}

${dict['blog']['title']}:

${posts.filter(post => post.year === slugOrYear && post.month === month).map(post => `- [${post.title}](/${lang}/blog/${post.year}/${post.month}/${post.day}/${post.slug})`).join("\n")}
`
    return new Response(markdownContent, {
        headers: {
            "Content-Type": "text/markdown; charset=utf-8"
        },
    });
}
