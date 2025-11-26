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
      return res.status(400).send('imageUrl required');
    }
    const { hostname } = new URL(imageUrl);
    if (!whitelist_domains.includes(hostname)) {
      return res.status(400).send('Invalid domain');
    }
    console.log("Converting image from URL:", imageUrl);

    // Fetch the WebP image
    const response = await fetch(encodeURIComponent(imageUrl));
    if (!response.ok) {
      return res.status(500).send('Failed to fetch image');
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
    res.status(500).send('Internal Server Error');
  }
}
