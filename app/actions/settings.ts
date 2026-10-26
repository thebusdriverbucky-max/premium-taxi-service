'use server';

import { db as prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/require-admin';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export type { StoreSettingsData } from '@/lib/settings-validation';
import { storeSettingsSchema, type StoreSettingsData } from '@/lib/settings-validation';
import { validationFieldErrors } from '@/lib/validation-errors';
import { getStripeConfiguration } from '@/lib/stripe';
import { getEmailDeliveryStatus } from '@/lib/email-config';

export async function getSettings() {
  try {
    await requireAdmin();
    let settings = await prisma.storeSettings.findFirst();

    if (!settings) {
      settings = await prisma.storeSettings.create({
        data: {
          currency: 'USD',
          taxRate: 0,
        },
      });
    }
    return { success: true, data: settings, stripeConfiguration: getStripeConfiguration(), emailDelivery: getEmailDeliveryStatus(process.env) };
  } catch (error) {
    console.error('Error fetching settings:', error);
    return { success: false, error: 'Failed to fetch settings' };
  }
}

export async function updateSettings(data: StoreSettingsData) {
  try {
    await requireAdmin();
    const validated = storeSettingsSchema.parse(data);
    const settings = await prisma.storeSettings.findFirst();
    const paymentCheck = storeSettingsSchema.safeParse({ ...validated, enableCardPayment: validated.enableCardPayment ?? settings?.enableCardPayment ?? true, enableCashPayment: validated.enableCashPayment ?? settings?.enableCashPayment ?? true });
    if (!paymentCheck.success) return { success: false, error: 'Please correct the highlighted settings', fieldErrors: validationFieldErrors(paymentCheck.error.issues) };
    const currencyChanged = settings?.currency !== validated.currency;

    await prisma.$transaction(async (tx) => {
      const updateData = validated;

      if (settings) {
        await tx.storeSettings.update({
          where: { id: settings.id },
          data: updateData,
        });
      } else {
        await tx.storeSettings.create({
          data: updateData,
        });
      }

      // Если валюта изменилась, обновляем её у всех тарифных планов
      if (currencyChanged) {
        await tx.tariffPlan.updateMany({
          data: {
            currency: validated.currency,
          },
        });
      }
    });

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Please correct the highlighted settings', fieldErrors: validationFieldErrors(error.issues) };
    }
    console.error('Error updating settings');
    return { success: false, error: 'Failed to update settings' };
  }
}
