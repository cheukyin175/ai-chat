import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserSubscription } from '@/lib/db/queries';

export async function POST(req: Request) {
  try {
    console.log('Manual subscription fix requested');
    
    const session = await auth();
    console.log('User session:', session ? 'Valid' : 'Invalid');
    
    if (!session?.user?.id) {
      console.log('Unauthorized: No user session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    console.log('Fixing subscription for user:', userId);
    
    // Check if user already has a subscription
    const existingSubscription = await getUserSubscription(userId);
    console.log('Existing subscription:', existingSubscription ? 'Found' : 'Not found');
    
    if (!existingSubscription) {
      console.log('No subscription found for user');
      return NextResponse.json({ 
        error: 'No subscription found',
        message: 'No subscription found for this user'
      }, { status: 404 });
    }
    
    // Force update the plan_type to premium
    const { error } = await supabaseAdmin
      .from('subscriptions')
      .update({
        plan_type: 'premium'
      })
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error updating subscription:', error);
      return NextResponse.json({ 
        error: 'Update failed',
        message: 'Failed to update subscription'
      }, { status: 500 });
    }
    
    console.log('Subscription fixed successfully');
    return NextResponse.json({ 
      success: true,
      message: 'Subscription fixed successfully'
    });
  } catch (error) {
    console.error('Error fixing subscription:', error);
    return NextResponse.json(
      { error: 'Error fixing subscription', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 