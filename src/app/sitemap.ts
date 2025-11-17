export default async function sitemap() {
  const baseUrl = "https://techzjc.com";

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
    }
  ];
}
