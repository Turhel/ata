type OptimizationCandidate = {
  lineNumber: number;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  dueDate: string | null;
  isRush: boolean;
  latitude?: string | null;
  longitude?: string | null;
};

export type RouteOptimizationMode = "heuristic_city_zip" | "heuristic_geo_city_zip" | "matrix_osrm";

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

function toCoordinate(value: string | null | undefined) {
  if (typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasCoordinates(candidate: OptimizationCandidate) {
  return toCoordinate(candidate.latitude) != null && toCoordinate(candidate.longitude) != null;
}

function distanceScore(left: OptimizationCandidate, right: OptimizationCandidate) {
  const leftLat = toCoordinate(left.latitude);
  const leftLon = toCoordinate(left.longitude);
  const rightLat = toCoordinate(right.latitude);
  const rightLon = toCoordinate(right.longitude);
  if (leftLat == null || leftLon == null || rightLat == null || rightLon == null) {
    return Number.POSITIVE_INFINITY;
  }

  const latDiff = leftLat - rightLat;
  const lonDiff = leftLon - rightLon;
  return latDiff * latDiff + lonDiff * lonDiff;
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

function compareByTuple(
  left: OptimizationCandidate,
  right: OptimizationCandidate,
  params: { routeDate: string; originCity: string | null }
) {
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
}

async function fetchOsrmDistanceMatrix(
  baseUrl: string,
  candidates: OptimizationCandidate[]
) {
  const coordinates = candidates
    .map((candidate) => {
      const latitude = toCoordinate(candidate.latitude);
      const longitude = toCoordinate(candidate.longitude);
      if (latitude == null || longitude == null) {
        return null;
      }
      return `${longitude},${latitude}`;
    });

  if (coordinates.some((value) => value == null)) {
    return null;
  }

  const url = `${baseUrl}/table/v1/driving/${coordinates.join(";")}?annotations=distance`;
  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }

  const body = (await response.json()) as {
    code?: string;
    distances?: unknown;
  };

  if (body.code !== "Ok" || !Array.isArray(body.distances)) {
    return null;
  }

  const matrix = body.distances.map((row) =>
    Array.isArray(row)
      ? row.map((value) => {
          const parsed = typeof value === "number" ? value : Number.NaN;
          return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
        })
      : []
  );

  if (matrix.length !== candidates.length || matrix.some((row) => row.length !== candidates.length)) {
    return null;
  }

  return matrix;
}

function orderByGreedyMatrix<TCandidate extends OptimizationCandidate>(
  candidates: TCandidate[],
  distanceMatrix: number[][]
) {
  const remaining = new Set(candidates.map((_, index) => index));
  const orderedIndexes: number[] = [];
  let currentIndex = 0;

  remaining.delete(currentIndex);
  orderedIndexes.push(currentIndex);

  while (remaining.size > 0) {
    let nextIndex: number | null = null;
    let nextDistance = Number.POSITIVE_INFINITY;

    for (const candidateIndex of remaining) {
      const distance = distanceMatrix[currentIndex]?.[candidateIndex] ?? Number.POSITIVE_INFINITY;
      if (distance < nextDistance) {
        nextDistance = distance;
        nextIndex = candidateIndex;
      }
    }

    if (nextIndex == null || !Number.isFinite(nextDistance)) {
      break;
    }

    orderedIndexes.push(nextIndex);
    remaining.delete(nextIndex);
    currentIndex = nextIndex;
  }

  if (remaining.size > 0) {
    orderedIndexes.push(...remaining);
  }

  return orderedIndexes.map((index) => candidates[index]!);
}

function orderByGeoHeuristic<TCandidate extends OptimizationCandidate>(
  fallbackOrdered: TCandidate[],
  params: { routeDate: string; originCity: string | null }
) {
  const ordered: TCandidate[] = [];
  const remaining = [...fallbackOrdered];
  let current = remaining.shift() ?? null;
  if (current) {
    ordered.push(current);
  }

  while (remaining.length > 0 && current) {
    let bestIndex = 0;
    let bestScore = Number.POSITIVE_INFINITY;

    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index]!;
      const tupleDelta =
        compareByTuple(candidate, current, { routeDate: params.routeDate, originCity: params.originCity }) !== 0;
      const tuplePenalty = tupleDelta ? 0.000001 * (index + 1) : 0;
      const distance = distanceScore(current, candidate);
      const score = Number.isFinite(distance) ? distance + tuplePenalty : Number.POSITIVE_INFINITY;

      if (score < bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }

    if (!Number.isFinite(bestScore)) {
      ordered.push(...remaining);
      break;
    }

    current = remaining.splice(bestIndex, 1)[0] ?? null;
    if (current) {
      ordered.push(current);
    }
  }

  return ordered;
}

export async function optimizeRouteStops<TCandidate extends OptimizationCandidate>(params: {
  candidates: TCandidate[];
  routeDate: string;
  originCity: string | null;
  routingEngineBaseUrl?: string | null;
}) {
  const fallbackOrdered = [...params.candidates].sort((left, right) =>
    compareByTuple(left, right, { routeDate: params.routeDate, originCity: params.originCity })
  );

  const hasAnyCoordinates = fallbackOrdered.some((candidate) => hasCoordinates(candidate));
  if (!hasAnyCoordinates) {
    return {
      ordered: fallbackOrdered,
      originCity: params.originCity?.trim() ? params.originCity.trim() : null,
      optimizationMode: "heuristic_city_zip" as const
    };
  }

  const allCoordinates = fallbackOrdered.every((candidate) => hasCoordinates(candidate));
  if (params.routingEngineBaseUrl && allCoordinates && fallbackOrdered.length > 1) {
    try {
      const matrix = await fetchOsrmDistanceMatrix(params.routingEngineBaseUrl, fallbackOrdered);
      if (matrix) {
        return {
          ordered: orderByGreedyMatrix(fallbackOrdered, matrix),
          originCity: params.originCity?.trim() ? params.originCity.trim() : null,
          optimizationMode: "matrix_osrm" as const
        };
      }
    } catch {
      // fallback silencioso para heurística local
    }
  }

  return {
    ordered: orderByGeoHeuristic(fallbackOrdered, {
      routeDate: params.routeDate,
      originCity: params.originCity
    }),
    originCity: params.originCity?.trim() ? params.originCity.trim() : null,
    optimizationMode: "heuristic_geo_city_zip" as const
  };
}
