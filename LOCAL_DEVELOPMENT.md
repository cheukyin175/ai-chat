# Local Development Guide

This guide will help you set up and run the Next.js AI Chatbot application locally.

## Prerequisites

Before you begin, make sure you have the following installed:

- Node.js (v18.17.0 or later)
- pnpm (v10.4.1 or later)
- Git

You'll also need accounts for the following services:

- OpenAI (for AI models)
- Supabase (for database and authentication)
- Stripe (for payments, optional)

## Setup Steps

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ai-chatbot
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory of the project. You can use the `.env.example` file as a template:

```bash
cp .env.example .env.local
```

Then, fill in the required environment variables:

#### Essential Environment Variables

```
# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key

# Fireworks AI API Key (optional, for reasoning models)
FIREWORKS_API_KEY=your_fireworks_api_key

# Authentication Secret
# Generate with: openssl rand -base64 32
AUTH_SECRET=your_auth_secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
```

#### Optional Environment Variables

```
# Google OAuth (for social login)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Stripe (for payments)
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

### 4. Set Up Supabase

1. Create a new project in Supabase
2. Use the SQL migrations in `combined_migrations.sql` to set up your database schema
3. Configure authentication providers in the Supabase dashboard

### 5. Start the Development Server

```bash
pnpm dev
```

The application will be available at http://localhost:3000.

## Development Workflow

### Database Migrations

This project uses Drizzle ORM for database migrations. You can use the following commands:

```bash
# Generate migrations
pnpm db:generate

# Apply migrations
pnpm db:migrate

# Open Drizzle Studio
pnpm db:studio
```

### Testing

```bash
pnpm test
```

### Linting and Formatting

```bash
# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format
```

## Project Structure

For a comprehensive overview of the project structure, see the [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) file.

## Troubleshooting

### Supabase Connection Issues

If you're having trouble connecting to Supabase:

1. Check that your environment variables are correctly set
2. Ensure your IP address is allowed in Supabase's network settings
3. Verify that your database schema is correctly set up

### Authentication Issues

If authentication is not working:

1. Check your OAuth provider settings in Supabase
2. Verify that your redirect URIs are correctly configured
3. Ensure your `NEXTAUTH_URL` and `NEXTAUTH_SECRET` are correctly set

### API Key Issues

If you're getting errors related to API keys:

1. Verify that your OpenAI API key is valid and has sufficient credits
2. Check that your Supabase keys have the correct permissions

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.io/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Shadcn UI Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs) 