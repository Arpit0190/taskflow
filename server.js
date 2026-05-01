/**
 * TaskFlow - Project Management API Server
 * Pure Node.js, zero external dependencies
 * Deploy on Railway: set PORT env var
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const url = require('url');

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'taskflow-secret-2024-xK9mP2';

// ─── IN-MEMORY DATABASE ────────────────────────────────────────────────────
const DB = {
  users: [],
  projects: [],
  members: [],   // { id, projectId, userId, role: 'admin'|'member' }
  tasks: [],
  nextId: { users: 1, projects: 1, members: 1, tasks: 1 }
};

// Seed demo data
function seedDB() {
  const adminHash = hashPassword('admin123');
  const memberHash = hashPassword('member123');

  DB.users.push(
    { id: 1, name: 'Alice Admin', email: 'admin@demo.com', passwordHash: adminHash, globalRole: 'admin', createdAt: new Date().toISOString() },
    { id: 2, name: 'Bob Member', email: 'member@demo.com', passwordHash: memberHash, globalRole: 'member', createdAt: new Date().toISOString() },
    { id: 3, name: 'Carol Dev', email: 'carol@demo.com', passwordHash: memberHash, globalRole: 'member', createdAt: new Date().toISOString() }
  );
  DB.nextId.users = 4;

  DB.projects.push(
    { id: 1, name: 'Website Redesign', description: 'Overhaul the company website with modern UI/UX', status: 'active', createdBy: 1, createdAt: new Date(Date.now() - 7 * 86400000).toISOString() },
    { id: 2, name: 'Mobile App v2', description: 'Launch the second version of our flagship mobile application', status: 'active', createdBy: 1, createdAt: new Date(Date.now() - 14 * 86400000).toISOString() },
    { id: 3, name: 'API Integration', description: 'Integrate third-party payment and shipping APIs', status: 'completed', createdBy: 1, createdAt: new Date(Date.now() - 30 * 86400000).toISOString() }
  );
  DB.nextId.projects = 4;

  DB.members.push(
    { id: 1, projectId: 1, userId: 1, role: 'admin' },
    { id: 2, projectId: 1, userId: 2, role: 'member' },
    { id: 3, projectId: 1, userId: 3, role: 'member' },
    { id: 4, projectId: 2, userId: 1, role: 'admin' },
    { id: 5, projectId: 2, userId: 2, role: 'member' },
    { id: 6, projectId: 3, userId: 1, role: 'admin' },
    { id: 7, projectId: 3, userId: 3, role: 'member' }
  );
  DB.nextId.members = 8;

  const now = Date.now();
  DB.tasks.push(
    { id: 1, projectId: 1, title: 'Design mockups', description: 'Create Figma mockups for all pages', status: 'done', priority: 'high', assignedTo: 2, createdBy: 1, dueDate: new Date(now - 2 * 86400000).toISOString().split('T')[0], createdAt: new Date(now - 5 * 86400000).toISOString() },
    { id: 2, projectId: 1, title: 'Implement homepage', description: 'Build responsive homepage with animations', status: 'in_progress', priority: 'high', assignedTo: 3, createdBy: 1, dueDate: new Date(now + 3 * 86400000).toISOString().split('T')[0], createdAt: new Date(now - 3 * 86400000).toISOString() },
    { id: 3, projectId: 1, title: 'Write copy', description: 'Draft and finalize all website copy', status: 'todo', priority: 'medium', assignedTo: 2, createdBy: 1, dueDate: new Date(now + 7 * 86400000).toISOString().split('T')[0], createdAt: new Date(now - 2 * 86400000).toISOString() },
    { id: 4, projectId: 1, title: 'SEO audit', description: 'Run full SEO audit and optimization', status: 'todo', priority: 'low', assignedTo: null, createdBy: 1, dueDate: new Date(now + 14 * 86400000).toISOString().split('T')[0], createdAt: new Date(now - 1 * 86400000).toISOString() },
    { id: 5, projectId: 2, title: 'User auth flow', description: 'Implement OAuth2 login', status: 'done', priority: 'high', assignedTo: 2, createdBy: 1, dueDate: new Date(now - 5 * 86400000).toISOString().split('T')[0], createdAt: new Date(now - 10 * 86400000).toISOString() },
    { id: 6, projectId: 2, title: 'Push notifications', description: 'Set up Firebase push notifications', status: 'in_progress', priority: 'high', assignedTo: 3, createdBy: 1, dueDate: new Date(now - 1 * 86400000).toISOString().split('T')[0], createdAt: new Date(now - 8 * 86400000).toISOString() },
    { id: 7, projectId: 2, title: 'Offline mode', description: 'Implement service worker for offline support', status: 'todo', priority: 'medium', assignedTo: 2, createdBy: 1, dueDate: new Date(now + 5 * 86400000).toISOString().split('T')[0], createdAt: new Date(now - 6 * 86400000).toISOString() },
    { id: 8, projectId: 3, title: 'Stripe integration', description: 'Payment processing via Stripe API', status: 'done', priority: 'high', assignedTo: 3, createdBy: 1, dueDate: new Date(now - 10 * 86400000).toISOString().split('T')[0], createdAt: new Date(now - 25 * 86400000).toISOString() },
    { id: 9, projectId: 3, title: 'Shipping webhooks', description: 'Handle FedEx/UPS webhook events', status: 'done', priority: 'medium', assignedTo: 2, createdBy: 1, dueDate: new Date(now - 7 * 86400000).toISOString().split('T')[0], createdAt: new Date(now - 20 * 86400000).toISOString() }
  );
  DB.nextId.tasks = 10;
}

// ─── CRYPTO HELPERS ────────────────────────────────────────────────────────
function hashPassword(pw) {
  return crypto.createHmac('sha256', JWT_SECRET).update(pw).digest('hex');
}

function signToken(payload) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify({ ...payload, iat: Date.now(), exp: Date.now() + 7 * 86400000 }));
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

function verifyToken(token) {
  try {
    const [header, body, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (expected !== sig) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}

function b64url(str) {
  return Buffer.from(str).toString('base64url');
}

// ─── REQUEST HELPERS ───────────────────────────────────────────────────────
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

function send(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  });
  res.end(JSON.stringify(data));
}

function getAuth(req) {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace('Bearer ', '');
  return verifyToken(token);
}

function requireAuth(req, res) {
  const user = getAuth(req);
  if (!user) { send(res, 401, { error: 'Unauthorized' }); return null; }
  return user;
}

function getUser(id) { return DB.users.find(u => u.id === id); }
function safeUser(u) { if (!u) return null; const { passwordHash, ...safe } = u; return safe; }

// ─── ROUTE HANDLERS ────────────────────────────────────────────────────────

// AUTH
function handleAuth(method, pathname, req, res, body) {
  if (method === 'POST' && pathname === '/api/auth/register') {
    const { name, email, password } = body;
    if (!name || !email || !password) return send(res, 400, { error: 'Name, email, and password required' });
    if (password.length < 6) return send(res, 400, { error: 'Password must be at least 6 characters' });
    if (DB.users.find(u => u.email.toLowerCase() === email.toLowerCase())) return send(res, 409, { error: 'Email already registered' });
    const user = { id: DB.nextId.users++, name, email: email.toLowerCase(), passwordHash: hashPassword(password), globalRole: 'member', createdAt: new Date().toISOString() };
    DB.users.push(user);
    const token = signToken({ userId: user.id, email: user.email });
    return send(res, 201, { token, user: safeUser(user) });
  }

  if (method === 'POST' && pathname === '/api/auth/login') {
    const { email, password } = body;
    if (!email || !password) return send(res, 400, { error: 'Email and password required' });
    const user = DB.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user || user.passwordHash !== hashPassword(password)) return send(res, 401, { error: 'Invalid credentials' });
    const token = signToken({ userId: user.id, email: user.email });
    return send(res, 200, { token, user: safeUser(user) });
  }

  if (method === 'GET' && pathname === '/api/auth/me') {
    const auth = requireAuth(req, res); if (!auth) return;
    const user = getUser(auth.userId);
    if (!user) return send(res, 404, { error: 'User not found' });
    return send(res, 200, safeUser(user));
  }
}

// USERS
function handleUsers(method, pathname, req, res, auth) {
  if (method === 'GET' && pathname === '/api/users') {
    return send(res, 200, DB.users.map(safeUser));
  }
}

// PROJECTS
function handleProjects(method, pathname, req, res, body, auth) {
  const projectMatch = pathname.match(/^\/api\/projects\/(\d+)$/);
  const membersMatch = pathname.match(/^\/api\/projects\/(\d+)\/members/);
  const statsMatch = pathname.match(/^\/api\/projects\/(\d+)\/stats$/);

  if (method === 'GET' && pathname === '/api/projects') {
    const userMemberships = DB.members.filter(m => m.userId === auth.userId);
    const projectIds = userMemberships.map(m => m.projectId);
    let projects = DB.projects.filter(p => projectIds.includes(p.id) || p.createdBy === auth.userId);
    projects = projects.map(p => {
      const tasks = DB.tasks.filter(t => t.projectId === p.id);
      const members = DB.members.filter(m => m.projectId === p.id);
      const myRole = (DB.members.find(m => m.projectId === p.id && m.userId === auth.userId) || {}).role || 'admin';
      return { ...p, taskCount: tasks.length, memberCount: members.length, myRole, creator: safeUser(getUser(p.createdBy)) };
    });
    return send(res, 200, projects);
  }

  if (method === 'POST' && pathname === '/api/projects') {
    const { name, description } = body;
    if (!name) return send(res, 400, { error: 'Project name required' });
    const project = { id: DB.nextId.projects++, name, description: description || '', status: 'active', createdBy: auth.userId, createdAt: new Date().toISOString() };
    DB.projects.push(project);
    DB.members.push({ id: DB.nextId.members++, projectId: project.id, userId: auth.userId, role: 'admin' });
    return send(res, 201, project);
  }

  if (projectMatch) {
    const projectId = parseInt(projectMatch[1]);
    const project = DB.projects.find(p => p.id === projectId);
    if (!project) return send(res, 404, { error: 'Project not found' });
    const membership = DB.members.find(m => m.projectId === projectId && m.userId === auth.userId);
    if (!membership) return send(res, 403, { error: 'Not a member of this project' });

    if (method === 'GET') {
      const tasks = DB.tasks.filter(t => t.projectId === projectId);
      const members = DB.members.filter(m => m.projectId === projectId).map(m => ({ ...m, user: safeUser(getUser(m.userId)) }));
      return send(res, 200, { ...project, tasks, members, myRole: membership.role });
    }

    if (method === 'PUT' || method === 'PATCH') {
      if (membership.role !== 'admin') return send(res, 403, { error: 'Admin access required' });
      const { name, description, status } = body;
      if (name) project.name = name;
      if (description !== undefined) project.description = description;
      if (status) project.status = status;
      return send(res, 200, project);
    }

    if (method === 'DELETE') {
      if (membership.role !== 'admin') return send(res, 403, { error: 'Admin access required' });
      const idx = DB.projects.findIndex(p => p.id === projectId);
      DB.projects.splice(idx, 1);
      DB.members = DB.members.filter(m => m.projectId !== projectId);
      DB.tasks = DB.tasks.filter(t => t.projectId !== projectId);
      return send(res, 200, { message: 'Project deleted' });
    }
  }

  if (statsMatch) {
    const projectId = parseInt(statsMatch[1]);
    const membership = DB.members.find(m => m.projectId === projectId && m.userId === auth.userId);
    if (!membership) return send(res, 403, { error: 'Not a member' });
    const tasks = DB.tasks.filter(t => t.projectId === projectId);
    const today = new Date().toISOString().split('T')[0];
    return send(res, 200, {
      total: tasks.length,
      todo: tasks.filter(t => t.status === 'todo').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      done: tasks.filter(t => t.status === 'done').length,
      overdue: tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'done').length
    });
  }

  if (membersMatch) {
    const projectId = parseInt(membersMatch[1]);
    const project = DB.projects.find(p => p.id === projectId);
    if (!project) return send(res, 404, { error: 'Project not found' });
    const membership = DB.members.find(m => m.projectId === projectId && m.userId === auth.userId);
    if (!membership) return send(res, 403, { error: 'Not a member' });

    if (method === 'GET') {
      const members = DB.members.filter(m => m.projectId === projectId).map(m => ({ ...m, user: safeUser(getUser(m.userId)) }));
      return send(res, 200, members);
    }

    if (method === 'POST') {
      if (membership.role !== 'admin') return send(res, 403, { error: 'Admin access required' });
      const { email, role } = body;
      const targetUser = DB.users.find(u => u.email.toLowerCase() === (email || '').toLowerCase());
      if (!targetUser) return send(res, 404, { error: 'User not found' });
      if (DB.members.find(m => m.projectId === projectId && m.userId === targetUser.id)) return send(res, 409, { error: 'Already a member' });
      const m = { id: DB.nextId.members++, projectId, userId: targetUser.id, role: role || 'member' };
      DB.members.push(m);
      return send(res, 201, { ...m, user: safeUser(targetUser) });
    }

    // DELETE /api/projects/:id/members/:userId
    const removeMemberMatch = pathname.match(/^\/api\/projects\/(\d+)\/members\/(\d+)$/);
    if (method === 'DELETE' && removeMemberMatch) {
      if (membership.role !== 'admin') return send(res, 403, { error: 'Admin access required' });
      const targetUserId = parseInt(removeMemberMatch[2]);
      if (targetUserId === auth.userId) return send(res, 400, { error: 'Cannot remove yourself' });
      const idx = DB.members.findIndex(m => m.projectId === projectId && m.userId === targetUserId);
      if (idx === -1) return send(res, 404, { error: 'Member not found' });
      DB.members.splice(idx, 1);
      return send(res, 200, { message: 'Member removed' });
    }

    // PATCH role
    const patchMemberMatch = pathname.match(/^\/api\/projects\/(\d+)\/members\/(\d+)$/);
    if ((method === 'PATCH' || method === 'PUT') && patchMemberMatch) {
      if (membership.role !== 'admin') return send(res, 403, { error: 'Admin access required' });
      const targetUserId = parseInt(patchMemberMatch[2]);
      const m = DB.members.find(m => m.projectId === projectId && m.userId === targetUserId);
      if (!m) return send(res, 404, { error: 'Member not found' });
      if (body.role) m.role = body.role;
      return send(res, 200, { ...m, user: safeUser(getUser(m.userId)) });
    }
  }
}

// TASKS
function handleTasks(method, pathname, req, res, body, auth) {
  const taskMatch = pathname.match(/^\/api\/tasks\/(\d+)$/);

  // GET /api/tasks?projectId=X
  if (method === 'GET' && pathname.startsWith('/api/tasks') && !taskMatch) {
    const qs = new url.URL('http://x' + pathname + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '')).searchParams;
    const projectId = qs.get('projectId');
    let tasks = DB.tasks;
    if (projectId) {
      const pid = parseInt(projectId);
      const membership = DB.members.find(m => m.projectId === pid && m.userId === auth.userId);
      if (!membership) return send(res, 403, { error: 'Not a member' });
      tasks = tasks.filter(t => t.projectId === pid);
    } else {
      const myProjectIds = DB.members.filter(m => m.userId === auth.userId).map(m => m.projectId);
      tasks = tasks.filter(t => myProjectIds.includes(t.projectId));
    }
    tasks = tasks.map(t => ({ ...t, assignee: safeUser(getUser(t.assignedTo)), project: DB.projects.find(p => p.id === t.projectId) }));
    return send(res, 200, tasks);
  }

  // POST /api/tasks
  if (method === 'POST' && pathname === '/api/tasks') {
    const { projectId, title, description, assignedTo, priority, dueDate, status } = body;
    if (!projectId || !title) return send(res, 400, { error: 'Project ID and title required' });
    const pid = parseInt(projectId);
    const membership = DB.members.find(m => m.projectId === pid && m.userId === auth.userId);
    if (!membership) return send(res, 403, { error: 'Not a member of this project' });
    if (assignedTo) {
      const assigneeMember = DB.members.find(m => m.projectId === pid && m.userId === parseInt(assignedTo));
      if (!assigneeMember) return send(res, 400, { error: 'Assignee must be a project member' });
    }
    const task = {
      id: DB.nextId.tasks++, projectId: pid, title, description: description || '',
      status: status || 'todo', priority: priority || 'medium',
      assignedTo: assignedTo ? parseInt(assignedTo) : null,
      createdBy: auth.userId, dueDate: dueDate || null, createdAt: new Date().toISOString()
    };
    DB.tasks.push(task);
    return send(res, 201, { ...task, assignee: safeUser(getUser(task.assignedTo)) });
  }

  if (taskMatch) {
    const taskId = parseInt(taskMatch[1]);
    const task = DB.tasks.find(t => t.id === taskId);
    if (!task) return send(res, 404, { error: 'Task not found' });
    const membership = DB.members.find(m => m.projectId === task.projectId && m.userId === auth.userId);
    if (!membership) return send(res, 403, { error: 'Not a member of this project' });

    if (method === 'GET') return send(res, 200, { ...task, assignee: safeUser(getUser(task.assignedTo)) });

    if (method === 'PUT' || method === 'PATCH') {
      const canEdit = membership.role === 'admin' || task.createdBy === auth.userId || task.assignedTo === auth.userId;
      if (!canEdit) return send(res, 403, { error: 'Cannot edit this task' });
      const { title, description, status, priority, assignedTo, dueDate } = body;
      if (title) task.title = title;
      if (description !== undefined) task.description = description;
      if (status) task.status = status;
      if (priority) task.priority = priority;
      if (assignedTo !== undefined) task.assignedTo = assignedTo ? parseInt(assignedTo) : null;
      if (dueDate !== undefined) task.dueDate = dueDate;
      task.updatedAt = new Date().toISOString();
      return send(res, 200, { ...task, assignee: safeUser(getUser(task.assignedTo)) });
    }

    if (method === 'DELETE') {
      if (membership.role !== 'admin' && task.createdBy !== auth.userId) return send(res, 403, { error: 'Cannot delete this task' });
      const idx = DB.tasks.findIndex(t => t.id === taskId);
      DB.tasks.splice(idx, 1);
      return send(res, 200, { message: 'Task deleted' });
    }
  }
}

// DASHBOARD
function handleDashboard(method, pathname, req, res, auth) {
  if (method === 'GET' && pathname === '/api/dashboard') {
    const myProjectIds = DB.members.filter(m => m.userId === auth.userId).map(m => m.projectId);
    const myProjects = DB.projects.filter(p => myProjectIds.includes(p.id));
    const myTasks = DB.tasks.filter(t => myProjectIds.includes(t.projectId));
    const today = new Date().toISOString().split('T')[0];
    const assigned = myTasks.filter(t => t.assignedTo === auth.userId);

    return send(res, 200, {
      summary: {
        totalProjects: myProjects.length,
        activeProjects: myProjects.filter(p => p.status === 'active').length,
        totalTasks: myTasks.length,
        myTasks: assigned.length,
        overdue: myTasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'done').length,
        completed: myTasks.filter(t => t.status === 'done').length,
        inProgress: myTasks.filter(t => t.status === 'in_progress').length,
        todo: myTasks.filter(t => t.status === 'todo').length
      },
      recentTasks: myTasks
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map(t => ({ ...t, assignee: safeUser(getUser(t.assignedTo)), project: DB.projects.find(p => p.id === t.projectId) })),
      overdueTasks: myTasks
        .filter(t => t.dueDate && t.dueDate < today && t.status !== 'done')
        .map(t => ({ ...t, assignee: safeUser(getUser(t.assignedTo)), project: DB.projects.find(p => p.id === t.projectId) }))
    });
  }
}

// ─── STATIC FILE SERVING ───────────────────────────────────────────────────
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

function serveStatic(req, res) {
  let filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
  if (!filePath.startsWith(path.join(__dirname, 'public'))) { res.writeHead(403); res.end(); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(__dirname, 'public', 'index.html'), (e2, d2) => {
        if (e2) { res.writeHead(404); res.end('Not Found'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(d2);
      });
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  });
}

// ─── MAIN ROUTER ───────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const parsedUrl = new url.URL(req.url, `http://localhost`);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS' });
    return res.end();
  }

  // Static files
  if (!pathname.startsWith('/api/')) return serveStatic(req, res);

  const body = await parseBody(req);

  // Public routes
  if (['/api/auth/register', '/api/auth/login'].includes(pathname) && method === 'POST') {
    return handleAuth(method, pathname, req, res, body);
  }

  // Auth required
  const auth = requireAuth(req, res); if (!auth) return;
  const user = getUser(auth.userId); if (!user) return send(res, 401, { error: 'User not found' });

  if (pathname.startsWith('/api/auth')) return handleAuth(method, pathname, req, res, body);
  if (pathname.startsWith('/api/users')) return handleUsers(method, pathname, req, res, auth);
  if (pathname.startsWith('/api/dashboard')) return handleDashboard(method, pathname, req, res, auth);
  if (pathname.startsWith('/api/projects')) return handleProjects(method, pathname, req, res, body, auth);
  if (pathname.startsWith('/api/tasks')) return handleTasks(method, pathname, req, res, body, auth);

  send(res, 404, { error: 'Not found' });
});

seedDB();
server.listen(PORT, () => console.log(`TaskFlow running on port ${PORT}\nDemo: admin@demo.com / admin123`));
