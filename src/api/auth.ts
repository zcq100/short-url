import { D1Database } from '@cloudflare/workers-types';
import { verifyPassword, hashPasswordWithSalt, createUserSession, clearSessionCookie } from '../auth';
import { getUserByUsername, getUserById, updateUser } from '../db';

export async function handleLogin(
  db: D1Database,
  body: { username?: string; password?: string }
): Promise<Response> {
  const { username, password } = body;

  if (!username || !password) {
    return json({ error: '用户名和密码不能为空' }, 400);
  }

  const user = await getUserByUsername(db, username);
  if (!user) {
    return json({ error: '用户名或密码错误' }, 401);
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return json({ error: '用户名或密码错误' }, 401);
  }

  const { sessionId, expiresAt } = await createUserSession(db, user.id);

  return json(
    { success: true, message: '登录成功' },
    200,
    {
      'Set-Cookie': `short_url_session=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Expires=${expiresAt.toUTCString()}; Secure`,
    }
  );
}

export async function handleLogout(sessionId: string): Promise<Response> {
  return json(
    { success: true, message: '已退出登录' },
    200,
    {
      'Set-Cookie': clearSessionCookie(),
    }
  );
}

export async function handleChangePassword(
  db: D1Database,
  userId: number,
  body: { old_password?: string; new_password?: string }
): Promise<Response> {
  const { old_password, new_password } = body;

  if (!old_password || !new_password) {
    return json({ error: '旧密码和新密码不能为空' }, 400);
  }

  if (new_password.length < 6) {
    return json({ error: '新密码长度不能少于6位' }, 400);
  }

  const currentUser = await getUserById(db, userId);
  if (!currentUser) {
    return json({ error: '用户不存在' }, 404);
  }

  const valid = await verifyPassword(old_password, currentUser.password_hash);
  if (!valid) {
    return json({ error: '旧密码错误' }, 401);
  }

  const newHash = await hashPasswordWithSalt(new_password);
  await updateUser(db, userId, { password_hash: newHash });

  return json({ success: true, message: '密码修改成功' });
}

export async function handleUpdateProfile(
  db: D1Database,
  userId: number,
  body: { username?: string }
): Promise<Response> {
  const { username } = body;

  if (!username || username.length < 2) {
    return json({ error: '用户名长度不能少于2位' }, 400);
  }

  await updateUser(db, userId, { username });

  return json({ success: true, message: '用户名修改成功' });
}

// ============ Utility ============

function json(data: any, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders,
    },
  });
}
