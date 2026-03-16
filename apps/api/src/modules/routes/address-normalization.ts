function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

const STATE_CODE_BY_NAME: Record<string, string> = {
  ALABAMA: "AL",
  ALASKA: "AK",
  ARIZONA: "AZ",
  ARKANSAS: "AR",
  CALIFORNIA: "CA",
  COLORADO: "CO",
  CONNECTICUT: "CT",
  DELAWARE: "DE",
  FLORIDA: "FL",
  GEORGIA: "GA",
  HAWAII: "HI",
  IDAHO: "ID",
  ILLINOIS: "IL",
  INDIANA: "IN",
  IOWA: "IA",
  KANSAS: "KS",
  KENTUCKY: "KY",
  LOUISIANA: "LA",
  MAINE: "ME",
  MARYLAND: "MD",
  MASSACHUSETTS: "MA",
  MICHIGAN: "MI",
  MINNESOTA: "MN",
  MISSISSIPPI: "MS",
  MISSOURI: "MO",
  MONTANA: "MT",
  NEBRASKA: "NE",
  NEVADA: "NV",
  "NEW HAMPSHIRE": "NH",
  "NEW JERSEY": "NJ",
  "NEW MEXICO": "NM",
  "NEW YORK": "NY",
  "NORTH CAROLINA": "NC",
  "NORTH DAKOTA": "ND",
  OHIO: "OH",
  OKLAHOMA: "OK",
  OREGON: "OR",
  PENNSYLVANIA: "PA",
  "RHODE ISLAND": "RI",
  "SOUTH CAROLINA": "SC",
  "SOUTH DAKOTA": "SD",
  TENNESSEE: "TN",
  TEXAS: "TX",
  UTAH: "UT",
  VERMONT: "VT",
  VIRGINIA: "VA",
  WASHINGTON: "WA",
  "WEST VIRGINIA": "WV",
  WISCONSIN: "WI",
  WYOMING: "WY",
  "DISTRICT OF COLUMBIA": "DC"
};

function normalizeAsciiUpper(value: string) {
  return normalizeWhitespace(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function toNullableString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeAddressLine1(value: unknown) {
  const text = toNullableString(value);
  if (!text) return null;

  const expanded = normalizeAsciiUpper(text)
    .replace(/[.,;:/\\#-]+/g, " ")
    .replace(/\bSTREET\b/g, "ST")
    .replace(/\bROAD\b/g, "RD")
    .replace(/\bAVENUE\b/g, "AVE")
    .replace(/\bDRIVE\b/g, "DR")
    .replace(/\bLANE\b/g, "LN")
    .replace(/\bBOULEVARD\b/g, "BLVD")
    .replace(/\bCOURT\b/g, "CT")
    .replace(/\bPLACE\b/g, "PL")
    .replace(/\bNORTH\b/g, "N")
    .replace(/\bSOUTH\b/g, "S")
    .replace(/\bEAST\b/g, "E")
    .replace(/\bWEST\b/g, "W");

  const normalized = normalizeWhitespace(expanded.replace(/[^A-Z0-9 ]+/g, " "));
  return normalized.length > 0 ? normalized : null;
}

export function normalizeCity(value: unknown) {
  const text = toNullableString(value);
  if (!text) return null;
  return normalizeAsciiUpper(text);
}

export function normalizeState(value: unknown) {
  const text = toNullableString(value);
  if (!text) return null;
  const normalized = normalizeAsciiUpper(text);
  if (normalized in STATE_CODE_BY_NAME) {
    return STATE_CODE_BY_NAME[normalized];
  }
  return normalized.replace(/[^A-Z]/g, "").slice(0, 2) || null;
}

export function normalizeZipCode(value: unknown) {
  const text = toNullableString(value);
  if (!text) return null;
  const digits = text.replace(/\D+/g, "");
  if (digits.length < 5) return null;
  return digits.slice(0, 5);
}

export function buildNormalizedAddress(input: {
  addressLine1: unknown;
  city: unknown;
  state: unknown;
  zipCode: unknown;
}) {
  return {
    normalizedAddressLine1: normalizeAddressLine1(input.addressLine1),
    normalizedCity: normalizeCity(input.city),
    normalizedState: normalizeState(input.state),
    normalizedZipCode: normalizeZipCode(input.zipCode)
  };
}

export function classifyGeocodeResult(input: {
  candidate: {
    normalizedAddressLine1: string | null;
    normalizedCity: string | null;
    normalizedState: string | null;
    normalizedZipCode: string | null;
  };
  resolved: {
    street: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
  };
}) {
  const resolvedStreet = normalizeAddressLine1(input.resolved.street);
  const resolvedCity = normalizeCity(input.resolved.city);
  const resolvedState = normalizeState(input.resolved.state);
  const resolvedZipCode = normalizeZipCode(input.resolved.zipCode);

  const streetMatches =
    !!input.candidate.normalizedAddressLine1 &&
    !!resolvedStreet &&
    input.candidate.normalizedAddressLine1 === resolvedStreet;
  const cityMatches =
    !!input.candidate.normalizedCity && !!resolvedCity && input.candidate.normalizedCity === resolvedCity;
  const stateMatches =
    !!input.candidate.normalizedState &&
    !!resolvedState &&
    input.candidate.normalizedState === resolvedState;
  const zipMatches =
    !input.candidate.normalizedZipCode ||
    !resolvedZipCode ||
    input.candidate.normalizedZipCode === resolvedZipCode;

  if (streetMatches && cityMatches && stateMatches && zipMatches) {
    return { quality: "precise" as const, reviewRequired: false, reviewReason: null };
  }

  if (streetMatches && cityMatches && stateMatches) {
    return {
      quality: "approximate" as const,
      reviewRequired: false,
      reviewReason: "ZIP do geocode não bateu exatamente com o snapshot"
    };
  }

  return {
    quality: "needs_review" as const,
    reviewRequired: true,
    reviewReason: "Geocode retornou resultado ambíguo ou com divergência de endereço"
  };
}
