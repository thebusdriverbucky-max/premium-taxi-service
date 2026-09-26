import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim()
    && process.env.STRIPE_DEPLOYMENT_ID?.trim(),
  );
}

export function getStripeDeploymentId(): string {
  const deploymentId = process.env.STRIPE_DEPLOYMENT_ID?.trim();
  if (!deploymentId) {
    throw new Error("STRIPE_DEPLOYMENT_ID is not configured for this deployment");
  }
  return deploymentId;
}

export function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error("Stripe is not configured for this deployment");
  }

  stripeClient ??= new Stripe(secretKey, { typescript: true });
  return stripeClient;
}
