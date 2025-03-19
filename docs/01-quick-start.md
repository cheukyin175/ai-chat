# Quick Start

The chatbot template is a web application built using [Next.js](https://nextjs.org) and the [AI SDK](https://sdk.vercel.ai) that can be used as a starting point for building your own AI applications. The template is designed to be easily customizable and extendable, allowing you to add new features and integrations as needed.

### Pre-requisites:

- GitHub/GitLab/Bitbucket account
- API Key from [OpenAI](https://platform.openai.com)
- Supabase account for database and authentication

### Local Development

To develop the chatbot template locally, you can clone the repository:

```bash
git clone https://github.com/<username>/<repository>
cd <repository>
pnpm install
```

Create a `.env.local` file with the necessary environment variables (see `.env.example` for reference).

After setting up the environment variables, you can start the development server by running:

```bash
pnpm dev
```

The chatbot template will be available at `http://localhost:3000`.
