import {
  PaymentMethod,
  PaymentStatus,
  Prisma,
  TripStatus,
  type Trip,
} from '@prisma/client';

type SettlementClient = Pick<
  Prisma.TransactionClient,
  'trip' | 'bookingEmailDelivery'
>;

type TripClient = Pick<Prisma.TransactionClient, 'trip'>;

// Longer than any in-flight Stripe call: 80s request timeout x 3 attempts is
// about 250s, and serverless platforms stop the function even earlier.
export const STALE_CHECKOUT_START_MS = 5 * 60 * 1000;
export const ABANDONED_CHECKOUT_TRIP_MS = 60 * 60 * 1000;

interface PaidSettlementInput {
  trip: Trip;
  paidAmount: Prisma.Decimal;
  checkoutSessionId?: string;
  paymentIntentId: string;
}

export async function settleTripPaid(
  tx: SettlementClient,
  input: PaidSettlementInput,
) {
  const { trip, paidAmount, checkoutSessionId, paymentIntentId } = input;

  if (
    trip.stripeCheckoutSessionId
    && checkoutSessionId
    && trip.stripeCheckoutSessionId !== checkoutSessionId
  ) {
    throw new Error('Checkout Session does not belong to this trip');
  }
  if (
    trip.stripePaymentIntentId
    && trip.stripePaymentIntentId !== paymentIntentId
  ) {
    throw new Error('PaymentIntent does not belong to this trip');
  }

  await tx.trip.updateMany({
    where: {
      id: trip.id,
      paymentStatus: {
        notIn: [PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUNDED],
      },
    },
    data: {
      ...(checkoutSessionId ? { stripeCheckoutSessionId: checkoutSessionId } : {}),
      stripePaymentIntentId: paymentIntentId,
    },
  });

  const settlement = await tx.trip.updateMany({
    where: {
      id: trip.id,
      paymentStatus: {
        in: [PaymentStatus.UNPAID, PaymentStatus.PENDING, PaymentStatus.FAILED],
      },
    },
    data: {
      paymentStatus: PaymentStatus.PAID,
      paidAmount,
      paidAt: trip.paidAt || new Date(),
    },
  });

  if (settlement.count === 0) return null;

  await tx.trip.updateMany({
    where: {
      id: trip.id,
      status: { in: [TripStatus.PENDING, TripStatus.CANCELLED] },
    },
    data: { status: TripStatus.CONFIRMED },
  });

  await tx.bookingEmailDelivery.upsert({
    where: { tripId: trip.id },
    update: {},
    create: { tripId: trip.id },
  });

  return tx.trip.findUnique({
    where: { id: trip.id },
    include: { tariffPlan: true },
  });
}

export async function markTripPaymentAttemptFailed(
  tx: SettlementClient,
  trip: Trip,
  paymentIntentId: string,
) {
  if (
    trip.stripePaymentIntentId
    && trip.stripePaymentIntentId !== paymentIntentId
  ) {
    throw new Error('PaymentIntent does not belong to this trip');
  }

  await tx.trip.updateMany({
    where: {
      id: trip.id,
      paymentStatus: { in: [PaymentStatus.UNPAID, PaymentStatus.PENDING] },
    },
    data: {
      paymentStatus: PaymentStatus.FAILED,
      stripePaymentIntentId: paymentIntentId,
    },
  });
}

export async function expireTripPayment(
  tx: SettlementClient,
  trip: Trip,
) {
  const expired = await tx.trip.updateMany({
    where: {
      id: trip.id,
      paymentStatus: {
        in: [PaymentStatus.UNPAID, PaymentStatus.PENDING, PaymentStatus.FAILED],
      },
    },
    data: { paymentStatus: PaymentStatus.FAILED },
  });

  if (expired.count === 0) return;

  await tx.trip.updateMany({
    where: { id: trip.id, status: TripStatus.PENDING },
    data: { status: TripStatus.CANCELLED },
  });
}

function abandonedCheckoutWhere(
  createdBefore?: Date,
): Prisma.TripWhereInput {
  return {
    paymentMethod: PaymentMethod.STRIPE,
    paymentStatus: PaymentStatus.UNPAID,
    stripeCheckoutSessionId: null,
    ...(createdBefore ? { createdAt: { lt: createdBefore } } : {}),
  };
}

// Frees a Stripe trip whose Checkout Session was never created: cancels it and
// releases its idempotency key so the same booking request can start over. The
// coupon link is dropped so a failed attempt never counts as a coupon use.
const releasedCheckoutData = {
  status: TripStatus.CANCELLED,
  paymentStatus: PaymentStatus.FAILED,
  bookingRequestId: null,
  discountCodeId: null,
};

export async function releaseAbandonedCheckoutTrip(
  client: TripClient,
  tripId: string,
  options: { createdBefore?: Date } = {},
) {
  const released = await client.trip.updateMany({
    where: { id: tripId, ...abandonedCheckoutWhere(options.createdBefore) },
    data: releasedCheckoutData,
  });

  return released.count > 0;
}

export async function releaseAbandonedCheckoutTrips(
  client: TripClient,
  options: { createdBefore: Date; limit: number },
) {
  const where = abandonedCheckoutWhere(options.createdBefore);
  const abandoned = await client.trip.findMany({
    where,
    select: { id: true },
    orderBy: { createdAt: 'asc' },
    take: options.limit,
  });
  if (abandoned.length === 0) return 0;

  const released = await client.trip.updateMany({
    where: { ...where, id: { in: abandoned.map((trip) => trip.id) } },
    data: releasedCheckoutData,
  });

  return released.count;
}

interface RefundSettlementInput {
  trip: Trip;
  refundedAmount: Prisma.Decimal;
  fullyRefunded: boolean;
}

export async function applyTripRefund(
  tx: SettlementClient,
  input: RefundSettlementInput,
) {
  const { trip, refundedAmount, fullyRefunded } = input;

  const refund = await tx.trip.updateMany({
    where: {
      id: trip.id,
      refundedAmount: { lte: refundedAmount },
      paymentStatus: {
        in: fullyRefunded
          ? [
              PaymentStatus.PAID,
              PaymentStatus.PARTIALLY_REFUNDED,
              PaymentStatus.REFUNDED,
            ]
          : [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED],
      },
    },
    data: {
      refundedAmount,
      refundedAt: refundedAmount.isPositive() ? trip.refundedAt || new Date() : null,
      paymentStatus: fullyRefunded
        ? PaymentStatus.REFUNDED
        : PaymentStatus.PARTIALLY_REFUNDED,
    },
  });

  if (refund.count === 0) return false;

  if (fullyRefunded) {
    await tx.trip.updateMany({
      where: { id: trip.id, status: { not: TripStatus.REFUNDED } },
      data: { status: TripStatus.REFUNDED },
    });
  }

  return true;
}
