import type { PrincipalBand } from "@/redux/services/gradebook/gradebook-types";

/** "70 and above", "60 to under 70", "Below 40": a remark band by its overall average. */
export function bandLabel(bands: PrincipalBand[], band: PrincipalBand): string {
  const above = bands.map((item) => item.band_min).filter((min) => min > band.band_min);
  const next = above.length ? Math.min(...above) : null;
  if (next === null) return `${band.band_min} and above`;
  if (band.band_min === 0) return `Below ${next}`;
  return `${band.band_min} to under ${next}`;
}
