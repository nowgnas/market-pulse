import Script from "next/script";

const ADSENSE_CLIENT_ID = "ca-pub-2114994662223496";

export function AdSenseScript() {
  return (
    <Script
      id="adsense-script"
      async
      strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
      crossOrigin="anonymous"
    />
  );
}
