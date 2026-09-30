export interface SelectedLocation {
  address: string;
  latitude: number;
  longitude: number;
  placeId?: string;
}

export interface RouteMetrics { distanceMeters: number; durationSeconds: number }

export function selectedLocation(address: string, latitude?: number, longitude?: number, placeId?: string): SelectedLocation | null {
  if (!address.trim() || latitude === undefined || longitude === undefined ||
      !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { address, latitude, longitude, ...(placeId ? { placeId } : {}) };
}

export function routeKey(pickup: SelectedLocation | null, dropoff: SelectedLocation | null) {
  return JSON.stringify([pickup, dropoff]);
}

// Legacy drafts did not bind the displayed address to coordinates. Keep their text,
// but require reselection rather than trusting potentially stale coordinate pairs.
export function restoreDraftLocation(version: unknown, address: string, point: unknown): SelectedLocation | null {
  if (version !== 2 || !point || typeof point !== 'object') return null;
  const p = point as Record<string, unknown>;
  if (p.address !== address || typeof p.lat !== 'number' || typeof p.lng !== 'number') return null;
  return selectedLocation(address, p.lat, p.lng, typeof p.placeId === 'string' ? p.placeId : undefined);
}

export function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
