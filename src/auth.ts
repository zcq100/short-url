import { D1Database } from '@cloudflare/workers-types';
import {
  getUserByUsername,
  getUserById,
  createUser,
  updateUser,
  countUsers,
  getSession,
  createSession,
  deleteSession,
  cleanExpiredSessions,
  getApiKeyByHash,
  updateApiKeyLastUsed,
  type User,
  type ApiKey,
} from './db';

// ============ Crypto Helpers ============

type BufferInput = ArrayBuffer | Uint8Array;

function base64Encode(buf: BufferInput): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64UrlEncode(buf: BufferInput): string {
  return base64Encode(buf)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

const SALT_LENGTH = 16;

async function generateSalt(): Promise<string> {
  const bytes = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  return base64UrlEncode(bytes);
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(hashBuffer);
}

export async function hashPasswordWithSalt(password: string): Promise<string> {
  const salt = await generateSalt();
  const hash = await hashPassword(password, salt);
  // Format: salt:hash
  return `${salt}:${hash}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, originalHash] = parts;
  const hash = await hashPassword(password, salt);
  return hash === originalHash;
}

// ============ Session ============

function generateUuid(): string {
  return crypto.randomUUID();
}

export const SESSION_COOKIE = 'short_url_session';
const SESSION_TTL_HOURS = 24;

export async function createUserSession(
  db: D1Database,
  userId: number
): Promise<{ sessionId: string; expiresAt: Date }> {
  const sessionId = generateUuid();
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);

  await createSession(db, {
    id: sessionId,
    user_id: userId,
    expires_at: expiresAt.toISOString(),
  });

  return { sessionId, expiresAt };
}

export async function validateSession(
  db: D1Database,
  sessionId: string
): Promise<User | null> {
  // Clean expired sessions occasionally
  await cleanExpiredSessions(db);

  const session = await getSession(db, sessionId);
  if (!session) return null;

  const user = await getUserById(db, session.user_id);
  return user;
}

export function sessionCookie(sessionId: string, expiresAt: Date): string {
  return `${SESSION_COOKIE}=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Expires=${expiresAt.toUTCString()}; Secure`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

// ============ API Key ============

const API_KEY_PREFIX = 'su_'; // short-url

export function generateApiKey(): { fullKey: string; prefix: string; hash: string } {
  const randomBytes = crypto.getRandomValues(new Uint8Array(24));
  const keyBody = base64UrlEncode(randomBytes);
  const fullKey = `${API_KEY_PREFIX}${keyBody}`;
  const prefix = fullKey.substring(0, 10); // First 10 chars for display

  // Use SHA-256 for the hash stored in DB
  return { fullKey, prefix, hash: '' }; // hash will be computed async
}

export async function hashApiKey(fullKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(fullKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(hashBuffer);
}

export async function validateApiKey(
  db: D1Database,
  apiKey: string
): Promise<ApiKey | null> {
  const keyHash = await hashApiKey(apiKey);
  const keyRecord = await getApiKeyByHash(db, keyHash);
  if (!keyRecord) return null;

  // Update last_used_at asynchronously via ctx.waitUntil if available
  await updateApiKeyLastUsed(db, keyRecord.id);
  return keyRecord;
}

// ============ Auto-init default admin ============

const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = 'admin123';

export async function ensureDefaultAdmin(db: D1Database): Promise<void> {
  const userCount = await countUsers(db);
  if (userCount === 0) {
    const passwordHash = await hashPasswordWithSalt(DEFAULT_PASSWORD);
    await createUser(db, { username: DEFAULT_USERNAME, password_hash: passwordHash });
    console.log('Default admin user created (admin / admin123)');
  }
}

// ============ Auth middleware helpers ============

export interface AuthResult {
  authenticated: boolean;
  type: 'session' | 'api_key' | 'none';
  userId?: number;
  apiKeyId?: number;
}

export async function checkAuth(
  db: D1Database,
  request: Request
): Promise<AuthResult> {
  // 1. Check for API Key in Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const apiKey = authHeader.substring(7);
    const keyRecord = await validateApiKey(db, apiKey);
    if (keyRecord) {
      return {
        authenticated: true,
        type: 'api_key',
        apiKeyId: keyRecord.id,
      };
    }
  }

  // 2. Check for Session cookie
  const cookieHeader = request.headers.get('Cookie') || '';
  const cookies = parseCookies(cookieHeader);
  const sessionId = cookies[SESSION_COOKIE];

  if (sessionId) {
    const user = await validateSession(db, sessionId);
    if (user) {
      return {
        authenticated: true,
        type: 'session',
        userId: user.id,
      };
    }
  }

  return { authenticated: false, type: 'none' };
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx > 0) {
      const key = pair.substring(0, idx).trim();
      const value = pair.substring(idx + 1).trim();
      cookies[key] = value;
    }
  });
  return cookies;
}
