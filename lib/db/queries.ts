import 'server-only';

import { genSaltSync, hashSync } from 'bcrypt-ts';
import { supabaseAdmin } from '@/lib/supabase';
import { ArtifactKind } from '@/components/artifact';
import { Database } from '@/lib/database.types';

// Type definitions based on Supabase schema
export type User = Database['public']['Tables']['User']['Row'];
export type Chat = Database['public']['Tables']['Chat']['Row'];
export type Message = Database['public']['Tables']['Message']['Row'];
export type Vote = Database['public']['Tables']['Vote']['Row'];
export type Document = Database['public']['Tables']['Document']['Row'];
export type Suggestion = Database['public']['Tables']['Suggestion']['Row'];
export type ReasoningChain = Database['public']['Tables']['ReasoningChain']['Row'];

// Add new types for our subscription system
export type Subscription = Database['public']['Tables']['subscriptions']['Row'];
export type UserBalance = Database['public']['Tables']['user_balance']['Row'];
export type Usage = Database['public']['Tables']['usage']['Row'];
export type DailyUsage = Database['public']['Tables']['daily_usage']['Row'];

export async function getUser(email: string): Promise<Array<User>> {
  try {
    const { data, error } = await supabaseAdmin
      .from('User')
      .select()
      .eq('email', email);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to get user from database');
    throw error;
  }
}

export async function createUser(email: string, password: string) {
  const salt = genSaltSync(10);
  const hash = hashSync(password, salt);

  try {
    const { error } = await supabaseAdmin
      .from('User')
      .insert({ email, password: hash });
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Failed to create user in database');
    throw error;
  }
}

export async function saveChat({
  id,
  userId,
  title,
  visibility = 'private',
}: {
  id: string;
  userId: string;
  title: string;
  visibility?: 'public' | 'private';
}) {
  try {
    const { error } = await supabaseAdmin
      .from('Chat')
      .insert({
        id,
        userId,
        title,
        visibility,
        createdAt: new Date().toISOString(),
      });
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Failed to save chat to database');
    throw error;
  }
}

export async function deleteChatById(id: string) {
  try {
    // Delete related messages and votes first
    await supabaseAdmin.from('Vote').delete().eq('chatId', id);
    await supabaseAdmin.from('Message').delete().eq('chatId', id);
    
    // Then delete the chat
    const { error } = await supabaseAdmin.from('Chat').delete().eq('id', id);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Failed to delete chat from database');
    throw error;
  }
}

export async function getChatsByUserId(id: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('Chat')
      .select()
      .eq('userId', id)
      .order('createdAt', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to get chats from database');
    throw error;
  }
}

export async function getChatById(id: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('Chat')
      .select()
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned, which is not an error for our use case
        return null;
      }
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Failed to get chat from database');
    throw error;
  }
}

export async function saveMessages({ messages }: { messages: Array<Message> }) {
  try {
    if (messages.length === 0) return { success: true };
    
    const { error } = await supabaseAdmin
      .from('Message')
      .insert(messages);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Failed to save messages to database');
    throw error;
  }
}

/**
 * Saves reasoning chain steps for a message
 */
export async function saveReasoningChain({ 
  messageId, 
  reasoningSteps 
}: { 
  messageId: string; 
  reasoningSteps: string | string[];
}) {
  try {
    // Handle different formats of reasoning steps
    let steps: { messageId: string; step_number: number; reasoning: string }[] = [];
    
    if (typeof reasoningSteps === 'string') {
      // If it's a single string, save as one step
      steps = [{
        messageId,
        step_number: 1,
        reasoning: reasoningSteps
      }];
    } else if (Array.isArray(reasoningSteps)) {
      // If it's an array, save as multiple steps
      steps = reasoningSteps.map((reasoning, index) => ({
        messageId,
        step_number: index + 1,
        reasoning
      }));
    }
    
    if (steps.length === 0) return { success: true };
    
    // Insert the reasoning chain steps
    const { error } = await supabaseAdmin
      .from('ReasoningChain')
      .insert(steps);
    
    if (error) throw error;
    
    // Update the message to indicate it has reasoning
    await supabaseAdmin
      .from('Message')
      .update({ has_reasoning: true })
      .eq('id', messageId);
    
    return { success: true };
  } catch (error) {
    console.error('Failed to save reasoning chain to database');
    throw error;
  }
}

export async function getMessagesByChatId(id: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('Message')
      .select()
      .eq('chatId', id)
      .order('createdAt', { ascending: true });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to get messages from database');
    throw error;
  }
}

/**
 * Gets messages with their reasoning chains
 */
export async function getMessagesWithReasoningByChatId(id: string) {
  try {
    // Get all messages for the chat
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('Message')
      .select()
      .eq('chatId', id)
      .order('createdAt', { ascending: true });
    
    if (messagesError) throw messagesError;
    if (!messages || messages.length === 0) return [];
    
    // Get reasoning chains for all messages that have reasoning
    const messagesWithReasoning = messages.filter(m => m.has_reasoning);
    if (messagesWithReasoning.length === 0) return messages;
    
    const messageIds = messagesWithReasoning.map(m => m.id);
    const { data: reasoningChains, error: reasoningError } = await supabaseAdmin
      .from('ReasoningChain')
      .select()
      .in('messageId', messageIds)
      .order('step_number', { ascending: true });
    
    if (reasoningError) throw reasoningError;
    
    // Combine messages with their reasoning chains
    const messagesWithReasoningChains = messages.map(message => {
      if (!message.has_reasoning) return message;
      
      const reasoning = reasoningChains
        ?.filter(r => r.messageId === message.id)
        .map(r => r.reasoning)
        .join('\n\n');
      
      return {
        ...message,
        reasoning
      };
    });
    
    return messagesWithReasoningChains;
  } catch (error) {
    console.error('Failed to get messages with reasoning from database');
    throw error;
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  try {
    // Check if vote exists
    const { data: existingVote, error: fetchError } = await supabaseAdmin
      .from('Vote')
      .select()
      .eq('chatId', chatId)
      .eq('messageId', messageId)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError; // PGRST116 is "no rows returned"
    
    const isUpvoted = type === 'up';
    
    if (existingVote) {
      // Update existing vote
      const { error } = await supabaseAdmin
        .from('Vote')
        .update({ isUpvoted })
        .eq('chatId', chatId)
        .eq('messageId', messageId);
      
      if (error) throw error;
    } else {
      // Insert new vote
      const { error } = await supabaseAdmin
        .from('Vote')
        .insert({
          chatId,
          messageId,
          isUpvoted,
        });
      
      if (error) throw error;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Failed to vote message in database');
    throw error;
  }
}

export async function getVotesByChatId(id: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('Vote')
      .select()
      .eq('chatId', id);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to get votes from database');
    throw error;
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    const { error } = await supabaseAdmin
      .from('Document')
      .insert({
        id,
        title,
        kind,
        content,
        userId,
        createdAt: new Date().toISOString(),
      });
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Failed to save document to database');
    throw error;
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const { data, error } = await supabaseAdmin
      .from('Document')
      .select()
      .eq('id', id)
      .order('createdAt', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to get documents from database');
    throw error;
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const { data, error } = await supabaseAdmin
      .from('Document')
      .select()
      .eq('id', id)
      .order('createdAt', { ascending: false })
      .limit(1)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to get document from database');
    throw error;
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    // First get all documents to delete
    const { data: documentsToDelete, error: fetchError } = await supabaseAdmin
      .from('Document')
      .select('id, createdAt')
      .eq('id', id)
      .gte('createdAt', timestamp.toISOString());
    
    if (fetchError) throw fetchError;
    
    if (!documentsToDelete || documentsToDelete.length === 0) {
      return { success: true };
    }
    
    // Delete related suggestions first
    for (const doc of documentsToDelete) {
      await supabaseAdmin
        .from('Suggestion')
        .delete()
        .eq('documentId', doc.id)
        .eq('documentCreatedAt', doc.createdAt);
    }
    
    // Then delete the documents
    const { error } = await supabaseAdmin
      .from('Document')
      .delete()
      .eq('id', id)
      .gte('createdAt', timestamp.toISOString());
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Failed to delete documents from database');
    throw error;
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    if (suggestions.length === 0) return { success: true };
    
    const { error } = await supabaseAdmin
      .from('Suggestion')
      .insert(suggestions);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Failed to save suggestions to database');
    throw error;
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    const { data, error } = await supabaseAdmin
      .from('Suggestion')
      .select()
      .eq('documentId', documentId)
      .order('createdAt', { ascending: true });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to get suggestions from database');
    throw error;
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    const { data, error } = await supabaseAdmin
      .from('Message')
      .select()
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to get message from database');
    throw error;
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    // First get all messages to delete
    const { data: messagesToDelete, error: fetchError } = await supabaseAdmin
      .from('Message')
      .select('id')
      .eq('chatId', chatId)
      .gte('createdAt', timestamp.toISOString());
    
    if (fetchError) throw fetchError;
    
    if (!messagesToDelete || messagesToDelete.length === 0) {
      return { success: true };
    }
    
    // Delete related votes first
    const messageIds = messagesToDelete.map((m: { id: string }) => m.id);
    await supabaseAdmin
      .from('Vote')
      .delete()
      .eq('chatId', chatId)
      .in('messageId', messageIds);
    
    // Then delete the messages
    const { error } = await supabaseAdmin
      .from('Message')
      .delete()
      .eq('chatId', chatId)
      .gte('createdAt', timestamp.toISOString());
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Failed to delete messages from database');
    throw error;
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    const { error } = await supabaseAdmin
      .from('Chat')
      .update({ visibility })
      .eq('id', chatId);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Failed to update chat visibility in database');
    throw error;
  }
}

// Subscription related queries
export async function getUserSubscription(userId: string) {
  try {
    // Get the subscription
    const { data: subscription, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    
    // If no subscription found, return null
    if (!subscription) return null;
    
    return subscription;
  } catch (error) {
    console.error('Failed to get user subscription from database');
    // Return null instead of throwing to prevent app crashes
    return null;
  }
}

export async function createOrUpdateSubscription({
  userId,
  stripeCustomerId,
  stripeSubscriptionId,
  priceId = 'price_free',
  planType = 'free',
  status = 'active',
  currentPeriodStart,
  currentPeriodEnd,
}: {
  userId: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  priceId?: string;
  planType?: 'free' | 'premium';
  status?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
}) {
  try {
    // Check if subscription exists
    const { data: existingSub, error: fetchError } = await supabaseAdmin
      .from('subscriptions')
      .select()
      .eq('user_id', userId)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
    
    if (existingSub) {
      // Update existing subscription
      const { error } = await supabaseAdmin
        .from('subscriptions')
        .update({
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSubscriptionId,
          price_id: priceId,
          plan_type: planType,
          status,
          current_period_start: currentPeriodStart,
          current_period_end: currentPeriodEnd,
        })
        .eq('id', existingSub.id);
      
      if (error) throw error;
    } else {
      // Create new subscription
      const { error } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          user_id: userId,
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSubscriptionId,
          price_id: priceId,
          plan_type: planType,
          status,
          current_period_start: currentPeriodStart,
          current_period_end: currentPeriodEnd,
        });
      
      if (error) throw error;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Failed to create or update subscription in database');
    throw error;
  }
}

// User balance related queries
export async function getUserBalance(userId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_balance')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    
    return data || null;
  } catch (error) {
    console.error('Failed to get user balance from database');
    return null;
  }
}

export async function createOrUpdateUserBalance({
  userId,
  balanceUsd,
}: {
  userId: string;
  balanceUsd: number;
}) {
  try {
    // Check if balance exists
    const { data: existingBalance, error: fetchError } = await supabaseAdmin
      .from('user_balance')
      .select()
      .eq('user_id', userId)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
    
    if (existingBalance) {
      // Update existing balance
      const { error } = await supabaseAdmin
        .from('user_balance')
        .update({
          balance_usd: balanceUsd,
        })
        .eq('id', existingBalance.id);
      
      if (error) throw error;
    } else {
      // Create new balance
      const { error } = await supabaseAdmin
        .from('user_balance')
        .insert({
          user_id: userId,
          balance_usd: balanceUsd,
        });
      
      if (error) throw error;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Failed to create or update user balance in database');
    throw error;
  }
}

// Usage tracking related queries
export async function trackUsage({
  userId,
  chatId,
  messageId,
  tokensUsed,
  costUsd,
}: {
  userId: string;
  chatId?: string;
  messageId?: string;
  tokensUsed: number;
  costUsd: number;
}) {
  try {
    const { error } = await supabaseAdmin
      .from('usage')
      .insert({
        user_id: userId,
        chat_id: chatId,
        message_id: messageId,
        tokens_used: tokensUsed,
        cost_usd: costUsd,
      });
    
    if (error) throw error;
    
    // Also deduct from user balance if they have one
    const { data: balance } = await supabaseAdmin
      .from('user_balance')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (balance) {
      const newBalance = Math.max(0, Number(balance.balance_usd) - costUsd);
      
      await supabaseAdmin
        .from('user_balance')
        .update({
          balance_usd: newBalance,
        })
        .eq('id', balance.id);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Failed to track usage in database');
    throw error;
  }
}

// Daily usage tracking
export async function incrementDailyUsage(userId: string) {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Check if there's an entry for today
    const { data: existingUsage, error: fetchError } = await supabaseAdmin
      .from('daily_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
    
    if (existingUsage) {
      // Increment existing usage
      const { error } = await supabaseAdmin
        .from('daily_usage')
        .update({
          requests_count: existingUsage.requests_count + 1,
        })
        .eq('id', existingUsage.id);
      
      if (error) throw error;
      
      return { count: existingUsage.requests_count + 1 };
    } else {
      // Create new usage entry
      const { error } = await supabaseAdmin
        .from('daily_usage')
        .insert({
          user_id: userId,
          date: today,
          requests_count: 1,
        });
      
      if (error) throw error;
      
      return { count: 1 };
    }
  } catch (error) {
    console.error('Failed to increment daily usage in database');
    throw error;
  }
}

export async function getDailyUsage(userId: string) {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    const { data, error } = await supabaseAdmin
      .from('daily_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    
    return data ? data.requests_count : 0;
  } catch (error) {
    console.error('Failed to get daily usage from database');
    return 0;
  }
}

// Initialize user subscription and balance
export async function initializeUserSubscription(userId: string) {
  try {
    // Create free subscription
    await createOrUpdateSubscription({
      userId,
      priceId: 'price_free',
      planType: 'free',
      status: 'active',
    });
    
    // Create balance with 0 USD
    await createOrUpdateUserBalance({
      userId,
      balanceUsd: 0,
    });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to initialize user subscription and balance');
    throw error;
  }
}
