import type {
  CoreAssistantMessage,
  CoreToolMessage,
  Message,
  TextStreamPart,
  ToolInvocation,
  ToolSet,
} from 'ai';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { customAlphabet } from 'nanoid';
import { v4 as uuidv4 } from 'uuid';

import type { Message as DBMessage, Document } from '@/lib/db/schema';
import { Message as ExtendedMessage } from './message-types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ApplicationError extends Error {
  info: string;
  status: number;
}

export const fetcher = async (url: string) => {
  const res = await fetch(url);

  if (!res.ok) {
    const error = new Error(
      'An error occurred while fetching the data.',
    ) as ApplicationError;

    error.info = await res.json();
    error.status = res.status;

    throw error;
  }

  return res.json();
};

export function getLocalStorage(key: string) {
  if (typeof window !== 'undefined') {
    return JSON.parse(localStorage.getItem(key) || '[]');
  }
  return [];
}

// Keep nanoid for non-database IDs (like temporary IDs)
export const nanoid = customAlphabet(
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  7
);

// Generate proper UUIDs for database entities
export function generateUUID() {
  return uuidv4();
}

function addToolMessageToChat({
  toolMessage,
  messages,
}: {
  toolMessage: CoreToolMessage;
  messages: Array<ExtendedMessage>;
}): Array<ExtendedMessage> {
  return messages.map((message) => {
    if (message.toolInvocations) {
      return {
        ...message,
        toolInvocations: message.toolInvocations.map((toolInvocation) => {
          const toolResult = toolMessage.content.find(
            (tool) => tool.toolCallId === toolInvocation.toolCallId,
          );

          if (toolResult) {
            return {
              ...toolInvocation,
              state: 'result',
              result: toolResult.result,
            };
          }

          return toolInvocation;
        }),
      };
    }

    return message;
  });
}

// Define types for message content parts
interface TextContent {
  type: 'text';
  text: string;
}

interface ToolCallContent {
  type: 'tool-call';
  toolCallId: string;
  toolName: string;
  args: any;
}

interface ReasoningContent {
  type: 'reasoning';
  reasoning: string;
}

type MessageContentPart = TextContent | ToolCallContent | ReasoningContent;

export function convertToUIMessages(
  messages: Array<DBMessage>,
): Array<ExtendedMessage> {
  return messages.reduce((chatMessages: Array<ExtendedMessage>, message) => {
    // Handle tools messages separately
    if (message.role === 'tool') {
      // Safe cast with type checking
      if (typeof message.content !== 'string' && Array.isArray(message.content)) {
        return addToolMessageToChat({
          toolMessage: message as unknown as CoreToolMessage,
          messages: chatMessages,
        });
      }
      // Fall back to normal message handling if content is not in expected format
    }

    let textContent = '';
    let reasoning: string | undefined = undefined;
    const toolInvocations: Array<ToolInvocation> = [];

    if (typeof message.content === 'string') {
      textContent = message.content;
    } else if (Array.isArray(message.content)) {
      // Handle array content by iterating and checking types
      const contentParts = message.content as unknown as MessageContentPart[];
      for (const content of contentParts) {
        if (content && typeof content === 'object') {
          if (content.type === 'text') {
            textContent += content.text;
          } else if (content.type === 'tool-call') {
            toolInvocations.push({
              state: 'call',
              toolCallId: content.toolCallId,
              toolName: content.toolName,
              args: content.args,
            });
          } else if (content.type === 'reasoning') {
            reasoning = content.reasoning;
          }
        }
      }
    }
    
    // Check for the different ways reasoning might be stored
    
    // 1. If the message has a reasoning property directly, use it
    if (message && typeof message === 'object' && 'reasoning' in message && message.reasoning) {
      reasoning = message.reasoning as string;
    }
    
    // 2. Check for has_reasoning flag from the database
    const hasReasoningFlag = message && 
      typeof message === 'object' && 
      'has_reasoning' in message && 
      !!message.has_reasoning;

    chatMessages.push({
      id: message.id,
      role: message.role as ExtendedMessage['role'],
      content: textContent,
      reasoning,
      has_reasoning: hasReasoningFlag,
      toolInvocations,
      createdAt: new Date(message.createdAt),
    });

    return chatMessages;
  }, []);
}

type ResponseMessageWithoutId = CoreToolMessage | CoreAssistantMessage;
type ResponseMessage = ResponseMessageWithoutId & { id: string };

export function sanitizeResponseMessages({
  messages,
  reasoning,
}: {
  messages: Array<ResponseMessage>;
  reasoning: string | undefined;
}) {
  const toolResultIds: Array<string> = [];

  for (const message of messages) {
    if (message.role === 'tool') {
      for (const content of message.content) {
        if (content.type === 'tool-result') {
          toolResultIds.push(content.toolCallId);
        }
      }
    }
  }

  const messagesBySanitizedContent = messages.map((message) => {
    if (message.role !== 'assistant') return message;

    if (typeof message.content === 'string') return message;

    const sanitizedContent = message.content.filter((content) =>
      content.type === 'tool-call'
        ? toolResultIds.includes(content.toolCallId)
        : content.type === 'text'
          ? content.text.length > 0
          : true,
    );

    if (reasoning) {
      // @ts-expect-error: reasoning message parts in sdk is wip
      sanitizedContent.push({ type: 'reasoning', reasoning });
    }

    return {
      ...message,
      content: sanitizedContent,
    };
  });

  return messagesBySanitizedContent.filter(
    (message) => message.content.length > 0,
  );
}

export function sanitizeUIMessages(messages: Array<ExtendedMessage>): Array<ExtendedMessage> {
  const messagesBySanitizedToolInvocations = messages.map((message) => {
    if (message.role !== 'assistant') return message;

    if (!message.toolInvocations) return message;

    const toolResultIds: Array<string> = [];

    for (const toolInvocation of message.toolInvocations) {
      if (toolInvocation.state === 'result') {
        toolResultIds.push(toolInvocation.toolCallId);
      }
    }

    const sanitizedToolInvocations = message.toolInvocations.filter(
      (toolInvocation) =>
        toolInvocation.state === 'result' ||
        toolResultIds.includes(toolInvocation.toolCallId),
    );

    return {
      ...message,
      toolInvocations: sanitizedToolInvocations,
    };
  });

  return messagesBySanitizedToolInvocations.filter(
    (message) =>
      message.content.length > 0 ||
      (message.toolInvocations && message.toolInvocations.length > 0),
  );
}

export function getMostRecentUserMessage(messages: Array<ExtendedMessage>) {
  return messages.length > 0 ? messages[messages.length - 1] : null;
}

export function getDocumentTimestampByIndex(
  documents: Array<Document>,
  index: number,
) {
  if (!documents) return new Date();
  if (index > documents.length) return new Date();

  return documents[index].createdAt;
}

/**
 * Estimates the number of tokens in a string.
 * This is a very rough estimate based on the assumption that 1 token ≈ 4 characters.
 * For more accurate token counting, you would need a proper tokenizer.
 * 
 * @param text The text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number {
  // A very rough estimate: ~4 characters per token for English text
  return Math.ceil(text.length / 4);
}
