-- Create tables for the chatbot application

-- User table
CREATE TABLE IF NOT EXISTS "User" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" VARCHAR(64) NOT NULL,
  "password" VARCHAR(64)
);

-- Chat table
CREATE TABLE IF NOT EXISTS "Chat" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" TIMESTAMP NOT NULL,
  "title" TEXT NOT NULL,
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "visibility" VARCHAR DEFAULT 'private' CHECK ("visibility" IN ('public', 'private'))
);

-- Message table
CREATE TABLE IF NOT EXISTS "Message" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "chatId" UUID NOT NULL REFERENCES "Chat"("id") ON DELETE CASCADE,
  "role" VARCHAR NOT NULL,
  "content" JSONB NOT NULL,
  "createdAt" TIMESTAMP NOT NULL
);

-- Vote table
CREATE TABLE IF NOT EXISTS "Vote" (
  "chatId" UUID NOT NULL REFERENCES "Chat"("id") ON DELETE CASCADE,
  "messageId" UUID NOT NULL REFERENCES "Message"("id") ON DELETE CASCADE,
  "isUpvoted" BOOLEAN NOT NULL,
  PRIMARY KEY ("chatId", "messageId")
);

-- Document table
CREATE TABLE IF NOT EXISTS "Document" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "createdAt" TIMESTAMP NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT,
  "kind" VARCHAR DEFAULT 'text' CHECK ("kind" IN ('text', 'code', 'image', 'sheet')),
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  PRIMARY KEY ("id", "createdAt")
);

-- Suggestion table
CREATE TABLE IF NOT EXISTS "Suggestion" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "documentId" UUID NOT NULL,
  "documentCreatedAt" TIMESTAMP NOT NULL,
  "originalText" TEXT NOT NULL,
  "suggestedText" TEXT NOT NULL,
  "description" TEXT,
  "isResolved" BOOLEAN NOT NULL DEFAULT false,
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP NOT NULL,
  FOREIGN KEY ("documentId", "documentCreatedAt") REFERENCES "Document"("id", "createdAt") ON DELETE CASCADE
);

-- Create subscription-related tables
CREATE TABLE IF NOT EXISTS "products" (
  "id" TEXT PRIMARY KEY,
  "active" BOOLEAN DEFAULT TRUE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "metadata" JSONB
);

CREATE TABLE IF NOT EXISTS "prices" (
  "id" TEXT PRIMARY KEY,
  "product_id" TEXT NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "active" BOOLEAN DEFAULT TRUE,
  "description" TEXT,
  "unit_amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "interval" TEXT,
  "interval_count" INTEGER,
  "trial_period_days" INTEGER
);

CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "status" TEXT NOT NULL,
  "price_id" TEXT NOT NULL REFERENCES "prices"("id"),
  "quantity" INTEGER DEFAULT 1,
  "cancel_at_period_end" BOOLEAN DEFAULT FALSE,
  "created" TIMESTAMP NOT NULL DEFAULT NOW(),
  "current_period_start" TIMESTAMP NOT NULL,
  "current_period_end" TIMESTAMP NOT NULL,
  "ended_at" TIMESTAMP,
  "cancel_at" TIMESTAMP,
  "canceled_at" TIMESTAMP,
  "trial_start" TIMESTAMP,
  "trial_end" TIMESTAMP,
  "stripe_customer_id" TEXT NOT NULL,
  "stripe_subscription_id" TEXT NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "chat_user_id_idx" ON "Chat" ("userId");
CREATE INDEX IF NOT EXISTS "message_chat_id_idx" ON "Message" ("chatId");
CREATE INDEX IF NOT EXISTS "document_user_id_idx" ON "Document" ("userId");
CREATE INDEX IF NOT EXISTS "suggestion_document_id_idx" ON "Suggestion" ("documentId");
CREATE INDEX IF NOT EXISTS "subscription_user_id_idx" ON "subscriptions" ("user_id");
CREATE INDEX IF NOT EXISTS "subscription_status_idx" ON "subscriptions" ("status");

-- Create RLS policies for security
-- Note: You'll need to enable RLS on these tables in the Supabase dashboard
-- and configure appropriate policies based on your authentication requirements 