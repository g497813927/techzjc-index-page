import sharp from 'sharp';
import { convertToSafeImageUrl } from '@/utils/imageUtils';
import { decodeImageDataUrl } from '@/utils/imageData.server';
import { getDictionary, hasLocale } from '../dictionaries';
import { notFound } from 'next/navigation';


// API route to convert WebP image to JPEG
export async function GET(req: Request, context: { params: Promise<{ lang: string }> }) {
  const { lang } = await context.params;
  if (!hasLocale(lang)) notFound();
  try {
    
    const { searchParams } = new URL(req.url);
    const imageUrl = searchParams.get("imageUrl");
    if (!imageUrl) {
      return new Response('Missing imageUrl parameter', { status: 400 });
    }
    if (imageUrl.startsWith('data:image/')) {
      const dict = await getDictionary(lang);
      const image = await decodeImageDataUrl(imageUrl, dict.image_errors.invalid_data, 'jpeg');
      if (image instanceof Response) return image;
      return new Response(new Uint8Array(image.data), {
        headers: { 'Content-Type': image.contentType },
      });
    }
    const safeURL = convertToSafeImageUrl(imageUrl);
    if (safeURL instanceof Response) {
      return safeURL; // Return the error response if URL is not safe
    }
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
