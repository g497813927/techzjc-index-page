import { getDictionary, hasLocale } from "@/app/[lang]/dictionaries";
import { getAllPosts } from "@/lib/blog";

export async function GET(request: Request, { params }: { params: { lang: string, slugOrYear: string } }): Promise<Response> {
    const { lang, slugOrYear } = await params;
    const posts = getAllPosts(lang);
    if (!hasLocale(lang)) {
        return new Response("Locale not supported", {
            status: 400,
            headers: {
                "Content-Type": "text/plain; charset=utf-8"
            },
        });
    }
    const dict = await getDictionary(lang);
    if (!/^\d{4}$/.test(slugOrYear)) {
        // Check if slugOrYear matches any post slug
        const matchingPost = posts.find(post => post.slug === slugOrYear);
        if (matchingPost) {
            // If it matches a post slug, redirect to the post's markdown route
            const redirectUrl = `/${lang}/markdown/blog/${matchingPost.year}/${matchingPost.month}/${matchingPost.day}/${matchingPost.slug}`;
            return new Response(null, {
                status: 302,
                headers: {
                    "Location": redirectUrl
                },
            });
        } else {
            // If it doesn't match any post slug, return 404
            return new Response("Not found", {
                status: 404,
                headers: {
                    "Content-Type": "text/plain; charset=utf-8"
                }
            });
        }
    }
    const markdownContent = `---
title: ${dict['metadata']['blog']['slug_or_year']['title'].replace('{slugOrYear}', slugOrYear)}
description: ${dict['metadata']['blog']['slug_or_year']['description'].replace('{slugOrYear}', slugOrYear)}
keywords: ${[...dict['metadata']['blog']['slug_or_year']['keywords'], slugOrYear].join(", ")}
image: https://techzjc.com/opengraph-image?title=Techzjc&subtitle=${encodeURIComponent(dict['metadata']['blog']['slug_or_year']['opengraph_image_subtitle'].replace('{slugOrYear}', slugOrYear))}
lang: ${lang}
---

# ${dict['metadata']['blog']['slug_or_year']['title'].replace('{slugOrYear}', slugOrYear)}

${dict['blog']['title']}:

${posts.filter(post => post.year === slugOrYear).map(post => `- [${post.title}](/${lang}/blog/${post.year}/${post.month}/${post.day}/${post.slug})`).join("\n")}

`
    return new Response(markdownContent, {
        headers: {
            "Content-Type": "text/markdown; charset=utf-8"
        },
    });
}
