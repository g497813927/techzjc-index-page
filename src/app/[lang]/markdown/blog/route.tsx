import { getDictionary, hasLocale } from "@/app/[lang]/dictionaries";
import { getAllPosts } from "@/lib/blog";
import { NextRequest } from "next/server";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ lang: string }> }): Promise<Response> {
    const { lang } = await params;
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
    const markdownContent = `---
title: ${dict['metadata']['blog']['index']['title']}
description: ${dict['metadata']['blog']['index']['description']}
keywords: ${dict['metadata']['blog']['index']['keywords'].join(", ")}
image: https://techzjc.com/opengraph-image?title=Techzjc&subtitle=${encodeURIComponent(dict['metadata']['blog']['index']['opengraph_image_subtitle'])}
lang: ${lang}
---

# ${dict['metadata']['blog']['index']['title']}

${dict['blog']['title']}:

${posts.map(post => `- [${post.title}](/${lang}/blog/${post.year}/${post.month}/${post.day}/${post.slug})`).join("\n")}

`
    return new Response(markdownContent, {
        headers: {
            "Content-Type": "text/markdown; charset=utf-8"
        },
    });
}
