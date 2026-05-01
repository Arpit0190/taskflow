TaskFlow — Project Management App

A full-stack project management application with role-based access control, built with zero external dependencies using pure Node.js.

 Features

Authentication — JWT-based signup/login with secure token handling
Projects — Create, edit, delete projects with team management
Tasks — Create tasks, assign to team members, set priorities & due dates
Kanban Board — Visual task board (To Do → In Progress → Done)
Role-Based Access — Admin vs Member roles per project
Dashboard— Stats overview, recent tasks, overdue alerts
REST API — Full RESTful API with proper HTTP status codes

Architecture


taskflow/
 server.js         Backend: HTTP server + REST API + In-memory DB
 public/
    index.html    Frontend: SPA with vanilla JS
 package.json
 railway.toml      Railway deployment config
 nixpacks.toml


Tech Stack:
Backend:Pure Node.js (built-in `http`, `crypto`, `fs` modules — ZERO npm dependencies)
Database: In-memory JavaScript objects (resets on restart — add SQLite/PostgreSQL for persistence)
Auth: HS256 JWT tokens (hand-rolled, no libraries)
Frontend: Vanilla HTML/CSS/JS SPA

 Deploy on Railway

 Option 1: GitHub Import (Recommended)
1. Push this folder to a GitHub repository
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your repo — Railway auto-detects Node.js
4. Set environment variable: `JWT_SECRET=your-random-secret-here`
5. Deploy! Your app will be live in ~60 seconds

 Option 2: Railway CLI
bash
npm install -g @railway/cli
railway login
railway init
railway up


Environment Variables
Variable | Default | Description |

 `PORT` | `3000` | Server port (Railway sets this automatically) |
 `JWT_SECRET` | `taskflow-secret-2024-xK9mP2` | Change this in production! |

Demo Credentials

Email | Password | Role |

 admin@demo.com | admin123 | Admin |
 member@demo.com | member123 | Member |
 carol@demo.com | member123 | Member |

 REST API Reference



POST /api/auth/register    { name, email, password }
POST /api/auth/login       { email, password }
GET  /api/auth/me          (requires Bearer token)


