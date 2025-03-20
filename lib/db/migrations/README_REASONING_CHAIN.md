# ReasoningChain Migration Guide

This document explains how to apply the ReasoningChain database migration to your existing AI chatbot application.

## Overview

The ReasoningChain feature adds support for storing AI model reasoning chains (step-by-step thought processes) separately from the chat messages, allowing for better organization and display of the model's reasoning.

## What's Included in the Migration

1. A new `has_reasoning` column on the `Message` table to flag messages that have associated reasoning
2. A new `ReasoningChain` table that stores reasoning steps linked to messages
3. An index on the `ReasoningChain` table for better performance

## Migration Methods

### Method 1: Using the Complete Migration Script

We have two versions of the migration script available:

#### Option A: Using the Fixed Script for Supabase SQL Editor (Recommended)

The `0005_reasoning_chain_complete_fixed.sql` file contains an optimized version specifically designed to work with Supabase's SQL Editor. This script:

1. Creates all required tables if they don't exist
2. Adds the `has_reasoning` column to the `Message` table if it doesn't exist
3. Creates the `ReasoningChain` table if it doesn't exist
4. Creates all necessary indexes and relationships
5. Drops existing triggers before recreating them to avoid errors
6. Uses simpler syntax that's more compatible with Supabase's SQL Editor

This is the recommended approach if you're running the script directly in Supabase's SQL Editor.

#### Option B: Using the Standard Migration Script

The `0005_reasoning_chain_complete.sql` file contains the original migration script that can be used with the migration tools or in environments that fully support PostgreSQL's PL/pgSQL syntax.

To apply either migration:

```bash
# Option 1: Using the migrate.ts script
pnpm db:migrate

# Option 2: Using the Supabase dashboard
# 1. Open your Supabase project
# 2. Go to the "SQL Editor" section
# 3. Copy and paste the contents of 0005_reasoning_chain_complete_fixed.sql
# 4. Click "Run" to execute the SQL
```

### Method 2: Using Drizzle ORM

If you're using Drizzle ORM for database management:

```bash
# Generate the migration
pnpm db:generate

# Apply the migration
pnpm db:migrate
```

## Type Definitions

The migration includes updated TypeScript type definitions in the `lib/database.types.ts` file to support the new tables and columns. Make sure this file is included in your project to avoid type errors.

## Verifying the Migration

After applying the migration, you can verify it was successful by running the following SQL query in the Supabase SQL Editor:

```sql
-- Check if the ReasoningChain table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'ReasoningChain'
);

-- Check if the has_reasoning column exists on the Message table
SELECT EXISTS (
   SELECT FROM information_schema.columns 
   WHERE table_schema = 'public' 
   AND table_name = 'Message' 
   AND column_name = 'has_reasoning'
);
```

Both queries should return `true` if the migration was successful.

## Troubleshooting

If you encounter any issues during migration:

1. **Syntax Error at or near "BEGIN"**: If you see this error when running the script in Supabase SQL Editor, use the `0005_reasoning_chain_complete_fixed.sql` script instead, which has been optimized for Supabase.

2. **Table Already Exists Errors**: The migration is designed to use IF NOT EXISTS clauses to avoid these errors, but if you encounter them, you may need to manually modify the script to skip creating tables that already exist.

3. **Permission Issues**: Ensure you have the right permissions to modify the database structure.

4. **Trigger Already Exists Errors**: The fixed script includes DROP TRIGGER IF EXISTS statements to avoid these errors, but if you still encounter them, you may need to manually drop the triggers before creating them. 