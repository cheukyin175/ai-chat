import { getOpenRouterModelsFromEnv } from './openrouter';

// Get OpenRouter models from environment variables
export const openRouterModels = getOpenRouterModelsFromEnv();

// Define the ChatModel interface
interface ChatModel {
  id: string;
  name: string;
  description: string;
  provider?: string;
}

// Dynamically generate chat models based on environment variables
export const chatModels: Array<ChatModel> = Object.entries(openRouterModels).map(([key, value]) => {
  const model = {
    id: `chat-model-${key.toLowerCase()}`,
    name: key,
    description: `${key} model (${value})`,
    provider: 'OpenRouter',
  };
  return model;
});

// Set default chat model to the first model in the list, or a fallback
export const DEFAULT_CHAT_MODEL: string = chatModels.length > 0 
  ? chatModels[0].id 
  : 'chat-model-default';

// Map of model IDs to their actual OpenRouter model identifiers
// This is dynamically generated from the environment variables
export const modelMapping: Record<string, string> = Object.fromEntries(
  chatModels.map(model => [model.id, openRouterModels[model.name]])
);

// Export a function to get the OpenRouter model ID from the UI model ID
export function getOpenRouterModelId(modelId: string): string {
  
  const openRouterModelId = modelMapping[modelId] || 
                           modelMapping[DEFAULT_CHAT_MODEL] || 
                           openRouterModels.Default || 
                           'openai/gpt-4o';
  return openRouterModelId;
}
