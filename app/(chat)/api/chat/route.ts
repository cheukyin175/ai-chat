import { NextResponse } from 'next/server';
import { 
  streamText, 
  generateText, 
  wrapLanguageModel, 
  extractReasoningMiddleware
} from 'ai';
import { auth } from '@/app/(auth)/auth';
import { estimateTokens, generateUUID } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import {
  getUserSubscription,
  getDailyUsage,
  incrementDailyUsage,
  getUserBalance,
  trackUsage,
  saveChat,
  getChatById,
  saveMessages,
  saveReasoningChain
} from '@/lib/db/queries';
import { createOpenRouterClient, extractOpenRouterUsage } from '@/lib/ai/openrouter';
import { getOpenRouterModelId } from '@/lib/ai/models';
import type { Message } from 'ai';
import { v4 as uuidv4 } from 'uuid';

// Add interface for reasoning message
interface ReasoningMessage extends Message {
  reasoning?: string;
}

// Add interface for database message
interface DatabaseMessage {
  id: string;
  chatId: string;
  role: string;
  content: string;
  createdAt: string;
  has_reasoning: boolean;
}

// Constants for usage limits
const FREE_PLAN_DAILY_LIMIT = 10;
const PREMIUM_PLAN_BALANCE = 5.00; // $5.00 USD
const TOKEN_COST_PER_1K = 0.002; // $0.002 per 1K

// Get reasoning model keywords from environment variable
const REASONING_MODEL_KEYWORDS = (process.env.REASONING_MODEL_KEYWORDS || 'reason,thinking,deepseek-r1')
  .split(',')
  .map(keyword => keyword.toLowerCase().trim());

// Helper function to check if a model name contains reasoning keywords
function isReasoningModel(modelName: string): boolean {
  const lowerModelName = modelName.toLowerCase();
  return REASONING_MODEL_KEYWORDS.some(keyword => lowerModelName.includes(keyword));
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    
    // Check if this is an AI SDK request or a direct API request
    const isAiSdkRequest = Boolean(json.messages && !json.chatId);    
    // Extract parameters based on request type
    const messages = json.messages as ReasoningMessage[];
    const chatId = isAiSdkRequest ? json.id : json.chatId;
    const modelName = isAiSdkRequest ? (json.selectedChatModel || 'chat-model-small') : (json.model || 'chat-model-small');
    
    // Generate a proper UUID if not provided
    const id = chatId || uuidv4();
        
    // Check if user is authenticated
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // Get user subscription
    const subscription = await getUserSubscription(userId);
    const planType = subscription?.plan_type || 'free';
    
    // Check usage limits based on plan
    if (planType === 'free') {
      const dailyUsage = await getDailyUsage(userId);
      if (dailyUsage >= FREE_PLAN_DAILY_LIMIT) {
        return NextResponse.json(
          { error: 'Daily usage limit reached for free plan' },
          { status: 403 }
        );
      }
    } else if (planType === 'premium') {
      const balance = await getUserBalance(userId);
      if (balance && balance.balance_usd < 0) {
        return NextResponse.json(
          { error: 'Insufficient balance' },
          { status: 403 }
        );
      }
    }
    
    // Save the chat if it's a new one
    if (messages.length === 1) {
      try {
        // Make sure id is a string, not an object
        const chatIdString = typeof id === 'object' ? JSON.stringify(id) : id;
        console.log(`Checking if chat exists with ID: ${chatIdString}`);
        
        // Check if the chat already exists before saving
        const existingChat = await getChatById(chatIdString);
        
        if (!existingChat) {
          await saveChat({
            id: chatIdString,
            userId,
            title: messages[0].content.substring(0, 100),
            visibility: 'private',
          });
        }
        
        // Save the user message to the database
        try {
          const messagesWithTimestamp = messages.map(msg => {
            // Ensure content is a string, not an object with parts
            let contentStr = '';
            if (typeof msg.content === 'string') {
              contentStr = msg.content;
            } else if (msg.content && typeof msg.content === 'object') {
              // If it has a text property (common in AI messages), use that
              if ((msg.content as any).text) {
                contentStr = (msg.content as any).text;
              } else {
                // Otherwise stringify the whole object
                contentStr = JSON.stringify(msg.content);
              }
            }
            
            return {
              // Generate a new UUID instead of using the one from the AI SDK
              id: uuidv4(),
              chatId: chatIdString,
              role: msg.role,
              content: contentStr,
              createdAt: new Date().toISOString(),
              has_reasoning: false
            };
          });
          
          await saveMessages({ messages: messagesWithTimestamp });
        } catch (saveMessageError) {
          console.error('Error saving user message:', saveMessageError);
        }
      } catch (saveError) {
        console.error('Error saving chat:', saveError);
        // Continue even if saving fails - this is not critical for the chat to work
      }
    } else {
      // If it's not the first message, save the new user message
      try {
        const chatIdString = typeof id === 'object' ? JSON.stringify(id) : id;
        // Find the last user message (should be the one just sent)
        const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
        
        if (lastUserMessage) {
          // Ensure content is a string, not an object with parts
          let contentStr = '';
          if (typeof lastUserMessage.content === 'string') {
            contentStr = lastUserMessage.content;
          } else if (lastUserMessage.content && typeof lastUserMessage.content === 'object') {
            // If it has a text property (common in AI messages), use that
            if ((lastUserMessage.content as any).text) {
              contentStr = (lastUserMessage.content as any).text;
            } else {
              // Otherwise stringify the whole object
              contentStr = JSON.stringify(lastUserMessage.content);
            }
          }
            
          await saveMessages({ 
            messages: [{
              // Generate a new UUID instead of using the one from the AI SDK
              id: uuidv4(),
              chatId: chatIdString,
              role: lastUserMessage.role,
              content: contentStr,
              createdAt: new Date().toISOString(),
              has_reasoning: false
            }]
          });
        }
      } catch (saveMessageError) {
        console.error('Error saving user message for existing chat:', saveMessageError);
      }
    }
    
    // Get the OpenRouter model ID from the UI model ID
    const modelId = getOpenRouterModelId(modelName);
    
    // Create OpenRouter client using the updated function
    const baseModel = createOpenRouterClient(modelId);
    
    // Track usage for billing
    await incrementDailyUsage(userId);
    
    // Estimate token usage for billing purposes
    const estimatedTokens = estimateTokens(
      messages.map((m) => typeof m.content === 'string' ? m.content : '').join(' ')
    );
    
    // Check if this is a reasoning model using the helper function
    const isReasoningModelEnabled = isReasoningModel(modelName);
    
    // Apply reasoning middleware if using a reasoning model
    const model = isReasoningModelEnabled 
      ? wrapLanguageModel({
          model: baseModel,
          middleware: extractReasoningMiddleware({ 
            tagName: 'think',
            startWithReasoning: false,  // Keep reasoning separate from final answer
            separator: '\n\n'           // Add clear separation between reasoning steps
          })
        }) 
      : baseModel;
    
    // Add system message to guide reasoning behavior for reasoning models
    const messagesWithReasoningGuidance = isReasoningModelEnabled
      ? [
          {
            role: 'system' as const,
            content: `You are a helpful AI assistant that provides clear, step-by-step reasoning before giving your final answer. 
            When reasoning:
            1. Break down your thinking into clear, numbered steps
            2. Each step should build on the previous one
            3. Keep your reasoning concise and focused
            4. End your reasoning with a clear conclusion
            5. Then provide your final answer
            
            Format your response like this:
            <think>
            1. First step of reasoning
            2. Second step of reasoning
            3. Final step of reasoning
            </think>
            
            Your final answer here.

            Mathematical Notation:
            - Use LaTeX/KaTeX for mathematical expressions
            - Inline math expressions should be enclosed in single dollar signs: $E=mc^2$
            - Block/display math expressions should use double dollar signs: 
              $$
              E = mc^2
              $$
            - Use proper LaTeX commands for mathematical symbols: \alpha, \beta, \sum, \int, etc.
            - For chemical equations use: \ce{H2O} format
            - For dimensional analysis use: \pu{kg.m/s^2} format
            - Always render fractions with \frac{numerator}{denominator}
            - Use \begin{equation} and \end{equation} for numbered equations
            - For matrices use \begin{matrix} and \end{matrix} environments`
          },
          ...messages
        ]
      : messages;
    
    // Create the text stream using AI SDK with the OpenRouter provider
    const result = streamText({
      model,
      messages: messagesWithReasoningGuidance,
      temperature: 0.7,
      maxTokens: 3000,
      onFinish: async (completion) => {
        try {
          const chatIdString = typeof id === 'object' ? JSON.stringify(id) : id;
          
          // Extract text content from the completion
          let completionText = '';
          let reasoningText = '';
          
          // Handle string completion
          if (typeof completion === 'string') {
            completionText = completion;
          } 
          // Handle object completion
          else if (completion && typeof completion === 'object') {
            // Try to extract reasoning if available
            if ('reasoning' in completion && completion.reasoning) {
              reasoningText = String(completion.reasoning);
            }
            
            // Try to get content from 'text' property (common in AI SDK responses)
            if ('text' in completion && typeof completion.text === 'string') {
              completionText = completion.text;
            } 
            // Or try to get from 'content' property
            else if ('content' in completion && typeof completion.content === 'string') {
              completionText = completion.content;
            }
            // If still empty, use string representation as fallback
            if (!completionText) {
              completionText = String(completion);
              
              // Fix [object Object] issue
              if (completionText === '[object Object]') {
                try {
                  completionText = JSON.stringify(completion);
                } catch (e) {
                  console.error('Error stringifying completion object:', e);
                  completionText = "Error: Unable to display message content";
                }
              }
            }
          }
          
          // For reasoning models, store reasoning in the new ReasoningChain table
          if (isReasoningModelEnabled && reasoningText) {
            // Save the final answer message first
            const assistantMessage: DatabaseMessage = {
              id: uuidv4(),
              role: 'assistant',
              content: completionText,
              chatId: chatIdString,
              createdAt: new Date().toISOString(),
              has_reasoning: !!reasoningText
            };
            
            // Save the message to get an ID
            await saveMessages({ messages: [assistantMessage] });
            
            // Now save the reasoning chain linked to this message
            await saveReasoningChain({
              messageId: assistantMessage.id,
              reasoningSteps: reasoningText
            });
          } else {
            // Save final answer as a normal message without reasoning
            const assistantMessage: DatabaseMessage = {
              id: uuidv4(),
              role: 'assistant',
              content: completionText,
              chatId: chatIdString,
              createdAt: new Date().toISOString(),
              has_reasoning: false
            };
            
            await saveMessages({ messages: [assistantMessage] });
          }
        } catch (saveResponseError) {
          console.error('Error saving assistant response:', saveResponseError);
        }
      }
    });
    
    // Track estimated token usage without requiring a message ID
    try {
      await trackUsage({
        userId,
        chatId: typeof id === 'object' ? JSON.stringify(id) : id,
        tokensUsed: estimatedTokens,
        costUsd: (estimatedTokens / 1000) * TOKEN_COST_PER_1K
      });
      console.log(`Usage tracked for chat ID: ${id}`);
    } catch (trackError) {
      console.error('Error tracking usage:', trackError);
    }
    
    // Return response with proper reasoning streaming
    return result.toDataStreamResponse({
      sendReasoning: isReasoningModelEnabled
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { 
        error: 'An error occurred during chat completion',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('id');
    
    // Check if user is authenticated
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    if (!chatId) {
      return NextResponse.json(
        { error: 'Chat ID is required' },
        { status: 400 }
      );
    }
    
    // First verify the chat belongs to the user
    const { data: chat, error: chatError } = await supabase
      .from('Chat')
      .select('id')
      .eq('id', chatId)
      .eq('userId', userId)
      .single();
    
    if (chatError || !chat) {
      return NextResponse.json(
        { error: 'Chat not found or not authorized' },
        { status: 404 }
      );
    }
    
    // Delete usage records first
    const { error: usageError } = await supabase
      .from('usage')
      .delete()
      .eq('chat_id', chatId);
    
    if (usageError) {
      console.error('Error deleting usage records:', usageError);
    }
    
    // Delete votes next
    const { error: votesError } = await supabase
      .from('Vote')
      .delete()
      .eq('chatId', chatId);
    
    if (votesError) {
      console.error('Error deleting votes:', votesError);
    }
    
    // Delete messages
    const { error: messagesError } = await supabase
      .from('Message')
      .delete()
      .eq('chatId', chatId);
    
    if (messagesError) {
      throw messagesError;
    }
    
    // Finally delete the chat
    const { error: chatDeleteError } = await supabase
      .from('Chat')
      .delete()
      .eq('id', chatId)
      .eq('userId', userId);
    
    if (chatDeleteError) {
      throw chatDeleteError;
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting chat:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
