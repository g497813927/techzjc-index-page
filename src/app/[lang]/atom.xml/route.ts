import { getAllPosts, getPostBySlug, PostMeta } from "@/lib/blog";
import { getDictionary, hasLocale } from "../dictionaries";
import { notFound } from "next/navigation";
import { mdxToFeedHtml } from "@/utils/mdxToFeedHtml";

export const dynamic = "force-static";
export const runtime = "nodejs";
export const revalidate = false;

function escapeXml(input: string) {
  return input.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return c;
    }
  });
}

function toRfc3339(date: Date) {
  return date.toISOString();
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ lang: string }> }
) {
  const { lang } = await context.params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang);

  const baseUrl = "https://techzjc.com";
  const feedUrl = `${baseUrl}/${lang}/atom.xml`;
  const blogUrl = `${baseUrl}/${lang}/blog`;

  const posts = getAllPosts(lang);

  const feedUpdated =
    posts
      .map((p: PostMeta) => new Date(p.time))
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? new Date();

  const entries = await Promise.all(
    posts
      .map(async (post: PostMeta) => {
        const url = `${baseUrl}/${lang}/blog/${post.year}/${post.month}/${post.day}/${post.slug}`;
        const title = post.title ?? post.slug;
        const summary = post.description ?? "";
        let postDetails;
        try {
          postDetails = getPostBySlug(
            post.slug,
            post.year,
            post.month,
            post.day
          );
        } catch {
          return null;
        }
        const html = await mdxToFeedHtml(postDetails.content);

        const id = url;

        const updated = new Date(post.time);

        return `
  <entry>
    <title>${escapeXml(String(title))}</title>
    <link rel="alternate" href="${url}" />
    <id>${escapeXml(id)}</id>
    <updated>${toRfc3339(updated)}</updated>
    ${
      summary
        ? `<summary type="text">${escapeXml(String(summary))}</summary>`
        : ""
    }
    <content type="html">${escapeXml(String(html))}</content>
  </entry>`.trim();
      })
      .filter((entry) => entry !== null)
  );

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${escapeXml(lang)}">
  <title>${escapeXml(
    String(dict["metadata"]["blog"]["index"]["title"])
  )}</title>
  <subtitle>${escapeXml(
    String(dict["metadata"]["blog"]["index"]["description"])
  )}</subtitle>

  <link rel="alternate" href="${blogUrl}" />
  <link rel="self" href="${feedUrl}" type="application/atom+xml" />

  <id>${escapeXml(`${baseUrl}/${lang}/`)}</id>
  <updated>${toRfc3339(feedUpdated)}</updated>

  <author>
    <name>${escapeXml(String(dict["metadata"]["blog"]["author"]))}</name>
  </author>
  ${
    lang === "zh-CN" &&
    `<follow_challenge>
      <feedId>225207565393201152</feedId>
      <userId>225207186284732416</userId>
    </follow_challenge>`
  }

${entries.length ? "  " + entries.join("\n").replace(/\n/g, "\n  ") : ""}
</feed>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
    },
  });
}
