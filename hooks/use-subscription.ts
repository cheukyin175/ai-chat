'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '@/lib/supabase-browser';
import type { Database } from '@/lib/database.types';

export type Subscription = Database['public']['Tables']['subscriptions']['Row'];
export type UserBalance = Database['public']['Tables']['user_balance']['Row'];

export function useSubscription() {
  const { data: session } = useSession();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [balance, setBalance] = useState<UserBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!session?.user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch subscription
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .single();

      if (subscriptionError && subscriptionError.code !== 'PGRST116') {
        throw subscriptionError;
      }

      // Fetch balance
      const { data: balanceData, error: balanceError } = await supabase
        .from('user_balance')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (balanceError && balanceError.code !== 'PGRST116') {
        throw balanceError;
      }

      setSubscription(subscriptionData);
      setBalance(balanceData);
      
      // If we have an active subscription, check if it needs to be updated
      if (subscriptionData && subscriptionData.status === 'active') {
        // Call the update endpoint to ensure the subscription is up to date
        try {
          const response = await fetch('/api/subscription/update', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              // Refresh the subscription data from the database
              const { data: refreshedData } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', session.user.id)
                .eq('status', 'active')
                .single();
                
              if (refreshedData) {
                setSubscription(refreshedData);
              }
            }
          }
        } catch (updateError) {
          console.error('Error updating subscription:', updateError);
          // Don't throw here, we still want to show the subscription data
        }
      }
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError('Failed to load subscription data');
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  // Function to manually refresh the subscription data
  const mutate = useCallback(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  return {
    subscription,
    balance,
    isLoading,
    error,
    isSubscribed: !!subscription,
    isPremium: subscription?.plan_type === 'premium',
    mutate
  };
} 