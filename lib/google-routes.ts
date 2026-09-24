import "server-only";

import type { CreateBookingInput } from "@/lib/validations";

const ROUTES_API_URL =
  "https://routes.googleapis.com/directions/v2:computeRoutes";

type RoutePoint = CreateBookingInput["pickup"];

interface RoutesApiResponse {
  routes?: Array<{
    distanceMeters?: number;
    duration?: string;
  }>;
}

interface RoutesApiErrorResponse {
  error?: {
    message?: string;
    status?: string;
    details?: Array<{
      reason?: string;
    }>;
  };
}

export interface ComputedRoute {
  distanceMeters: number;
  durationSeconds: number;
}

export class RouteCalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RouteCalculationError";
  }
}

function toWaypoint(point: RoutePoint) {
  return {
    location: {
      latLng: {
        latitude: point.latitude,
        longitude: point.longitude,
      },
    },
  };
}

function parseDurationSeconds(duration: string | undefined): number {
  if (!duration || !/^\d+(?:\.\d+)?s$/.test(duration)) {
    throw new RouteCalculationError("Routes API returned an invalid duration");
  }

  const seconds = Number(duration.slice(0, -1));

  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new RouteCalculationError("Routes API returned an invalid duration");
  }

  return Math.ceil(seconds);
}

export async function computeDrivingRoute(
  pickup: RoutePoint,
  dropoff: RoutePoint,
): Promise<ComputedRoute> {
  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;

  if (!apiKey) {
    throw new RouteCalculationError("Google Routes API is not configured");
  }

  let response: Response;

  try {
    response = await fetch(ROUTES_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
      },
      body: JSON.stringify({
        origin: toWaypoint(pickup),
        destination: toWaypoint(dropoff),
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_UNAWARE",
        computeAlternativeRoutes: false,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new RouteCalculationError("Unable to reach Google Routes API");
  }

  if (!response.ok) {
    let providerMessage = "";
    try {
      const data = await response.json() as RoutesApiErrorResponse;
      const reason = data.error?.details?.find(detail => detail.reason)?.reason;
      providerMessage = [data.error?.message, reason].filter(Boolean).join(" ");
    } catch {
      // Preserve the HTTP status if Google returned a non-JSON response.
    }

    throw new RouteCalculationError(
      `Google Routes API request failed with status ${response.status}${providerMessage ? `: ${providerMessage}` : ""}`,
    );
  }

  const data = await response.json() as RoutesApiResponse;
  const route = data.routes?.[0];
  const distanceMeters = route?.distanceMeters;

  if (!route ||
      typeof distanceMeters !== "number" ||
      !Number.isInteger(distanceMeters) ||
      distanceMeters <= 0) {
    throw new RouteCalculationError("No valid driving route was found");
  }

  return {
    distanceMeters,
    durationSeconds: parseDurationSeconds(route.duration),
  };
}
