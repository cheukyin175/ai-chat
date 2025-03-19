'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function SubscriptionStatus() {
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    const success = searchParams.get('subscription_success');
    const canceled = searchParams.get('subscription_canceled');

    if (success === 'true') {
      setMessage('Your subscription has been successfully activated!');
      setType('success');
      setVisible(true);
      toast.success('Subscription activated successfully');
    } else if (canceled === 'true') {
      setMessage('Your subscription process was canceled.');
      setType('error');
      setVisible(true);
      toast.error('Subscription process canceled');
    }
  }, [searchParams]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 flex items-center gap-3 max-w-md",
            type === 'success' 
              ? "bg-green-50 text-green-900 border border-green-200" 
              : "bg-red-50 text-red-900 border border-red-200"
          )}
        >
          {type === 'success' ? (
            <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          )}
          
          <p className="text-sm flex-1">{message}</p>
          
          <button 
            onClick={() => setVisible(false)}
            className={cn(
              "p-1.5 rounded-full hover:bg-black/5 transition-colors",
              type === 'success' ? "text-green-700" : "text-red-700"
            )}
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 