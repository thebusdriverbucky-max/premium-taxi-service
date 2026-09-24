import assert from "node:assert/strict";
import test from "node:test";

import {
  calculatePrice,
  decimalToMinor,
  minorToDecimal,
  PricingError,
} from "./pricing";

const baseInput = {
  distanceMeters: 10_000,
  durationSeconds: 1_200,
  baseFareMinor: 500,
  pricePerKmMinor: 120,
  pricePerMinuteMinor: 10,
  minimumFareMinor: 0,
  airportSurchargeMinor: 500,
  includesAirport: false,
  luggageFeeMinor: 300,
  luggageQuantity: 0,
  childSeatFeeMinor: 400,
  childSeatQuantity: 0,
} as const;

test("calculates distance and duration in minor units", () => {
  const result = calculatePrice(baseInput);
  assert.equal(result.distanceFareMinor, 1_200);
  assert.equal(result.durationFareMinor, 200);
  assert.equal(result.totalMinor, 1_900);
});

test("rounds sub-unit distance and duration components deterministically", () => {
  const result = calculatePrice({
    ...baseInput,
    distanceMeters: 1,
    durationSeconds: 3,
    pricePerKmMinor: 500,
    pricePerMinuteMinor: 10,
  });
  assert.equal(result.distanceFareMinor, 1);
  assert.equal(result.durationFareMinor, 1);
});

test("applies the greater tariff or zone minimum before extras", () => {
  const result = calculatePrice({
    ...baseInput,
    distanceMeters: 2_000,
    durationSeconds: 0,
    minimumFareMinor: 1_000,
    includesAirport: true,
    luggageQuantity: 2,
    childSeatQuantity: 1,
    zones: [{
      name: "Local",
      minDistanceMeters: 0,
      maxDistanceMeters: 5_000,
      minimumMinor: 1_500,
    }],
  });
  assert.equal(result.appliedZoneName, "Local");
  assert.equal(result.appliedMinimumMinor, 1_500);
  assert.equal(result.subtotalMinor, 3_000);
});

test("clamps fixed discounts to subtotal", () => {
  const result = calculatePrice({
    ...baseInput,
    discount: { type: "FIXED", amountMinor: 100_000 },
  });
  assert.equal(result.discountMinor, result.subtotalMinor);
  assert.equal(result.totalMinor, 0);
});

test("applies percentage discounts once and honors a maximum", () => {
  const result = calculatePrice({
    ...baseInput,
    discount: { type: "PERCENT", basisPoints: 2_500, maximumMinor: 300 },
  });
  assert.equal(result.subtotalMinor, 1_900);
  assert.equal(result.discountMinor, 300);
  assert.equal(result.totalMinor, 1_600);
});

test("converts decimal boundaries without floating-point arithmetic", () => {
  assert.equal(decimalToMinor("12.30"), 1_230);
  assert.equal(decimalToMinor(12), 1_200);
  assert.equal(minorToDecimal(1_230), "12.30");
  assert.throws(() => decimalToMinor("12.345"), PricingError);
});

test("rejects negative, fractional and invalid zone inputs", () => {
  assert.throws(
    () => calculatePrice({ ...baseInput, luggageQuantity: -1 }),
    PricingError,
  );
  assert.throws(
    () => calculatePrice({ ...baseInput, distanceMeters: 1.5 }),
    PricingError,
  );
  assert.throws(
    () => calculatePrice({
      ...baseInput,
      zones: [{
        name: "Invalid",
        minDistanceMeters: 100,
        maxDistanceMeters: 100,
        minimumMinor: 500,
      }],
    }),
    PricingError,
  );
});
