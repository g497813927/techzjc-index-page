import { getAllPosts, PostMeta } from "@/lib/blog";
import { getDictionary, hasLocale } from "../dictionaries";
import { notFound } from "next/navigation";

export const dynamic = "force-static";
export const revalidate = false;

function escapeXml(input: string) {
  return input.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
      default: return c;
    }
  });
}

export async function GET(_request: Request, context: { params: Promise<{ lang: string }> }) {
  const { lang } = await context.params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  const baseUrl = "https://techzjc.com";
  const posts = getAllPosts(lang);

  const items = posts
    .map((post: PostMeta) => {
      const link = `${baseUrl}/${lang}/blog/${post.year}/${post.month}/${post.day}/${post.slug}`;
      const title = post.title ?? post.slug;
      const description =
        post.description ??
        "";

      return `
<item>
  <title>${escapeXml(title)}</title>
  <link>${link}</link>
  <guid>${link}</guid>
  <pubDate>${new Date(post.time).toUTCString()}</pubDate>
  <description>${escapeXml(description)}</description>
</item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(`${dict['metadata']['blog']['index']['title']}`)}</title>
    <link>${baseUrl}/${lang}/blog</link>
    <atom:link href="${baseUrl}/${lang}/rss.xml" rel="self" type="application/rss+xml" />
    <description>${escapeXml(`${dict['metadata']['blog']['index']['description']}`)}</description>
    <dc:creator>${escapeXml(dict['metadata']['blog']['author'])}</dc:creator>
    <language>${lang}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items ? "    " + items.replace(/\n/g, "\n    ") : ""}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}