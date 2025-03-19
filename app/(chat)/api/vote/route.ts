import { auth } from '@/app/(auth)/auth';
import { getChatById, getVotesByChatId, voteMessage } from '@/lib/db/queries';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');

  if (!chatId) {
    return NextResponse.json(
      { error: 'Chat ID is required' },
      { status: 400 }
    );
  }

  const session = await auth();

  if (!session || !session.user || !session.user.email) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // Check if chat exists first
    try {
      const chat = await getChatById(chatId);
      
      if (!chat) {
        console.log(`Chat ${chatId} not found`);
        // Return empty array instead of 404 to avoid UI errors
        return NextResponse.json([], {
          status: 200,
          headers: {
            'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
          },
        });
      }

      if (chat.userId !== session.user.id) {
        return new Response('Unauthorized', { status: 401 });
      }
    } catch (chatError) {
      console.error('Error checking chat:', chatError);
      // Return empty array instead of 500 to avoid UI errors
      return NextResponse.json([], {
        status: 200,
        headers: {
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
        },
      });
    }

    // Get votes
    const votes = await getVotesByChatId(chatId);

    // Add cache headers to reduce unnecessary requests
    return NextResponse.json(votes, {
      status: 200,
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('Error fetching votes:', error);
    // Return empty array instead of 500 to avoid UI errors
    return NextResponse.json([], { 
      status: 200,
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
      },
    });
  }
}

export async function PATCH(request: Request) {
  const {
    chatId,
    messageId,
    type,
  }: { chatId: string; messageId: string; type: 'up' | 'down' } =
    await request.json();

  if (!chatId || !messageId || !type) {
    return new Response('messageId and type are required', { status: 400 });
  }

  const session = await auth();

  if (!session || !session.user || !session.user.email) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const chat = await getChatById(chatId);

    if (!chat) {
      return new Response('Chat not found', { status: 404 });
    }

    if (chat.userId !== session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    await voteMessage({
      chatId,
      messageId,
      type: type,
    });

    return new Response('Message voted', { status: 200 });
  } catch (error) {
    console.error('Error voting message:', error);
    return NextResponse.json({ error: 'Failed to vote message' }, { status: 500 });
  }
}
