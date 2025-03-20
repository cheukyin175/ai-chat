// Extended type for the Message interface to include our custom fields
import { Message as AIMessage } from 'ai';

// Extend the AI SDK's Message type with our custom properties
export interface ExtendedMessage extends AIMessage {
  reasoning?: string;
  has_reasoning?: boolean;
  toolInvocations?: Array<any>;
}

// Use this type instead of importing Message directly from ai
export type Message = ExtendedMessage; 