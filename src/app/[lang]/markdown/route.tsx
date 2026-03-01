import { availableLocales, getDictionary, hasLocale } from "@/app/[lang]/dictionaries";
import { parseEducationEntry, formatEducationEntry } from '@/utils/educationUtils';
import { copyrightNotice, fetchedPhotos1, fetchedPhotos2 } from '@/data/photos';
import { publications } from "@/data/publications";
import { NextRequest } from "next/server";
import { baseUrl } from "@/data/siteInfo";
import { yamlQ, indentBlock } from "@/utils/yamlHelper";
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
    const dict = await getDictionary(lang);
    const canonicalUrl = `${baseUrl}/${lang}`;

    const alternate_languages = availableLocales
        .filter(locale => locale !== lang)
        .map(locale => ({
            hrefLang: locale,
            href: `${baseUrl}/${locale}`
        }));

    const markdownContent = `---
title: ${yamlQ(dict['metadata']['index']['title'])}
description: ${yamlQ(dict['metadata']['index']['description'])}
keywords:
${dict['metadata']['index']['keywords'].map(
        keyword => `  - ${yamlQ(keyword)}`
    ).join("\n")}
image: ${yamlQ(`${baseUrl}/opengraph-image?title=Techzjc`)}
lang: ${yamlQ(lang)}
canonical_url: ${yamlQ(canonicalUrl)}
alternate_languages:
${alternate_languages.map(lang => `  ${lang.hrefLang}: ${yamlQ(lang.href)}`).join("\n")}
---

# ${dict['metadata']['index']['title']}

## ${dict['about']['title']}

${dict['about']['introduction']['description_title']}

### ${dict['about']['hobbies']['title']}

${Object.values(dict['about']['hobbies']['children']).map(item => `- ${item}`).join("\n")}

### ${dict['about']['education']['title']}

${Object.values(dict['about']['education']['children']).map(item => `- ${formatEducationEntry(dict['about']['education'][parseEducationEntry(item)], item)}`).join("\n")}

## ${dict['photos']['title']}

${[...fetchedPhotos1, ...fetchedPhotos2].map((photo) => `- ![${[photo.alt, copyrightNotice].filter(Boolean).join(' ') || photo.name}](${baseUrl}${photo.url})`).join("\n")}


## ${dict['publications']['title']}

${publications.map(pub => {
        const title = pub.title;
        return `### ${title}

\`\`\`yaml
title: ${yamlQ(title)}
authors:
${pub.authors.map(author => `  - first_name: ${yamlQ(author.firstName)}\n    last_name: ${yamlQ(author.lastName)}${author.suffix ? `\n    suffix: ${yamlQ(author.suffix)}` : ""}${author.orcid ? `\n    orcid: ${yamlQ(author.orcid)}` : ""}${author.highlight ? `\n    highlight: true` : ""}`).join("\n")}
venue: ${yamlQ(`${pub.venue_full}${pub.venue_short ? ` (${pub.venue_short})` : ""}`)}
${pub.url ? `url: ${yamlQ(pub.url)}\n` : ""}${pub.doi ? `doi: ${yamlQ(pub.doi)}` : ""}
${pub.abstract ? `abstract: |\n${indentBlock(pub.abstract, 2)}` : ""}
\`\`\``}).join("\n\n")}

## ${dict['metadata']['contacts']['title']}

${dict['metadata']['contacts']['children'].map(contact => `- [${contact.label}](${contact.url})`).join("\n")}`

    const estTokens = estimateMarkdownTokens(markdownContent);
    return new Response(markdownContent, {
        headers: {
            "Content-Language": lang,
            "x-markdown-tokens": estTokens.toString(),
            "Content-Signal": "ai-train=yes, search=yes, ai-input=yes",
            "X-Robots-Tag": "noindex, follow",
            "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
            "Link": `<${canonicalUrl}>; rel="canonical"${alternate_languages.map(lang => `, <${lang.href}>; rel="alternate"; hreflang="${lang.hrefLang}"`).join("")}, <${baseUrl}/>; rel="alternate"; hreflang="x-default"`,
            "Content-Type": "text/markdown; charset=utf-8"
        },
    });
}