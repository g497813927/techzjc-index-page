import { availableLocales, getDictionary, hasLocale } from "@/app/[lang]/dictionaries";
import { getAllPosts } from "@/lib/blog";
import { NextRequest } from "next/server";
import { baseUrl } from "@/data/siteInfo";
import { yamlQ } from "@/utils/yamlHelper";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ lang: string; slugOrYear: string; month: string }> }
): Promise<Response> {
    const { lang, slugOrYear, month } = await params;

    if (!hasLocale(lang)) {
        return new Response("Locale not supported", {
            status: 400,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
    }

    // Enforce year/month format for this route
    if (!/^\d{4}$/.test(slugOrYear) || !/^\d{2}$/.test(month)) {
        return new Response("Invalid year or month", {
            status: 400,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
    }

    const dict = await getDictionary(lang);

    const canonicalUrl = `${baseUrl}/${lang}/blog/${slugOrYear}/${month}`;
    const alternate_languages = availableLocales
        .filter((locale) => locale !== lang)
        .map((locale) => ({
            hrefLang: locale,
            href: `${baseUrl}/${locale}/blog/${slugOrYear}/${month}`,
        }));

    const og = new URL(`${baseUrl}/opengraph-image`);
    og.searchParams.set("title", "Techzjc");
    og.searchParams.set(
        "subtitle",
        dict.metadata.blog.month.opengraph_image_subtitle
            .replace("{year}", slugOrYear)
            .replace("{month}", month)
    );

    const title = dict.metadata.blog.month.title
        .replace("{year}", slugOrYear)
        .replace("{month}", month);

    const description = dict.metadata.blog.month.description
        .replace("{year}", slugOrYear)
        .replace("{month}", month);

    const posts = getAllPosts(lang).filter(
        (p) => p.year === slugOrYear && p.month === month
    );

    const markdownContent = `---
title: ${yamlQ(title)}
description: ${yamlQ(description)}
keywords:
${dict.metadata.blog.month.keywords.map((k) => `  - ${yamlQ(k)}`).join("\n")}
image: ${yamlQ(og.toString())}
lang: ${yamlQ(lang)}
canonical_url: ${yamlQ(canonicalUrl)}
alternate_languages:
${alternate_languages.map((a) => `  ${a.hrefLang}: ${yamlQ(a.href)}`).join("\n")}
---

# ${title}

## ${dict.blog.title}

${posts.length ? "" : `> ${dict.blog.month.no_articles?.replace("{year}", slugOrYear).replace("{month}", month) ?? "No posts found."}\n`}${posts
            .map((post) => {
                const postUrl = `${baseUrl}/${lang}/blog/${post.year}/${post.month}/${post.day}/${post.slug}`;
                return `- **${post.year}-${post.month}-${post.day}** - [${post.title}](${postUrl}) - ${post.description ?? ""}`;
            })
            .join("\n")}
`;

    return new Response(markdownContent, {
        headers: {
            "Content-Language": lang,
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
