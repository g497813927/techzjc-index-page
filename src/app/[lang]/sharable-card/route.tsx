import 'server-only';
import { ImageResponse } from "next/og";
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import QRCode from 'qrcode'
import { hasLocale } from "../dictionaries";
import { notFound } from "next/navigation";
import { convertToJpegBase64 } from "@/utils/imageConvertHelper";

export async function GET(req: Request, context: { params: Promise<{ lang: string }> }) {
  const { searchParams } = new URL(req.url);
  const quotation = searchParams.get("quotation") ?? "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque a tortor massa. Nam non consectetur ligula. Quisque sit amet erat ac mauris gravida pretium. Phasellus neque lectus, suscipit et porttitor at, rhoncus eu diam. Praesent laoreet suscipit fermentum. Etiam commodo semper turpis, et auctor felis convallis et. Quisque ultricies accumsan elit, vel molestie sem. Etiam vel odio et nulla dapibus varius in vel magna.";
  let background_image = searchParams.get("background_image") ?? "https://techzjc.com/assets/image/hero-image-og.jpg";
  const link = searchParams.get("link") ?? "https://techzjc.com";
  // Get locale from path
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
    } catch (error) {
      return new Response(`Failed to convert background image ${error}`, {
        status: 500,
      });
    }
  } else {
    background_image = encodeURI(background_image);
  }
  const title = searchParams.get("title") ?? "";
  const time = searchParams.get("time") ?? "";
  const charsPerLine = 60;
  const baseHeight = 470;
  const perLineHeight = 48;
  const padding = 25;
  const lineCount = Math.ceil(quotation.length / charsPerLine);
  let height = baseHeight + lineCount * perLineHeight;
  height += Math.floor(lineCount / 5) * padding;
  const finalHeight = Math.max(height, 470);

  try {
    const font = await readFile(
      join(process.cwd(), 'public', 'assets', 'fonts', 'NotoSansSC-Regular.ttf')
    );
    const loadedFontSettings = [{
      name: 'NotoSansSC',
      data: font
    }];
    const qrCodeDataURL = await QRCode.toDataURL(link, {
      margin: 1,
      width: 128,
      color: {
        light: '#ffffff00' // Transparent background
      }
    });
    return new ImageResponse(
      (
        <div style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: `${finalHeight}px`,
        }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            // alignItems: "center",
            width: "100%",
            justifyContent: "center",
            fontFamily: "NotoSansSC, sans-serif",
            position: "relative",
            color: "white"
          }}
        >
          <img
            src={background_image}
            alt="Open Graph Image Background"
            width={1200}
            height={finalHeight}
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
          <p style={{
            fontSize: 48,
            marginBottom: 20,
            marginTop: 40,
          }}>&ldquo;</p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 100px",
            }}
          >
            <p
              style={{
                fontSize: 36
              }}
            >
              {quotation}
            </p>
          </div>
          <p style={{
            fontSize: 48,
            marginTop: 20,
            marginBottom: 40,
            alignSelf: "flex-end",
          }}>&rdquo;</p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            width: '100%',
            marginTop: "auto",
            justifyContent: "space-between",
            fontFamily: "NotoSansSC, sans-serif",
            position: "relative",
            color: "black",
            padding: "25px",
          }}
        >
          <div style={{
            display: "flex",
            flexDirection: "column",
          }}>
          <span>{title}</span>
          <span>{time}</span>
            </div>
        <img id="qrcode" src={encodeURI(qrCodeDataURL)} alt="QR Code"
              style={{
                marginTop: 25,
                width: 128,
                height: 128,
              }}
            />
            </div>
        </div>
      ),
      {
        width: 1200,
        height: finalHeight,
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