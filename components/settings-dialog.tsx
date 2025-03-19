'use client';

import { Suspense, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { UserProfile } from '@/components/user-profile';
import { SubscriptionProvider } from '@/components/subscription-provider';
import { Pricing } from '@/components/pricing';
import { User } from 'next-auth';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserIcon, 
  CreditCardIcon, 
  XIcon,
  ShieldIcon, 
  BellIcon, 
  KeyIcon 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsDialogProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SettingsTab = 'profile' | 'subscription' | 'notifications' | 'security';

export function SettingsDialog({ user, open, onOpenChange }: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    // Optional: Add analytics tracking or other side effects
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden w-[1200px] h-[700px] max-w-none max-h-none rounded-xl">
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-[300px] bg-muted/30 border-r border-border/40 flex flex-col">
            <div className="p-8">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-2xl font-bold">Settings</DialogTitle>
                  <button 
                    onClick={() => onOpenChange(false)}
                    className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <XIcon size={18} />
                  </button>
                </div>
                <DialogDescription className="text-sm text-muted-foreground mt-2">
                  Manage your account settings and preferences
                </DialogDescription>
              </DialogHeader>
            </div>
            
            <Separator />
            
            <nav className="flex-1 overflow-y-auto p-6">
              <div className="mb-3 px-3 py-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  User Settings
                </h3>
              </div>
              
              <div className="space-y-2">
                <button
                  onClick={() => handleTabChange('profile')}
                  className={cn(
                    "flex items-center justify-between w-full px-4 py-3 text-left rounded-md transition-colors",
                    activeTab === 'profile' 
                      ? "bg-primary text-primary-foreground font-medium" 
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <UserIcon size={18} />
                    <span>My Profile</span>
                  </div>
                </button>
                
                <button
                  onClick={() => handleTabChange('security')}
                  className={cn(
                    "flex items-center justify-between w-full px-4 py-3 text-left rounded-md transition-colors",
                    activeTab === 'security' 
                      ? "bg-primary text-primary-foreground font-medium" 
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <KeyIcon size={18} />
                    <span>Security</span>
                  </div>
                </button>
                
                <button
                  onClick={() => handleTabChange('notifications')}
                  className={cn(
                    "flex items-center justify-between w-full px-4 py-3 text-left rounded-md transition-colors",
                    activeTab === 'notifications' 
                      ? "bg-primary text-primary-foreground font-medium" 
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <BellIcon size={18} />
                    <span>Notifications</span>
                  </div>
                </button>
              </div>
              
              <div className="mt-8 mb-3 px-3 py-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Billing
                </h3>
              </div>
              
              <div className="space-y-2">
                <button
                  onClick={() => handleTabChange('subscription')}
                  className={cn(
                    "flex items-center justify-between w-full px-4 py-3 text-left rounded-md transition-colors",
                    activeTab === 'subscription' 
                      ? "bg-primary text-primary-foreground font-medium" 
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <CreditCardIcon size={18} />
                    <span>Subscription</span>
                  </div>
                </button>
              </div>
            </nav>
            
            <div className="p-6 border-t border-border/40">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div className="overflow-hidden">
                  <p className="font-medium truncate">{user?.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email || 'user@example.com'}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto px-10 py-8">
              <AnimatePresence mode="wait">
                {activeTab === 'profile' && (
                  <motion.div
                    key="profile"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="space-y-8 max-w-4xl"
                  >
                    <div className="mb-4">
                      <h2 className="text-2xl font-semibold">Your Profile</h2>
                      <p className="text-muted-foreground mt-2">
                        Manage your personal information and account preferences
                      </p>
                    </div>
                    <UserProfile user={user} />
                  </motion.div>
                )}
                
                {activeTab === 'subscription' && (
                  <motion.div
                    key="subscription"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="space-y-8"
                  >
                    <div className="mb-4">
                      <h2 className="text-2xl font-semibold">Subscription Plans</h2>
                      <p className="text-muted-foreground mt-2">
                        Choose the plan that works best for your needs
                      </p>
                    </div>
                    
                    <Suspense fallback={
                      <div className="flex items-center justify-center h-[500px]">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                      </div>
                    }>
                      <SubscriptionProvider>
                        <Pricing />
                      </SubscriptionProvider>
                    </Suspense>
                  </motion.div>
                )}
                
                {activeTab === 'notifications' && (
                  <motion.div
                    key="notifications"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="space-y-8"
                  >
                    <div className="mb-4">
                      <h2 className="text-2xl font-semibold">Notification Preferences</h2>
                      <p className="text-muted-foreground mt-2">
                        Control when and how you receive notifications
                      </p>
                    </div>
                    
                    <div className="bg-muted/30 rounded-lg p-10 text-center text-muted-foreground">
                      <BellIcon size={36} className="mx-auto mb-4 text-muted-foreground/70" />
                      <h3 className="text-xl font-medium text-foreground mb-2">No notification settings yet</h3>
                      <p className="mt-2 max-w-md mx-auto text-base">
                        Notification preferences will be available in a future update. 
                        Check back soon.
                      </p>
                    </div>
                  </motion.div>
                )}
                
                {activeTab === 'security' && (
                  <motion.div
                    key="security"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="space-y-8"
                  >
                    <div className="mb-4">
                      <h2 className="text-2xl font-semibold">Security Settings</h2>
                      <p className="text-muted-foreground mt-2">
                        Manage your account security and authentication options
                      </p>
                    </div>
                    
                    <div className="bg-muted/30 rounded-lg p-10 text-center text-muted-foreground">
                      <KeyIcon size={36} className="mx-auto mb-4 text-muted-foreground/70" />
                      <h3 className="text-xl font-medium text-foreground mb-2">Security settings coming soon</h3>
                      <p className="mt-2 max-w-md mx-auto text-base">
                        Advanced security options including two-factor authentication 
                        will be available in a future update.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 