import { TariffPlan } from "@prisma/client";

export interface TariffZone {
  name: string;
  minKm: number;
  maxKm: number;
  minPrice: number | string;
}

export interface TariffPlanWithZones extends Omit<TariffPlan, "zones"> {
  zones: TariffZone[] | null;
}
