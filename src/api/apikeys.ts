import { D1Database } from '@cloudflare/workers-types';
import { listApiKeys, createApiKey, deleteApiKey } from '../db';
import { generateApiKey, hashApiKey } from '../auth';

export async function handleListApiKeys(
  db: D1Database
): Promise<Response> {
  const keys = await listApiKeys(db);

  // Don't expose key_hash — only prefix for display
  const safeKeys = keys.map(k => ({
    id: k.id,
    name: k.name,
    key_prefix: k.key_prefix,
    is_active: k.is_active,
    created_at: k.created_at,
    last_used_at: k.last_used_at,
  }));

  return json(safeKeys);
}

export async function handleCreateApiKey(
  db: D1Database,
  body: { name?: string }
): Promise<Response> {
  const { name } = body;

  if (!name || name.trim().length === 0) {
    return json({ error: 'Key 名称不能为空' }, 400);
  }

  const { fullKey, prefix } = generateApiKey();
  const hash = await hashApiKey(fullKey);

  const keyRecord = await createApiKey(db, {
    name: name.trim(),
    key_hash: hash,
    key_prefix: prefix,
  });

  // Return the full key only once — it cannot be recovered later
  return json({
    id: keyRecord.id,
    name: keyRecord.name,
    key: fullKey,
    key_prefix: keyRecord.key_prefix,
    created_at: keyRecord.created_at,
    warning: '请立即保存此 API Key，之后无法再次查看完整 Key',
  }, 201);
}

export async function handleDeleteApiKey(
  db: D1Database,
  id: number
): Promise<Response> {
  const success = await deleteApiKey(db, id);
  if (!success) {
    return json({ error: 'API Key 不存在' }, 404);
  }
  return json({ success: true, message: 'API Key 已删除' });
}

// ============ Utility ============

function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
