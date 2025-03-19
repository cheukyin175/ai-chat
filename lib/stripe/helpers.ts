import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

// Map of price IDs to plan types
const PRICE_TO_PLAN_MAP: Record<string, 'free' | 'premium'> = {
  'price_1R3ak6GaijbBxKEhHwrjADKn': 'premium',
  // Add more price IDs as needed
};

/**
 * Determines the plan type based on the price ID
 * @param priceId The Stripe price ID
 * @returns The plan type ('premium' or 'free')
 */
export function getPlanTypeFromPriceId(priceId: string): 'free' | 'premium' {
  // Check if the price ID is in our map
  if (priceId in PRICE_TO_PLAN_MAP) {
    return PRICE_TO_PLAN_MAP[priceId];
  }
  
  // If the price ID starts with 'price_' and is not in our map, assume it's premium
  if (priceId.startsWith('price_')) {
    console.log(`Unknown price ID: ${priceId}, assuming premium plan`);
    return 'premium';
  }
  
  // Default to free plan
  return 'free';
}

/**
 * Retrieves a Stripe subscription by ID
 * @param subscriptionId The Stripe subscription ID
 * @returns The Stripe subscription object
 */
export async function getStripeSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Retrieves a Stripe customer by ID
 * @param customerId The Stripe customer ID
 * @returns The Stripe customer object
 */
export async function getStripeCustomer(customerId: string): Promise<Stripe.Customer> {
  return await stripe.customers.retrieve(customerId) as Stripe.Customer;
}

/**
 * Finds a Stripe customer by email
 * @param email The customer's email
 * @returns The first matching Stripe customer or null if not found
 */
export async function findStripeCustomerByEmail(email: string): Promise<Stripe.Customer | null> {
  const customers = await stripe.customers.list({
    email,
    limit: 1
  });
  
  return customers.data.length > 0 ? customers.data[0] : null;
}

/**
 * Gets active subscriptions for a customer
 * @param customerId The Stripe customer ID
 * @returns Array of active subscriptions
 */
export async function getActiveSubscriptionsForCustomer(customerId: string): Promise<Stripe.Subscription[]> {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'active',
    limit: 10
  });
  
  return subscriptions.data;
} 