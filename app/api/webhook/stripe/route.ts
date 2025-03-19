import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createOrUpdateSubscription, getUserSubscription } from '@/lib/db/queries';
import { getPlanTypeFromPriceId } from '@/lib/stripe/helpers';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

export async function POST(req: Request) {
  console.log('Stripe webhook received');
  
  const body = await req.text();
  const signature = req.headers.get('Stripe-Signature') as string;
  
  console.log('Webhook signature received:', signature ? 'Present' : 'Missing');

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    
    console.log('Webhook event constructed successfully:', event.type);
  } catch (error: any) {
    console.error('Webhook signature verification failed:', error.message);
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }

  // Handle subscription events
  if (event.type === 'checkout.session.completed') {
    console.log('Processing checkout.session.completed event');
    const session = event.data.object as Stripe.Checkout.Session;
    console.log('Checkout session data:', {
      id: session.id,
      customerId: session.customer,
      subscriptionId: session.subscription,
      userId: session.metadata?.userId
    });
    
    try {
      // Retrieve the subscription details from Stripe
      console.log('Retrieving subscription details from Stripe');
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string
      );
      
      // Get the price details
      const priceId = subscription.items.data[0].price.id;
      console.log('Subscription details retrieved:', {
        id: subscription.id,
        status: subscription.status,
        priceId: priceId
      });
      
      // Determine plan type based on price ID
      const planType = getPlanTypeFromPriceId(priceId);
      console.log('Determined plan type:', planType, 'based on price ID:', priceId);
      
      // Check if there's an existing subscription with the wrong plan type
      const existingSubscription = await getUserSubscription(session.metadata?.userId as string);
      if (existingSubscription && existingSubscription.plan_type !== planType) {
        console.log(`Plan type mismatch: database has '${existingSubscription.plan_type}', should be '${planType}'. Fixing...`);
      }
      
      // Update user's subscription status in Supabase
      console.log('Updating subscription in database');
      await createOrUpdateSubscription({
        userId: session.metadata?.userId as string,
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: session.subscription as string,
        priceId,
        planType,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      });
      console.log('Subscription updated successfully in database');
    } catch (error) {
      console.error('Error processing checkout.session.completed event:', error);
    }
  } else if (event.type === 'invoice.payment_succeeded') {
    console.log('Processing invoice.payment_succeeded event');
    // Handle subscription renewals
    const invoice = event.data.object as Stripe.Invoice;
    
    if (invoice.subscription) {
      try {
        console.log('Retrieving subscription details for invoice:', invoice.id);
        const subscription = await stripe.subscriptions.retrieve(
          invoice.subscription as string
        );
        
        // Get the price details
        const priceId = subscription.items.data[0].price.id;
        console.log('Subscription details retrieved:', {
          id: subscription.id,
          status: subscription.status,
          priceId: priceId
        });
        
        // Determine plan type based on price ID
        const planType = getPlanTypeFromPriceId(priceId);
        console.log('Determined plan type:', planType, 'based on price ID:', priceId);
        
        // Check if there's an existing subscription with the wrong plan type
        const existingSubscription = await getUserSubscription(subscription.metadata.userId as string);
        if (existingSubscription && existingSubscription.plan_type !== planType) {
          console.log(`Plan type mismatch: database has '${existingSubscription.plan_type}', should be '${planType}'. Fixing...`);
        }
        
        // Update subscription in database
        console.log('Updating subscription in database');
        await createOrUpdateSubscription({
          userId: subscription.metadata.userId as string,
          stripeCustomerId: subscription.customer as string,
          stripeSubscriptionId: subscription.id,
          priceId,
          planType,
          status: subscription.status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        });
        console.log('Subscription updated successfully in database');
      } catch (error) {
        console.error('Error processing invoice.payment_succeeded event:', error);
      }
    }
  } else if (event.type === 'customer.subscription.updated') {
    console.log('Processing customer.subscription.updated event');
    // Handle subscription updates
    const subscription = event.data.object as Stripe.Subscription;
    
    try {
      // Get the price details
      const priceId = subscription.items.data[0].price.id;
      console.log('Subscription details:', {
        id: subscription.id,
        status: subscription.status,
        priceId: priceId
      });
      
      // Determine plan type based on price ID
      const planType = getPlanTypeFromPriceId(priceId);
      console.log('Determined plan type:', planType, 'based on price ID:', priceId);
      
      // Check if there's an existing subscription with the wrong plan type
      const existingSubscription = await getUserSubscription(subscription.metadata.userId as string);
      if (existingSubscription && existingSubscription.plan_type !== planType) {
        console.log(`Plan type mismatch: database has '${existingSubscription.plan_type}', should be '${planType}'. Fixing...`);
      }
      
      // Update subscription in database
      console.log('Updating subscription in database');
      await createOrUpdateSubscription({
        userId: subscription.metadata.userId as string,
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
        priceId,
        planType,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      });
      console.log('Subscription updated successfully in database');
    } catch (error) {
      console.error('Error processing customer.subscription.updated event:', error);
    }
  } else {
    console.log('Unhandled event type:', event.type);
  }

  return new NextResponse(null, { status: 200 });
} 