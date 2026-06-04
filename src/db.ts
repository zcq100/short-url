import { D1Database } from '@cloudflare/workers-types';

export interface Link {
  id: number;
  slug: string;
  target_url: string;
  title: string;
  clicks: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: number;
  name: string;
  key_hash: string;
  key_prefix: string;
  is_active: number;
  created_at: string;
  last_used_at: string | null;
}

export interface Session {
  id: string;
  user_id: number;
  created_at: string;
  expires_at: string;
}

// ============ Links ============

export async function getLinkBySlug(db: D1Database, slug: string): Promise<Link | null> {
  const stmt = db.prepare('SELECT * FROM links WHERE slug = ? AND is_active = 1');
  const result = await stmt.bind(slug).first<Link>();
  return result || null;
}

export async function getLinkById(db: D1Database, id: number): Promise<Link | null> {
  const stmt = db.prepare('SELECT * FROM links WHERE id = ?');
  const result = await stmt.bind(id).first<Link>();
  return result || null;
}

export async function listLinks(
  db: D1Database,
  options: { page?: number; pageSize?: number; search?: string }
): Promise<{ links: Link[]; total: number }> {
  const { page = 1, pageSize = 20, search = '' } = options;
  const offset = (page - 1) * pageSize;

  let countQuery = 'SELECT COUNT(*) as total FROM links';
  let dataQuery = 'SELECT * FROM links';
  const params: any[] = [];

  if (search) {
    const where = ' WHERE slug LIKE ? OR target_url LIKE ? OR title LIKE ?';
    const pattern = `%${search}%`;
    countQuery += where;
    dataQuery += where;
    params.push(pattern, pattern, pattern);
  }

  dataQuery += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

  let countStmt = db.prepare(countQuery);
  let dataStmt = db.prepare(dataQuery);

  if (params.length > 0) {
    countStmt = countStmt.bind(...params);
    dataStmt = dataStmt.bind(...params, pageSize, offset);
  } else {
    dataStmt = dataStmt.bind(pageSize, offset);
  }

  const countResult = await countStmt.first<{ total: number }>();
  const links = await dataStmt.all<Link>();

  return {
    links: links.results,
    total: countResult?.total ?? 0,
  };
}

export async function createLink(
  db: D1Database,
  data: { slug: string; target_url: string; title?: string }
): Promise<Link> {
  const stmt = db.prepare(
    'INSERT INTO links (slug, target_url, title) VALUES (?, ?, ?) RETURNING *'
  );
  const result = await stmt.bind(data.slug, data.target_url, data.title || '').first<Link>();
  return result!;
}

export async function updateLink(
  db: D1Database,
  id: number,
  data: { slug?: string; target_url?: string; title?: string; is_active?: number }
): Promise<Link | null> {
  const fields: string[] = ['updated_at = CURRENT_TIMESTAMP'];
  const values: any[] = [];

  if (data.slug !== undefined) { fields.push('slug = ?'); values.push(data.slug); }
  if (data.target_url !== undefined) { fields.push('target_url = ?'); values.push(data.target_url); }
  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
  if (data.is_active !== undefined) { fields.push('is_active = ?'); values.push(data.is_active); }

  values.push(id);
  const stmt = db.prepare(`UPDATE links SET ${fields.join(', ')} WHERE id = ? RETURNING *`);
  const result = await stmt.bind(...values).first<Link>();
  return result || null;
}

export async function deleteLink(db: D1Database, id: number): Promise<boolean> {
  const stmt = db.prepare('DELETE FROM links WHERE id = ?');
  const result = await stmt.bind(id).run();
  return result.meta?.changes === 1;
}

export async function incrementClicks(db: D1Database, slug: string): Promise<void> {
  const stmt = db.prepare('UPDATE links SET clicks = clicks + 1 WHERE slug = ?');
  await stmt.bind(slug).run();
}

export async function slugExists(db: D1Database, slug: string): Promise<boolean> {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM links WHERE slug = ?');
  const result = await stmt.bind(slug).first<{ count: number }>();
  return (result?.count ?? 0) > 0;
}

export async function getDashboardStats(db: D1Database): Promise<{ totalLinks: number; totalClicks: number }> {
  const result = await db.prepare(
    'SELECT COUNT(*) as totalLinks, COALESCE(SUM(clicks), 0) as totalClicks FROM links'
  ).first<{ totalLinks: number; totalClicks: number }>();
  return { totalLinks: result?.totalLinks ?? 0, totalClicks: result?.totalClicks ?? 0 };
}

// ============ Users ============

export async function getUserByUsername(db: D1Database, username: string): Promise<User | null> {
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  const result = await stmt.bind(username).first<User>();
  return result || null;
}

export async function getUserById(db: D1Database, id: number): Promise<User | null> {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  const result = await stmt.bind(id).first<User>();
  return result || null;
}

export async function createUser(
  db: D1Database,
  data: { username: string; password_hash: string }
): Promise<User> {
  const stmt = db.prepare(
    'INSERT INTO users (username, password_hash) VALUES (?, ?) RETURNING *'
  );
  const result = await stmt.bind(data.username, data.password_hash).first<User>();
  return result!;
}

export async function updateUser(
  db: D1Database,
  id: number,
  data: { username?: string; password_hash?: string }
): Promise<User | null> {
  const fields: string[] = ['updated_at = CURRENT_TIMESTAMP'];
  const values: any[] = [];

  if (data.username !== undefined) { fields.push('username = ?'); values.push(data.username); }
  if (data.password_hash !== undefined) { fields.push('password_hash = ?'); values.push(data.password_hash); }

  values.push(id);
  const stmt = db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ? RETURNING *`);
  const result = await stmt.bind(...values).first<User>();
  return result || null;
}

export async function countUsers(db: D1Database): Promise<number> {
  const result = await db.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>();
  return result?.count ?? 0;
}

// ============ API Keys ============

export async function getApiKeyByHash(db: D1Database, keyHash: string): Promise<ApiKey | null> {
  const stmt = db.prepare('SELECT * FROM api_keys WHERE key_hash = ? AND is_active = 1');
  const result = await stmt.bind(keyHash).first<ApiKey>();
  return result || null;
}

export async function listApiKeys(db: D1Database): Promise<ApiKey[]> {
  const result = await db.prepare(
    'SELECT id, name, key_prefix, is_active, created_at, last_used_at FROM api_keys ORDER BY created_at DESC'
  ).all<ApiKey>();
  return result.results;
}

export async function createApiKey(
  db: D1Database,
  data: { name: string; key_hash: string; key_prefix: string }
): Promise<ApiKey> {
  const stmt = db.prepare(
    'INSERT INTO api_keys (name, key_hash, key_prefix) VALUES (?, ?, ?) RETURNING *'
  );
  const result = await stmt.bind(data.name, data.key_hash, data.key_prefix).first<ApiKey>();
  return result!;
}

export async function deleteApiKey(db: D1Database, id: number): Promise<boolean> {
  const stmt = db.prepare('DELETE FROM api_keys WHERE id = ?');
  const result = await stmt.bind(id).run();
  return result.meta?.changes === 1;
}

export async function updateApiKeyLastUsed(db: D1Database, id: number): Promise<void> {
  const stmt = db.prepare('UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?');
  await stmt.bind(id).run();
}

// ============ Sessions ============

export async function createSession(
  db: D1Database,
  data: { id: string; user_id: number; expires_at: string }
): Promise<Session> {
  const stmt = db.prepare(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?) RETURNING *'
  );
  const result = await stmt.bind(data.id, data.user_id, data.expires_at).first<Session>();
  return result!;
}

export async function getSession(db: D1Database, sessionId: string): Promise<Session | null> {
  const stmt = db.prepare(
    'SELECT * FROM sessions WHERE id = ? AND expires_at > CURRENT_TIMESTAMP'
  );
  const result = await stmt.bind(sessionId).first<Session>();
  return result || null;
}

export async function deleteSession(db: D1Database, sessionId: string): Promise<void> {
  const stmt = db.prepare('DELETE FROM sessions WHERE id = ?');
  await stmt.bind(sessionId).run();
}

export async function cleanExpiredSessions(db: D1Database): Promise<void> {
  const stmt = db.prepare('DELETE FROM sessions WHERE expires_at <= CURRENT_TIMESTAMP');
  await stmt.run();
}
