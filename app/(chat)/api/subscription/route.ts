import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getUserSubscription } from '@/lib/db/queries';
import Stripe from 'stripe';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await getUserSubscription(session.user.id);
    
    // Even if subscription is null, return a 200 response
    return NextResponse.json({ 
      subscription,
      // Add cache headers to prevent frequent requests
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
      }
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    // Return a 200 response with null subscription to prevent UI errors
    return NextResponse.json({ 
      subscription: null,
      error: 'Error fetching subscription data'
    });
  }
}

export async function POST(req: Request) {
  try {
    console.log('POST request received at /api/subscription');
    
    const session = await auth();
    console.log('User session:', session ? 'Valid' : 'Invalid');
    
    const body = await req.json();
    const { priceId } = body;
    
    console.log('Request body:', body);
    console.log('Creating checkout session with priceId:', priceId);
    console.log('Environment variables check:', {
      stripeSecretKey: process.env.STRIPE_SECRET_KEY ? 'Set' : 'Not set',
      stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? 'Set' : 'Not set',
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? 'Set' : 'Not set'
    });
    
    if (!session?.user?.id) {
      console.log('Unauthorized: No user session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize Stripe
    console.log('Initializing Stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16' as any,
    });

    // Get or create a Stripe customer
    let stripeCustomerId: string;
    
    // Check if user already has a subscription with a Stripe customer ID
    console.log('Checking for existing subscription');
    const subscription = await getUserSubscription(session.user.id);
    console.log('Existing subscription:', subscription ? 'Found' : 'Not found');
    
    if (subscription?.stripe_customer_id) {
      console.log('Using existing Stripe customer ID:', subscription.stripe_customer_id);
      stripeCustomerId = subscription.stripe_customer_id;
    } else {
      console.log('Creating new Stripe customer');
      // Create a new customer
      const customer = await stripe.customers.create({
        email: session.user.email || undefined,
        metadata: {
          userId: session.user.id
        }
      });
      console.log('New Stripe customer created:', customer.id);
      stripeCustomerId = customer.id;
    }

    // Create a checkout session
    console.log('Creating Stripe checkout session');
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      billing_address_collection: 'auto',
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      allow_promotion_codes: true,
      success_url: `${process.env.NEXTAUTH_URL}/?subscription_success=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/?subscription_canceled=true`,
      metadata: {
        userId: session.user.id,
      },
    });
    
    console.log('Checkout session created:', checkoutSession.id);
    console.log('Checkout URL:', checkoutSession.url);

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Error creating checkout session', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 