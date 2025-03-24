## Try ME!
if you interested for a demo, you can email, cheukyin175@gmail.com for a deployed link!

## Features

- [Next.js](https://nextjs.org) App Router
  - Advanced routing for seamless navigation and performance
  - React Server Components (RSCs) and Server Actions for server-side rendering and increased performance
- [AI SDK](https://sdk.vercel.ai/docs)
  - Unified API for generating text, structured objects, and tool calls with LLMs
  - Hooks for building dynamic chat and generative user interfaces
  - Supports OpenAI (default), Anthropic, Cohere, and other model providers
- [shadcn/ui](https://ui.shadcn.com)
  - Styling with [Tailwind CSS](https://tailwindcss.com)
  - Component primitives from [Radix UI](https://radix-ui.com) for accessibility and flexibility
- Data Persistence
  - Postgres database for saving chat history and user data
  - Blob storage for efficient file storage
  - Reasoning Chain support for AI model thought process visualization 
- [NextAuth.js](https://github.com/nextauthjs/next-auth)
  - Simple and secure authentication

## Reasoning Chain Feature

The application includes support for AI models that provide reasoning chains or "thinking" as part of their responses. This allows users to see the model's step-by-step thought process leading to the final answer.

### How It Works

1. When using a compatible AI model (those with reasoning capabilities like Claude or specialized models):
   - The system extracts the reasoning chain from the model's response
   - The reasoning is stored in a dedicated database table linked to the response message
   - Users can expand/collapse the reasoning chain in the UI to see the model's thought process

2. Database Schema:
   - `ReasoningChain` table stores individual reasoning steps linked to messages
   - Messages with reasoning chains are marked with a `has_reasoning` flag
   - Each reasoning step is stored with a step number for proper ordering

3. Supported Models:
   - Model compatibility is detected automatically based on keywords in the model name
   - Configurable through the `REASONING_MODEL_KEYWORDS` environment variable

## Model Providers

With [AI SDK](https://sdk.vercel.ai/docs), you can switch LLM providers 
