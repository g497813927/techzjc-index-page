// Bound both the longest side and total raster allocation while retaining small images.
const MAX_SIDE = 4096;
const MAX_PIXELS = 4 * 1024 * 1024;

function parseDimension(value: string | null, fallback: number): number | null {
  if (value === null) return fallback;
  if (!/^[0-9]+$/.test(value)) return null;

  const dimension = Number(value);
  return Number.isSafeInteger(dimension) && dimension > 0 && dimension <= MAX_SIDE
    ? dimension
    : null;
}

export function parseOpenGraphDimensions(
  searchParams: URLSearchParams,
): { width: number; height: number } | null {
  const width = parseDimension(searchParams.get("width"), 1200);
  const height = parseDimension(searchParams.get("height"), 630);
  if (width === null || height === null || width * height > MAX_PIXELS) return null;

  return { width, height };
}
