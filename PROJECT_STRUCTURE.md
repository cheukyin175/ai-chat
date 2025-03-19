# Project Structure

This document provides an overview of the project structure for the Next.js AI Chatbot application with subscription capabilities.

## Root Directory

- `.next/` - Next.js build output
- `app/` - Next.js App Router components and routes
- `components/` - Reusable React components
- `hooks/` - Custom React hooks
- `lib/` - Utility functions and libraries
- `public/` - Static assets
- `supabase/` - Supabase configuration and migrations
- `tests/` - Test files
- `docs/` - Documentation files
- `artifacts/` - Generated artifacts

## App Directory (Next.js App Router)

- `app/globals.css` - Global CSS styles
- `app/layout.tsx` - Root layout component
- `app/favicon.ico` - Site favicon
- `app/(chat)/` - Chat application routes
  - `page.tsx` - Main chat page
  - `layout.tsx` - Chat layout
  - `actions.ts` - Server actions for chat
  - `chat/` - Chat-specific routes
  - `api/` - Chat-specific API routes
    - `chat/route.ts` - Chat message processing API
    - `document/route.ts` - Document creation and management API
    - `files/route.ts` - File upload and processing API
    - `history/route.ts` - Chat history retrieval API
    - `suggestions/route.ts` - AI suggestions generation API
    - `vote/route.ts` - Message voting and feedback API
- `app/(auth)/` - Authentication routes
  - `login/` - Login page
  - `register/` - Registration page
  - `auth.ts` - Authentication configuration
- `app/api/` - Global API routes
  - `subscription/route.ts` - Subscription management and Stripe checkout API
  - `webhook/route.ts` - Stripe webhook handler for subscription events
  - `create-checkout-session/route.ts` - Legacy checkout session creation API
- `app/settings/` - User settings routes

## Components Directory

- `components/ui/` - UI components (Shadcn UI)
  - `button.tsx` - Button component
  - `card.tsx` - Card component
  - `dialog.tsx` - Dialog component
  - `dropdown-menu.tsx` - Dropdown menu component
  - `input.tsx` - Input component
  - `toast.tsx` - Toast notification component
  - `toaster.tsx` - Toast container component
  - `use-toast.ts` - Toast hook
- `components/chat.tsx` - Main chat component
- `components/chat-header.tsx` - Chat header component
- `components/message.tsx` - Message component
- `components/messages.tsx` - Messages container component
- `components/sidebar-history.tsx` - Chat history sidebar
- `components/sidebar-toggle.tsx` - Sidebar toggle component
- `components/sidebar-user-nav.tsx` - User navigation in sidebar
- `components/app-sidebar.tsx` - Main application sidebar
- `components/model-selector.tsx` - AI model selector
- `components/visibility-selector.tsx` - Chat visibility selector
- `components/multimodal-input.tsx` - Input for text and file uploads
- `components/markdown.tsx` - Markdown rendering component
- `components/code-block.tsx` - Code block component
- `components/code-editor.tsx` - Code editor component
- `components/text-editor.tsx` - Text editor component
- `components/sheet-editor.tsx` - Spreadsheet editor component
- `components/image-editor.tsx` - Image editor component
- `components/document.tsx` - Document component
- `components/document-preview.tsx` - Document preview component
- `components/artifact.tsx` - Artifact component
- `components/artifact-actions.tsx` - Artifact action buttons
- `components/artifact-messages.tsx` - Messages for artifacts
- `components/create-artifact.tsx` - Create artifact component
- `components/pricing.tsx` - Pricing component for subscription plans
- `components/subscription-guard.tsx` - Subscription access control
- `components/auth-form.tsx` - Authentication form
- `components/sign-out-form.tsx` - Sign out form
- `components/theme-provider.tsx` - Theme provider component
- `components/icons.tsx` - Icon components

## Hooks Directory

- `hooks/use-chat.ts` - Chat functionality hook
- `hooks/use-subscription.ts` - Subscription management hook
- `hooks/use-document.ts` - Document management hook
- `hooks/use-visibility.ts` - Chat visibility hook
- `hooks/use-model.ts` - AI model selection hook
- `hooks/use-local-storage.ts` - Local storage hook

## Lib Directory

- `lib/ai/` - AI-related utilities
  - `providers/` - AI provider implementations
  - `prompts/` - System prompts for AI models
  - `tools/` - AI function calling tools
- `lib/db/` - Database utilities and schema
  - `schema.ts` - Database schema definitions
  - `schema.sql` - SQL schema for Supabase
  - `queries.ts` - Database query functions
    - `getUserSubscription()` - Retrieves user subscription data
    - `createOrUpdateSubscription()` - Manages subscription records
    - `getUserBalance()` - Retrieves user balance information
    - `createOrUpdateUserBalance()` - Manages user balance records
    - `trackUsage()` - Records usage and costs
    - `incrementDailyUsage()` - Updates daily usage counters
    - `getDailyUsage()` - Retrieves daily usage statistics
    - `initializeUserSubscription()` - Sets up new user subscriptions
- `lib/utils.ts` - General utility functions
  - `estimateTokens()` - Calculates token usage for cost estimation
- `lib/supabase.ts` - Server-side Supabase client
- `lib/supabase-browser.ts` - Client-side Supabase client
- `lib/database.types.ts` - TypeScript types for database schema
- `lib/constants.ts` - Application constants

## Configuration Files

- `.env.local` - Environment variables
  - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
  - `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
  - `OPENAI_API_KEY` - OpenAI API key
  - `STRIPE_SECRET_KEY` - Stripe secret key
  - `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
  - `STRIPE_PREMIUM_PRICE_ID` - Stripe price ID for premium plan
  - `NEXT_PUBLIC_APP_URL` - Application URL for redirects
- `.env.example` - Example environment variables
- `package.json` - Project dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `next.config.ts` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `postcss.config.mjs` - PostCSS configuration
- `middleware.ts` - Next.js middleware for authentication and usage limits
- `components.json` - Shadcn UI components configuration

## Subscription System

The application includes a subscription system with the following components:

- Free tier: Limited to 10 chat requests per day
- Premium tier: Priced at HK$50 with a $5 USD balance for AI usage
- Usage tracking: Monitors and limits usage based on subscription tier
- Stripe integration: Handles payment processing and subscription management

### Database Tables

- `subscriptions` - Stores user subscription data
  - `id` - Unique identifier
  - `user_id` - User reference
  - `stripe_customer_id` - Stripe customer ID
  - `stripe_subscription_id` - Stripe subscription ID
  - `plan_type` - 'free' or 'premium'
  - `status` - Subscription status
  - `current_period_start` - Start of billing period
  - `current_period_end` - End of billing period

- `user_balance` - Tracks user's available balance
  - `id` - Unique identifier
  - `user_id` - User reference
  - `balance_usd` - Available balance in USD

- `usage` - Records individual usage events
  - `id` - Unique identifier
  - `user_id` - User reference
  - `chat_id` - Chat reference
  - `message_id` - Message reference
  - `tokens_used` - Number of tokens consumed
  - `cost_usd` - Cost in USD

- `daily_usage` - Tracks daily usage limits
  - `id` - Unique identifier
  - `user_id` - User reference
  - `date` - Usage date
  - `requests_count` - Number of requests made

## Documentation

- `docs/01-quick-start.md` - Quick start guide
- `docs/02-update-models.md` - Guide for updating AI models
- `docs/03-artifacts.md` - Documentation for artifacts feature

## Local Development

To start the development server:

```bash
pnpm install
pnpm dev
```

The application will be available at http://localhost:3000.
