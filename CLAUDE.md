# Asky - AI-Powered GitHub Repository Chat

Fullstack chat application integrated with LLM to explain GitHub repositories, featuring GitHub OAuth authentication.

## Tech Stack

### Monorepo
- **Turborepo**: Build system and development tooling
- **pnpm**: Package manager with workspace support

### Backend (`apps/api/`)
- **NestJS**: Progressive Node.js framework
- **Prisma**: Type-safe ORM for PostgreSQL
- **PostgreSQL**: Production-grade database
- **Passport.js**: Authentication middleware
- **GitHub OAuth2**: User authentication

### Frontend (`apps/web/`)
- **React 19**: UI library
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **Axios**: HTTP client
- **React Router**: Client-side routing

## Project Structure

```
asky/
├── apps/
│   ├── api/                    # NestJS Backend
│   │   ├── src/
│   │   │   ├── auth/           # GitHub OAuth & JWT handling
│   │   │   ├── prisma/         # Prisma service
│   │   │   ├── app.module.ts   # Main module
│   │   │   └── main.ts         # Application entry
│   │   ├── prisma/
│   │   │   └── schema.prisma   # Database schema
│   │   └── .env.example        # Environment variables template
│   │
│   └── web/                    # React Frontend
│       ├── src/
│       │   ├── pages/          # Login & Home pages
│       │   ├── hooks/          # Custom React hooks
│       │   ├── lib/            # API client
│       │   └── main.tsx        # Application entry
│       └── .env.example        # Environment variables template
│
├── packages/
│   ├── shared-types/           # Shared TypeScript types
│   └── config/                 # ESLint & TypeScript configs
│
└── turbo.json                  # Turborepo configuration
```

## Getting Started

### Prerequisites

- **Node.js**: >= 20.0.0
- **pnpm**: 9.15.0 or later
- **PostgreSQL**: 14+ or Docker for containerized database

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd asky

# Install dependencies
pnpm install
```

### 2. Database Setup

#### Option A: Using Docker (Recommended)

```bash
# Start PostgreSQL container
docker run --name asky-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=asky \
  -p 5432:5432 \
  -d postgres

# Verify container is running
docker ps | grep asky-postgres
```

#### Option B: Local PostgreSQL

Ensure PostgreSQL is installed and create a database:

```bash
psql -U postgres
CREATE DATABASE asky;
\q
```

### 3. Configure Environment Variables

#### Backend (`apps/api/.env`)

```bash
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env`:

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/asky?schema=public"

# GitHub OAuth (get from GitHub)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# JWT
JWT_SECRET=your_jwt_secret_make_it_long_and_random
JWT_EXPIRATION=7d

# Server
PORT=3001
NODE_ENV=development

# Frontend
FRONTEND_URL=http://localhost:5173

# Callback URL
GITHUB_CALLBACK_URL=http://localhost:3001/auth/github/callback
```

#### Frontend (`apps/web/.env`)

```bash
cp apps/web/.env.example apps/web/.env
```

Edit `apps/web/.env`:

```bash
VITE_API_URL=http://localhost:3001
```

### 4. Setup GitHub OAuth App

1. Go to GitHub → Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in the form:
   - **Application name**: Asky (or your preferred name)
   - **Homepage URL**: `http://localhost:5173`
   - **Authorization callback URL**: `http://localhost:3001/auth/github/callback`
4. Click "Register application"
5. Copy the **Client ID** and generate a **Client Secret**
6. Add these to your `apps/api/.env` file

### 5. Run Prisma Migrations

```bash
cd apps/api

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Optional: Open Prisma Studio to view database
npx prisma studio
```

### 6. Start Development Servers

```bash
# From project root
pnpm dev

# Or start each app separately:
# Terminal 1 - Backend
cd apps/api && pnpm dev

# Terminal 2 - Frontend
cd apps/web && pnpm dev
```

### 7. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Prisma Studio**: http://localhost:5555 (if running)

## Development Workflow

### Building

```bash
# Build all apps
pnpm build

# Build specific app
cd apps/api && pnpm build
cd apps/web && pnpm build
```

### Running in Production

```bash
# Build and start backend
cd apps/api
pnpm build
pnpm start

# Build and preview frontend
cd apps/web
pnpm build
pnpm preview
```

## Authentication Flow

1. User clicks "Continue with GitHub" on the login page
2. Frontend redirects to backend `/auth/github` endpoint
3. Backend initiates GitHub OAuth flow
4. User authorizes the application on GitHub
5. GitHub redirects to backend `/auth/github/callback`
6. Backend:
   - Exchanges authorization code for access token
   - Fetches user profile from GitHub
   - Creates/updates user in database
   - Generates JWT token
   - Sets httpOnly cookie with JWT
   - Redirects to frontend
7. Frontend checks for authenticated user on mount
8. User is redirected to home page

## API Endpoints

### Authentication

- `GET /auth/github` - Initiate GitHub OAuth flow
- `GET /auth/github/callback` - GitHub OAuth callback
- `GET /auth/me` - Get current user profile
- `GET /auth/logout` - Logout user

### Health Check

- `GET /` - API health check

## Database Schema

### User Model

```prisma
model User {
  id          String   @id @default(uuid())
  githubId    String   @unique
  username    String
  avatar      String?
  accessToken String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps | grep asky-postgres

# View logs
docker logs asky-postgres

# Restart container
docker restart asky-postgres
```

### Prisma Issues

```bash
# Reset database (CAUTION: deletes all data)
cd apps/api
npx prisma migrate reset

# Regenerate Prisma Client
npx prisma generate
```

### GitHub OAuth Callback Issues

- Ensure callback URL in GitHub OAuth App matches `GITHUB_CALLBACK_URL` in `.env`
- Check that `FRONTEND_URL` is correct in backend `.env`
- Verify CORS is configured correctly in `apps/api/src/main.ts`

### CORS Issues

If you encounter CORS errors:

1. Check `apps/api/src/main.ts` CORS configuration
2. Ensure `FRONTEND_URL` matches your frontend URL
3. Verify cookies are being sent with `withCredentials: true` in API calls

## Future Enhancements

- [ ] Repository search integration with GitHub API
- [ ] LLM integration for repository explanation
- [ ] Chat interface for asking questions
- [ ] Repository indexing and caching
- [ ] Organization-level repository access
- [ ] Rate limiting and caching strategies
- [ ] E2E testing with Playwright
- [ ] Error handling and logging
- [ ] Docker Compose for local development
- [ ] CI/CD pipeline setup

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.
