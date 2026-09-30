import { z } from 'zod';

export interface StoreSettingsData {
  companyName?: string;
  storeEmail?: string | null;
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

const optionalText = (max: number) => z.string().trim().max(max).optional();

export const storeSettingsSchema = z.object({
  companyName: optionalText(120), storeEmail: z.preprocess(
    value => typeof value === 'string' && !value.trim() ? null : value,
    z.string().trim().email('Enter a valid contact email or leave it blank').max(254).nullable().optional(),
  ),
  currency: z.string().trim().length(3).transform(value => value.toUpperCase()),
  taxRate: z.number().finite().min(0).max(100), baseCity: optionalText(120), taxiLicense: optionalText(120),
  tiktokUrl: optionalText(500), facebookUrl: optionalText(500), instagramUrl: optionalText(500),
  heroTitle: optionalText(200), heroSubtitle: optionalText(500), heroButtonText: optionalText(100), heroImageUrl: optionalText(1000),
  ctaTitle: optionalText(200), ctaSubtitle: optionalText(500), ctaButtonText: optionalText(100),
  footerCopyright: optionalText(300), faviconUrl: optionalText(1000), ogImageUrl: optionalText(1000), siteLang: optionalText(10),
  phoneNumber: optionalText(50), whatsappNumber: optionalText(50), workingHours: optionalText(200), serviceArea: optionalText(500),
  fleetSize: z.number().int().min(0).max(100000).optional(), logoUrl: optionalText(1000), mapCountryCode: optionalText(10),
  mapCenterLat: z.number().finite().min(-90).max(90).optional(), mapCenterLng: z.number().finite().min(-180).max(180).optional(),
  mapDefaultZoom: z.number().int().min(1).max(22).optional(), enableCardPayment: z.boolean().optional(), enableCashPayment: z.boolean().optional(),
  familyTitle: optionalText(200), familyText: optionalText(2000), featuresTitle: optionalText(200), featuresSubtitle: optionalText(500),
  feature1Title: optionalText(200), feature1Text: optionalText(1000), feature2Title: optionalText(200), feature2Text: optionalText(1000),
  feature3Title: optionalText(200), feature3Text: optionalText(1000), feature4Title: optionalText(200), feature4Text: optionalText(1000),
  servicesTitle: optionalText(200), servicesSubtitle: optionalText(500), service1Title: optionalText(200), service1Text: optionalText(1000),
  service2Title: optionalText(200), service2Text: optionalText(1000), service3Title: optionalText(200), service3Text: optionalText(1000),
  statsBar1Value: optionalText(50), statsBar1Label: optionalText(100), statsBar2Value: optionalText(50), statsBar2Label: optionalText(100),
  statsBar3Value: optionalText(50), statsBar3Label: optionalText(100), statsBar4Value: optionalText(50), statsBar4Label: optionalText(100),
  airportSurcharge: z.number().finite().min(0).max(100000).optional(), luggageFee: z.number().finite().min(0).max(100000).optional(),
  childSeatFee: z.number().finite().min(0).max(100000).optional(),
}).strict().refine(data => data.enableCardPayment !== false || data.enableCashPayment !== false, {
  message: 'At least one payment method must remain enabled', path: ['enableCashPayment'],
});
