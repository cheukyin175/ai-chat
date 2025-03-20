import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

import { auth } from '@/app/(auth)/auth';
import { Chat } from '@/components/chat';
import { getChatById, getMessagesWithReasoningByChatId } from '@/lib/db/queries';
import { convertToUIMessages } from '@/lib/utils';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  
  try {
    console.log(`Loading chat page with ID: ${id}`);
    const chat = await getChatById(id);

    if (!chat) {
      console.error(`Chat not found with ID: ${id}`);
      return notFound();
    }

    console.log(`Found chat: ${JSON.stringify({
      id: chat.id,
      title: chat.title,
      visibility: chat.visibility,
      userId: chat.userId,
    })}`);

    const session = await auth();
    console.log(`User session:`, session ? `Authenticated as ${session.user?.id}` : 'Not authenticated');

    if (chat.visibility === 'private') {
      if (!session || !session.user) {
        console.error(`Unauthorized access to private chat: ${id} - No session`);
        return notFound();
      }

      if (session.user.id !== chat.userId) {
        console.error(`Unauthorized access to private chat: ${id} - User ID mismatch`);
        return notFound();
      }
    }

    console.log(`Loading messages for chat: ${id}`);
    const messagesFromDb = await getMessagesWithReasoningByChatId(id);
    console.log(`Found ${messagesFromDb.length} messages for chat: ${id}`);

    // Convert messages to the format expected by the Chat component
    const convertedMessages = messagesFromDb.map(message => ({
      ...message,
      createdAt: new Date(message.createdAt)
    }));

    const cookieStore = await cookies();
    const chatModelFromCookie = cookieStore.get('chat-model');
    const modelValue = chatModelFromCookie?.value || DEFAULT_CHAT_MODEL;
    console.log(`Using chat model: ${modelValue} for chat: ${id}`);

    return (
      <>
        <Chat
          id={chat.id}
          initialMessages={convertToUIMessages(convertedMessages)}
          selectedChatModel={modelValue}
          selectedVisibilityType={chat.visibility}
          isReadonly={session?.user?.id !== chat.userId}
        />
        <DataStreamHandler id={id} />
      </>
    );
  } catch (error) {
    console.error(`Error loading chat ${id}:`, error);
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold mb-4">Error Loading Chat</h1>
        <p className="text-gray-600 mb-4">There was a problem loading this chat. It may have been deleted or you may not have permission to view it.</p>
        <a href="/" className="text-blue-500 hover:underline">Return to Home</a>
      </div>
    );
  }
}
