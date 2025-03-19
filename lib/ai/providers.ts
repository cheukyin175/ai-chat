import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { openai } from '@ai-sdk/openai';
import { isTestEnvironment } from '../constants';
import { openRouterModels } from './models';
import { createOpenRouterClient } from './openrouter';

// Add error handling for OpenRouter API calls with fallback to OpenAI
const withFallback = (model: any, fallbackModelId: string) => {
  return {
    ...model,
    invoke: async (...args: any[]) => {
      try {
        return await model.invoke(...args);
      } catch (error) {
        console.error('OpenRouter API error:', error);
        console.log('Falling back to OpenAI API...');
        
        // Check if OpenAI API key is available
        if (!process.env.OPENAI_API_KEY) {
          console.error('No OpenAI API key available for fallback');
          throw new Error(`OpenRouter API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        try {
          // Create fallback client using OpenAI directly
          const fallbackClient = openai(fallbackModelId as any);
          // Use any to bypass TypeScript checking
          return await (fallbackClient as any).invoke(...args);
        } catch (fallbackError) {
          console.error('Fallback to OpenAI also failed:', fallbackError);
          throw new Error(`Both OpenRouter and OpenAI fallback failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
  };
};

export const myProvider = customProvider({
  languageModels: {
    // Production models using OpenRouter with fallback
    'chat-model-small': withFallback(
      createOpenRouterClient(openRouterModels.Fast),
      'gpt-3.5-turbo'
    ),
    'chat-model-reasoning': wrapLanguageModel({
      model: withFallback(
        createOpenRouterClient(openRouterModels.Reasoning),
        'gpt-4-turbo'
      ),
      middleware: extractReasoningMiddleware({ tagName: 'think' }),
    }),
    'title-model': withFallback(
      createOpenRouterClient(openRouterModels.Default || openRouterModels.Fast),
      'gpt-3.5-turbo'
    ),
    'artifact-model': withFallback(
      createOpenRouterClient(openRouterModels.Default || openRouterModels.Fast),
      'gpt-3.5-turbo'
    ),
  },
  imageModels: {
    // Image models still use OpenAI directly
    'small-model': openai.image('dall-e-2'),
    'large-model': openai.image('dall-e-3'),
  },
});

// OpenRouter Integration Notes:
// 1. To use OpenRouter, add OPENROUTER_API_KEY to your .env.local file
// 2. To customize models, add OPENROUTER_MODEL to your .env.local file
//    Format: OPENROUTER_MODEL="Fast=model1,Reasoning=model2,Default=model3"
//    Example: OPENROUTER_MODEL="Fast=google/gemini-2.0-flash-001,Reasoning=anthropic/claude-3-opus"
// 3. OpenRouter endpoint: https://openrouter.ai/api/v1
// 4. OpenRouter returns usage information in the response
