import { ImageResponse } from "next/og";
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import QRCode from 'qrcode'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const quotation = searchParams.get("quotation") ?? "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque a tortor massa. Nam non consectetur ligula. Quisque sit amet erat ac mauris gravida pretium. Phasellus neque lectus, suscipit et porttitor at, rhoncus eu diam. Praesent laoreet suscipit fermentum. Etiam commodo semper turpis, et auctor felis convallis et. Quisque ultricies accumsan elit, vel molestie sem. Etiam vel odio et nulla dapibus varius in vel magna.";
  let background_image = searchParams.get("background_image") ?? "https://techzjc.com/assets/image/hero-image-og.jpg";
  const link = searchParams.get("link") ?? "https://techzjc.com";
  
  // Check if background image is jpg or png, else convert to jpg
  if (!background_image.endsWith(".jpg") && !background_image.endsWith(".jpeg") && !background_image.endsWith(".png")) {
    console.log("Converting background image to jpg for OG image generation.");
    console.log(`${new URL('/convert', req.url)}?imageUrl=${encodeURIComponent(background_image)}`);
    background_image = `${new URL('/convert', req.url)}?imageUrl=${encodeURIComponent(background_image)}`;
  }
  const title = searchParams.get("title") ?? "";
  const time = searchParams.get("time") ?? "";
  const charsPerLine = 60;
  const baseHeight = 500;
  const perLineHeight = 48;
  const lineCount = Math.ceil(quotation.length / charsPerLine);
  const height = baseHeight + lineCount * perLineHeight;
  const finalHeight = Math.max(500, height);

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
            src={encodeURI(background_image)}
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
            padding: "0 50px 20px 50px",
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
                marginTop: 40,
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