# Asky

AI-powered GitHub repository chat application with GitHub OAuth authentication.

## Quick Start

```bash
# Install dependencies
pnpm install

# Start PostgreSQL (using Docker)
docker run --name asky-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=asky -p 5432:5432 -d postgres

# Setup environment files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Edit .env files with your GitHub OAuth credentials

# Run database migrations
cd apps/api
npx prisma migrate dev --name init
npx prisma generate

# Start development servers (from root)
pnpm dev
```

Visit http://localhost:5173 to access the application.

## Documentation

See [CLAUDE.md](./CLAUDE.md) for detailed setup instructions, architecture, and development guide.

## Tech Stack

- **Frontend**: React 19 + Vite + Tailwind CSS
- **Backend**: NestJS + Prisma + PostgreSQL
- **Auth**: GitHub OAuth2 + JWT (httpOnly cookies)
- **Monorepo**: Turborepo + pnpm workspaces

## License

MIT
