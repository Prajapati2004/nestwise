import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const imageUrl = searchParams.get("url");

  if (!imageUrl) {
    return new Response("Missing url parameter", { status: 400 });
  }

  // Only allow Zillow image domains
  const allowed = [
    "zillowstatic.com",
    "photos.zillowstatic.com",
    "ssl.cdn-redfin.com",
    "cdn.redfin.com",
  ];

  const isAllowed = allowed.some((domain) => imageUrl.includes(domain));
  if (!isAllowed) {
    return new Response("Domain not allowed", { status: 403 });
  }

  try {
    const res = await fetch(imageUrl, {
      headers: {
        // Spoof a browser request so Zillow serves the image
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.zillow.com/",
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
      },
    });

    if (!res.ok) {
      return new Response("Failed to fetch image", { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buffer = await res.arrayBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400", // cache for 24 hours
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("[image-proxy] Error:", err);
    return new Response("Proxy error", { status: 500 });
  }
}
