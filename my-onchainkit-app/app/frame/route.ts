import { NextResponse } from "next/server";

const APP_URL = "https://my-onchainkit-e6vf4admh-ismenes-projects.vercel.app";

export async function GET() {
  const html = `
    <!doctype html>
    <html>
      <head>
        <meta property="og:title" content="Ask Ismène" />
        <meta property="og:description" content="Let me turn your antsy dilemma into a 1/1 contemplative artwork." />
        <meta property="og:image" content="${APP_URL}/favicon.ico" />

        <!-- Farcaster frame meta -->
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${APP_URL}/favicon.ico" />
        <meta property="fc:frame:button:1" content="Ask Ismène" />
        <meta property="fc:frame:button:1:action" content="link" />
        <meta property="fc:frame:button:1:target" content="${APP_URL}" />
      </head>
      <body></body>
    </html>
  `;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html",
    },
  });
}
