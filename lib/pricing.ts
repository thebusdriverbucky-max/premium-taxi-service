/**
 * Pure pricing primitives. All monetary values are integer minor units
 * (for example cents), so HTTP, Prisma and floating-point arithmetic stay
 * outside the trusted calculation boundary.
 */

export interface PricingZone {
  name: string;
  minDistanceMeters: number;
  maxDistanceMeters: number;
  minimumMinor: number;
}

export type PricingDiscount =
  | { type: "FIXED"; amountMinor: number }
  | { type: "PERCENT"; basisPoints: number; maximumMinor?: number };

export interface PricingInput {
  distanceMeters: number;
  durationSeconds: number;
  baseFareMinor: number;
  pricePerKmMinor: number;
  pricePerMinuteMinor: number;
  minimumFareMinor: number;
  zones?: readonly PricingZone[];
  airportSurchargeMinor: number;
  includesAirport: boolean;
  luggageFeeMinor: number;
  luggageQuantity: number;
  childSeatFeeMinor: number;
  childSeatQuantity: number;
  discount?: PricingDiscount;
}

export interface PricingBreakdown {
  baseFareMinor: number;
  distanceFareMinor: number;
  durationFareMinor: number;
  fareBeforeMinimumMinor: number;
  appliedMinimumMinor: number;
  appliedZoneName: string | null;
  airportSurchargeMinor: number;
  luggageFeeMinor: number;
  childSeatFeeMinor: number;
  subtotalMinor: number;
  discountMinor: number;
  totalMinor: number;
}

export class PricingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PricingError";
  }
}

export function decimalToMinor(
  value: string | number,
  field = "amount",
): number {
  const normalized = String(value).trim();
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);

  if (!match) {
    throw new PricingError(`${field} must have at most two decimal places`);
  }

  const whole = BigInt(match[1]);
  const fraction = BigInt((match[2] ?? "").padEnd(2, "0"));
  const minor = whole * 100n + fraction;
  const asNumber = Number(minor);
  assertNonNegativeInteger(asNumber, field);
  return asNumber;
}

export function minorToDecimal(minor: number): string {
  assertNonNegativeInteger(minor, "minor");
  return `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, "0")}`;
}

function assertNonNegativeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new PricingError(`${field} must be a non-negative safe integer`);
  }
}

function multiplyAndRound(
  amount: number,
  multiplier: number,
  divisor: number,
): number {
  const result =
    (BigInt(amount) * BigInt(multiplier) + BigInt(Math.floor(divisor / 2))) /
    BigInt(divisor);

  const asNumber = Number(result);
  assertNonNegativeInteger(asNumber, "calculated amount");
  return asNumber;
}

function checkedAdd(...values: number[]): number {
  const total = values.reduce((sum, value) => sum + BigInt(value), 0n);
  const asNumber = Number(total);
  assertNonNegativeInteger(asNumber, "calculated total");
  return asNumber;
}

function validateInput(input: PricingInput): void {
  const integerFields: Array<[number, string]> = [
    [input.distanceMeters, "distanceMeters"],
    [input.durationSeconds, "durationSeconds"],
    [input.baseFareMinor, "baseFareMinor"],
    [input.pricePerKmMinor, "pricePerKmMinor"],
    [input.pricePerMinuteMinor, "pricePerMinuteMinor"],
    [input.minimumFareMinor, "minimumFareMinor"],
    [input.airportSurchargeMinor, "airportSurchargeMinor"],
    [input.luggageFeeMinor, "luggageFeeMinor"],
    [input.luggageQuantity, "luggageQuantity"],
    [input.childSeatFeeMinor, "childSeatFeeMinor"],
    [input.childSeatQuantity, "childSeatQuantity"],
  ];

  integerFields.forEach(([value, field]) =>
    assertNonNegativeInteger(value, field),
  );

  input.zones?.forEach((zone, index) => {
    assertNonNegativeInteger(zone.minDistanceMeters, `zones[${index}].minDistanceMeters`);
    assertNonNegativeInteger(zone.maxDistanceMeters, `zones[${index}].maxDistanceMeters`);
    assertNonNegativeInteger(zone.minimumMinor, `zones[${index}].minimumMinor`);

    if (zone.maxDistanceMeters <= zone.minDistanceMeters) {
      throw new PricingError(`zones[${index}] has an invalid distance range`);
    }
  });

  if (input.discount?.type === "FIXED") {
    assertNonNegativeInteger(input.discount.amountMinor, "discount.amountMinor");
  } else if (input.discount?.type === "PERCENT") {
    assertNonNegativeInteger(input.discount.basisPoints, "discount.basisPoints");
    if (input.discount.basisPoints > 10_000) {
      throw new PricingError("discount.basisPoints cannot exceed 10000");
    }
    if (input.discount.maximumMinor !== undefined) {
      assertNonNegativeInteger(input.discount.maximumMinor, "discount.maximumMinor");
    }
  }
}

export function calculatePrice(input: PricingInput): PricingBreakdown {
  validateInput(input);

  const distanceFareMinor = multiplyAndRound(
    input.pricePerKmMinor,
    input.distanceMeters,
    1_000,
  );
  const durationFareMinor = multiplyAndRound(
    input.pricePerMinuteMinor,
    input.durationSeconds,
    60,
  );
  const fareBeforeMinimumMinor = checkedAdd(
    input.baseFareMinor,
    distanceFareMinor,
    durationFareMinor,
  );

  const activeZone = input.zones?.find(
    zone =>
      input.distanceMeters >= zone.minDistanceMeters &&
      input.distanceMeters < zone.maxDistanceMeters,
  );
  const appliedMinimumMinor = Math.max(
    input.minimumFareMinor,
    activeZone?.minimumMinor ?? 0,
  );
  const meteredFareMinor = Math.max(
    fareBeforeMinimumMinor,
    appliedMinimumMinor,
  );

  const airportSurchargeMinor = input.includesAirport
    ? input.airportSurchargeMinor
    : 0;
  const luggageFeeMinor = multiplyAndRound(
    input.luggageFeeMinor,
    input.luggageQuantity,
    1,
  );
  const childSeatFeeMinor = multiplyAndRound(
    input.childSeatFeeMinor,
    input.childSeatQuantity,
    1,
  );
  const subtotalMinor = checkedAdd(
    meteredFareMinor,
    airportSurchargeMinor,
    luggageFeeMinor,
    childSeatFeeMinor,
  );

  let discountMinor = 0;
  if (input.discount?.type === "FIXED") {
    discountMinor = Math.min(input.discount.amountMinor, subtotalMinor);
  } else if (input.discount?.type === "PERCENT") {
    const percentageAmount = multiplyAndRound(
      subtotalMinor,
      input.discount.basisPoints,
      10_000,
    );
    discountMinor = Math.min(
      percentageAmount,
      input.discount.maximumMinor ?? percentageAmount,
      subtotalMinor,
    );
  }

  return {
    baseFareMinor: input.baseFareMinor,
    distanceFareMinor,
    durationFareMinor,
    fareBeforeMinimumMinor,
    appliedMinimumMinor,
    appliedZoneName: activeZone?.name ?? null,
    airportSurchargeMinor,
    luggageFeeMinor,
    childSeatFeeMinor,
    subtotalMinor,
    discountMinor,
    totalMinor: subtotalMinor - discountMinor,
  };
}
