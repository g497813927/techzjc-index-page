import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
    width: 1200,
    height: 630,
};

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const title = searchParams.get("title") ?? "Techzjc";
    const background_image = searchParams.get("background_image") ?? "https://techzjc.com/assets/image/hero-image-og.jpg";
    const subtitle = searchParams.get("subtitle") ?? "";
    try {
        return new ImageResponse(
            (
              <div
                className="ogimage-container"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
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
                      objectFit: "cover"
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
                  className="ogimage-text"
                  >
                    <h1 className="ogimage-title">{title}</h1>
                    {subtitle && <h2 className="ogimage-subtitle">{subtitle}</h2>}
                </div>
              </div>
            ),
            {
                width: size.width,
                height: size.height,
            }
        );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
        console.log(`${e.message}`);
        return new Response(`Failed to generate the image`, {
            status: 500,
        });
    }
}