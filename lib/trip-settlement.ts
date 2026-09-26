import {
  PaymentStatus,
  Prisma,
  TripStatus,
  type Trip,
} from '@prisma/client';

type SettlementClient = Pick<
  Prisma.TransactionClient,
  'trip' | 'bookingEmailDelivery'
>;

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
