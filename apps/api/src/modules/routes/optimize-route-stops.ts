type OptimizationCandidate = {
  lineNumber: number;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  dueDate: string | null;
  isRush: boolean;
};

export type RouteOptimizationMode = "heuristic_city_zip";

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function normalizeZip(zipCode: string | null | undefined) {
  return normalizeText(zipCode).replace(/[^0-9A-Z]/g, "");
}

function parseAddress(addressLine1: string | null | undefined) {
  const normalized = normalizeText(addressLine1);
  if (!normalized) {
    return { street: "", houseNumber: Number.MAX_SAFE_INTEGER };
  }

  const match = normalized.match(/^(\d+)\s+(.*)$/);
  if (!match) {
    return { street: normalized, houseNumber: Number.MAX_SAFE_INTEGER };
  }

  return {
    street: (match[2] ?? "").trim(),
    houseNumber: Number.parseInt(match[1] ?? "", 10) || Number.MAX_SAFE_INTEGER
  };
}

function compareText(left: string, right: string) {
  return left.localeCompare(right, "en", {
    sensitivity: "base",
    numeric: true
  });
}

function compareNumber(left: number, right: number) {
  return left - right;
}

function buildSortTuple(params: {
  candidate: OptimizationCandidate;
  routeDate: string;
  originCity: string | null;
}) {
  const normalizedOriginCity = normalizeText(params.originCity);
  const normalizedCity = normalizeText(params.candidate.city);
  const normalizedState = normalizeText(params.candidate.state);
  const normalizedZip = normalizeZip(params.candidate.zipCode);
  const normalizedAddressLine2 = normalizeText(params.candidate.addressLine2);
  const { street, houseNumber } = parseAddress(params.candidate.addressLine1);

  const urgencyRank =
    params.candidate.dueDate && params.candidate.dueDate < params.routeDate
      ? 0
      : params.candidate.isRush
        ? 1
        : 2;

  const originCityRank =
    normalizedOriginCity && normalizedCity === normalizedOriginCity ? 0 : 1;

  return {
    urgencyRank,
    originCityRank,
    city: normalizedCity,
    state: normalizedState,
    zip: normalizedZip,
    street,
    houseNumber,
    addressLine2: normalizedAddressLine2,
    lineNumber: params.candidate.lineNumber
  };
}

export function optimizeRouteStops<TCandidate extends OptimizationCandidate>(params: {
  candidates: TCandidate[];
  routeDate: string;
  originCity: string | null;
}) {
  const ordered = [...params.candidates].sort((left, right) => {
    const leftTuple = buildSortTuple({
      candidate: left,
      routeDate: params.routeDate,
      originCity: params.originCity
    });
    const rightTuple = buildSortTuple({
      candidate: right,
      routeDate: params.routeDate,
      originCity: params.originCity
    });

    return (
      compareNumber(leftTuple.urgencyRank, rightTuple.urgencyRank) ||
      compareNumber(leftTuple.originCityRank, rightTuple.originCityRank) ||
      compareText(leftTuple.city, rightTuple.city) ||
      compareText(leftTuple.state, rightTuple.state) ||
      compareText(leftTuple.zip, rightTuple.zip) ||
      compareText(leftTuple.street, rightTuple.street) ||
      compareNumber(leftTuple.houseNumber, rightTuple.houseNumber) ||
      compareText(leftTuple.addressLine2, rightTuple.addressLine2) ||
      compareNumber(leftTuple.lineNumber, rightTuple.lineNumber)
    );
  });

  return {
    ordered,
    originCity: params.originCity?.trim() ? params.originCity.trim() : null,
    optimizationMode: "heuristic_city_zip" as const
  };
}
