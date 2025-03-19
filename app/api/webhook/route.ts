import { NextResponse, NextRequest } from 'next/server';
import Stripe from 'stripe';
import { 
  createOrUpdateSubscription, 
  createOrUpdateUserBalance 
} from '@/lib/db/queries';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

// Stripe webhook secret
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature') as string;

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const priceId = session.metadata?.priceId;

        if (!userId || !priceId) {
          console.error('Missing userId or priceId in session metadata');
          return NextResponse.json(
            { error: 'Missing metadata' },
            { status: 400 }
          );
        }

        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        // Update subscription in database
        await createOrUpdateSubscription({
          userId,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: subscription.id,
          planType: 'premium',
          status: subscription.status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        });

        // Initialize user balance with $5 USD
        await createOrUpdateUserBalance({
          userId,
          balanceUsd: 5.0,
        });

        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        
        // Only process subscription invoices
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          );
          
          // Get customer metadata to find userId
          const customer = await stripe.customers.retrieve(
            invoice.customer as string
          ) as Stripe.Customer;
          
          const userId = customer.metadata.userId;
          
          if (!userId) {
            console.error('Missing userId in customer metadata');
            return NextResponse.json(
              { error: 'Missing metadata' },
              { status: 400 }
            );
          }
          
          // Update subscription in database
          await createOrUpdateSubscription({
            userId,
            stripeCustomerId: invoice.customer as string,
            stripeSubscriptionId: subscription.id,
            planType: 'premium',
            status: subscription.status,
            currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
          });
          
          // Refresh user balance with $5 USD on renewal
          await createOrUpdateUserBalance({
            userId,
            balanceUsd: 5.0,
          });
        }
        
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Get customer metadata to find userId
        const customer = await stripe.customers.retrieve(
          subscription.customer as string
        ) as Stripe.Customer;
        
        const userId = customer.metadata.userId;
        
        if (!userId) {
          console.error('Missing userId in customer metadata');
          return NextResponse.json(
            { error: 'Missing metadata' },
            { status: 400 }
          );
        }
        
        // Update subscription in database
        await createOrUpdateSubscription({
          userId,
          stripeCustomerId: subscription.customer as string,
          stripeSubscriptionId: subscription.id,
          planType: 'premium',
          status: subscription.status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        });
        
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Get customer metadata to find userId
        const customer = await stripe.customers.retrieve(
          subscription.customer as string
        ) as Stripe.Customer;
        
        const userId = customer.metadata.userId;
        
        if (!userId) {
          console.error('Missing userId in customer metadata');
          return NextResponse.json(
            { error: 'Missing metadata' },
            { status: 400 }
          );
        }
        
        // Update subscription to free plan
        await createOrUpdateSubscription({
          userId,
          stripeCustomerId: subscription.customer as string,
          stripeSubscriptionId: subscription.id,
          planType: 'free',
          status: 'canceled',
          currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        });
        
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
} 