import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import Stripe from 'stripe';
import { createOrUpdateSubscription, getUserSubscription } from '@/lib/db/queries';
import { getPlanTypeFromPriceId } from '@/lib/stripe/helpers';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

export async function POST(req: Request) {
  try {
    console.log('Manual subscription update requested');
    
    const session = await auth();
    console.log('User session:', session ? 'Valid' : 'Invalid');
    
    if (!session?.user?.id) {
      console.log('Unauthorized: No user session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    console.log('Updating subscription for user:', userId);
    
    // Check if user already has a subscription with a Stripe customer ID
    const existingSubscription = await getUserSubscription(userId);
    console.log('Existing subscription:', existingSubscription ? 'Found' : 'Not found');
    
    if (!existingSubscription?.stripe_customer_id || !existingSubscription?.stripe_subscription_id) {
      console.log('No Stripe subscription found for user');
      
      // Try to find the customer in Stripe
      const customers = await stripe.customers.list({
        email: session.user.email || undefined,
        limit: 1
      });
      
      if (customers.data.length === 0) {
        console.log('No Stripe customer found for user');
        return NextResponse.json({ 
          error: 'No subscription found',
          message: 'No active subscription found for this user'
        }, { status: 404 });
      }
      
      const customer = customers.data[0];
      console.log('Found Stripe customer:', customer.id);
      
      // Get subscriptions for this customer
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'active',
        limit: 1
      });
      
      if (subscriptions.data.length === 0) {
        console.log('No active subscriptions found for customer');
        return NextResponse.json({ 
          error: 'No active subscription',
          message: 'No active subscription found for this user'
        }, { status: 404 });
      }
      
      const subscription = subscriptions.data[0];
      console.log('Found active subscription:', subscription.id);
      
      // Get the price details
      const priceId = subscription.items.data[0].price.id;
      
      // Determine plan type based on price ID
      const planType = getPlanTypeFromPriceId(priceId);
      console.log('Determined plan type:', planType, 'based on price ID:', priceId);
      
      // Check if the existing subscription has the correct plan type
      if (existingSubscription && existingSubscription.plan_type !== planType) {
        console.log(`Plan type mismatch: database has '${existingSubscription.plan_type}', should be '${planType}'. Fixing...`);
      }
      
      // Update subscription in database
      console.log('Updating subscription in database');
      await createOrUpdateSubscription({
        userId,
        stripeCustomerId: customer.id,
        stripeSubscriptionId: subscription.id,
        priceId,
        planType,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      });
      
      console.log('Subscription updated successfully');
      return NextResponse.json({ 
        success: true,
        message: 'Subscription updated successfully',
        subscription: {
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString()
        }
      });
    } else {
      // Subscription exists, just refresh it from Stripe
      console.log('Refreshing existing subscription from Stripe');
      
      const subscription = await stripe.subscriptions.retrieve(
        existingSubscription.stripe_subscription_id
      );
      
      // Get the price details
      const priceId = subscription.items.data[0].price.id;
      
      // Determine plan type based on price ID
      const planType = getPlanTypeFromPriceId(priceId);
      console.log('Determined plan type:', planType, 'based on price ID:', priceId);
      
      // Check if the existing subscription has the correct plan type
      if (existingSubscription.plan_type !== planType) {
        console.log(`Plan type mismatch: database has '${existingSubscription.plan_type}', should be '${planType}'. Fixing...`);
      }
      
      // Update subscription in database
      console.log('Updating subscription in database');
      await createOrUpdateSubscription({
        userId,
        stripeCustomerId: existingSubscription.stripe_customer_id,
        stripeSubscriptionId: subscription.id,
        priceId,
        planType,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      });
      
      console.log('Subscription refreshed successfully');
      return NextResponse.json({ 
        success: true,
        message: 'Subscription refreshed successfully',
        subscription: {
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString()
        }
      });
    }
  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json(
      { error: 'Error updating subscription', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 