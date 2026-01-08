import 'server-only';
import { ImageResponse } from "next/og";
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { hasLocale } from "../dictionaries";
import { notFound } from "next/navigation";
import { convertToJpegBase64 } from "@/utils/imageConvertHelper";

export async function GET(req: Request, context: { params: Promise<{ lang: string }> }) {
  const size = { width: 1200, height: 630 };
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") ?? "Techzjc";
  let background_image = searchParams.get("background_image") ?? "https://techzjc.com/assets/image/hero-image-og.jpg";
  const width = searchParams.get("width") ?? size.width.toString();
  size.width = parseInt(width);
  const height = searchParams.get("height") ?? size.height.toString();
  size.height = parseInt(height);
  const { lang } = await context.params;
  if (!hasLocale(lang)) notFound();
  // Check if background image is jpg or png, else convert to jpg
  if (!background_image.endsWith(".jpg") && !background_image.endsWith(".jpeg") && !background_image.endsWith(".png")) {
    try {
      background_image = await convertToJpegBase64(
        req,
        lang,
        background_image
      );
    } catch {
      return new Response(`Failed to convert background image`, {
        status: 500,
      });
    }
  } else {
    background_image = encodeURIComponent(background_image);
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
        width: parseInt(width),
        height: parseInt(height),
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