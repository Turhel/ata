import { buildNormalizedAddress, normalizeAddressLine1, normalizeCity, normalizeState, normalizeZipCode } from "./address-normalization.js";

export type ParsedRouteGpxStop = {
  seq: number;
  latitude: string | null;
  longitude: string | null;
  name: string | null;
  sourceAddress: string | null;
  sym: string | null;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  normalizedAddressLine1: string | null;
  normalizedCity: string | null;
  normalizedState: string | null;
  normalizedZipCode: string | null;
};

function decodeXmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function extractTag(block: string, tagName: string) {
  const match = block.match(new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, "i"));
  return match?.[1] ? decodeXmlEntities(match[1].trim()) : null;
}

function extractAttribute(openingTag: string, attributeName: string) {
  const match = openingTag.match(new RegExp(`${attributeName}=\"([^\"]+)\"`, "i"));
  return match?.[1]?.trim() ?? null;
}

function parseSourceAddress(sourceAddress: string | null, fallbackName: string | null) {
  if (!sourceAddress) {
    return {
      addressLine1: fallbackName,
      city: null,
      state: null,
      zipCode: null
    };
  }

  const segments = sourceAddress
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);

  const addressLine1 = segments[0] ?? fallbackName ?? null;
  const locationSegment = segments[1] ?? null;
  const locationMatch = locationSegment?.match(/^(.*)\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/i);

  return {
    addressLine1,
    city: locationMatch?.[1]?.trim() ?? null,
    state: locationMatch?.[2]?.trim() ?? null,
    zipCode: locationMatch?.[3]?.trim() ?? null
  };
}

export function parseRouteGpxBuffer(params: { buffer: Buffer }) {
  const xml = params.buffer.toString("utf8");
  const matches = [...xml.matchAll(/<rtept\b([^>]*)>([\s\S]*?)<\/rtept>/gi)];
  if (matches.length === 0) {
    throw new Error("Arquivo GPX sem rtept");
  }

  return matches.map((match, index) => {
    const openingTag = match[1] ?? "";
    const block = match[2] ?? "";
    const name = extractTag(block, "name");
    const sourceAddress = extractTag(block, "src");
    const parsedAddress = parseSourceAddress(sourceAddress, name);
    const normalized = buildNormalizedAddress(parsedAddress);

    return {
      seq: index + 1,
      latitude: extractAttribute(openingTag, "lat"),
      longitude: extractAttribute(openingTag, "lon"),
      name,
      sourceAddress,
      sym: extractTag(block, "sym"),
      addressLine1: parsedAddress.addressLine1,
      city: parsedAddress.city,
      state: parsedAddress.state,
      zipCode: parsedAddress.zipCode,
      normalizedAddressLine1: normalized.normalizedAddressLine1 ?? normalizeAddressLine1(name),
      normalizedCity: normalized.normalizedCity ?? normalizeCity(parsedAddress.city),
      normalizedState: normalized.normalizedState ?? normalizeState(parsedAddress.state),
      normalizedZipCode: normalized.normalizedZipCode ?? normalizeZipCode(parsedAddress.zipCode)
    } satisfies ParsedRouteGpxStop;
  });
}
