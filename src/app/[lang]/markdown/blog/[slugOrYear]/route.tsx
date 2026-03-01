import { availableLocales, getDictionary, hasLocale } from "@/app/[lang]/dictionaries";
import { getAllPosts } from "@/lib/blog";
import { NextRequest } from "next/server";
import { baseUrl } from "@/data/siteInfo";
import { yamlQ } from "@/utils/yamlHelper";
import { estimateMarkdownTokens } from "@/utils/markdownTokens";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ lang: string; slugOrYear: string }> }
): Promise<Response> {
    const { lang, slugOrYear } = await params;

    if (!hasLocale(lang)) {
        return new Response("Locale not supported", {
            status: 400,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
    }

    const dict = await getDictionary(lang);

    // If slugOrYear is not a year, treat it as a slug alias and redirect to the full dated path
    if (!/^\d{4}$/.test(slugOrYear)) {
        const posts = getAllPosts(lang);
        const matchingPost = posts.find((post) => post.slug === slugOrYear);

        if (matchingPost) {
            const redirectUrl = `${baseUrl}/${lang}/markdown/blog/${matchingPost.year}/${matchingPost.month}/${matchingPost.day}/${matchingPost.slug}`;
            return new Response(null, {
                status: 302,
                headers: {
                    Location: redirectUrl,
                    "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=604800",
                },
            });
        }

        return new Response("Not found", {
            status: 404,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
    }

    // Year index
    const posts = getAllPosts(lang).filter((p) => p.year === slugOrYear);

    const canonicalUrl = `${baseUrl}/${lang}/blog/${slugOrYear}`;
    const alternate_languages = availableLocales
        .filter((locale) => locale !== lang)
        .map((locale) => ({
            hrefLang: locale,
            href: `${baseUrl}/${locale}/blog/${slugOrYear}`,
        }));

    const og = new URL(`${baseUrl}/opengraph-image`);
    og.searchParams.set("title", "Techzjc");
    og.searchParams.set(
        "subtitle",
        dict.metadata.blog.slug_or_year.opengraph_image_subtitle.replace("{slugOrYear}", slugOrYear)
    );

    const title = dict.metadata.blog.slug_or_year.title.replace("{slugOrYear}", slugOrYear);
    const description = dict.metadata.blog.slug_or_year.description.replace("{slugOrYear}", slugOrYear);

    const markdownContent = `---
title: ${yamlQ(title)}
description: ${yamlQ(description)}
keywords:
${[...dict.metadata.blog.slug_or_year.keywords, slugOrYear].map((k) => `  - ${yamlQ(k)}`).join("\n")}
image: ${yamlQ(og.toString())}
lang: ${yamlQ(lang)}
canonical_url: ${yamlQ(canonicalUrl)}
alternate_languages:
${alternate_languages.map((a) => `  ${a.hrefLang}: ${yamlQ(a.href)}`).join("\n")}
---

# ${title}

## ${dict.blog.title}

${posts.length ? "" : `> ${dict.blog.slug_or_year.no_articles?.replace("{slugOrYear}", slugOrYear) ?? "No posts found."}\n`}${posts
            .map((post) => {
                const postUrl = `${baseUrl}/${lang}/blog/${post.year}/${post.month}/${post.day}/${post.slug}`;
                return `- **${post.year}-${post.month}-${post.day}** - [${post.title}](${postUrl}) - ${post.description ?? ""}`;
            })
            .join("\n")}
`;
    const estTokens = estimateMarkdownTokens(markdownContent);
    return new Response(markdownContent, {
        headers: {
            "Content-Language": lang,
            "x-markdown-tokens": estTokens.toString(),
            "Content-Signal": "ai-train=yes, search=yes, ai-input=yes",
            "X-Robots-Tag": "noindex, follow",
            "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=604800",
            "Link": `<${canonicalUrl}>; rel="canonical"${alternate_languages
                .map((a) => `, <${a.href}>; rel="alternate"; hreflang="${a.hrefLang}"`)
                .join("")
                }, <${baseUrl}/>; rel="alternate"; hreflang="x-default"`,
            "Content-Type": "text/markdown; charset=utf-8",
        },
    });
}
