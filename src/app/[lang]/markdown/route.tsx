import { getDictionary, hasLocale } from "@/app/[lang]/dictionaries";
import { parseEducationEntry, formatEducationEntry } from '@/utils/educationUtils';
import { copyrightNotice, fetchedPhotos1, fetchedPhotos2 } from '@/data/photos';
import { publications } from "@/data/publications";
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
    const dict = await getDictionary(lang);

    const markdownContent = `---
title: ${dict['metadata']['index']['title']}
description: ${dict['metadata']['index']['description']}
keywords: ${dict['metadata']['index']['keywords'].join(", ")}
image: https://techzjc.com/opengraph-image?title=Techzjc
lang: ${lang}
---

# ${dict['metadata']['index']['title']}

## ${dict['about']['title']}

${dict['about']['introduction']['description_title']}

### ${dict['about']['hobbies']['title']}

${Object.values(dict['about']['hobbies']['children']).map(item => `- ${item}`).join("\n")}

### ${dict['about']['education']['title']}

${Object.values(dict['about']['education']['children']).map(item => `- ${formatEducationEntry(dict['about']['education'][parseEducationEntry(item)], item)}`).join("\n")}

## ${dict['photos']['title']}
${[...fetchedPhotos1, ...fetchedPhotos2].map((photo) => `- ![${[photo.alt, copyrightNotice].filter(Boolean).join(" ")}](${photo.url})`).join("\n")}

## ${dict['publications']['title']}

${publications.map(pub => {
        const title = pub.title;
        return `- ${title}
    - ${pub.authors.length > 1 ? dict['publications']['authors'] : dict['publications']['author']}:
        ${pub.authors.map(author => `- ${author.orcid ? `[` : ""}${author.highlight ? `**` : ""}${author.firstName} ${author.lastName}${author.suffix ? `, ${author.suffix}` : ""}${author.highlight ? `**` : ""}${author.orcid ? ` (ORCID: ${author.orcid})](https://orcid.org/${author.orcid})` : ""}`).join("\n        ")}
    - ${dict['publications']['published_in']}: *${pub.venue_full}*${pub.venue_short ? ` (${pub.venue_short})` : ""}${pub.publisher ? `, ${pub.publisher}` : ""}${pub.location ? `, ${pub.location}` : ""}${pub.pages ? `, pp. ${pub.pages}` : ""}
    ${pub.abstract ? `- ${dict['publications']['abstract']}: ${pub.abstract}` : ""}
    ${pub.url ? `- [${dict['publications']['view_article']}](${pub.url})\n    ` : ""}${pub.doi ? `- [DOI: ${pub.doi}](https://doi.org/${pub.doi})\n` : ""}`;
    }).join("")}

## ${dict['metadata']['contacts']['title']}

${dict['metadata']['contacts']['children'].map(contact => `- [${contact.label}](${contact.url})`).join("\n")}`


    return new Response(markdownContent, {
        headers: {
            "Content-Type": "text/markdown; charset=utf-8"
        },
    });
}