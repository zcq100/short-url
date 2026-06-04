import { D1Database } from '@cloudflare/workers-types';
import {
  listLinks,
  createLink,
  updateLink,
  deleteLink,
  getLinkById,
  slugExists,
  getDashboardStats,
  getDailyNewLinks,
  getDailyClicks,
  getTopLinks,
} from '../db';
import type { AuthResult } from '../auth';

// Nanoid-like ID generator (no dependency needed)
function generateSlug(length = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

async function ensureUniqueSlug(db: D1Database): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const slug = generateSlug();
    if (!(await slugExists(db, slug))) {
      return slug;
    }
  }
  // Fallback: longer slug if collisions occur
  return generateSlug(8);
}

export async function handleListLinks(
  db: D1Database,
  url: URL
): Promise<Response> {
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);
  const search = url.searchParams.get('search') || '';

  const result = await listLinks(db, { page, pageSize, search });

  return json({
    links: result.links,
    total: result.total,
    page,
    pageSize,
    totalPages: Math.ceil(result.total / pageSize),
  });
}

export async function handleCreateLink(
  db: D1Database,
  body: { target_url?: string; slug?: string; title?: string },
  auth: AuthResult
): Promise<Response> {
  const { target_url, slug, title } = body;

  if (!target_url) {
    return json({ error: '目标 URL 不能为空' }, 400);
  }

  // Validate URL
  try {
    new URL(target_url);
  } catch {
    return json({ error: '无效的 URL 格式' }, 400);
  }

  let finalSlug = slug;

  if (finalSlug) {
    // Custom slug validation
    if (!/^[a-zA-Z0-9_-]{2,20}$/.test(finalSlug)) {
      return json({ error: '自定义短码格式无效：2-20位字母、数字、下划线和连字符' }, 400);
    }
    if (await slugExists(db, finalSlug)) {
      return json({ error: '该短码已被使用' }, 409);
    }
  } else {
    finalSlug = await ensureUniqueSlug(db);
  }

  const link = await createLink(db, {
    slug: finalSlug!,
    target_url,
    title: title || '',
  });

  return json(link, 201);
}

export async function handleUpdateLink(
  db: D1Database,
  id: number,
  body: { slug?: string; target_url?: string; title?: string; is_active?: number }
): Promise<Response> {
  const existing = await getLinkById(db, id);
  if (!existing) {
    return json({ error: '链接不存在' }, 404);
  }

  // If slug is being changed, check uniqueness
  if (body.slug && body.slug !== existing.slug) {
    if (!/^[a-zA-Z0-9_-]{2,20}$/.test(body.slug)) {
      return json({ error: '自定义短码格式无效：2-20位字母、数字、下划线和连字符' }, 400);
    }
    if (await slugExists(db, body.slug)) {
      return json({ error: '该短码已被使用' }, 409);
    }
  }

  // Validate URL if provided
  if (body.target_url) {
    try {
      new URL(body.target_url);
    } catch {
      return json({ error: '无效的 URL 格式' }, 400);
    }
  }

  const updated = await updateLink(db, id, body);
  return json(updated);
}

export async function handleDeleteLink(
  db: D1Database,
  id: number
): Promise<Response> {
  const success = await deleteLink(db, id);
  if (!success) {
    return json({ error: '链接不存在' }, 404);
  }
  return json({ success: true, message: '链接已删除' });
}

export async function handleGetLinkStats(
  db: D1Database,
  id: number
): Promise<Response> {
  const link = await getLinkById(db, id);
  if (!link) {
    return json({ error: '链接不存在' }, 404);
  }
  return json(link);
}

export async function handleDashboardStats(
  db: D1Database
): Promise<Response> {
  const stats = await getDashboardStats(db);
  return json(stats);
}

export async function handleDailyStats(
  db: D1Database,
  url: URL
): Promise<Response> {
  const days = parseInt(url.searchParams.get('days') || '30', 10);
  const [newLinks, clicks] = await Promise.all([
    getDailyNewLinks(db, days),
    getDailyClicks(db, days),
  ]);
  return json({ newLinks, clicks });
}

export async function handleTopLinks(
  db: D1Database,
  url: URL
): Promise<Response> {
  const limit = parseInt(url.searchParams.get('limit') || '10', 10);
  const links = await getTopLinks(db, limit);
  return json(links);
}

// ============ Utility ============

function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
