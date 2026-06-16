# Anti Gravity — Backend

A self-contained Node.js + TypeScript + Express + Prisma + PostgreSQL backend for the **APM Life-Cycle** agent system. The backend exposes a REST API and a WebSocket stream letting an AI agent safely read, write, create, rename, and delete files within the frontend project — with automatic backup before every destructive operation.

---

## Directory Structure

```
backend/
├── prisma/
│   └── schema.prisma          # DB models: AgentSession, ActionLog, BackupEntry, WorkspaceSnapshot
├── src/
│   ├── config/
│   │   ├── env.ts             # Zod-validated env loader
│   │   └── paths.ts           # FRONTEND_ROOT, BACKEND_ROOT, TRASH_DIR constants + safety guard
│   ├── db/
│   │   └── prisma.client.ts   # Singleton PrismaClient
│   ├── types/                 # ← Copy to frontend's src/types/ for shared types
│   │   ├── api.types.ts       # ApiSuccess / ApiError / ApiResponse envelopes
│   │   ├── file.types.ts      # FileNode, FileWritePayload, WsFileEvent, etc.
│   │   └── agent.types.ts     # AgentSessionDto, ActionLogDto, etc.
│   ├── middleware/
│   │   ├── errorHandler.ts    # Global error handler + AppError class
│   │   ├── requestLogger.ts   # Morgan logger (coloured in dev)
│   │   └── validatePath.ts    # Path-traversal guard middleware
│   ├── services/
│   │   ├── backup.service.ts  # Backup files to .trash/ before destructive ops
│   │   ├── file.service.ts    # All FS operations (tree, read, write, mkdir, rename, delete)
│   │   └── action.service.ts  # AgentSession CRUD + ActionLog persistence
│   ├── controllers/
│   │   ├── files.controller.ts
│   │   ├── agent.controller.ts
│   │   └── restore.controller.ts
│   ├── routes/
│   │   ├── files.routes.ts
│   │   ├── agent.routes.ts
│   │   └── restore.routes.ts
│   ├── ws/
│   │   └── fsWatcher.ts       # chokidar + ws WebSocket broadcaster
│   └── server.ts              # Express app bootstrap
├── .trash/                    # Auto-managed backup directory (git-ignored)
├── .env.example               # Template — copy to .env
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | v18+ |
| npm | v9+ |
| PostgreSQL | v14+ |

---

## 1. First-Time Setup

### Step 1 — Install dependencies
```powershell
cd backend
npm install
```

### Step 2 — Configure environment
```powershell
# Copy the example env file
copy .env.example .env
```

Open `.env` and fill in your values:

```env
PORT=4000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/anti_gravity?schema=public"
FRONTEND_ROOT="C:/Users/DELL/Documents/APM-Life-Cycle"
CORS_ORIGINS="http://localhost:3000"
```

> **Important**: `FRONTEND_ROOT` must be the absolute path to the frontend project. The backend enforces that the agent cannot access files outside this directory.

### Step 3 — Set up the database

Make sure PostgreSQL is running, then create the database and run migrations:

```powershell
# Generate the Prisma client
npm run db:generate

# Create the database tables (runs all migrations)
npm run db:migrate
```

When prompted for a migration name, enter something like `init`.

To inspect the database in a GUI:
```powershell
npm run db:studio
```

---

## 2. Running the Backend

### Development (with hot-reload)
```powershell
npm run dev
```

Output:
```
✅  PostgreSQL connected via Prisma.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀  Anti Gravity Backend is running
    REST API  → http://localhost:4000/api/v1
    WebSocket → ws://localhost:4000/ws
    Health    → http://localhost:4000/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👁️   Watching for FS changes in: C:/Users/DELL/Documents/APM-Life-Cycle
```

### Production
```powershell
npm run build
npm start
```

---

## 3. API Reference

### Base URL
```
http://localhost:4000/api/v1
```

### Response Format
All endpoints return a standard envelope:

**Success:**
```json
{ "success": true, "data": { ... }, "message": "...", "timestamp": "2024-..." }
```

**Error:**
```json
{ "success": false, "error": { "code": "NOT_FOUND", "message": "..." }, "timestamp": "..." }
```

---

### File Endpoints (`/api/v1/files`)

#### `GET /files/tree`
Returns the full recursive directory tree of the frontend root.

```bash
curl http://localhost:4000/api/v1/files/tree
```

#### `GET /files/read?path=src/App.tsx`
Returns the content of a single file.

```bash
curl "http://localhost:4000/api/v1/files/read?path=src/App.tsx"
```

#### `POST /files/write`
Creates or overwrites a file. **Auto-backs up if the file exists.**

```bash
curl -X POST http://localhost:4000/api/v1/files/write \
  -H "Content-Type: application/json" \
  -d '{ "path": "src/test.ts", "content": "export const x = 1;", "sessionId": "clxyz" }'
```

#### `POST /files/mkdir`
Creates a directory.

```bash
curl -X POST http://localhost:4000/api/v1/files/mkdir \
  -H "Content-Type: application/json" \
  -d '{ "path": "src/new-module" }'
```

#### `PUT /files/rename`
Renames or moves a file/directory. **Auto-backs up source.**

```bash
curl -X PUT http://localhost:4000/api/v1/files/rename \
  -H "Content-Type: application/json" \
  -d '{ "oldPath": "src/old.ts", "newPath": "src/new.ts" }'
```

#### `DELETE /files/delete?path=src/old.ts`
Deletes a file or directory. **Always backs up first.**

```bash
curl -X DELETE "http://localhost:4000/api/v1/files/delete?path=src/old.ts"
```

---

### Agent Session Endpoints (`/api/v1/agent`)

#### `POST /agent/sessions` — Create session
```bash
curl -X POST http://localhost:4000/api/v1/agent/sessions \
  -H "Content-Type: application/json" \
  -d '{ "name": "Refactor auth module", "notes": "Session 1" }'
```

#### `GET /agent/sessions` — List all sessions
```bash
curl http://localhost:4000/api/v1/agent/sessions
```

#### `GET /agent/sessions/:id/actions` — Get action log
```bash
curl "http://localhost:4000/api/v1/agent/sessions/clxyz/actions?page=1&pageSize=50"
```

#### `POST /agent/sessions/:id/snapshot` — Take workspace snapshot
```bash
curl -X POST http://localhost:4000/api/v1/agent/sessions/clxyz/snapshot \
  -H "Content-Type: application/json" \
  -d '{ "label": "Before refactor" }'
```

---

### Restore Endpoints (`/api/v1/restore`)

#### `GET /restore/backups` — List all backups
```bash
curl http://localhost:4000/api/v1/restore/backups
```

#### `POST /restore/backups/:id/restore` — Restore a file
```bash
curl -X POST http://localhost:4000/api/v1/restore/backups/clxyz/restore
```

---

### WebSocket (`ws://localhost:4000/ws`)

Connect with any WebSocket client. Events are emitted as JSON:

```json
{ "event": "change", "path": "src/App.tsx", "timestamp": "2024-01-15T10:30:00.000Z" }
```

**Event types:** `add`, `addDir`, `change`, `unlink`, `unlinkDir`

**JavaScript example (frontend):**
```typescript
const ws = new WebSocket('ws://localhost:4000/ws');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(`File ${data.event}: ${data.path}`);
};
```

---

## 4. Security

### Path Traversal Protection
Every file operation validates the requested path:
1. The path is resolved with `path.resolve()` to an absolute path.
2. It must **start with** `FRONTEND_ROOT` — any attempt to escape returns `403 Forbidden`.
3. It must **not enter** `BACKEND_ROOT` — the agent cannot touch the backend itself.

**Test it:**
```bash
# This should return 403 PATH_TRAVERSAL
curl "http://localhost:4000/api/v1/files/read?path=../../etc/passwd"
```

### Backup / Trash System
Before any destructive operation (WRITE-overwrite, RENAME, DELETE), the backend:
1. Copies the target file/directory to `backend/.trash/<timestamp>_<name>/`.
2. Records the backup in the `backup_entries` table.
3. You can list backups at `GET /api/v1/restore/backups` and restore any of them.

---

## 5. Shared Frontend Types

Copy these files to your frontend's `src/types/` folder — they have no backend-specific imports:

```
backend/src/types/api.types.ts    → frontend/src/types/api.types.ts
backend/src/types/file.types.ts   → frontend/src/types/file.types.ts
backend/src/types/agent.types.ts  → frontend/src/types/agent.types.ts
```

---

## 6. Running Tests

```powershell
npm run test
```

TypeScript check only:
```powershell
npm run lint
```

---

## 7. Troubleshooting

| Problem | Solution |
|---|---|
| `DATABASE_URL` error on startup | Verify PostgreSQL is running and the URL is correct in `.env` |
| `FRONTEND_ROOT` path guard blocks valid paths | Ensure the path in `.env` uses forward slashes on Windows |
| `Cannot find module '@prisma/client'` | Run `npm run db:generate` after `npm install` |
| Port already in use | Change `PORT` in `.env` or kill the process using port 4000 |
| `.trash/` not created | The server creates it automatically on startup — check write permissions |
