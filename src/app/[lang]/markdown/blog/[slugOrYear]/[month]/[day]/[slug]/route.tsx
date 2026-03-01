import { getDictionary, hasLocale } from "@/app/[lang]/dictionaries";
import { getPostBySlug } from "@/lib/blog";
import markdownParseJSX from "@/utils/markdownParseJSX";

export async function GET(request: Request, { params }: { params: { lang: string, slugOrYear: string, month: string, day: string, slug: string } }): Promise<Response> {
    const { lang, slugOrYear, month, day, slug } = await params;
    if (!hasLocale(lang)) {
        return new Response("Locale not supported", {
            status: 400,
            headers: {
                "Content-Type": "text/plain; charset=utf-8"
            },
        });
    }
    const dict = await getDictionary(lang);
    let Post = null;
    try {
        Post = getPostBySlug(slug, slugOrYear, month, day);
        //eslint-disable-next-line
    } catch (error) {
        return new Response("Post not found", {
            status: 404,
            headers: {
                "Content-Type": "text/plain; charset=utf-8"
            },
        });
    }
    const renderedContent = await markdownParseJSX(Post.content);
    const markdownContent = `---
title: ${Post.title} - ${dict['metadata']['blog']['post']['title']}
description: ${Post.description || dict['metadata']['blog']['post']['default_description'].replace('{title}', Post.title)}
keywords: ${Post.tags ? Post.tags.join(", ") : ''}${Post.tags ? ', ' : ''}${Post.title}, ${dict['metadata']['blog']['post']['keywords'].join(", ")}
image: ${Post.ogImage || 'https://techzjc.com/opengraph-image?title=Techzjc&subtitle=' + encodeURIComponent(Post.title)}
lang: ${lang}
---

# ${Post.title}

${renderedContent}

`
    return new Response(markdownContent, {
        headers: {
            "Content-Type": "text/markdown; charset=utf-8"
        },
    });
}
