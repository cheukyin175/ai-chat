'use client';

import { User } from 'next-auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PencilIcon, CheckIcon, KeyIcon, MailIcon } from 'lucide-react';
import { FcGoogle } from "react-icons/fc";
import { useState } from 'react';
import { cn } from '@/lib/utils';

// Extend the User type to include the provider property
interface ExtendedUser extends User {
  provider?: string;
}

interface UserProfileProps {
  user: ExtendedUser;
}

export function UserProfile({ user }: UserProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');

  const onSave = () => {
    // Here you would typically save the changes to the backend
    // For now, we'll just toggle the editing state
    setIsEditing(false);
  };

  // Default authentication method
  const authMethod = user?.provider || 'email';

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-shrink-0">
            <div className="rounded-full overflow-hidden h-24 w-24 bg-primary/10 flex items-center justify-center border-2 border-border">
              {user?.image ? (
                <img 
                  src={user.image} 
                  alt={user.name || 'User'} 
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-3xl font-bold text-primary">
                  {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex-1 space-y-4">
            <div>
              {isEditing ? (
                <div className="space-y-3">
                  <Label htmlFor="displayName">Display Name</Label>
                  <div className="flex gap-2">
                    <Input
                      id="displayName"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="max-w-md"
                    />
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={onSave}
                      className="shrink-0"
                    >
                      <CheckIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold mb-1">
                      {user?.name || 'User'}
                    </h3>
                    <p className="text-muted-foreground text-sm">{user?.email}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsEditing(true)}
                    className="h-8 px-2"
                  >
                    <PencilIcon className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>
                </div>
              )}
            </div>
            
            <div className="pt-2">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Login Methods
              </h4>
              <div className="space-y-2">
                <div className={cn(
                  "flex items-center gap-2 p-2 rounded-md border border-border/60",
                  "bg-muted/30 text-sm"
                )}>
                  {authMethod === 'mail' ? (
                    <MailIcon className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <FcGoogle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span>
                    {authMethod === 'mail' 
                      ? 'Email & Password' 
                      : 'Google'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
      
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-full p-2 bg-primary/10 text-primary">
            <KeyIcon size={16} />
          </div>
          <div className="flex-1">
            <h3 className="font-medium">Account Security</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Protect your account with additional security measures
            </p>
            <Button variant="outline" disabled>
              Set Up Two-Factor Authentication (Coming Soon)
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
} 