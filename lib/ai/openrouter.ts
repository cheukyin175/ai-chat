/**
 * OpenRouter API integration utilities
 * 
 * This file contains utilities for working with the OpenRouter API,
 * including handling usage information returned in responses.
 */
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';

// OpenRouter response includes usage information
export interface OpenRouterUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface OpenRouterResponse {
  id: string;
  model: string;
  usage: OpenRouterUsage;
  created: number;
}

/**
 * Extracts usage information from an OpenRouter API response
 */
export function extractOpenRouterUsage(response: any): OpenRouterUsage | null {
  if (!response || !response.usage) {
    return null;
  }

  return {
    prompt_tokens: response.usage.prompt_tokens || 0,
    completion_tokens: response.usage.completion_tokens || 0,
    total_tokens: response.usage.total_tokens || 0,
  };
}

/**
 * Creates an OpenRouter client configured with the provided model ID
 * 
 * This function creates a client using the official OpenRouter provider for the AI SDK
 */
export function createOpenRouterClient(modelId: string) {
  // Check if OpenRouter API key is available
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('OPENROUTER_API_KEY is not set in environment variables');
    throw new Error('OPENROUTER_API_KEY is required for OpenRouter integration');
  }
  
  try {
    // Create OpenRouter provider instance
    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
      // Add additional configuration
      extraBody: {
        // You can add any OpenRouter-specific options here
        // For example, HTTP_REFERER and X-Title are handled automatically by the provider
      }
    });
    
    // Return the model instance for the specified model ID
    return openrouter(modelId);
  } catch (error: any) {
    console.error('Error creating OpenRouter client:', error);
    throw new Error(`Failed to create OpenRouter client: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Tracks usage from an OpenRouter response
 * 
 * This function can be used to log or store usage information
 * for billing or analytics purposes.
 */
export async function trackOpenRouterUsage(generationId: string) {
  try {
    // Fetch the generation details from OpenRouter
    const response = await fetch(`https://openrouter.ai/api/v1/generation?id=${generationId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY || ''}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch generation: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Extract usage information
    const usage = {
      model: data.data.model,
      tokens_prompt: data.data.tokens_prompt,
      tokens_completion: data.data.tokens_completion,
      total_cost: data.data.total_cost,
      generation_time: data.data.generation_time
    };
    
    // Log usage information
    console.log('OpenRouter usage:', usage);
    
    // Here you could store this information in your database
    // for billing or analytics purposes
    
    return usage;
  } catch (error) {
    console.error('Error tracking OpenRouter usage:', error);
    return null;
  }
}

/**
 * Gets the OpenRouter models from environment variables
 * 
 * Format: OPENROUTER_MODEL="model1,model2,model3"
 * Example: OPENROUTER_MODEL="google/gemini-2.0-flash-001,anthropic/claude-3-haiku"
 */
export function getOpenRouterModelsFromEnv(): Record<string, string> {
  const modelString = process.env.OPENROUTER_MODEL;
  
  if (!modelString) {
    console.warn('OPENROUTER_MODEL not set in environment variables, using defaults');
    return {
      // Default models if not specified in env
      Fast: 'Fastest model',
      Reasoning: 'Model with reasoning chain'
    };
  }
  
  try {
    // Parse comma-separated models
    const modelArray = modelString.split(',').map(m => m.trim());
    
    // Create a record of model types
    const models: Record<string, string> = {};
    
    // Assign models based on position or explicit key=value format
    modelArray.forEach((model, index) => {
      if (model.includes('=')) {
        // Handle key=value format (e.g., "Fast=google/gemini-2.0-flash-001")
        const [key, value] = model.split('=').map(part => part.trim());
        models[key] = value;
      } else {
        // Handle position-based assignment
        const key = index === 0 ? 'Fast' : 
                   index === 1 ? 'Reasoning' : 
                   `Model${index + 1}`;
        models[key] = model;
      }
    });
    
    // Ensure we have at least a Default model
    if (!models.Default && models.Fast) {
      models.Default = models.Fast;
    }
    
    return models;
  } catch (error) {
    console.error('Error parsing OPENROUTER_MODEL:', error);
    return {
      Fast: 'google/gemini-2.0-flash-001',
      Reasoning: 'anthropic/claude-3-opus',
      Default: 'openai/gpt-4o'
    };
  }
}

// Define a type for API errors
interface ApiError extends Error {
  response?: {
    status?: number;
    data?: any;
  };
}

/**
 * Direct function to generate completions with OpenRouter
 * 
 * This function uses the OpenRouter provider to generate completions
 */
export async function generateOpenRouterCompletion(modelId: string, messages: any[]) {
  // Create OpenRouter client
  const model = createOpenRouterClient(modelId);
    
  try {
    // Use the AI SDK's generateText function with the OpenRouter model
    const { text, usage } = await generateText({
      model,
      messages,
      temperature: 0.7,
      maxTokens: 1000,
    });
    
    return {
      choices: [
        {
          message: {
            role: 'assistant',
            content: text
          }
        }
      ],
      usage: usage || {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      }
    };
  } catch (error: unknown) {
    console.error('OpenRouter API error:', error);
    
    const apiError = error as ApiError;
    console.error('Error details:', apiError.message || 'Unknown error');
    
    if (apiError.response) {
      console.error('Response status:', apiError.response.status);
      console.error('Response data:', apiError.response.data);
    }
    
    throw error;
  }
} 