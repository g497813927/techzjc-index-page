import sharp from 'sharp';
import { fetchRemoteImage, MAX_REMOTE_IMAGE_BYTES } from '@/utils/remoteImage.server';
import { decodeImageDataUrl } from '@/utils/imageData.server';
import { getDictionary, hasLocale } from '../dictionaries';
import { notFound } from 'next/navigation';

function jpegResponse(data: Uint8Array): Response {
  if (data.byteLength > MAX_REMOTE_IMAGE_BYTES) {
    return new Response('Image size exceeds limit', { status: 413 });
  }
  // Conversion is already complete; stream the owned bytes without copying them.
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(data);
      controller.close();
    },
  });
  return new Response(body, { headers: { 'Content-Type': 'image/jpeg' } });
}


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
      return jpegResponse(image.data);
    }
    // Fetch the WebP image
    const response = await fetchRemoteImage(imageUrl);
    if (!response.ok) {
      return response;
    }
    const webpBuffer = await response.arrayBuffer();

    // Convert to JPEG
    const jpgBuffer = await sharp(webpBuffer)
      .jpeg({ quality: 80 })
      .toBuffer();

    return jpegResponse(jpgBuffer);


  } catch (error) {
    console.error('Error converting image:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
