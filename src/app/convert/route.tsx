import sharp from 'sharp';


// API route to convert WebP image to JPEG
// eslint-disable-next-line
export async function GET(req: Request, res: any) {
    try {
      // Check if url matches current domain
      if (!req.url.startsWith('http://127.0.0.1:3000') && !req.url.startsWith('http://localhost:3000') && !req.url.startsWith('https://techzjc.com') && !req.url.startsWith('https://static.techzjc.com')) {
        return res.status(400).send('Invalid domain');
      }
      const { searchParams } = new URL(req.url);
      const imageUrl = searchParams.get("imageUrl");
      console.log("Converting image from URL:", imageUrl);
  if (!imageUrl) {
    return res.status(400).send('imageUrl required');
  }

  // Fetch the WebP image
  const response = await fetch(imageUrl);
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
