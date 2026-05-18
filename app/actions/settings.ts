'use server';

import { db as prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export interface StoreSettingsData {
  companyName?: string;
  storeEmail?: string;
  currency: string;
  taxRate: number;
  baseCity?: string;
  taxiLicense?: string;
  tiktokUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroButtonText?: string;
  heroImageUrl?: string;
  ctaTitle?: string;
  ctaSubtitle?: string;
  ctaButtonText?: string;
  footerCopyright?: string;
  faviconUrl?: string;
  ogImageUrl?: string;
  siteLang?: string;
  phoneNumber?: string;
  whatsappNumber?: string;
  workingHours?: string;
  serviceArea?: string;
  fleetSize?: number;
  logoUrl?: string;
  mapCountryCode?: string;
  mapCenterLat?: number;
  mapCenterLng?: number;
  mapDefaultZoom?: number;
  enableCardPayment?: boolean;
  enableCashPayment?: boolean;
  familyTitle?: string;
  familyText?: string;
  featuresTitle?: string;
  featuresSubtitle?: string;
  feature1Title?: string;
  feature1Text?: string;
  feature2Title?: string;
  feature2Text?: string;
  feature3Title?: string;
  feature3Text?: string;
  feature4Title?: string;
  feature4Text?: string;
  servicesTitle?: string;
  servicesSubtitle?: string;
  service1Title?: string;
  service1Text?: string;
  service2Title?: string;
  service2Text?: string;
  service3Title?: string;
  service3Text?: string;
  statsBar1Value?: string;
  statsBar1Label?: string;
  statsBar2Value?: string;
  statsBar2Label?: string;
  statsBar3Value?: string;
  statsBar3Label?: string;
  statsBar4Value?: string;
  statsBar4Label?: string;
  airportSurcharge?: number;
  luggageFee?: number;
  childSeatFee?: number;
}

export async function getSettings() {
  try {
    let settings = await prisma.storeSettings.findFirst();

    if (!settings) {
      settings = await prisma.storeSettings.create({
        data: {
          currency: 'USD',
          taxRate: 0,
        },
      });
    }
    return { success: true, data: settings };
  } catch (error) {
    console.error('Error fetching settings:', error);
    return { success: false, error: 'Failed to fetch settings' };
  }
}

export async function updateSettings(data: StoreSettingsData) {
  try {
    const settings = await prisma.storeSettings.findFirst();
    const currencyChanged = settings?.currency !== data.currency;

    await prisma.$transaction(async (tx) => {
      const updateData = {
        companyName: data.companyName,
        storeEmail: data.storeEmail,
        currency: data.currency,
        taxRate: data.taxRate,
        baseCity: data.baseCity,
        taxiLicense: data.taxiLicense,
        tiktokUrl: data.tiktokUrl,
        facebookUrl: data.facebookUrl,
        instagramUrl: data.instagramUrl,
        heroTitle: data.heroTitle,
        heroSubtitle: data.heroSubtitle,
        heroButtonText: data.heroButtonText,
        heroImageUrl: data.heroImageUrl,
        ctaTitle: data.ctaTitle,
        ctaSubtitle: data.ctaSubtitle,
        ctaButtonText: data.ctaButtonText,
        footerCopyright: data.footerCopyright,
        faviconUrl: data.faviconUrl,
        ogImageUrl: data.ogImageUrl,
        siteLang: data.siteLang,
        phoneNumber: data.phoneNumber,
        whatsappNumber: data.whatsappNumber,
        workingHours: data.workingHours,
        serviceArea: data.serviceArea,
        fleetSize: data.fleetSize,
        logoUrl: data.logoUrl,
        mapCountryCode: data.mapCountryCode,
        mapCenterLat: data.mapCenterLat,
        mapCenterLng: data.mapCenterLng,
        mapDefaultZoom: data.mapDefaultZoom,
        enableCardPayment: data.enableCardPayment,
        enableCashPayment: data.enableCashPayment,
        familyTitle: data.familyTitle,
        familyText: data.familyText,
        featuresTitle: data.featuresTitle,
        featuresSubtitle: data.featuresSubtitle,
        feature1Title: data.feature1Title,
        feature1Text: data.feature1Text,
        feature2Title: data.feature2Title,
        feature2Text: data.feature2Text,
        feature3Title: data.feature3Title,
        feature3Text: data.feature3Text,
        feature4Title: data.feature4Title,
        feature4Text: data.feature4Text,
        servicesTitle: data.servicesTitle,
        servicesSubtitle: data.servicesSubtitle,
        service1Title: data.service1Title,
        service1Text: data.service1Text,
        service2Title: data.service2Title,
        service2Text: data.service2Text,
        service3Title: data.service3Title,
        service3Text: data.service3Text,
        statsBar1Value: data.statsBar1Value,
        statsBar1Label: data.statsBar1Label,
        statsBar2Value: data.statsBar2Value,
        statsBar2Label: data.statsBar2Label,
        statsBar3Value: data.statsBar3Value,
        statsBar3Label: data.statsBar3Label,
        statsBar4Value: data.statsBar4Value,
        statsBar4Label: data.statsBar4Label,
        airportSurcharge: data.airportSurcharge,
        luggageFee: data.luggageFee,
        childSeatFee: data.childSeatFee,
      };

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
            currency: data.currency,
          },
        });
      }
    });

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error) {
    console.error('Error updating settings:', error);
    return { success: false, error: 'Failed to update settings' };
  }
}
