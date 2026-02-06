# Fullstack Portal

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Adding a New Feature (Step-by-Step)](#adding-a-new-feature-step-by-step)
- [Adding a New Microservice](#adding-a-new-microservice)
- [Docker](#docker)
- [Testing](#testing)
- [CI/CD Pipeline](#cicd-pipeline)
- [Branching & Deployment Strategy](#branching--deployment-strategy)
- [Environment Configuration](#environment-configuration)
- [Routing & Reverse Proxy (Caddy)](#routing--reverse-proxy-caddy)
- [Authentication Flow](#authentication-flow)
- [Database](#database)
- [Shared Libraries](#shared-libraries)
- [Guiding Principles](#guiding-principles)

---

## Architecture Overview

```
                        ┌──────────────┐
                        │    Caddy     │  Reverse proxy, TLS, rate limiting
                        │  (port 80/443)│
                        └──────┬───────┘
                               │
               ┌───────────────┼───────────────────┐
               │               │                   │
        ┌──────▼──────┐ ┌─────▼──────┐    ┌───────▼────────┐
        │   Client    │ │ Auth Routes│    │ Protected APIs │
        │ React SPA   │ │ (no auth)  │    │ (forward_auth) │
        │  (port 80)  │ │            │    │                │
        └─────────────┘ └─────┬──────┘    └───────┬────────┘
                              │                   │
                        ┌─────▼──────┐    ┌───────▼────────┐
                        │   Auth     │    │  Auth Gateway  │
                        │  Service   │    │  (JWT verify)  │
                        │ (port 5001)│    │  (port 5005)   │
                        └────────────┘    └───────┬────────┘
                                                  │ adds user headers
                                                  ▼
          ┌──────────────────────────────────────────────────────────────┐
          │                    Microservices                            │
          │                                                            │
          │  notifications (5002)    projects (5003)    callid (5004)  │
          │  sample-automation (5006)  user-mgmt (5007)  quota (5008) │
          │  reporting (5009)     project-info (5010)  publishing (5011)│
          │  disposition (5012)   ai-prompting (5013)  github (5014)  │
          │  promark-employees (5015)                                  │
          │                                                            │
          │  Legacy monolith API (5000) ← remaining non-migrated routes│
          └──────────────┬──────────────────────┬──────────────────────┘
                         │                      │
                  ┌──────▼──────┐       ┌───────▼───────┐
                  │  MongoDB    │       │ MS SQL Server │
                  │ (auth/users)│       │ (Promark/Voxco)│
                  └─────────────┘       └───────────────┘
```

The application is a **hybrid microservices architecture** — an Express.js monolith that is being incrementally decomposed into standalone microservices. All services run in Docker containers behind a Caddy reverse proxy that handles TLS termination, rate limiting, and JWT-based forward authentication.

---

## Tech Stack

| Layer          | Technology                                              |
| -------------- | ------------------------------------------------------- |
| Frontend       | React 19, Vite 6, Redux Toolkit (RTK Query), React Router 7 |
| Backend        | Express.js 4, Node.js 20                                |
| Auth           | JWT (access + refresh tokens), bcrypt                    |
| Databases      | MongoDB (Mongoose) — auth/users; MS SQL Server (Sequelize + mssql) — business data |
| Reverse Proxy  | Caddy 2 (with rate-limit plugin)                        |
| Containerization | Docker, Docker Compose (multi-stage builds)           |
| CI/CD          | GitHub Actions (20 workflows)                           |
| Client Testing | Vitest 2 + jsdom                                        |
| Server Testing | Jest 29                                                 |

---

## Repository Structure

```
fullstack-portal/
├── .github/workflows/        # 20 GitHub Actions workflow files
├── caddy/                    # Caddyfile configs + Dockerfile (reverse proxy)
├── client/                   # React frontend
│   ├── src/
│   │   ├── api/              # RTK Query base API config
│   │   ├── app/              # Redux store setup
│   │   ├── components/       # Reusable UI components
│   │   ├── context/          # React Context providers
│   │   ├── features/         # RTK Query API slices + Redux slices (17 slices)
│   │   ├── hooks/            # Custom React hooks
│   │   ├── utils/            # Utility functions
│   │   ├── views/            # Page components (30+ views)
│   │   ├── App.jsx           # Root component & routing
│   │   └── index.jsx         # React entry point
│   ├── Dockerfile            # Multi-stage: dev → build → Caddy production
│   ├── vite.config.js        # Vite config with chunk splitting & proxy
│   └── vitest.config.ts      # Test config
├── server/
│   ├── config/               # CORS, roles config
│   ├── controllers/          # Monolith controllers (13)
│   ├── database/             # SQL scripts & stored procedures
│   ├── middleware/            # JWT verification, logging, error handling
│   ├── models/               # Sequelize models (22)
│   ├── routes/               # Monolith routes (public + private)
│   ├── services/             # Monolith business logic (14 services)
│   ├── shared-libs/          # Shared packages across services
│   │   ├── auth-middleware/   # JWT verification
│   │   ├── cors-config/      # CORS settings
│   │   ├── db-connection/    # Database connection pooling
│   │   ├── error-handler/    # Error handling middleware
│   │   └── roles-config/     # Role configuration
│   ├── auth-service/         # Microservice: authentication (5001)
│   ├── auth-gateway/         # Microservice: JWT verification gateway (5005)
│   ├── notification-service/ # Microservice: notifications (5002)
│   ├── project-numbering-service/  # (5003)
│   ├── callid-service/       # (5004)
│   ├── sample-automation-service/  # (5006)
│   ├── user-management-service/    # (5007)
│   ├── quota-management-service/   # (5008)
│   ├── reporting-service/    # (5009)
│   ├── project-info-service/ # (5010)
│   ├── project-publishing-service/ # (5011)
│   ├── disposition-service/  # (5012)
│   ├── ai-prompting-service/ # (5013)
│   ├── github-service/       # (5014)
│   ├── promark-employees-service/  # (5015)
│   ├── __tests__/            # Jest tests
│   ├── Dockerfile            # Monolith multi-stage build
│   └── server.js             # Monolith entry point
├── docs/                     # Additional documentation
├── docker-compose.yml        # Production orchestration (18 services)
├── docker-compose.dev.yml    # Development with hot reload
├── docker-compose.testing.yml # Testing environment
├── .env.example              # Environment variable template
├── .env.dev                  # Development env vars
├── .env.testing              # Testing env vars
└── package.json              # Root scripts (install:all, dev, test, deploy)
```

---

## Getting Started

### Prerequisites

- **Node.js 20** (match the Docker images)
- **Docker Desktop** (running)
- **Git**

### Quick Start (Docker — recommended)

```bash
# Clone the repo
git clone <repo-url> && cd fullstack-portal

# Copy and fill in env vars
cp .env.example .env.dev

# Start everything with hot reload
docker compose -f docker-compose.dev.yml --env-file .env.dev up -d --build
```

The dev environment mounts your source code as volumes, so file changes trigger automatic reload via **nodemon** (server) and **Vite HMR** (client).

| Service         | URL                          |
| --------------- | ---------------------------- |
| Client (Vite)   | `https://localhost` (via Caddy) or `http://localhost:5173` (direct) |
| API (monolith)  | `http://localhost:5000/api`  |
| Microservices   | `http://localhost:5001-5015` |

### Quick Start (Without Docker)

```bash
# Install all dependencies (root + client + server)
npm run install:all

# Start client and server concurrently
npm run dev
```

The client's Vite dev server proxies `/api` requests to `localhost:5000` when running outside Docker.

---

## Development Workflow

### Day-to-Day Flow

```
1. Pull latest from 'testing'
2. Create a feature branch off 'testing'
3. Make changes (follow the step-by-step guide below)
4. Run tests locally
5. Push and open a PR to 'testing'
6. CI runs tests automatically
7. Get PR reviewed and merged to 'testing'
8. Verify on the testing environment
9. PR from 'testing' → 'main' for production release
```

### Running Locally

```bash
# Start dev environment
docker compose -f docker-compose.dev.yml --env-file .env.dev up -d --build

# Rebuild a single service after dependency changes
docker compose -f docker-compose.dev.yml up -d --build --no-deps <service-name>

# View logs for a specific service
docker compose -f docker-compose.dev.yml logs -f <service-name>

# Stop everything
docker compose -f docker-compose.dev.yml down
```

For code changes, just save the file — hot reload picks it up automatically. You only need to rebuild when you change `package.json` dependencies.

---

## Adding a New Feature (Step-by-Step)

All new feature development follows this 9-step process. Each step builds on the previous one.

### Step 1 — Create the Service

**Location:** `server/services/` (monolith) or `server/<service-name>/services/` (microservice)

The service layer contains all business logic: database queries, data transformations, calculations. It should have **zero knowledge** of HTTP — no `req`, `res`, or status codes.

```javascript
// server/services/MyFeatureServices.js
const { QueryTypes } = require('sequelize');

class MyFeatureServices {
  constructor(db) {
    this.db = db;
  }

  async getItems(projectId) {
    return this.db.query(
      'SELECT * FROM tblItems WHERE ProjectID = :projectId',
      { replacements: { projectId }, type: QueryTypes.SELECT }
    );
  }
}

module.exports = MyFeatureServices;
```

### Step 2 — Create the Controller

**Location:** `server/controllers/` or `server/<service-name>/controllers/`

The controller receives HTTP requests, validates input, calls the service, and returns the response. This is the only layer that touches `req` and `res`.

```javascript
// server/controllers/myFeatureController.js
const MyFeatureServices = require('../services/MyFeatureServices');
const service = new MyFeatureServices(db);

const getItems = async (req, res) => {
  const { projectId } = req.params;
  if (!projectId) return res.status(400).json({ message: 'projectId is required' });

  const items = await service.getItems(projectId);
  res.json(items);
};

module.exports = { getItems };
```

### Step 3 — Define the Route

**Location:** `server/routes/api/` or `server/<service-name>/routes/`

Map URLs to controller methods. Add the route to either `publicRoutes.js` (no auth) or `privateRoutes.js` (JWT required).

```javascript
// server/routes/api/myFeature.js
const router = require('express').Router();
const controller = require('../../controllers/myFeatureController');

router.get('/:projectId', controller.getItems);

module.exports = router;
```

Then register it in `privateRoutes.js`:

```javascript
router.use('/my-feature', require('./api/myFeature'));
```

### Step 4 — Create the Page Component

**Location:** `client/src/views/<ModuleName>/`

Create a directory for your feature. The main component acts as a container — keep it focused on layout and presentation, not logic.

```jsx
// client/src/views/my_feature/MyFeature.jsx
import { useMyFeatureLogic } from './useMyFeatureLogic';
import './MyFeature.css';

const MyFeature = () => {
  const { items, isLoading, error } = useMyFeatureLogic();

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error loading data.</p>;

  return (
    <div className="my-feature">
      {items.map(item => <div key={item.id}>{item.name}</div>)}
    </div>
  );
};

export default MyFeature;
```

### Step 5 — Implement Logic in a Custom Hook

**Location:** `client/src/views/<ModuleName>/useMyFeatureLogic.ts`

All `useState`, `useEffect`, API calls, and business logic go here. This pattern keeps the JSX component clean and makes the logic independently testable.

```typescript
// client/src/views/my_feature/useMyFeatureLogic.ts
import { useGetItemsQuery } from '../../features/myFeatureApiSlice';

export const useMyFeatureLogic = () => {
  const { data: items = [], isLoading, error } = useGetItemsQuery();

  return { items, isLoading, error };
};
```

### Step 6 — Style the Component

**Location:** `client/src/views/<ModuleName>/MyFeature.css`

Write scoped CSS for your feature. Follow BEM naming conventions to avoid style collisions.

### Step 7 — Create the RTK Query API Slice

**Location:** `client/src/features/myFeatureApiSlice.tsx`

Define your backend endpoints using RTK Query. This handles data fetching, caching, and cache invalidation automatically.

```typescript
// client/src/features/myFeatureApiSlice.tsx
import { apiSlice } from '../api/apiSlice';

export const myFeatureApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getItems: builder.query({
      query: () => '/my-feature',
      providesTags: ['MyFeature'],
    }),
  }),
});

export const { useGetItemsQuery } = myFeatureApiSlice;
```

### Step 8 — Update `index.jsx` (if needed)

**Location:** `client/src/index.jsx`

Only needed if your feature requires a new global provider or context wrapper. Most features skip this step.

### Step 9 — Add Routing in `App.jsx`

**Location:** `client/src/App.jsx`

Add a lazy-loaded route wrapped in `RequireAuth` with the appropriate role restrictions.

```jsx
const MyFeature = lazy(() => import('./views/my_feature/MyFeature'));

// Inside the Route tree:
<Route element={<RequireAuth allowedRoles={[ROLES.Admin, ROLES.User]} />}>
  <Route path="my-feature" element={<MyFeature />} />
</Route>
```

---

## Adding a New Microservice

When extracting logic from the monolith or building a brand-new service:

### 1. Scaffold the Service Directory

```
server/my-new-service/
├── config/
├── controllers/
├── middleware/
├── models/
├── routes/
├── services/
├── Dockerfile
├── package.json
└── server.js
```

### 2. Create the Dockerfile

Follow the existing pattern — multi-stage build with shared-libs:

```dockerfile
FROM node:20-alpine AS development
WORKDIR /app
COPY shared-libs ./shared-libs
COPY my-new-service/package*.json ./
RUN npm install
COPY my-new-service .
CMD ["npm", "run", "dev"]

FROM node:20-alpine AS production
WORKDIR /app
COPY shared-libs ./shared-libs
COPY my-new-service/package*.json ./
RUN npm install --omit=dev
COPY my-new-service .
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:<PORT>/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"
CMD ["node", "server.js"]
```

### 3. Add a Health Check Endpoint

Every microservice must expose `/health`:

```javascript
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
    version: '1.0.0'
  });
});
```

### 4. Register in Docker Compose

Add entries in all three compose files (`docker-compose.yml`, `docker-compose.dev.yml`, `docker-compose.testing.yml`). Use the next available port (currently 5016).

### 5. Add Caddy Route

In `caddy/Caddyfile.production` (and other Caddyfile variants), add the route with forward auth:

```
handle /api/my-new-service/* {
    forward_auth auth-gateway:5005 {
        uri /verify
        copy_headers X-User-Authenticated X-User-Name X-User-Roles
    }
    reverse_proxy my-new-service:5016
}
```

### 6. Create a GitHub Actions Workflow

Copy an existing `deploy-*-service.yml` and update the service name, path triggers, and port.

---

## Docker

### Compose Files

| File                          | Purpose                                   |
| ----------------------------- | ----------------------------------------- |
| `docker-compose.yml`          | **Production** — optimized builds, no volumes |
| `docker-compose.dev.yml`      | **Development** — hot reload via volumes, nodemon |
| `docker-compose.testing.yml`  | **Testing** — production builds with test env vars |

### Common Commands

```bash
# Development
docker compose -f docker-compose.dev.yml --env-file .env.dev up -d --build
docker compose -f docker-compose.dev.yml logs -f auth          # tail a service
docker compose -f docker-compose.dev.yml up -d --build --no-deps auth  # rebuild one service

# Testing
docker compose -f docker-compose.testing.yml --env-file .env.testing up -d --build

# Production (typically handled by CI/CD)
docker compose --env-file .env.production up -d --build
```

### How Hot Reload Works (Dev)

In `docker-compose.dev.yml`, each service mounts the source directory as a volume:

```yaml
volumes:
  - ./server/auth-service:/app           # source code (live)
  - ./server/shared-libs:/app/shared-libs # shared packages (live)
  - /app/node_modules                     # anonymous volume (preserved)
```

The `npm run dev` command starts **nodemon**, which watches for file changes and restarts the process. The client uses **Vite HMR** for instant browser updates.

> **Gotcha:** If you add or remove a dependency in `package.json`, you must rebuild the container (`--build`) because `node_modules` is in an anonymous volume and won't pick up `npm install` changes from your host.

---

## Testing

### Client Tests (Vitest)

```bash
cd client

npm test              # watch mode
npm run test:run      # single run (CI)
npm run test:coverage # with coverage report
```

- **Config:** `client/vitest.config.ts`
- **Environment:** jsdom
- **Test files:** `client/src/__tests__/`
- **Supports:** `.test.{js,ts,jsx,tsx}` and `.spec.{js,ts,jsx,tsx}`

### Server Tests (Jest)

```bash
cd server

npm test                                          # all tests
npm test -- --testPathPattern="__tests__/auth"     # single service
npm run test:coverage                              # with coverage
```

- **Config:** `server/package.json` (`jest` key)
- **Environment:** Node
- **Test files:** `server/__tests__/`
- **Structure:** Tests mirror the service structure (e.g., `__tests__/auth-service/authController.test.js`)

### Running Tests Before Pushing

```bash
# From the root
npm test   # runs both client and server tests
```

CI will run these same tests on every push and PR. If tests fail, the deployment workflows will not proceed.

---

## CI/CD Pipeline

### Workflow Overview

There are **20 GitHub Actions workflows** organized into three categories:

#### 1. CI — Runs on Every Push/PR (`ci.yml`)

**Triggers:** Push to `main` or `testing`, PRs to `main`

```
Push / PR
    ├── check-already-tested (skip if duplicate)
    ├── test-server (Jest)
    ├── test-client (Vitest)
    └── test-summary (aggregate results)
```

Smart deduplication prevents the same commit from being tested twice (once on push, once on the PR event).

#### 2. Full Deployment (`main.yml`, `testing.yml`)

**Trigger:** Manual (`workflow_dispatch` only)

```
Manual trigger
    ├── test-server
    ├── test-client
    └── deploy (after tests pass)
        ├── SSH to server
        ├── Pull latest code
        ├── Create .env from GitHub Secrets
        ├── docker compose up -d --build
        └── Health check all services
```

#### 3. Per-Service Deployment (17 workflows)

**Trigger:** Push to `main` or `testing` with changes in that service's directory, or manual dispatch.

```
Push with changes in server/auth-service/**
    ├── test (service-specific Jest tests)
    ├── deploy-testing (if on 'testing' branch)
    └── deploy-production (if on 'main' branch)
        ├── SSH to server
        ├── git pull
        ├── docker compose up -d --build --no-deps auth
        └── Health check
```

This means **merging a change to a single service only rebuilds and redeploys that service** — not the entire stack. Zero-downtime, targeted deployments.

**Services with individual deployment workflows:**
auth, auth-gateway, client, caddy, notifications, project-numbering, callid, sample-automation, user-management, quota-management, reporting, project-info, project-publishing, disposition, ai-prompting, github, promark-employees

---

## Branching & Deployment Strategy

```
feature/my-feature ──PR──▶ testing ──PR──▶ main
                            │                │
                        auto-deploy      auto-deploy
                        (per-service)    (per-service)
                            │                │
                            ▼                ▼
                      Testing Server    Production Server
```

| Branch      | Purpose                     | Deploys To        | Deploy Trigger                |
| ----------- | --------------------------- | ----------------- | ----------------------------- |
| `main`      | Production-ready code       | Production server | Per-service auto on merge, or manual full deploy |
| `testing`   | Integration & QA            | Testing server    | Per-service auto on merge, or manual full deploy |
| `feature/*` | Individual feature work     | Nowhere           | CI tests only                 |

### Rules

1. **Never push directly to `main` or `testing`** — always use PRs.
2. Features branch off `testing` and PR back to `testing` first.
3. After QA on the testing environment, PR from `testing` to `main`.
4. Full-stack deployments are **manual** (workflow_dispatch). Per-service deployments are **automatic** on merge when the service's files changed.

---

## Environment Configuration

### Environment Files

| File              | Purpose                          | Committed? |
| ----------------- | -------------------------------- | ---------- |
| `.env.example`    | Template with all required vars  | Yes        |
| `.env.dev`        | Local development values         | Yes        |
| `.env.testing`    | Testing server values            | Yes        |
| `.env.production` | Production values (CI creates it)| No — built from GitHub Secrets |

### Key Variables

```bash
# App Environment
NODE_ENV=                    # development | testing | production
VITE_ENV=                    # Same as NODE_ENV (for Vite client)

# URLs
VITE_DOMAIN_NAME=            # e.g., portal.example.com
FRONTEND_URL=                # Full frontend URL
VITE_API_URL=                # API base URL (used in client)

# Auth
ACCESS_TOKEN_SECRET=         # JWT access token signing secret
REFRESH_TOKEN_SECRET=        # JWT refresh token signing secret

# Databases
DATABASE_URI=                # MongoDB connection string
PROMARK_DB_USER=             # MS SQL Server credentials (Promark)
PROMARK_DB_PASSWORD=
PROMARK_DB_SERVER=
PROMARK_DB_NAME=
VOXCO_DB_USER=               # MS SQL Server credentials (Voxco)
VOXCO_DB_PASSWORD=
VOXCO_DB_SERVER=
VOXCO_DB_NAME=

# External Services
OPENAI_API_KEY=              # OpenAI API key (for ai-prompting-service)
SMTP_HOST=                   # Email server
FULLSTACK_PORTAL_ISSUES_TOKEN= # GitHub token (for github-service)
```

### How Env Vars Are Loaded

**Server:** `dotenv` loads the appropriate file based on `NODE_ENV`:

```javascript
switch (process.env.NODE_ENV) {
  case 'development': envPath = '.env.development'; break;
  case 'testing':     envPath = '.env.testing'; break;
  case 'production':  envPath = '.env.production'; break;
}
```

**Client:** Vite injects `VITE_*` variables at build time via Docker build args. Access them at runtime with `import.meta.env.VITE_*`.

---

## Routing & Reverse Proxy (Caddy)

Caddy sits in front of all services and handles:

- **TLS termination** — automatic Let's Encrypt in production, self-signed in dev
- **Rate limiting** — 100 requests/min, burst of 20/sec (via `caddy-ratelimit` plugin)
- **Security headers** — HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff
- **Forward auth** — JWT verification through the auth-gateway before reaching protected services

### Route Resolution Order

1. **Public auth routes** → directly to `auth:5001` (no JWT check)
   - `/api/auth/*`, `/api/refresh`, `/api/reset/*`

2. **Protected microservice routes** → forward auth through `auth-gateway:5005`, then proxy to the service
   - `/api/notifications/*` → `notifications:5002`
   - `/api/project-database/*` → `projects:5003`
   - `/api/callid/*` → `callid:5004`
   - `/api/sample-automation/*` → `sample-automation:5006`
   - `/api/users/*` → `user-management:5007`
   - `/api/quota-management/*` → `quota-management:5008`
   - `/api/reports/*` → `reporting:5009`
   - `/api/project-info/*` → `project-info:5010`
   - `/api/project-publishing/*` → `project-publishing:5011`
   - `/api/disposition-report/*` → `disposition:5012`
   - `/api/ai/*` → `ai-prompting:5013`
   - `/api/github/*` → `github:5014`
   - `/api/promark-employees/*` → `promark-employees:5015`

3. **Legacy monolith** → `api:5000` (all other `/api/*` routes)

4. **Frontend** → `client:80` (everything else, serves the React SPA)

---

## Authentication Flow

```
Client                  Caddy              Auth Gateway         Microservice
  │                       │                    │                     │
  │── GET /api/users ────▶│                    │                     │
  │                       │── forward_auth ───▶│                     │
  │                       │                    │── verify JWT        │
  │                       │                    │   extract claims    │
  │                       │◀─ 200 + headers ──│                     │
  │                       │   X-User-Name      │                     │
  │                       │   X-User-Roles     │                     │
  │                       │   X-User-Authenticated                   │
  │                       │                                          │
  │                       │── proxy with headers ──────────────────▶│
  │                       │                                          │
  │◀─────────── response ─│◀─────────────────────────────────────── │
```

- The **auth-gateway** (`port 5005`) only verifies tokens — it does not issue them.
- The **auth-service** (`port 5001`) handles login, registration, token issuance, and refresh.
- On successful verification, the gateway adds `X-User-*` headers so downstream services know who the caller is without needing to parse the JWT themselves.

---

## Database

### Systems

| Database       | ORM/Driver         | Used For                       |
| -------------- | ------------------ | ------------------------------ |
| MongoDB        | Mongoose           | User accounts, roles, refresh tokens |
| MS SQL Server  | Sequelize + mssql  | Promark business data, Voxco survey data |
| MS SQL (ODBC)  | odbc               | Legacy direct connections       |

### Sequelize Models

22 models in `server/models/`, auto-generated via `sequelize-auto` and initialized in `init-models.js`.

### SQL Scripts

Stored procedures and migration scripts live in `server/database/`:

```
server/database/
├── sp_ApplyWDNCScrubbing.sql
├── sp_AutoAssignCallIDs.sql
├── sp_StratifiedSplit.sql
├── migrate_variable_exclusions.sql
├── migrate_add_ivr.sql
├── recommended_indexes.sql
└── ... (12+ scripts)
```

Migration scripts are applied manually — there is no automated migration runner.

### Useful DB Commands

```bash
npm run db:migrate   # Run migrations (server/scripts/migrate.js)
npm run db:seed      # Seed data (server/scripts/seed.js)
```

---

## Shared Libraries

Shared code lives in `server/shared-libs/` and is installed as local file dependencies:

| Library            | Purpose                                |
| ------------------ | -------------------------------------- |
| `auth-middleware`   | JWT verification middleware            |
| `cors-config`      | Standardized CORS settings             |
| `db-connection`    | Database connection pooling            |
| `error-handler`    | Express error handling middleware       |
| `roles-config`     | Role definitions and configuration     |

Microservices reference them in their `package.json`:

```json
"dependencies": {
  "@internal/cors-config": "file:./shared-libs/cors-config",
  "@internal/error-handler": "file:./shared-libs/error-handler"
}
```

In Docker, shared-libs are copied into the build context alongside the service code.

---

## Guiding Principles

- **Service → Controller → Route → Component → Hook → Style → API Slice → Route** — follow the order.
- **Separation of concerns** — services don't know about HTTP; controllers don't query databases; hooks don't contain JSX.
- **Test each layer** — unit tests for services, integration tests for controllers/routes.
- **All features via PR** — describe the changes, reference the ticket.
- **Comment complex logic** — if it's not obvious, explain why.
- **Keep microservices independent** — each service owns its data and logic. Communicate through APIs, not shared databases.
