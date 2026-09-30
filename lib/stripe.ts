import Stripe from "stripe";
import { stripeConfiguration } from "./payment-availability";

let stripeClient: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return getStripeConfiguration().configured;
}

export function getStripeConfiguration() {
  return stripeConfiguration(process.env);
}

export function getStripeDeploymentId(): string {
  const deploymentId = process.env.STRIPE_DEPLOYMENT_ID?.trim();
  if (!deploymentId) {
    throw new Error("STRIPE_DEPLOYMENT_ID is not configured for this deployment");
  }
  return deploymentId;
}

export function getStripe(): Stripe {
  if (!isStripeConfigured()) {
    throw new Error("Stripe server configuration is incomplete");
  }
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error("Stripe is not configured for this deployment");
  }

  stripeClient ??= new Stripe(secretKey, { typescript: true });
  return stripeClient;
}
