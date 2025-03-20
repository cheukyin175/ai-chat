import { Message } from '@/lib/message-types';
import { PreviewMessage, ThinkingMessage } from './message';
import { useScrollToBottom } from './use-scroll-to-bottom';
import { Overview } from './overview';
import { memo } from 'react';
import { Vote } from '@/lib/db/schema';
import equal from 'fast-deep-equal';
import { UseChatHelpers } from '@ai-sdk/react';

interface MessagesProps {
  chatId: string;
  status: UseChatHelpers['status'];
  votes: Array<Vote> | undefined;
  messages: Array<Message>;
  setMessages: UseChatHelpers['setMessages'];
  reload: UseChatHelpers['reload'];
  isReadonly: boolean;
  isArtifactVisible: boolean;
  chatModelId: string;
  scrollToBottom: React.RefObject<HTMLDivElement>;
  isLoading: boolean;
  streamingReasoning?: string | null;
  isReasoningStreaming?: boolean;
}

export function PureMessages({
  chatId,
  status,
  votes,
  messages,
  setMessages,
  reload,
  isReadonly,
  isArtifactVisible,
  chatModelId,
  scrollToBottom,
  isLoading,
  streamingReasoning,
  isReasoningStreaming,
}: MessagesProps) {
  const isMessageEmpty = messages.length === 0;
  const isSomethingBeingGenerated = isLoading || status === 'streaming';

  return (
    <div
      className={`flex-1 overflow-y-auto ${isMessageEmpty ? 'flex items-center justify-center' : 'space-y-2'}`}
      data-state={isMessageEmpty ? 'empty' : 'filled'}
      data-testid="chat-messages"
    >
      {messages.length === 0 && <Overview selectedModelId={chatModelId} />}
      <div ref={scrollToBottom} />
      {messages.map((message, index) => (
        <PreviewMessage
          key={message.id}
          chatId={chatId}
          message={message}
          isLoading={status === 'streaming' && messages.length - 1 === index}
          vote={
            votes
              ? votes.find((vote) => vote.messageId === message.id)
              : undefined
          }
          setMessages={setMessages}
          reload={reload}
          isReadonly={isReadonly}
          streamingReasoning={index === messages.length - 1 ? streamingReasoning : undefined}
          isReasoningStreaming={index === messages.length - 1 ? isReasoningStreaming : false}
        />
      ))}

      {status === 'submitted' &&
        messages.length > 0 &&
        messages[messages.length - 1].role === 'user' && <ThinkingMessage />}
    </div>
  );
}

export const Messages = memo(PureMessages, (prevProps, nextProps) => {
  if (prevProps.isArtifactVisible && nextProps.isArtifactVisible) return true;

  if (prevProps.status !== nextProps.status) return false;
  if (prevProps.status && nextProps.status) return false;
  if (prevProps.messages.length !== nextProps.messages.length) return false;
  if (!equal(prevProps.messages, nextProps.messages)) return false;
  if (!equal(prevProps.votes, nextProps.votes)) return false;
  if (prevProps.streamingReasoning !== nextProps.streamingReasoning) return false;
  if (prevProps.isReasoningStreaming !== nextProps.isReasoningStreaming) return false;

  return true;
});
