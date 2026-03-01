import { availableLocales, getDictionary, hasLocale } from "@/app/[lang]/dictionaries";
import { getPostBySlug } from "@/lib/blog";
import markdownParseJSX from "@/utils/markdownParseJSX";
import { NextRequest } from "next/server";
import { baseUrl } from "@/data/siteInfo";
import { yamlQ } from "@/utils/yamlHelper";
import { estimateMarkdownTokens } from "@/utils/markdownTokens";

export async function GET(
    _request: NextRequest,
    {
        params,
    }: { params: Promise<{ lang: string; slugOrYear: string; month: string; day: string; slug: string }> }
): Promise<Response> {
    const { lang, slugOrYear: year, month, day, slug } = await params;

    if (!hasLocale(lang)) {
        return new Response("Locale not supported", {
            status: 400,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
    }

    if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month) || !/^\d{2}$/.test(day)) {
        return new Response("Invalid year, month, or day", {
            status: 400,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
    }

    // Keep your traversal prevention idea (minimal)
    let sanitizedSlug = slug;
    let previousSlug: string;
    do {
        previousSlug = sanitizedSlug;
        sanitizedSlug = sanitizedSlug.replace(/(\.\.[\/\\])/g, "");
    } while (sanitizedSlug !== previousSlug);
    if (sanitizedSlug !== slug) {
        return new Response("Invalid slug", {
            status: 400,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
    }

    const dict = await getDictionary(lang);

    let Post: ReturnType<typeof getPostBySlug>;
    try {
        Post = getPostBySlug(sanitizedSlug, year, month, day);
    } catch {
        return new Response("Post not found", {
            status: 404,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
    }

    // If frontmatter lang mismatches the route lang, decide what you want.
    const postLang = Post.lang || lang;

    const htmlCanonicalUrl = `${baseUrl}/${lang}/blog/${year}/${month}/${day}/${sanitizedSlug}`;

    const alternate_languages = availableLocales
        .filter((locale) => locale !== lang)
        .map((locale) => ({
            hrefLang: locale,
            href: `${baseUrl}/${locale}/blog/${year}/${month}/${day}/${sanitizedSlug}`,
        }));

    // Prefer frontmatter description; otherwise use your dict fallback
    const description =
        Post.description ||
        dict.metadata.blog.post.default_description.replace("{title}", Post.title);

    const og = new URL(`${baseUrl}/opengraph-image`);
    og.searchParams.set("title", Post.title.length > 40 ? Post.title.slice(0, 37) + '...' : Post.title);
    og.searchParams.set("subtitle", dict.metadata.blog.post.opengraph_image_subtitle.replace("{title}", Post.title));

    const imageUrl = og.toString();

    // Render MDX to markdown-ish (your existing pipeline)
    const renderedContent = await markdownParseJSX(Post.content);

    // Use Post.time (from frontmatter) as authoritative published_time.
    // Keep it as-is (quoted) so you don't accidentally claim timezone precision you don't have.
    const publishedTime = Post.time || `${year}-${month}-${day}`;

    // Build YAML tags list consistently
    const tags = Array.isArray(Post.tags) ? Post.tags : [];


    const markdownContent = `---
id: ${yamlQ(htmlCanonicalUrl)}
type: ${yamlQ("blog_post")}
lang: ${yamlQ(postLang)}
title: ${yamlQ(dict.metadata.blog.post.title.replace("{title}", Post.title))}
description: ${yamlQ(description)}
canonical_url: ${yamlQ(htmlCanonicalUrl)}
published_time: ${yamlQ(publishedTime)}
tags:${tags.length ? "\n" + tags.map((t: string) => `  - ${yamlQ(t)}`).join("\n") : " []"}
image: ${yamlQ(imageUrl)}
alternate_languages:
${alternate_languages.map((a) => `  ${a.hrefLang}: ${yamlQ(a.href)}`).join("\n")}
---

# ${Post.title}

${renderedContent}
`;
    const estTokens = estimateMarkdownTokens(markdownContent);
    return new Response(markdownContent, {
        headers: {
            "Content-Language": lang,
            "x-markdown-tokens": estTokens.toString(),
            "Content-Signal": "ai-train=yes, search=yes, ai-input=yes",
            "X-Robots-Tag": "noindex, follow",
            "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=604800",
            "Link": `<${htmlCanonicalUrl}>; rel="canonical"${alternate_languages
                .map((a) => `, <${a.href}>; rel="alternate"; hreflang="${a.hrefLang}"`)
                .join("")
                }, <${baseUrl}/>; rel="alternate"; hreflang="x-default"`,
            "Content-Type": "text/markdown; charset=utf-8",
        },
    });
}
