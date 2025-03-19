-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS "daily_usage";
DROP TABLE IF EXISTS "usage";
DROP TABLE IF EXISTS "user_balance";
DROP TABLE IF EXISTS "subscriptions";
DROP TABLE IF EXISTS "Suggestion";
DROP TABLE IF EXISTS "Document";
DROP TABLE IF EXISTS "Vote";
DROP TABLE IF EXISTS "Message";
DROP TABLE IF EXISTS "Chat";
DROP TABLE IF EXISTS "User";

-- Create User table
CREATE TABLE "User" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "email" TEXT UNIQUE NOT NULL,
  "password" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Chat table
CREATE TABLE "Chat" (
  "id" UUID PRIMARY KEY,
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "visibility" TEXT NOT NULL DEFAULT 'private',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Message table
CREATE TABLE "Message" (
  "id" UUID PRIMARY KEY,
  "chatId" UUID NOT NULL REFERENCES "Chat"("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Vote table
CREATE TABLE "Vote" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "chatId" UUID NOT NULL REFERENCES "Chat"("id") ON DELETE CASCADE,
  "messageId" UUID NOT NULL REFERENCES "Message"("id") ON DELETE CASCADE,
  "isUpvoted" BOOLEAN NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE("chatId", "messageId")
);

-- Create Document table
CREATE TABLE "Document" (
  "id" UUID PRIMARY KEY,
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Suggestion table
CREATE TABLE "Suggestion" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "documentId" UUID NOT NULL REFERENCES "Document"("id") ON DELETE CASCADE,
  "documentCreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE "subscriptions" (
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

-- User balance table
CREATE TABLE "user_balance" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "balance_usd" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage tracking table
CREATE TABLE "usage" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "chat_id" UUID REFERENCES "Chat"("id") ON DELETE CASCADE,
  "message_id" UUID REFERENCES "Message"("id") ON DELETE CASCADE,
  "tokens_used" INTEGER NOT NULL DEFAULT 0,
  "cost_usd" DECIMAL(10, 4) NOT NULL DEFAULT 0.0000,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily usage limits table
CREATE TABLE "daily_usage" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "date" DATE NOT NULL DEFAULT CURRENT_DATE,
  "requests_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE("user_id", "date")
);

-- Create indexes for better performance
CREATE INDEX "idx_chat_userId" ON "Chat"("userId");
CREATE INDEX "idx_message_chatId" ON "Message"("chatId");
CREATE INDEX "idx_vote_chatId" ON "Vote"("chatId");
CREATE INDEX "idx_vote_messageId" ON "Vote"("messageId");
CREATE INDEX "idx_document_userId" ON "Document"("userId");
CREATE INDEX "idx_suggestion_documentId" ON "Suggestion"("documentId");
CREATE INDEX "idx_subscriptions_user_id" ON "subscriptions"("user_id");
CREATE INDEX "idx_subscriptions_status" ON "subscriptions"("status");
CREATE INDEX "idx_user_balance_user_id" ON "user_balance"("user_id");
CREATE INDEX "idx_usage_user_id" ON "usage"("user_id");
CREATE INDEX "idx_usage_chat_id" ON "usage"("chat_id");
CREATE INDEX "idx_daily_usage_user_id_date" ON "daily_usage"("user_id", "date");

-- Create function for automatically updating the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update the updated_at column
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON "subscriptions"
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_user_balance_updated_at
BEFORE UPDATE ON "user_balance"
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_daily_usage_updated_at
BEFORE UPDATE ON "daily_usage"
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Create a function to initialize subscription and balance for new users
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

-- Create a trigger to initialize subscription and balance when a new user is created
CREATE TRIGGER on_user_created
AFTER INSERT ON "User"
FOR EACH ROW EXECUTE PROCEDURE initialize_user_subscription(); 