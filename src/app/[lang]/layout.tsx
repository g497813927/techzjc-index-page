import "./globals.css";
import { DebugBootstrap } from "@/components/DebugBootstrap";
import { MoveToTop } from "@/components/MoveToTop";
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from '@vercel/speed-insights/next';
import { GoogleAnalytics, GoogleTagManager } from '@next/third-parties/google'
import { getDictionary, hasLocale } from "./dictionaries";
import { CnCoreValuesMouseClickHelper } from "@/utils/cnCoreValuesMouseClickHelper";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  return [{ lang: 'en-US' }, { lang: 'zh-CN' }];
}

export default async function RootLayout({ children, params }: LayoutProps<'/[lang]'>) {
  const themeScript = `!function(){var e=document.documentElement;e.classList.remove("no-js"),e.classList.add("js");try{var t=window.localStorage.getItem("theme"),a=window.matchMedia("(prefers-color-scheme:dark)").matches;"dark"===t||!t&&a?(e.classList.add("dark"),e.setAttribute("data-theme","dark")):(e.classList.remove("dark"),e.setAttribute("data-theme","light"))}catch(t){}}();`;
  // Guard LA.init: only runs if SDK loaded successfully, swallows errors silently
  const laInitScript = "try{if(window.LA&&typeof window.LA.init==='function'){window.LA.init({id:'3PdOUXA31SUg1C4G',ck:'3PdOUXA31SUg1C4G',autoTrack:true,hashMode:true,screenRecord:true})}}catch(e){}";
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const dict = await getDictionary(lang);
  return (
    <html suppressHydrationWarning lang={lang} className="no-js">
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
        {
          process.env.NEXT_PUBLIC_VERCEL_ENV === 'true' ?
            <>
              <GoogleAnalytics gaId="G-1ZLSY6R45Z" />
              <GoogleTagManager gtmId="GTM-N4FFLQFV" />
              <SpeedInsights />
              <Analytics />
            </>
            :
            <>
              <script id="LA_COLLECT" src="https://sdk.51.la/js-sdk-pro.min.js"></script>
              <script
                dangerouslySetInnerHTML={{ __html: laInitScript }}
              ></script>
            </>
        }
        <link rel="alternate" type="application/rss+xml" title={dict['metadata']['blog']['index']['rss_feed_link_title']} href={`https://techzjc.com/${lang}/rss.xml`} />
        <link rel="alternate" type="application/atom+xml" title={dict['metadata']['blog']['index']['atom_feed_link_title']} href={`https://techzjc.com/${lang}/atom.xml`} />
      </head>
      <body>
        {
          lang === 'zh-CN' &&
          <CnCoreValuesMouseClickHelper />
        }
        <DebugBootstrap />
        <MoveToTop dict={await (await import(`./dictionaries/${lang}.json`)).default} />
        {children}
      </body>
    </html>
  );
}
