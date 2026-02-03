import sharp from 'sharp';


// API route to convert WebP image to JPEG
// eslint-disable-next-line
export async function GET(req: Request, res: any) {
  try {
    // Check if url matches whitelisted domains
    const whitelist_domains = ['localhost', 'techzjc.com', 'static.techzjc.com', '127.0.0.1'];
    
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
    const { hostname, protocol } = imageURLObj;
    if (protocol !== 'http:' && protocol !== 'https:') {
      return new Response('Invalid URL protocol', { status: 400 });
    }
    if (!whitelist_domains.includes(hostname)) {
      return new Response('Domain not allowed', { status: 403 });
    }
    console.log("Converting image from URL:", imageUrl);

    // Fetch the WebP image
    const response = await fetch(imageURLObj.toString());
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
