import { getDictionary as getImageDictionary } from "../dictionaries";
import { decodeImageDataUrl } from "@/utils/imageData.server";
import 'server-only';
import { ImageResponse } from "next/og";
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getDictionary, hasLocale } from "../dictionaries";
import { notFound } from "next/navigation";
import { convertToJpegBase64 } from "@/utils/imageConvertHelper";
import { isSafeImageUrl } from '@/utils/imageUtils';
import { remoteImageToDataUrl } from '@/utils/remoteImage.server';
import { parseOpenGraphDimensions } from '@/utils/openGraphDimensions';

export async function GET(req: Request, context: { params: Promise<{ lang: string }> }) {
  const { searchParams } = new URL(req.url);
  const { lang } = await context.params;
  if (!hasLocale(lang)) notFound();
  const size = parseOpenGraphDimensions(searchParams);
  if (!size) {
    const dictionary = await getDictionary(lang);
    return new Response(dictionary.opengraph_image.invalid_dimensions, { status: 400 });
  }
  const title = searchParams.get("title") ?? "Techzjc";
  const defaultBackgroundImage = "https://techzjc.com/assets/image/hero-image-og.jpg";
  let background_image = searchParams.get("background_image") ?? defaultBackgroundImage;
  if (!isSafeImageUrl(background_image)) {
    background_image = defaultBackgroundImage;
  }
  // Check if background image is jpg or png, else convert to jpg
  if (!background_image.endsWith(".jpg") && !background_image.endsWith(".jpeg") && !background_image.endsWith(".png") && !background_image.startsWith("data:image/")) {
    try {
      background_image = await convertToJpegBase64(
        background_image
      );
    } catch {
      return new Response(`Failed to convert background image`, {
        status: 500,
      });
    }
  } else {
    let safeURL: string | Response;
    if (background_image.startsWith("data:image/")) {
      const dict = await getImageDictionary(lang);
      const image = await decodeImageDataUrl(background_image, dict.image_errors.invalid_data);
      if (image instanceof Response) return image;
      safeURL = `data:${image.contentType};base64,${image.data.toString("base64")}`;
    } else {
      safeURL = await remoteImageToDataUrl(background_image);
    }
    if (safeURL instanceof Response) {
      return safeURL; // Return the error response if URL is not safe
    }
    background_image = encodeURI(safeURL);
  }
  const subtitle = searchParams.get("subtitle") ?? "";
  try {
    const font = await readFile(
      join(process.cwd(), 'public', 'assets', 'fonts', 'NotoSansSC-Regular.ttf')
    );
    const loadedFontSettings = [{
      name: 'NotoSansSC',
      data: font
    }];
    return new ImageResponse(
      (
        <div
          className="ogimage-container"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "NotoSansSC, sans-serif",
            width: size.width,
            height: size.height,
            position: "relative",
            color: "white"
          }}
        >
          <img
            src={background_image}
            alt="Open Graph Image Background"
            width={size.width}
            height={size.height}
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              minHeight: "100%",
              minWidth: "100%",
              objectFit: "cover",
              filter: "brightness(0.4)",
            }}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "0 100px",
            }}
          >
            <h1
              style={{
                fontSize: 64
              }}
            >
              {title}
            </h1>
            {
              subtitle &&
              <h2
                style={{
                  fontSize: 36,
                  marginTop: 20,
                }}
              >
                {subtitle}
              </h2>
            }
          </div>
        </div>
      ),
      {
        width: size.width,
        height: size.height,
        fonts: loadedFontSettings
      }
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    console.log(`${e.message}`);
    // console.log(font);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
