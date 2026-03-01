import { availableLocales, getDictionary, hasLocale } from "@/app/[lang]/dictionaries";
import { NextRequest } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { baseUrl } from "@/data/siteInfo";
import { yamlQ } from "@/utils/yamlHelper";
import { estimateMarkdownTokens } from "@/utils/markdownTokens";

type LicensePkg = {
    id: string;
    name?: string;
    licenses: string;
    repository?: string;
    licenseFile?: string;
    licenseText?: string;
};

function parsePkgNameFromId(id: string): { name: string; version: string } {
    if (!id.includes("@")) return { name: id, version: "N/A" };

    if (id.startsWith("@")) {
        const parts = id.split("@");
        const scopedName = parts[1] ? `@${parts[1]}` : id;
        const version = parts[2] || "N/A";
        return { name: scopedName, version };
    }

    const parts = id.split("@");
    const name = parts[0] || id;
    const version = parts[1] || "N/A";
    return { name, version };
}

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ lang: string }> }
): Promise<Response> {
    const { lang } = await params;

    if (!hasLocale(lang)) {
        return new Response("Locale not supported", {
            status: 400,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
    }

    const dict = await getDictionary(lang);

    const canonicalUrl = `${baseUrl}/${lang}/licenses`;
    const alternate_languages = availableLocales
        .filter((locale) => locale !== lang)
        .map((locale) => ({
            hrefLang: locale,
            href: `${baseUrl}/${locale}/licenses`,
        }));

    const og = new URL(`${baseUrl}/opengraph-image`);
    og.searchParams.set("title", dict.licenses.title);
    og.searchParams.set("subtitle", dict.metadata.index.title);

    const licenseFilePath = path.join(process.cwd(), "public", "LICENSES.json");

    let licenses: LicensePkg[];
    try {
        const rawData = await fs.readFile(licenseFilePath, "utf-8");
        licenses = JSON.parse(rawData) as LicensePkg[];
    } catch (error) {
        const title = dict.licenses.title;
        const description = dict.licenses.error_loading_licenses;

        const markdownError = `---
title: ${yamlQ(title)}
description: ${yamlQ(description)}
keywords:
  - ${yamlQ("licenses")}
  - ${yamlQ("open source")}
image: ${yamlQ(og.toString())}
lang: ${yamlQ(lang)}
canonical_url: ${yamlQ(canonicalUrl)}
alternate_languages:
${alternate_languages.map((a) => `  ${a.hrefLang}: ${yamlQ(a.href)}`).join("\n")}
---

# ${title}

${description}
`;

        return new Response(markdownError, {
            status: 200,
            headers: {
                "Content-Language": lang,
                "X-Robots-Tag": "noindex, follow",
                "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=86400",
                "Link": `<${canonicalUrl}>; rel="canonical"${alternate_languages
                    .map((a) => `, <${a.href}>; rel="alternate"; hreflang="${a.hrefLang}"`)
                    .join("")
                    }, <${baseUrl}/>; rel="alternate"; hreflang="x-default"`,
                "Content-Type": "text/markdown; charset=utf-8",
            },
        });
    }

    const title = dict.licenses.title;
    const description = dict.licenses.title;

    const markdownContent = `---
title: ${yamlQ(title)}
description: ${yamlQ(description)}
keywords:
  - ${yamlQ("licenses")}
  - ${yamlQ("open source licenses")}
image: ${yamlQ(og.toString())}
lang: ${yamlQ(lang)}
canonical_url: ${yamlQ(canonicalUrl)}
alternate_languages:
${alternate_languages.map((a) => `  ${a.hrefLang}: ${yamlQ(a.href)}`).join("\n")}
---

# ${title}

> **Summary:** ${description} Total packages: ${licenses.length}.

${licenses
            .map((pkg) => {
                const { name, version } = parsePkgNameFromId(pkg.id);
                const repo = pkg.repository || "N/A";

                const metaYamlLines: string[] = [
                    `id: ${yamlQ(pkg.id)}`,
                    `package: ${yamlQ(name)}`,
                    `version: ${yamlQ(version)}`,
                    `licenses: ${yamlQ(pkg.licenses || "N/A")}`,
                    `repository: ${yamlQ(repo)}`,
                ];

                if (pkg.licenseFile) metaYamlLines.push(`license_file: ${yamlQ(pkg.licenseFile)}`);

                const metaYaml = metaYamlLines.join("\n");

                const licenseText = pkg.licenseText?.trimEnd() || dict.licenses.license_item["no-license-info"] || "No license info.";

                return `## ${name} (${version})

\`\`\`yaml
${metaYaml}
\`\`\`

${pkg.repository ? `Source: ${pkg.repository}\n` : ""}

\`\`\`text
${licenseText}
\`\`\`
`;
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
