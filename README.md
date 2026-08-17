# SupportDesk Mini

A lightweight IT support ticket management single page application (SPA) built with Laravel 12, React, Vite, TypeScript, Tailwind CSS, shadcn/ui, and Docker Compose.

---

## Technical Stack & Architecture

```
React SPA + Vite + TS (Node 22)
          |
          | HTTP / JSON (port 8000)
          v
  Laravel 12 REST API (PHP 8.3)
          |
          | Docker Network (mysql:3306)
          v
     MySQL 8.0
```

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS v4, shadcn/ui
- **Backend**: Laravel 12 REST API, PHP 8.3, Laravel Sanctum preparation
- **Database**: MySQL 8.0 (internal Docker network)
- **Containerization**: Docker Compose (`app`, `mysql`, `frontend`)

---

## Prerequisites

- **Docker Desktop** (v29.x+ with Docker Compose v5.x+)
- No local PHP, Node.js, Composer, or MySQL installation required on the host machine.

---

## Getting Started

### 1. Environment Setup

Copy `.env.example` to `.env` (or let Docker entrypoint auto-generate defaults):

```bash
cp .env.example .env
```

### 2. Start Docker Environment

Build and launch all services in detached mode:

```bash
docker compose up -d --build
```

### 3. Verify Service Status

Check that all 3 services (`supportdesk_mysql`, `supportdesk_app`, `supportdesk_frontend`) are running and healthy:

```bash
docker compose ps
```

---

## Port Mappings & Endpoints

| Service | Port | Endpoint / Purpose |
|---|---|---|
| **Frontend SPA** | `5173` | [http://localhost:5173](http://localhost:5173) |
| **Laravel API** | `8000` | [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health) |
| **MySQL Service** | `3306` | Internal Docker Network (`mysql:3306`) |

---

## Infrastructure Health Check

The backend exposes an infrastructure health check endpoint:

**Endpoint**: `GET /api/v1/health`

**Sample Response (HTTP 200 OK)**:
```json
{
  "status": "ok",
  "timestamp": "2026-08-17T14:55:00.000000Z",
  "services": {
    "database": "connected",
    "php_version": "8.3.28"
  }
}
```

If the database is unreachable, it returns HTTP 503 (`status: degraded`, `database: disconnected`) gracefully without exposing credentials or stack traces.

---

## Useful Docker Commands

### Database Connectivity Check
```bash
docker compose exec app php artisan tinker --execute="DB::connection()->getPdo(); echo 'DB Connected Successfully!';"
```

### Run Frontend Production Build
```bash
docker compose exec frontend npm run build
```

### View Container Logs
```bash
# View logs for all services
docker compose logs -f

# View logs for backend only
docker compose logs -f app
```

### Stop Services
```bash
docker compose down
```

---

## Git & Micro-Commit Conventions

All commits are linked to trainee assessment issues:
- `#1 setup Laravel backend`
- `#1 setup React frontend`
- `#1 configure Docker environment`
- `#1 verify development environment`
