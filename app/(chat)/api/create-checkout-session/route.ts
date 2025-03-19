import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@/app/(auth)/auth';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    const { priceId } = await req.json();
    
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Create a checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXTAUTH_URL}/?subscription_success=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/?subscription_canceled=true`,
      metadata: {
        userId: session.user.id,
        priceId,
      },
      customer_email: session.user.email || undefined,
    });

    return NextResponse.json({ sessionId: checkoutSession.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return new NextResponse('Error creating checkout session', { status: 500 });
  }
} 