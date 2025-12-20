import "./globals.css";
import { DebugBootstrap } from "@/components/DebugBootstrap";
import { MoveToTop } from "@/components/MoveToTop";
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from '@vercel/speed-insights/next';
import { GoogleAnalytics, GoogleTagManager } from '@next/third-parties/google'
import { getDictionary } from "./dictionaries";

export async function generateStaticParams() {
  return [{ lang: 'en-US' }, { lang: 'zh-CN' }];
}

export default async function RootLayout({children, params}: LayoutProps<'/[lang]'>) {

  const themeScript = `!function(){try{var e=window.localStorage.getItem("theme"),t=window.matchMedia("(prefers-color-scheme:dark)").matches;"dark"===e||!e&&t?(document.documentElement.classList.add("dark"),document.documentElement.setAttribute("data-theme","dark")):(document.documentElement.classList.remove("dark"),document.documentElement.setAttribute("data-theme","light"))}catch(e){}}();`;
  const { lang } = await params;
  const dict = await getDictionary(lang as 'en-US' | 'zh-CN');
  return (
    <html suppressHydrationWarning lang={lang}>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
        {
          process.env.NEXT_PUBLIC_VERCEL_ENV === 'true' && <>
            <GoogleAnalytics gaId="G-1ZLSY6R45Z" />
            <GoogleTagManager gtmId="GTM-N4FFLQFV" />
            <SpeedInsights />
            <Analytics />
          </>
        }
        <link rel="alternate" type="application/rss+xml" title={dict['metadata']['blog']['index']['rss_feed_link_title']} href={`https://techzjc.com/${lang}/rss.xml`} />
        <link rel="alternate" type="application/atom+xml" title={dict['metadata']['blog']['index']['atom_feed_link_title']} href={`https://techzjc.com/${lang}/atom.xml`} />
      </head>
      <body>
        <DebugBootstrap />
        <MoveToTop dict={await (await import(`./dictionaries/${(await params).lang}.json`)).default} />
        {children}
      </body>
    </html>
  );
}
