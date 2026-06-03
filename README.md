# SafeGuard — Fire Extinguisher Management System

A **RESTful Microservices** platform for managing, inspecting and maintaining fire
extinguishers across commercial buildings. Built for SafeGuard.

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite + Tailwind CSS (dark / light mode) |
| Backend | Node.js + Express microservices behind an API Gateway |
| Database | PostgreSQL |
| Auth | JWT access/refresh tokens, RBAC, **OTP email verification** for sign-up & deletes |
| Docs | Swagger / OpenAPI 3 |

---

## Architecture

```
                        ┌─────────────────────────┐
  React frontend  ──►   │   API Gateway  :4000     │  (Swagger at /api/docs)
   (Vite :5173)         └───────────┬─────────────┘
                                    │ proxies /api/*
        ┌──────────────┬────────────┼───────────────┬────────────────┐
        ▼              ▼            ▼               ▼                ▼
  Auth/User      Extinguisher   Inspection &     Reporting      Notification
  Service        Service        Maintenance      Service        Service
   :4001          :4002          :4003            :4004           :4005
        └──────────────┴────────────┴───────────────┴────────────────┘
                                    │
                            ┌───────▼────────┐
                            │  PostgreSQL    │
                            └────────────────┘
```

### Microservices
| Service | Port | Responsibility |
|---------|------|----------------|
| **Auth & User** | 4001 | Registration (OTP verify), login/logout, JWT, RBAC, profile, password |
| **Extinguisher** | 4002 | Register/edit/delete (admin), status update (inspector), list/view |
| **Inspection & Maintenance** | 4003 | Schedule inspections, complete them, log maintenance |
| **Reporting** | 4004 | Real-time reports + CSV / PDF export |
| **Notification** | 4005 | In-app notifications, email hooks |
| **Gateway** | 4000 | Single entry point + Swagger docs |

---

## Deployment Guide (local)

### Prerequisites
- **Node.js 18+**
- **PostgreSQL 14+** running locally

### 1. Create the database
```sql
-- in psql:
CREATE DATABASE fems;
```

### 2. Configure the backend
```bash
cd backend
copy .env.example .env      # Windows  (or: cp .env.example .env)
# edit .env -> set PGPASSWORD to your postgres password
npm install
```

### 3. Create tables + seed demo data
```bash
npm run migrate    # applies database/schema.sql
npm run seed       # creates demo users + sample extinguishers
```

### 4. Start the backend services

**Option A — all at once** (one terminal):
```bash
npm run dev        # gateway + 5 microservices together (auto-reload)
```

**Option B — each microservice in its own terminal** (true microservices style):
| Terminal | Command | Port |
|----------|---------|------|
| 1 | `npm run dev:gateway` | 4000 |
| 2 | `npm run dev:auth` | 4001 |
| 3 | `npm run dev:extinguisher` | 4002 |
| 4 | `npm run dev:inspection` | 4003 |
| 5 | `npm run dev:reporting` | 4004 |
| 6 | `npm run dev:notification` | 4005 |

> `dev:*` uses **nodemon** (auto-restarts on file changes). For production without
> auto-reload, use the matching `start:*` commands (e.g. `npm run start:auth`), or
> `npm start` to run them all.

Swagger docs → **http://localhost:4000/api/docs**

### 5. Start the frontend
```bash
cd ../frontend
npm install
npm run dev        # → http://localhost:5173
```

---

## Demo accounts  (password: `Password123!`)
| Role | Email |
|------|-------|
| Admin | admin@safeguard.com |
| Inspector | inspector@safeguard.com |
| User | user@safeguard.com |

---

## OTP-secured actions
**Sign-up email verification** and **all delete operations** (delete extinguisher, delete
account) require a 6-digit one-time code emailed to the user. **Logout** uses a plain
"Are you sure?" confirmation (no OTP). The delete flow is:
1. Click the action → **"Are you sure?"** confirmation.
2. Confirm → a code is emailed (Gmail SMTP via Nodemailer).
3. Enter the code → action executes.

> The code is also printed to the backend console (look for `[otp]`) so you can demo
> the flow even if email delivery is blocked on your network.

---

## Deliverables map
| Deliverable | Location |
|-------------|----------|
| Source code | `backend/`, `frontend/` |
| Swagger / OpenAPI | `backend/gateway/openapi.yaml` → served at `/api/docs` |
| Database schema (DDL) | `database/schema.sql` |
| ERD (Mermaid) | `database/ERD.md` |
| ERD (dbdiagram.io) | `database/dbdiagram.dbml` |
| Seed data | `database/seed.sql`, `backend/scripts/seed.js` |
| DB backup script | `database/backup.ps1` |
| Report export (PDF/CSV) | Reports page → Export, or `/api/reports/export/*` |
| Deployment guide | this file (`README.md`) |
| System flow + role guide | `SYSTEM_FLOW.md` |

---

## API quick test
```bash
# Login
curl -X POST http://localhost:4000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@safeguard.com\",\"password\":\"Password123!\"}"

# List extinguishers (use the returned accessToken)
curl http://localhost:4000/api/extinguishers -H "Authorization: Bearer <TOKEN>"
```

---

## Database export / backup
```powershell
cd database
./backup.ps1            # creates database/backups/fems_backup_<timestamp>.sql
```
Restore: `psql -U postgres -d fems -f <backup>.sql`
