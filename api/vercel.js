import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { searchNutritionDb, analyzeMealNutrition } from '../src/nutrition-engine.mjs';

const DATA_DIR = process.env.DATA_DIR || '/tmp/aetherix-data';
const SECRET = process.env.SESSION_SECRET || 'aetherix-serverless-hmac-key-v1';
const SESSION_DAYS = 90;

function ensureDir() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch {
    // Ignore read-only edge environments
  }
}

function sendJson(res, status, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  for (const [k, v] of Object.entries(extraHeaders)) {
    res.setHeader(k, v);
  }
  res.end(body);
}

function signToken(data) {
  const b64 = Buffer.from(JSON.stringify(data), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(b64).digest('base64url');
  return `${b64}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const b64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac('sha256', SECRET).update(b64).digest('base64url');
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
    if (parsed.exp && Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

function parseCookies(req) {
  const raw = req.headers?.cookie || '';
  const out = {};
  for (const part of raw.split(';')) {
    const eq = part.indexOf('=');
    if (eq > 0) {
      const k = part.slice(0, eq).trim();
      const v = part.slice(eq + 1).trim();
      out[k] = decodeURIComponent(v);
    }
  }
  return out;
}

function readSession(req) {
  const auth = req.headers?.authorization || '';
  if (/^Bearer\s+/i.test(auth)) {
    const tok = auth.replace(/^Bearer\s+/i, '').trim();
    const s = verifyToken(tok);
    if (s?.user?.id) return s.user;
  }
  const cookies = parseCookies(req);
  if (cookies.aetherix_sess) {
    const s = verifyToken(cookies.aetherix_sess);
    if (s?.user?.id) return s.user;
  }
  return null;
}

function sessionCookieHeader(user, req) {
  const exp = Date.now() + SESSION_DAYS * 86400000;
  const token = signToken({ user, exp });
  const isHttps = (req.headers?.['x-forwarded-proto'] || 'https').includes('https');
  const maxAge = SESSION_DAYS * 86400;
  return `aetherix_sess=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${isHttps ? '; Secure' : ''}`;
}

function clearCookieHeader(req) {
  const isHttps = (req.headers?.['x-forwarded-proto'] || 'https').includes('https');
  return `aetherix_sess=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isHttps ? '; Secure' : ''}`;
}

function usersDbPath() {
  return path.join(DATA_DIR, 'users.json');
}

function readUsers() {
  try {
    ensureDir();
    const p = usersDbPath();
    if (!fs.existsSync(p)) return [];
    return JSON.parse(fs.readFileSync(p, 'utf8')) || [];
  } catch {
    return [];
  }
}

function writeUsers(users) {
  try {
    ensureDir();
    fs.writeFileSync(usersDbPath(), JSON.stringify(users, null, 2));
  } catch {
    // Ignore ephemeral write failure
  }
}

function userStatePath(uid) {
  const safe = String(uid || '').replace(/[^a-zA-Z0-9_-]/g, '');
  return path.join(DATA_DIR, `state-${safe}.json`);
}

function readUserState(uid) {
  try {
    const p = userStatePath(uid);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function writeUserState(uid, state) {
  try {
    ensureDir();
    fs.writeFileSync(userStatePath(uid), JSON.stringify(state));
  } catch {
    // Ignore ephemeral write failure
  }
}

function hashPw(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derived = crypto.scryptSync(String(password), salt, 32).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPw(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const check = crypto.scryptSync(String(password), salt, 32).toString('hex');
  return hash.length === check.length && crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(check));
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.trim()) {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

export default async function handler(req, res) {
  ensureDir();
  const urlObj = new URL(req.url || '/api/health', `https://${req.headers?.host || 'localhost'}`);
  const pathname = urlObj.pathname.replace(/\/+$/, '') || '/api';
  const method = (req.method || 'GET').toUpperCase();

  try {
    if (method === 'GET' && pathname === '/api/health') {
      return sendJson(res, 200, { ok: true, writable: true });
    }

    if (method === 'GET' && pathname === '/api/config') {
      return sendJson(res, 200, {
        invite_only: false,
        allow_guest: true,
        password_login: true,
      });
    }

    if (method === 'GET' && pathname === '/api/nutrition/search') {
      const q = urlObj.searchParams.get('q') || '';
      const limit = urlObj.searchParams.get('limit') || 12;
      const out = await searchNutritionDb(q, limit, DATA_DIR);
      return sendJson(res, 200, out);
    }

    if (method === 'POST' && pathname === '/api/nutrition/analyze') {
      const body = await readJsonBody(req);
      const out = await analyzeMealNutrition(body || {}, DATA_DIR);
      return sendJson(res, 200, out);
    }

    if (method === 'GET' && pathname === '/api/me') {
      const user = readSession(req);
      if (!user) return sendJson(res, 401, { error: 'not signed in' });
      return sendJson(res, 200, { user });
    }

    if (method === 'POST' && pathname === '/api/register/password') {
      const body = await readJsonBody(req);
      const name = String(body.name || '').trim().slice(0, 40);
      const password = String(body.password || '');
      if (!name) return sendJson(res, 400, { error: 'Enter a name' });
      if (password.length < 8) return sendJson(res, 400, { error: 'Password must be at least 8 characters' });

      const users = readUsers();
      const key = name.toLowerCase();
      if (users.some(u => u.name.toLowerCase() === key)) {
        return sendJson(res, 409, { error: 'That name is already taken' });
      }
      const userRecord = {
        id: crypto.randomBytes(12).toString('hex'),
        name,
        admin: users.length === 0,
        owner: users.length === 0,
        created: Date.now(),
        pw: hashPw(password),
      };
      users.push(userRecord);
      writeUsers(users);
      const pubUser = { id: userRecord.id, name: userRecord.name, admin: userRecord.admin, owner: userRecord.owner, hasPassword: true };
      return sendJson(res, 200, { user: pubUser }, { 'Set-Cookie': sessionCookieHeader(pubUser, req) });
    }

    if (method === 'POST' && pathname === '/api/login/password') {
      const body = await readJsonBody(req);
      const name = String(body.name || '').trim();
      const password = String(body.password || '');
      if (!name || !password) return sendJson(res, 400, { error: 'Enter your name and password' });

      const users = readUsers();
      const found = users.find(u => u.name.toLowerCase() === name.toLowerCase());
      if (!found || !verifyPw(password, found.pw)) {
        return sendJson(res, 401, { error: 'Wrong name or password' });
      }
      const pubUser = { id: found.id, name: found.name, admin: !!found.admin, owner: !!found.owner, hasPassword: true };
      return sendJson(res, 200, { user: pubUser }, { 'Set-Cookie': sessionCookieHeader(pubUser, req) });
    }

    if (method === 'POST' && (pathname === '/api/logout' || pathname === '/api/logout/all')) {
      return sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearCookieHeader(req) });
    }

    if (method === 'GET' && pathname === '/api/data') {
      const user = readSession(req);
      if (!user) return sendJson(res, 401, { error: 'not signed in' });
      const st = readUserState(user.id);
      if (!st) return sendJson(res, 200, { state: null, rev: 0 });
      const copy = { ...st };
      delete copy._rev;
      delete copy._wids;
      return sendJson(res, 200, { state: copy, rev: st._rev || 0 });
    }

    if (method === 'GET' && pathname === '/api/data/rev') {
      const user = readSession(req);
      if (!user) return sendJson(res, 401, { error: 'not signed in' });
      const st = readUserState(user.id);
      return sendJson(res, 200, { rev: st?._rev || 0, ...(st?._wid ? { wid: st._wid } : {}) });
    }

    if (method === 'PUT' && pathname === '/api/data') {
      const user = readSession(req);
      if (!user) return sendJson(res, 401, { error: 'not signed in' });
      const body = await readJsonBody(req);
      if (!body.state || typeof body.state !== 'object' || Array.isArray(body.state)) {
        return sendJson(res, 400, { error: 'state required' });
      }
      const cur = readUserState(user.id);
      const curRev = cur?._rev || 0;
      const nextRev = Math.max(curRev, Number(body.baseRev) || 0) + 1;
      const wid = crypto.randomBytes(8).toString('hex');
      const nextState = { ...body.state, _rev: nextRev, _wid: wid };
      delete nextState.active;
      writeUserState(user.id, nextState);
      return sendJson(res, 200, { ok: true, ts: body.state._ts || null, rev: nextRev, wid });
    }

    if (method === 'GET' && pathname === '/api/passkeys') {
      const user = readSession(req);
      if (!user) return sendJson(res, 401, { error: 'not signed in' });
      return sendJson(res, 200, { passkeys: [] });
    }

    if (method === 'GET' && pathname === '/api/push/status') {
      return sendJson(res, 200, { enabled: false, subscribed: false });
    }

    if (method === 'POST' && pathname === '/api/activity') {
      return sendJson(res, 200, { ok: true });
    }

    return sendJson(res, 404, { error: 'not found' });
  } catch (err) {
    console.error('Vercel API error:', err);
    return sendJson(res, 500, { error: 'server error' });
  }
}
