# AEH Backend — Avviare Educational Hub API

Express.js + PostgreSQL backend with JWT auth, Razorpay payments, student portal.

## Tech Stack
- **Runtime**: Node.js + TypeScript (compiled with esbuild)
- **Framework**: Express.js v5
- **Database**: PostgreSQL (via Drizzle ORM)
- **Auth**: JWT (admin + student)
- **Payments**: Razorpay (test & live mode)
- **Deployment**: Render

## API Endpoints

| Route | Description |
|-------|-------------|
| `POST /api/auth/login` | Admin login |
| `GET /api/auth/me` | Get current admin |
| `GET /api/applications` | List applications (admin) |
| `GET /api/contacts` | List contact messages (admin) |
| `GET /api/careers` | List career applications (admin) |
| `POST /api/student/auth/register` | Student registration |
| `POST /api/student/auth/login` | Student login |
| `GET /api/fee-structures` | Get fee structures |
| `POST /api/payments/create-order` | Create Razorpay order |
| `POST /api/payments/verify` | Verify payment signature |
| `GET /api/payments/my-payments` | Student payment history |

## Setup

### Prerequisites
- Node.js 18+
- pnpm (`npm install -g pnpm`)
- PostgreSQL database (Neon recommended)
- Razorpay account (test keys for development)

### Local Development
```bash
pnpm install
cp .env.example .env
# Fill in .env values
pnpm db:push       # Push database schema
pnpm dev           # Start development server
```

### Environment Variables
```env
DATABASE_URL=postgresql://...
SESSION_SECRET=strong-random-secret
JWT_SECRET=strong-random-secret
STUDENT_JWT_SECRET=strong-random-secret
RAZORPAY_KEY_ID=rzp_test_xxxx
RAZORPAY_KEY_SECRET=xxxx
ALLOWED_ORIGINS=https://your-frontend.pages.dev
PORT=8080
NODE_ENV=production
```

## Deploy to Render

1. Connect this GitHub repo to Render
2. Create a **Web Service**
3. Set build command: `npm install -g pnpm && pnpm install && pnpm build`
4. Set start command: `node packages/api-server/dist/index.mjs`
5. Add all environment variables from `.env.example`
6. For database: Use Neon PostgreSQL free tier, copy `DATABASE_URL`

## Default Admin Credentials
After first deploy, the DB seeds with:
- Username: `admin` / Password: `admin123`
- Username: `admissions` / Password: `admissions123`

**Change these immediately in production!**
