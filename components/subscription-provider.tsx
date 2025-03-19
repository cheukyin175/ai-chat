'use client';

import { ReactNode, createContext, useContext } from 'react';
import { useSubscription } from '@/hooks/use-subscription';
import type { Subscription, UserBalance } from '@/hooks/use-subscription';

interface SubscriptionContextType {
  subscription: Subscription | null;
  balance: UserBalance | null;
  isLoading: boolean;
  isSubscribed: boolean;
  isPremium: boolean;
  error: string | null;
  mutate: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  subscription: null,
  balance: null,
  isLoading: true,
  isSubscribed: false,
  isPremium: false,
  error: null,
  mutate: () => {}
});

export const useSubscriptionContext = () => useContext(SubscriptionContext);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const { 
    subscription, 
    balance, 
    isLoading, 
    error, 
    isSubscribed, 
    isPremium, 
    mutate 
  } = useSubscription();
  
  return (
    <SubscriptionContext.Provider 
      value={{ 
        subscription, 
        balance, 
        isLoading, 
        error, 
        isSubscribed, 
        isPremium, 
        mutate 
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
} 