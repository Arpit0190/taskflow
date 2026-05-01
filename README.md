# ⚡ TaskFlow — Project Management App

A full-stack project management application with role-based access control, built with zero external dependencies using pure Node.js.

## 🚀 Features

- **Authentication** — JWT-based signup/login with secure token handling
- **Projects** — Create, edit, delete projects with team management
- **Tasks** — Create tasks, assign to team members, set priorities & due dates
- **Kanban Board** — Visual task board (To Do → In Progress → Done)
- **Role-Based Access** — Admin vs Member roles per project
- **Dashboard** — Stats overview, recent tasks, overdue alerts
- **REST API** — Full RESTful API with proper HTTP status codes

## 🏗️ Architecture

```
taskflow/
├── server.js        # Backend: HTTP server + REST API + In-memory DB
├── public/
│   └── index.html   # Frontend: SPA with vanilla JS
├── package.json
├── railway.toml     # Railway deployment config
└── nixpacks.toml
```

**Tech Stack:**
- **Backend:** Pure Node.js (built-in `http`, `crypto`, `fs` modules — ZERO npm dependencies)
- **Database:** In-memory JavaScript objects (resets on restart — add SQLite/PostgreSQL for persistence)
- **Auth:** HS256 JWT tokens (hand-rolled, no libraries)
- **Frontend:** Vanilla HTML/CSS/JS SPA

## 🌐 Deploy on Railway

### Option 1: GitHub Import (Recommended)
1. Push this folder to a GitHub repository
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your repo — Railway auto-detects Node.js
4. Set environment variable: `JWT_SECRET=your-random-secret-here`
5. Deploy! Your app will be live in ~60 seconds

### Option 2: Railway CLI
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

### Environment Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port (Railway sets this automatically) |
| `JWT_SECRET` | `taskflow-secret-2024-xK9mP2` | Change this in production! |

## 🔑 Demo Credentials

| Email | Password | Role |
|-------|----------|------|
| admin@demo.com | admin123 | Admin |
| member@demo.com | member123 | Member |
| carol@demo.com | member123 | Member |

## 📡 REST API Reference

### Auth
```
POST /api/auth/register    { name, email, password }
POST /api/auth/login       { email, password }
GET  /api/auth/me          (requires Bearer token)
```

### Projects
```
GET    /api/projects                    List user's projects
POST   /api/projects                    Create project
GET    /api/projects/:id                Get project with tasks/members
PUT    /api/projects/:id                Update project (admin only)
DELETE /api/projects/:id                Delete project (admin only)
GET    /api/projects/:id/stats          Task statistics
GET    /api/projects/:id/members        List members
POST   /api/projects/:id/members        Add member { email, role }
PATCH  /api/projects/:id/members/:uid   Update member role
DELETE /api/projects/:id/members/:uid   Remove member
```

### Tasks
```
GET    /api/tasks?projectId=X    List tasks (filter by project)
POST   /api/tasks                Create task
GET    /api/tasks/:id            Get task
PATCH  /api/tasks/:id            Update task
DELETE /api/tasks/:id            Delete task
```

### Dashboard
```
GET /api/dashboard    Summary stats + recent/overdue tasks
```

## 🔐 Role-Based Access Control

| Action | Admin | Member |
|--------|-------|--------|
| View project | ✅ | ✅ |
| Create tasks | ✅ | ✅ |
| Edit own tasks | ✅ | ✅ |
| Edit any task | ✅ | ❌ |
| Delete own tasks | ✅ | ✅ |
| Delete any task | ✅ | ❌ |
| Add members | ✅ | ❌ |
| Remove members | ✅ | ❌ |
| Change roles | ✅ | ❌ |
| Edit project | ✅ | ❌ |
| Delete project | ✅ | ❌ |

## 💾 Adding Persistent Storage

The in-memory DB resets on server restart. To persist data, replace the DB object with SQLite:

```bash
npm install better-sqlite3
```

Then update `server.js` to use file-based SQLite queries. A schema:

```sql
CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT UNIQUE, password_hash TEXT, global_role TEXT, created_at TEXT);
CREATE TABLE projects (id INTEGER PRIMARY KEY, name TEXT, description TEXT, status TEXT, created_by INTEGER, created_at TEXT);
CREATE TABLE members (id INTEGER PRIMARY KEY, project_id INTEGER, user_id INTEGER, role TEXT);
CREATE TABLE tasks (id INTEGER PRIMARY KEY, project_id INTEGER, title TEXT, description TEXT, status TEXT, priority TEXT, assigned_to INTEGER, created_by INTEGER, due_date TEXT, created_at TEXT, updated_at TEXT);
```

Or use Railway's managed PostgreSQL — add the plugin in your Railway project settings.
