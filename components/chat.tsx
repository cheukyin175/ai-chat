'use client';

import type { Attachment } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useState, useEffect, useRef } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { ChatHeader } from '@/components/chat-header';
import type { Vote } from '@/lib/db/schema';
import { fetcher, generateUUID, sanitizeUIMessages } from '@/lib/utils';
import { Artifact } from './artifact';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import { VisibilityType } from './visibility-selector';
import { useArtifactSelector } from '@/hooks/use-artifact';
import { toast } from 'sonner';
import { usePathname, useRouter } from 'next/navigation';
import { Message } from '@/lib/message-types';

// Define interface for our message accumulator
interface MessageAccumulator {
  messages: Array<Message>;
}

export function Chat({
  id,
  initialMessages,
  selectedChatModel,
  selectedVisibilityType,
  isReadonly,
}: {
  id: string;
  initialMessages: Array<Message>;
  selectedChatModel: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  const { mutate: globalMutate } = useSWRConfig();
  const pathname = usePathname();
  const router = useRouter();
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isFirstMessage, setIsFirstMessage] = useState(initialMessages.length === 0);
  const [hasRefreshedHistory, setHasRefreshedHistory] = useState(false);

  // Simply pass the messages through with no special handling
  const processedInitialMessages = { messages: initialMessages };

  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    status,
    stop,
    reload,
  } = useChat({
    id,
    body: { id, selectedChatModel: selectedChatModel },
    initialMessages: processedInitialMessages.messages,
    experimental_throttle: 100,
    sendExtraMessageFields: true,
    api: '/api/chat',
    onResponse: (response) => {
      // This is called when the API response is received
      if (!response.ok) {
        toast.error('Failed to send message. Please try again.');
      }
    },
    onFinish: (message) => {
      // This is called when the response is complete
      if (!hasInteracted) {
        setHasInteracted(true);
      }
      
      // If this was the first message in a new chat, refresh the history
      if (isFirstMessage && !hasRefreshedHistory) {
        console.log('First message sent, refreshing chat history');
        // Refresh the history data in the sidebar
        globalMutate('/api/history');
        setIsFirstMessage(false);
        setHasRefreshedHistory(true);
      }
    },
  });

  // Add state to track streaming reasoning
  const [streamingReasoning, setStreamingReasoning] = useState<string | null>(null);
  const [isReasoningStreaming, setIsReasoningStreaming] = useState(false);

  // Enhanced streaming reasoning handler
  useEffect(() => {
    // Check for reasoning in the streaming message
    if (status === 'streaming' && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      // Always set streaming state when streaming starts, to trigger expansion
      if (lastMessage.role === 'assistant') {
        setIsReasoningStreaming(true);
      }
      
      // If we have a reasoning part in the streaming
      if (lastMessage.role === 'assistant' && lastMessage.content && 
          typeof lastMessage.content === 'object') {
        
        let textContent = '';
        let reasoningContent = '';
        
        // Check if this is reasoning/thinking content
        if ('reasoning' in lastMessage.content) {
          // @ts-ignore - Reasoning is added by the AI SDK middleware
          reasoningContent = lastMessage.content.reasoning || '';
          
          // Set streaming reasoning state - ensure it's visible immediately
          setStreamingReasoning(reasoningContent);
        }
        
        // Check for text content
        if ('text' in lastMessage.content) {
          // @ts-ignore - Text part is added by the AI SDK middleware 
          textContent = lastMessage.content.text || '';
        }
        
        // Create a new message array with the reasoning properly attached
        const updatedMessages = [...messages];
        const lastIndex = updatedMessages.length - 1;
        
        // Update the message with reasoning property and text content
        updatedMessages[lastIndex] = {
          ...lastMessage,
          content: textContent,
          reasoning: reasoningContent,
        };
        
        // Use proper sanitizing function to ensure message type compatibility
        setMessages(sanitizeUIMessages(updatedMessages));
      }
    } else if (status !== 'streaming') {
      // Reset streaming state when not streaming
      setStreamingReasoning(null);
      setIsReasoningStreaming(false);
    }
  }, [messages, status, setMessages]);

  // Refresh history on component mount (page reload)
  useEffect(() => {
    // Only refresh if this is an existing chat (has an ID that's not newly generated)
    // and has messages (to avoid refreshing for brand new chats)
    if (id && initialMessages.length > 0) {
      console.log('Component mounted with existing chat, refreshing history');
      globalMutate('/api/history');
    }
  }, [id, initialMessages.length, globalMutate]);

  // Monitor messages to detect when a new chat gets its first response
  useEffect(() => {
    // If we have exactly 2 messages (user + AI) and this is a new chat that hasn't refreshed history
    if (messages.length === 2 && isFirstMessage && !hasRefreshedHistory) {
      const userMessage = messages.find(m => m.role === 'user');
      const assistantMessage = messages.find(m => m.role === 'assistant');
      
      // If we have both a user message and an assistant message, refresh history
      if (userMessage && assistantMessage && assistantMessage.content) {
        console.log('First AI response received, refreshing chat history');
        globalMutate('/api/history');
        setIsFirstMessage(false);
        setHasRefreshedHistory(true);
      }
    }
  }, [messages, isFirstMessage, hasRefreshedHistory, globalMutate]);

  // Track when user interacts with the chat
  const onUserInteraction = () => {
    setHasInteracted(true);
  };

  // Only fetch votes when needed and with caching
  const { data: votes } = useSWR<Array<Vote>>(
    id ? `/api/vote?chatId=${id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      dedupingInterval: 30000, // Only refetch at most once per 30 seconds
    }
  );

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);
  const scrollBottomRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <div className="sticky top-0 flex flex-col min-w-0 h-dvh bg-background">
        <ChatHeader
          chatId={id}
          selectedModelId={selectedChatModel}
          selectedVisibilityType={selectedVisibilityType}
          isReadonly={isReadonly}
        />

        <div className="flex-1 flex flex-col">
          <Messages
            chatId={id}
            status={status}
            votes={votes}
            messages={messages}
            setMessages={setMessages}
            reload={reload}
            isReadonly={isReadonly}
            isArtifactVisible={isArtifactVisible}
            chatModelId={selectedChatModel}
            scrollToBottom={scrollBottomRef}
            isLoading={status === 'submitted'}
            streamingReasoning={streamingReasoning}
            isReasoningStreaming={isReasoningStreaming}
          />
        </div>

        <form 
          className="sticky flex mx-auto px-4 bg-background pb-4 md:pb-6 pt-4 gap-2 w-full md:max-w-3xl mt-5 " 
          onSubmit={(e) => {
            onUserInteraction();
            handleSubmit(e);
          }}
        >
          {!isReadonly && (
            <MultimodalInput
              chatId={id}
              input={input}
              setInput={setInput}
              handleSubmit={(e) => {
                onUserInteraction();
                handleSubmit(e);
              }}
              status={status}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={messages}
              setMessages={setMessages}
              append={append}
            />
          )}
        </form>
      </div>

      {isArtifactVisible && (
        <Artifact
          chatId={id}
          input={input}
          setInput={setInput}
          handleSubmit={handleSubmit}
          status={status}
          stop={stop}
          attachments={attachments}
          setAttachments={setAttachments}
          append={append}
          messages={messages}
          setMessages={setMessages}
          reload={reload}
          votes={votes}
          isReadonly={isReadonly}
        />
      )}
    </>
  );
}
