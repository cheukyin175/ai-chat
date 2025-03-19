'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useSubscription } from '@/hooks/use-subscription';

// Define the pricing plans
const pricingPlans = [
  {
    name: 'Free',
    description: 'Basic access to AI chatbot',
    price: 'Free',
    priceId: 'free',
    features: [
      '10 chat requests per day',
      'No credit card required'
    ]
  },
  {
    name: 'Premium',
    description: 'Full access',
    price: 'HK$50',
    // IMPORTANT: Replace this with your price ID (not product ID)
    // Visit /api/test-stripe to see all your products and their price IDs
    // The price ID should start with "price_", not "prod_"
    priceId: 'price_1R3ak6GaijbBxKEhHwrjADKn',
    features: [
      'Unlimited chat requests',
      'Priority support'
    ]
  }
];

export function Pricing() {
  const router = useRouter();
  const { data: session } = useSession();
  const { subscription, isLoading, mutate } = useSubscription();
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Check for subscription_success parameter in URL
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const subscriptionSuccess = searchParams.get('subscription_success');
    
    if (subscriptionSuccess === 'true' && session?.user?.id) {
      console.log('Subscription success detected, updating subscription status');
      
      // Remove the query parameter from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
      // Show loading toast
      toast({
        title: 'Updating subscription status',
        description: 'Please wait while we update your subscription status...',
      });
      
      // Call the manual update endpoint
      fetch('/api/subscription/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          toast({
            title: 'Subscription activated',
            description: 'Your premium subscription has been activated successfully!',
          });
          // Refresh subscription data
          mutate();
        } else {
          toast({
            title: 'Subscription status update failed',
            description: data.message || 'Please try refreshing the page.',
            variant: 'destructive'
          });
        }
      })
      .catch(error => {
        console.error('Error updating subscription status:', error);
        toast({
          title: 'Subscription status update failed',
          description: 'Please try refreshing the page.',
          variant: 'destructive'
        });
      });
    }
  }, [session, toast, mutate]);

  const handleSubscription = async (priceId: string) => {
    console.log('Subscription initiated for price ID:', priceId);
    
    if (!session) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to subscribe to a plan',
        variant: 'destructive'
      });
      router.push('/login');
      return;
    }

    // Handle free plan differently
    if (priceId === 'free') {
      toast({
        title: 'Free Plan',
        description: 'You are already on the free plan',
      });
      return;
    }

    try {
      console.log('Setting isSubmitting state for price ID:', priceId);
      setIsSubmitting(priceId);

      // Call the subscription API to create a checkout session
      console.log('Calling subscription API with price ID:', priceId);
      const response = await fetch('/api/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          priceId
        })
      });

      console.log('API response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error response:', errorData);
        throw new Error(errorData.message || 'Failed to create checkout session');
      }

      const data = await response.json();
      console.log('API success response:', data);
      
      // Redirect to Stripe checkout
      if (data.url) {
        console.log('Redirecting to Stripe checkout URL:', data.url);
        window.location.href = data.url;
      } else {
        console.error('No checkout URL returned in response');
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast({
        title: 'Subscription error',
        description: error instanceof Error ? error.message : 'Failed to process subscription. Please try again later.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(null);
    }
  };

  const isCurrentPlan = (priceId: string) => {
    if (isLoading || !subscription) return false;
    return subscription.plan_type === priceId;
  };

  const refreshSubscription = async () => {
    try {
      toast({
        title: 'Refreshing subscription status',
        description: 'Please wait...',
      });
      
      const response = await fetch('/api/subscription/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Subscription status updated',
          description: 'Your subscription status has been refreshed.',
        });
        // Refresh subscription data
        mutate();
      } else {
        toast({
          title: 'Failed to refresh subscription',
          description: data.message || 'Please try again later.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error refreshing subscription:', error);
      toast({
        title: 'Failed to refresh subscription',
        description: 'Please try again later.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="text-center py-4">Loading subscription status...</div>
      ) : subscription ? (
        <div className="bg-muted p-4 rounded-lg mb-4">
          <h3 className="font-medium">Current Subscription</h3>
          <p>Plan: {subscription.plan_type === 'premium' ? 'Premium' : 'Free'}</p>
          <p>Status: {subscription.status}</p>
          {subscription.current_period_end && (
            <p>Renews: {new Date(subscription.current_period_end).toLocaleDateString()}</p>
          )}
          <div className="flex gap-2 mt-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshSubscription}
            >
              Refresh Status
            </Button>
          </div>
        </div>
      ) : null}
      
      <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
        {pricingPlans.map((plan) => (
          <Card key={plan.priceId} className={`flex flex-col ${isCurrentPlan(plan.priceId) ? 'border-primary' : ''}`}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 flex-1">
              <div className="text-3xl font-bold">{plan.price}</div>
              <ul className="grid gap-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                onClick={() => handleSubscription(plan.priceId)}
                disabled={isSubmitting === plan.priceId || isCurrentPlan(plan.priceId)}
              >
                {isSubmitting === plan.priceId
                  ? 'Processing...'
                  : isCurrentPlan(plan.priceId)
                  ? 'Current Plan'
                  : `Subscribe to ${plan.name}`}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
} 