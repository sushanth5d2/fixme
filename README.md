# Fix Me 🔧

**Fix Me** is a repair-service marketplace connecting customers with verified repair technicians and companies.

---

## Architecture

| Layer | Technology |
|-------|-----------|
| Backend API | NestJS + TypeScript |
| Admin Web | Next.js + TypeScript |
| Customer App | React Native + TypeScript |
| Fixer App | React Native + TypeScript |
| Database | PostgreSQL 16 + PostGIS |
| Cache | Redis 7 |
| Object Storage | MinIO (S3-compatible) |
| Real-time | Socket.IO + Redis adapter |
| Reverse Proxy | Nginx |
| Containers | Docker + Docker Compose |
| CI/CD | GitHub Actions |
| Monitoring | Prometheus + Grafana |
| Monorepo | Turborepo + npm workspaces |

---

## Repository Structure

```
fixme/
├── apps/
│   ├── api/              ← NestJS REST API
│   ├── admin-web/        ← Next.js admin dashboard
│   ├── customer-mobile/  ← React Native customer app
│   └── fixer-mobile/     ← React Native fixer app
├── packages/
│   ├── shared-types/     ← TypeScript types shared across apps
│   ├── validation/       ← Shared validation schemas & utilities
│   ├── tsconfig/         ← Shared TypeScript configurations
│   └── eslint-config/    ← Shared ESLint configurations
├── infrastructure/
│   ├── docker/           ← Dockerfiles
│   ├── nginx/            ← Nginx configuration
│   └── monitoring/       ← Prometheus & Grafana
└── docs/                 ← Project documentation
```

---

## Quick Start (Local Development)

### Prerequisites

- **Node.js** ≥ 20.0.0
- **npm** ≥ 10.0.0
- **Docker** + **Docker Compose** v2

### 1. Clone and Install

```bash
git clone https://github.com/your-org/fixme.git
cd fixme
npm install
```

### 2. Start Infrastructure

```bash
# Start PostgreSQL, Redis, MinIO
docker compose up postgres redis minio minio-setup -d

# Wait for health checks to pass (~30s)
docker compose ps
```

### 3. Configure API Environment

```bash
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your settings
```

### 4. Run Database Migrations

```bash
npm run db:migrate
```

### 5. Seed Development Data

```bash
npm run db:seed:dev
```

### 6. Start the API

```bash
npm run dev --workspace=apps/api
```

The API will be available at: `http://localhost:3000/api/v1`  
Swagger docs: `http://localhost:3000/api/docs`

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all apps in development mode |
| `npm run build` | Build all apps |
| `npm run test` | Run all tests |
| `npm run lint` | Lint all apps |
| `npm run typecheck` | Type-check all apps |
| `npm run format` | Format all code (Prettier) |
| `npm run db:migrate` | Run pending database migrations |
| `npm run db:migrate:revert` | Revert last migration |
| `npm run db:seed:dev` | Seed development data |

---

## API Reference

See `http://localhost:3000/api/docs` (Swagger UI) when running in development mode.

---

## Environment Variables

See [`apps/api/.env.example`](apps/api/.env.example) for the full list.

**Required for API:**
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`
- `REDIS_HOST`, `REDIS_PORT`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`

---

## User Roles

| Role | Description |
|------|-------------|
| `CUSTOMER` | End users creating repair requests |
| `FIXER` | Verified repair technicians/companies |
| `ADMIN` | Platform administrators |
| `SUPER_ADMIN` | High-privilege admin (manage other admins) |

---

## Repair Request Lifecycle

```
OPEN → QUOTED → CUSTOMER_ACCEPTED → ASSIGNED → FIXER_ON_THE_WAY
  → DEVICE_RECEIVED → DIAGNOSING → REPAIR_IN_PROGRESS
  → READY_FOR_DELIVERY → COMPLETED → REVIEWED
```

Exceptional: `CANCELLED`, `DISPUTED`

---

## Security

- JWT access tokens (15 min) + refresh tokens (7 days) with rotation
- bcrypt password hashing (cost factor 12)
- OTP: 6-digit, 10-minute expiry, max 3 attempts
- All authorization enforced server-side
- HTTPS enforced via Nginx
- Private S3 buckets for sensitive documents
- Soft delete for important records
- Comprehensive audit logging

---

## Development Phases

This project is built in 49 phases. See [`docs/`](docs/) for phase documentation.

---

## License

Private — All rights reserved.
"# fixme" 
