import sharp from 'sharp';


// API route to convert WebP image to JPEG
// eslint-disable-next-line
export async function GET(req: Request, res: any) {
  try {
    // Check if url matches whitelisted domains (exclude localhost/loopback to prevent SSRF into internal services)
    const whitelist_domains = ['techzjc.com', 'static.techzjc.com'];
    
    const { searchParams } = new URL(req.url);
    const imageUrl = searchParams.get("imageUrl");
    if (!imageUrl) {
      return new Response('Missing imageUrl parameter', { status: 400 });
    }
    let imageURLObj: URL;
    try {
      imageURLObj = new URL(imageUrl);
    } catch {
      return new Response('Invalid URL format', { status: 400 });
    }

    // Validate URL components to mitigate SSRF
    const protocol = imageURLObj.protocol;
    const rawHostname = imageURLObj.hostname;
    const port = imageURLObj.port;
    const path = imageURLObj.pathname || '/';

    // Only allow http/https
    if (protocol !== 'http:' && protocol !== 'https:') {
      return new Response('Invalid URL protocol', { status: 400 });
    }

    // Normalize hostname by removing any trailing dot
    const normalizedHostname = rawHostname.replace(/\.$/, '');

    // Enforce hostname allow-list
    if (!whitelist_domains.includes(normalizedHostname)) {
      return new Response('Domain not allowed', { status: 403 });
    }

    // Disallow non-standard or explicit ports to avoid bypassing expected services
    if (port && port !== '80' && port !== '443') {
      return new Response('Port not allowed', { status: 403 });
    }

    // Basic path sanity checks: must be absolute and not contain path traversal
    if (!path.startsWith('/') || path.includes('..')) {
      return new Response('Invalid path', { status: 400 });
    }

    const safeURL = `${protocol}//${normalizedHostname}${port ? `:${port}` : ''}${path}`;
    console.log("Converting image from URL:", safeURL);

    // Fetch the WebP image
    const response = await fetch(safeURL);
    if (!response.ok) {
      return new Response('Failed to fetch image', { status: 502 });
    }
    const webpBuffer = await response.arrayBuffer();

    // Convert to JPEG
    const jpgBuffer = await sharp(webpBuffer)
      .jpeg({ quality: 80 })
      .toBuffer();

    // Response body expects a BodyInit; convert Node Buffer to Uint8Array
    return new Response(new Uint8Array(jpgBuffer), {
      headers: {
        'Content-Type': 'image/jpeg',
      },
    });


  } catch (error) {
    console.error('Error converting image:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
