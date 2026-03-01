import { availableLocales, getDictionary, hasLocale } from "@/app/[lang]/dictionaries";
import { getAllPosts } from "@/lib/blog";
import { NextRequest } from "next/server";
import { indentBlock, yamlQ } from "@/utils/yamlHelper";
import { baseUrl } from "@/data/siteInfo";
import { estimateMarkdownTokens } from "@/utils/markdownTokens";

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
    const canonicalUrl = `${baseUrl}/${lang}/blog`;

    const alternate_languages = availableLocales
        .filter(locale => locale !== lang)
        .map(locale => ({
            hrefLang: locale,
            href: `${baseUrl}/${locale}/blog`
        }));
    const og = new URL(`${baseUrl}/opengraph-image`);
    og.searchParams.set("title", "Techzjc");
    og.searchParams.set("subtitle", dict.metadata.blog.index.opengraph_image_subtitle);
    const markdownContent = `---
title: ${yamlQ(dict['metadata']['blog']['index']['title'])}
description: ${yamlQ(dict['metadata']['blog']['index']['description'])}
keywords:
${dict['metadata']['blog']['index']['keywords'].map(
        keyword => `  - ${yamlQ(keyword)}`
    ).join("\n")}
image: ${yamlQ(og.toString())}
lang: ${yamlQ(lang)}
canonical_url: ${yamlQ(canonicalUrl)}
alternate_languages:
${alternate_languages.map(lang => `  ${lang.hrefLang}: ${yamlQ(lang.href)}`).join("\n")}
---

# ${dict['metadata']['blog']['index']['title']}

## ${dict['blog']['title']}

${posts.map(post => {
        const postUrl = `${baseUrl}/${lang}/blog/${post.year}/${post.month}/${post.day}/${post.slug}`;
        const postYamlLines: string[] = [
            `id: ${yamlQ(postUrl)}`,
            `type: ${yamlQ("blog_post")}`,
            `lang: ${yamlQ(lang)}`,
            `title: ${yamlQ(post.title)}`,
            `description: ${yamlQ(post.description ?? "")}`,
            `canonical_url: ${yamlQ(postUrl)}`,
            `published_time: ${yamlQ(`${post.year}-${post.month}-${post.day}`)}`,
        ];

        if (post.tags?.length) {
            postYamlLines.push(`tags:`);
            for (const t of post.tags) postYamlLines.push(`  - ${yamlQ(t)}`);
        } else {
            postYamlLines.push(`tags: []`);
        }

        if (post.ogImage) postYamlLines.push(`image: ${yamlQ(new URL(post.ogImage, baseUrl).toString())}`);

        const postYaml = postYamlLines.join("\n");

        return `- **${post.year}-${post.month}-${post.day}** - [${post.title}](${postUrl}) - ${post.description}\n\n${indentBlock(`\`\`\`yaml\n${postYaml}\n\`\`\``, 2)}`;
    }).join("\n\n")}`
    const estTokens = estimateMarkdownTokens(markdownContent);
    return new Response(markdownContent, {
        headers: {
            "Content-Language": lang,
            "x-markdown-tokens": estTokens.toString(),
            "Content-Signal": "ai-train=yes, search=yes, ai-input=yes",
            "X-Robots-Tag": "noindex, follow",
            "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=604800",
            "Link": `<${canonicalUrl}>; rel="canonical"${alternate_languages.map(lang => `, <${lang.href}>; rel="alternate"; hreflang="${lang.hrefLang}"`).join("")}, <${baseUrl}/>; rel="alternate"; hreflang="x-default"`,
            "Content-Type": "text/markdown; charset=utf-8"
        },
    });
}
