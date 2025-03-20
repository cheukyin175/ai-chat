-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create User table if it doesn't exist
CREATE TABLE IF NOT EXISTS "User" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "email" TEXT UNIQUE NOT NULL,
  "password" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Chat table if it doesn't exist
CREATE TABLE IF NOT EXISTS "Chat" (
  "id" UUID PRIMARY KEY,
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "visibility" TEXT NOT NULL DEFAULT 'private',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Message table if it doesn't exist
CREATE TABLE IF NOT EXISTS "Message" (
  "id" UUID PRIMARY KEY,
  "chatId" UUID NOT NULL REFERENCES "Chat"("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add has_reasoning column to Message table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'Message' AND column_name = 'has_reasoning'
  ) THEN
    ALTER TABLE "Message"
    ADD COLUMN "has_reasoning" BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Create ReasoningChain table if it doesn't exist
CREATE TABLE IF NOT EXISTS "ReasoningChain" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "messageId" UUID NOT NULL REFERENCES "Message"("id") ON DELETE CASCADE,
  "step_number" INTEGER NOT NULL,
  "reasoning" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE("messageId", "step_number")
);

-- Create Vote table if it doesn't exist
CREATE TABLE IF NOT EXISTS "Vote" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "chatId" UUID NOT NULL REFERENCES "Chat"("id") ON DELETE CASCADE,
  "messageId" UUID NOT NULL REFERENCES "Message"("id") ON DELETE CASCADE,
  "isUpvoted" BOOLEAN NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE("chatId", "messageId")
);

-- Create Document table if it doesn't exist
CREATE TABLE IF NOT EXISTS "Document" (
  "id" UUID PRIMARY KEY,
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Suggestion table if it doesn't exist
CREATE TABLE IF NOT EXISTS "Suggestion" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "documentId" UUID NOT NULL REFERENCES "Document"("id") ON DELETE CASCADE,
  "documentCreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subscriptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "stripe_customer_id" TEXT,
  "stripe_subscription_id" TEXT,
  "price_id" TEXT NOT NULL DEFAULT 'price_free',
  "plan_type" TEXT NOT NULL DEFAULT 'free',
  "status" TEXT NOT NULL DEFAULT 'active',
  "current_period_start" TIMESTAMP WITH TIME ZONE,
  "current_period_end" TIMESTAMP WITH TIME ZONE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_balance table if it doesn't exist
CREATE TABLE IF NOT EXISTS "user_balance" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "balance_usd" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create usage table if it doesn't exist
CREATE TABLE IF NOT EXISTS "usage" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "chat_id" UUID REFERENCES "Chat"("id") ON DELETE CASCADE,
  "message_id" UUID REFERENCES "Message"("id") ON DELETE CASCADE,
  "tokens_used" INTEGER NOT NULL DEFAULT 0,
  "cost_usd" DECIMAL(10, 4) NOT NULL DEFAULT 0.0000,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create daily_usage table if it doesn't exist
CREATE TABLE IF NOT EXISTS "daily_usage" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "date" DATE NOT NULL DEFAULT CURRENT_DATE,
  "requests_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE("user_id", "date")
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_chat_userId" ON "Chat"("userId");
CREATE INDEX IF NOT EXISTS "idx_message_chatId" ON "Message"("chatId");
CREATE INDEX IF NOT EXISTS "idx_vote_chatId" ON "Vote"("chatId");
CREATE INDEX IF NOT EXISTS "idx_vote_messageId" ON "Vote"("messageId");
CREATE INDEX IF NOT EXISTS "idx_document_userId" ON "Document"("userId");
CREATE INDEX IF NOT EXISTS "idx_suggestion_documentId" ON "Suggestion"("documentId");
CREATE INDEX IF NOT EXISTS "idx_subscriptions_user_id" ON "subscriptions"("user_id");
CREATE INDEX IF NOT EXISTS "idx_subscriptions_status" ON "subscriptions"("status");
CREATE INDEX IF NOT EXISTS "idx_user_balance_user_id" ON "user_balance"("user_id");
CREATE INDEX IF NOT EXISTS "idx_usage_user_id" ON "usage"("user_id");
CREATE INDEX IF NOT EXISTS "idx_usage_chat_id" ON "usage"("chat_id");
CREATE INDEX IF NOT EXISTS "idx_daily_usage_user_id_date" ON "daily_usage"("user_id", "date");
CREATE INDEX IF NOT EXISTS "idx_reasoning_chain_messageId" ON "ReasoningChain"("messageId");

-- Create function for auto-updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Create function for initializing new user subscriptions
CREATE OR REPLACE FUNCTION initialize_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Create free subscription for new user
  INSERT INTO "subscriptions" (user_id, price_id, plan_type, status)
  VALUES (NEW.id, 'price_free', 'free', 'active');
  
  -- Create zero balance for new user
  INSERT INTO "user_balance" (user_id, balance_usd)
  VALUES (NEW.id, 0.00);
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop triggers if they exist (to avoid errors when creating them)
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON "subscriptions";
DROP TRIGGER IF EXISTS update_user_balance_updated_at ON "user_balance";
DROP TRIGGER IF EXISTS update_daily_usage_updated_at ON "daily_usage";
DROP TRIGGER IF EXISTS on_user_created ON "User";

-- Create triggers for updating updated_at columns
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON "subscriptions"
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_user_balance_updated_at
BEFORE UPDATE ON "user_balance"
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_daily_usage_updated_at
BEFORE UPDATE ON "daily_usage"
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Create trigger for initializing subscriptions for new users
CREATE TRIGGER on_user_created
AFTER INSERT ON "User"
FOR EACH ROW EXECUTE PROCEDURE initialize_user_subscription();

-- Add comments to tables
COMMENT ON TABLE "ReasoningChain" IS 'Stores reasoning chain steps for messages, linked to the Message table'; 