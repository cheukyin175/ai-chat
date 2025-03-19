-- Subscriptions table
CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "stripe_customer_id" TEXT,
  "stripe_subscription_id" TEXT,
  "price_id" TEXT NOT NULL DEFAULT 'price_free',
  "plan_type" TEXT NOT NULL DEFAULT 'free', -- 'free' or 'premium'
  "status" TEXT NOT NULL DEFAULT 'active',
  "current_period_start" TIMESTAMP WITH TIME ZONE,
  "current_period_end" TIMESTAMP WITH TIME ZONE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User balance table
CREATE TABLE IF NOT EXISTS "user_balance" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "balance_usd" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage tracking table
CREATE TABLE IF NOT EXISTS "usage" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "chat_id" UUID REFERENCES "Chat"("id") ON DELETE CASCADE,
  "message_id" UUID REFERENCES "Message"("id") ON DELETE CASCADE,
  "tokens_used" INTEGER NOT NULL DEFAULT 0,
  "cost_usd" DECIMAL(10, 4) NOT NULL DEFAULT 0.0000,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily usage limits table
CREATE TABLE IF NOT EXISTS "daily_usage" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "date" DATE NOT NULL DEFAULT CURRENT_DATE,
  "requests_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE("user_id", "date")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_subscriptions_user_id" ON "subscriptions"("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_balance_user_id" ON "user_balance"("user_id");
CREATE INDEX IF NOT EXISTS "idx_usage_user_id" ON "usage"("user_id");
CREATE INDEX IF NOT EXISTS "idx_usage_chat_id" ON "usage"("chat_id");
CREATE INDEX IF NOT EXISTS "idx_daily_usage_user_id_date" ON "daily_usage"("user_id", "date");

-- Create functions and triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON "subscriptions"
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_user_balance_updated_at
BEFORE UPDATE ON "user_balance"
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_daily_usage_updated_at
BEFORE UPDATE ON "daily_usage"
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column(); 