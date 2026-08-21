# The Mailing Company — Monorepo Architecture

The Mailing Company is a production-grade bulk email personalization SaaS application built with React (Vite), TypeScript, Node.js (Express), Prisma ORM (PostgreSQL), and Redis (BullMQ).

---

## Monorepo Layout

- `/frontend` — React 18 + Vite + TypeScript + Tailwind CSS UI app.
- `/backend` — Express + TypeScript API server & Prisma ORM.
- `/shared` — Shared TypeScript type declarations and contracts.

---

## LLM Integration & Google Gemini API Setup (Phase 5B)

The application supports swappable AI providers (`Gemini`, `Anthropic`, `Mock`). By default, it integrates with **Google Gemini 1.5 Flash** (Free Tier).

### How to Get a Free Google Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account and click **Create API Key**.
3. Copy your generated API key.
4. Add the key to `backend/.env` (and root `.env`):

```env
LLM_PROVIDER="gemini"
GEMINI_API_KEY="AIzaSyYourGeneratedGeminiApiKeyHere"
```

### Free Tier Limits & Rate Handling

- Gemini API offers a generous free tier for developers.
- Refer to [Google AI Pricing & Free Tier Limits](https://ai.google.dev/pricing) for real-time quota information.
- The app automatically queues, throttles, and caches repeated prompts for 10 minutes to protect your free-tier limits.

---

## Security & Master Token Encryption (Phase 3)

Gmail OAuth refresh tokens, SMTP app passwords, and AWS secret keys are encrypted at rest using **AES-256-GCM** before being saved to PostgreSQL.

To generate a secure 32-byte master encryption key for your environment, run:

```bash
openssl rand -hex 32
```

Add the generated 64-character hex key to your `backend/.env` file:

```env
ENCRYPTION_MASTER_KEY="your-generated-64-hex-character-key"
```

---

## Quick Start

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Generate Prisma Client**:
   ```bash
   npm run prisma:generate
   ```

3. **Start Local Docker Services** (PostgreSQL + Redis):
   ```bash
   docker-compose up -d
   ```

4. **Launch Dev Application**:
   ```bash
   npm run dev
   ```
   - Frontend UI: `http://localhost:3000`
   - Backend API: `http://localhost:5001/api/health`

---

## Production Deployment & Hardening Guide (Phase 8)

### 1. Generating Master Secrets securely
Before deploying to production, generate a cryptographically secure JWT secret and master encryption key:

```bash
# Generate 64-character hex master key for AES-256-GCM credential encryption
openssl rand -hex 32

# Generate JWT secret
openssl rand -hex 32
```

Set these in your production environment variables (`NODE_ENV="production"`):

```env
NODE_ENV="production"
PORT=5001
APP_URL="https://api.yourdomain.com"
CLIENT_URL="https://app.yourdomain.com"
DATABASE_URL="postgresql://postgres:password@prod-db.internal:5432/mailpersonalize_prod?sslmode=require&connection_limit=20"
REDIS_URL="rediss://prod-redis.internal:6379"
JWT_SECRET="<your-generated-jwt-secret>"
ENCRYPTION_MASTER_KEY="<your-generated-encryption-master-key>"
```

### 2. Backend Deployment (Railway / Render / AWS ECS)
1. **Build & Start Commands**:
   - Build Command: `npm run build`
   - Start Command: `npm run start --workspace=backend`
2. **Environment Variables**: Apply values from `.env.production`.
3. **Database Migration**: Run `npx prisma db push` or `npx prisma migrate deploy` in build step.

### 3. Frontend Deployment (Vercel / Netlify / Cloudflare Pages)
1. **Build Settings**:
   - Build Command: `npm run build --workspace=frontend`
   - Output Directory: `frontend/dist`
2. **Environment Variables**: Set `VITE_API_BASE_URL="https://api.yourdomain.com/api"`.

### 4. Automated Database Backups & Load Testing
- **Run Automated Daily Backup Script**:
  ```bash
  chmod +x scripts/db-backup.sh
  ./scripts/db-backup.sh
  ```
- **Execute 5,000 Contact Load Test**:
  ```bash
  npx tsx scripts/load-test.ts
  ```

