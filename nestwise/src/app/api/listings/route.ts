import { NextRequest } from "next/server";

const OPENWEB_KEY = process.env.OPENWEB_NINJA_API_KEY;
const BASE_URL = "https://api.openwebninja.com/realtime-zillow-data/search";

export interface ParsedListing {
  address: string;
  city: string;
  price: string;
  priceNum: number;
  beds: number;
  baths: number;
  sqft: number;
  description: string;
  url: string;
  imgUrl: string;
  daysOnMarket: number;
  neighborhoodAvg: number;
  scamRisk: "safe" | "review" | "risk";
  score: number;
  verdict: string;
  why: string;
}

function scoreIt(priceNum: number, neighborhoodAvg: number, beds: number) {
  const priceDiff = neighborhoodAvg > 0 ? (neighborhoodAvg - priceNum) / neighborhoodAvg : 0;
  let scamRisk: "safe" | "review" | "risk" = "safe";
  if (priceDiff > 0.45) scamRisk = "risk";
  else if (priceDiff > 0.28) scamRisk = "review";
  let pts = 0;
  if (priceDiff >= 0.15) pts += 4;
  else if (priceDiff >= 0.05) pts += 3;
  else if (priceDiff >= -0.05) pts += 2;
  if (beds >= 2) pts += 2;
  if (beds >= 3) pts += 1;
  const score = Math.min(10, Math.max(1, Math.round((pts / 7) * 10)));
  const verdict =
    scamRisk === "risk" ? "Likely scam" :
    score >= 8 ? "Great deal" :
    score >= 6 ? "Good deal" :
    score >= 4 ? "Fair deal" : "Review carefully";
  const why =
    scamRisk === "risk" ? "Price far below area avg — verify" :
    priceDiff >= 0.1 ? `${Math.round(priceDiff * 100)}% below area avg` :
    priceDiff <= -0.1 ? `${Math.round(Math.abs(priceDiff) * 100)}% above area avg` :
    "Near area average price";
  return { score: scamRisk === "risk" ? 2 : score, verdict, why, scamRisk };
}

interface SearchOptions {
  location: string;
  forRent: boolean;
  minPrice?: string;
  maxPrice?: string;
  minBeds?: string;
  minBaths?: string;
  homeType?: string;
  spaceType?: string;
  newConstruction?: string;
  foreclosure?: string;
}

async function searchProperties(opts: SearchOptions): Promise<ParsedListing[]> {
  if (!OPENWEB_KEY) return [];

  try {
    const params: Record<string, string> = {
      location: opts.location,
      home_status: opts.forRent ? "FOR_RENT" : "FOR_SALE",
      sort: "NEWEST",
      page: "1",
    };

    // Price filters
    if (opts.minPrice && Number(opts.minPrice) > 0) {
      params[opts.forRent ? "min_monthly_payment" : "min_price"] = opts.minPrice;
    }
    if (opts.maxPrice && Number(opts.maxPrice) > 0) {
      params[opts.forRent ? "max_monthly_payment" : "max_price"] = opts.maxPrice;
    }

    // Beds / baths
    if (opts.minBeds && Number(opts.minBeds) > 0) {
      params.min_bedrooms = opts.minBeds;
    }
    if (opts.minBaths && Number(opts.minBaths) > 0) {
      params.min_bathrooms = opts.minBaths;
    }

    // Home type
    if (opts.homeType) {
      params.home_type = opts.homeType;
    }

    // Rent-specific
    if (opts.forRent && opts.spaceType) {
      params.space_type = opts.spaceType;
    }

    // Buy-specific
    if (!opts.forRent && opts.newConstruction === "true") {
      params.for_sale_is_new_construction = "true";
    }
    if (!opts.forRent && opts.foreclosure === "true") {
      params.for_sale_is_foreclosure = "true";
    }

    const queryString = new URLSearchParams(params).toString();
    const res = await fetch(`${BASE_URL}?${queryString}`, {
      headers: {
        "x-api-key": OPENWEB_KEY,
        "Accept": "*/*",
      },
    });

    if (!res.ok) {
      console.error("[OpenWebNinja] Error:", res.status, await res.text());
      return [];
    }

    const data = await res.json();
    console.log("[OpenWebNinja] Response keys:", Object.keys(data));

    const results = data?.data?.results
      || data?.results
      || data?.data
      || (Array.isArray(data) ? data : []);

    if (!Array.isArray(results) || results.length === 0) {
      console.log("[OpenWebNinja] No results:", JSON.stringify(data).slice(0, 500));
      return [];
    }

    const prices = results
      .map((r: Record<string, unknown>) => typeof r.price === "number" ? r.price : 0)
      .filter((p: number) => p > 0);
    const avgPrice = prices.length
      ? Math.round(prices.reduce((a: number, b: number) => a + b, 0) / prices.length)
      : 0;

    // No slice — return all results
    return results.map((r: Record<string, unknown>) => {
      const priceNum = typeof r.price === "number" ? r.price : 0;
      const addressObj = r.address as Record<string, unknown> | undefined;
      const streetAddress = typeof addressObj?.streetAddress === "string"
        ? addressObj.streetAddress
        : typeof r.streetAddress === "string" ? r.streetAddress : "";
      const cityName = typeof addressObj?.city === "string"
        ? addressObj.city
        : typeof r.city === "string" ? r.city : opts.location.split(",")[0].trim();
      const state = typeof addressObj?.state === "string" ? addressObj.state : "";
      const zipcode = typeof addressObj?.zipcode === "string" ? addressObj.zipcode : "";
      const address = [streetAddress, cityName, state, zipcode].filter(Boolean).join(", ");

      const beds = typeof r.bedrooms === "number" ? r.bedrooms : 0;
      const baths = typeof r.bathrooms === "number" ? r.bathrooms : 0;
      const sqft = typeof r.livingArea === "number" ? r.livingArea : 0;
      const daysOnMarket = typeof r.daysOnZillow === "number" ? r.daysOnZillow : 0;

      const photos = r.responsivePhotos as { mixedSources?: { jpeg?: { url: string }[] } }[] | undefined;
      const imgUrl = Array.isArray(photos) && photos[0]?.mixedSources?.jpeg?.[0]?.url
        ? photos[0].mixedSources.jpeg[0].url : "";

      const detailUrl = typeof r.detailUrl === "string" ? r.detailUrl : "";
      const neighborhoodAvg = avgPrice || Math.round(priceNum * 1.08);
      const { score, verdict, why, scamRisk } = scoreIt(priceNum, neighborhoodAvg, beds);
      const homeType = typeof r.homeType === "string"
        ? r.homeType.replace(/_/g, " ").toLowerCase() : "property";

      return {
        address: address || "Address not available",
        city: cityName,
        price: opts.forRent ? `$${priceNum.toLocaleString()}/mo` : `$${priceNum.toLocaleString()}`,
        priceNum,
        beds,
        baths,
        sqft,
        description: `${homeType} in ${cityName}.${sqft > 0 ? ` ${sqft.toLocaleString()} sqft.` : ""}${beds > 0 ? ` ${beds} bed, ${baths} bath.` : ""}`,
        url: detailUrl.startsWith("http") ? detailUrl : `https://www.zillow.com${detailUrl}`,
        imgUrl,
        daysOnMarket,
        neighborhoodAvg,
        scamRisk,
        score,
        verdict,
        why,
      };
    });
  } catch (err) {
    console.error("[OpenWebNinja] Error:", err);
    return [];
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const location = searchParams.get("location") || "Chicago, IL";
  const type = (searchParams.get("type") || "buy") as "buy" | "rent";

  if (!OPENWEB_KEY) {
    return Response.json({
      listings: [],
      error: "OPENWEB_NINJA_API_KEY is missing.",
      source: "no_key",
    });
  }

  try {
    const listings = await searchProperties({
      location,
      forRent: type === "rent",
      minPrice: searchParams.get("minPrice") ?? undefined,
      maxPrice: searchParams.get("maxPrice") ?? undefined,
      minBeds: searchParams.get("minBeds") ?? undefined,
      minBaths: searchParams.get("minBaths") ?? undefined,
      homeType: searchParams.get("homeType") ?? undefined,
      spaceType: searchParams.get("spaceType") ?? undefined,
      newConstruction: searchParams.get("newConstruction") ?? undefined,
      foreclosure: searchParams.get("foreclosure") ?? undefined,
    });

    if (listings.length === 0) {
      return Response.json({
        listings: [],
        error: `No listings found for "${location}". Try "City, ST" format e.g. "Chicago, IL"`,
        source: "no_results",
      });
    }

    return Response.json({ listings, source: "live", location, type });
  } catch (err) {
    console.error("[/api/listings]", err);
    return Response.json({
      listings: [],
      error: "Search failed. Please try again.",
      source: "error",
    });
  }
}
