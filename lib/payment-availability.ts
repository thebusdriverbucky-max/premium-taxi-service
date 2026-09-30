export const stripeRequiredVariables = ['STRIPE_SECRET_KEY', 'STRIPE_DEPLOYMENT_ID', 'STRIPE_WEBHOOK_SECRET'] as const;

// Presence is not verification of credentials or webhook delivery.
export function stripeConfiguration(env: Record<string, string | undefined>) {
  const present = Object.fromEntries(stripeRequiredVariables.map(name => [name, Boolean(env[name]?.trim())])) as Record<typeof stripeRequiredVariables[number], boolean>;
  return { present, configured: stripeRequiredVariables.every(name => present[name]) };
}

export function paymentAvailability(settings: { enableCardPayment?: boolean; enableCashPayment?: boolean } | null, configured: boolean) {
  return {
    card: settings?.enableCardPayment !== false && configured,
    cash: settings?.enableCashPayment !== false,
  };
}
