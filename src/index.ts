import { D1Database } from '@cloudflare/workers-types';
import { checkAuth, ensureDefaultAdmin } from './auth';
import { handleLogin, handleLogout, handleChangePassword, handleUpdateProfile } from './api/auth';
import { handleListLinks, handleCreateLink, handleUpdateLink, handleDeleteLink, handleGetLinkStats, handleDashboardStats, handleDailyStats, handleTopLinks } from './api/links';
import { handleListApiKeys, handleCreateApiKey, handleDeleteApiKey } from './api/apikeys';
import { handleRedirect } from './redirect';
import { handleMcpRequest } from './mcp/index';
import { ADMIN_HTML } from './admin/html';

export interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Ensure default admin user exists (first request only)
    await ensureDefaultAdmin(env.DB);

    const url = new URL(request.url);
    const path = url.pathname;

    // === CORS headers for API routes ===
    const apiCorsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight for API routes
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: apiCorsHeaders });
    }

    // === MCP endpoint ===
    if (path === '/mcp' || path === '/mcp/') {
      return handleMcpRequest(env.DB, request);
    }

    // === API v1 endpoint (external, before /api/ prefix) ===
    if (path === '/api/v1/shorten') {
      return handleV1Shorten(request, env, apiCorsHeaders);
    }

    // === API routes ===
    if (path.startsWith('/api/')) {
      return handleApiRoutes(request, env, ctx, apiCorsHeaders);
    }

    // === Admin panel ===
    if (path === '/admin' || path.startsWith('/admin/')) {
      return handleAdminPanel();
    }

    // === Home page ===
    if (path === '/' || path === '') {
      return new Response(
        `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Short URL Service</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
  .card { background: white; padding: 3rem; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); text-align: center; max-width: 500px; }
  h1 { color: #333; margin-bottom: 0.5rem; font-size: 2rem; }
  p { color: #666; margin-bottom: 1.5rem; }
  .links { display: flex; gap: 1rem; justify-content: center; }
  .links a { padding: 0.75rem 1.5rem; border-radius: 6px; text-decoration: none; font-weight: 500; transition: all 0.2s; }
  .links a.primary { background: #667eea; color: white; }
  .links a.primary:hover { background: #5a6fd6; }
  .links a.secondary { background: #f0f0f0; color: #333; }
  .links a.secondary:hover { background: #e0e0e0; }
</style>
</head>
<body>
  <div class="card">
    <h1>🔗 Short URL</h1>
    <p>简洁高效的短链接服务，基于 Cloudflare Workers</p>
    <div class="links">
      <a href="/admin" class="primary">管理后台</a>
      <a href="/mcp" class="secondary">MCP API</a>
    </div>
  </div>
</body>
</html>`,
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    // === Short link redirect ===
    const slug = path.replace(/^\/+/, '');
    if (slug) {
      return handleRedirect(env.DB, slug, ctx);
    }

    return new Response('Not Found', { status: 404 });
  },
};

async function handleApiRoutes(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Helper to add CORS headers
  const withCors = (resp: Response) => {
    const headers = new Headers(resp.headers);
    for (const [k, v] of Object.entries(corsHeaders)) {
      headers.set(k, v);
    }
    return new Response(resp.body, {
      status: resp.status,
      statusText: resp.statusText,
      headers,
    });
  };

  // === Auth routes (no session required) ===
  if (path === '/api/auth/login' && method === 'POST') {
    const body = await request.json().catch(() => ({})) as { username?: string; password?: string };
    return withCors(await handleLogin(env.DB, body));
  }

  // === Routes that require session ===
  const auth = await checkAuth(env.DB, request);

  // Auth check for session-protected routes
  const requireSession = (handler: () => Promise<Response>) => {
    if (!auth.authenticated || auth.type !== 'session') {
      return withCors(new Response(JSON.stringify({ error: '未登录' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }));
    }
    return handler();
  };

  // Logout
  if (path === '/api/auth/logout' && method === 'POST') {
    const cookieHeader = request.headers.get('Cookie') || '';
    const cookies = parseCookiesSimple(cookieHeader);
    return withCors(await handleLogout(cookies['short_url_session'] || ''));
  }

  // Change password
  if (path === '/api/auth/change-password' && method === 'POST') {
    return requireSession(async () => {
      const body = await request.json().catch(() => ({})) as { old_password?: string; new_password?: string };
      return withCors(await handleChangePassword(env.DB, auth.userId!, body));
    });
  }

  // Update profile (username)
  if (path === '/api/auth/profile' && method === 'PUT') {
    return requireSession(async () => {
      const body = await request.json().catch(() => ({})) as { username?: string };
      return withCors(await handleUpdateProfile(env.DB, auth.userId!, body));
    });
  }

  // Dashboard stats
  if (path === '/api/stats' && method === 'GET') {
    return requireSession(async () => {
      return withCors(await handleDashboardStats(env.DB));
    });
  }

  // Daily stats (charts)
  if (path === '/api/stats/daily' && method === 'GET') {
    return requireSession(async () => {
      return withCors(await handleDailyStats(env.DB, url));
    });
  }

  // Top links
  if (path === '/api/stats/top-links' && method === 'GET') {
    return requireSession(async () => {
      return withCors(await handleTopLinks(env.DB, url));
    });
  }

  // === Link routes ===
  // List links
  if (path === '/api/links' && method === 'GET') {
    return requireSession(async () => {
      return withCors(await handleListLinks(env.DB, url));
    });
  }

  // Create link (session or API key)
  if (path === '/api/links' && method === 'POST') {
    if (!auth.authenticated) {
      return withCors(new Response(JSON.stringify({ error: '未认证' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }));
    }
    const body = await request.json().catch(() => ({})) as { target_url?: string; slug?: string; title?: string };
    return withCors(await handleCreateLink(env.DB, body, auth));
  }

  // Update link
  const linkUpdateMatch = path.match(/^\/api\/links\/(\d+)$/);
  if (linkUpdateMatch && method === 'PUT') {
    const id = parseInt(linkUpdateMatch[1]);
    return requireSession(async () => {
      const body = await request.json().catch(() => ({})) as { slug?: string; target_url?: string; title?: string; is_active?: number };
      return withCors(await handleUpdateLink(env.DB, id, body));
    });
  }

  // Delete link
  if (linkUpdateMatch && method === 'DELETE') {
    const id = parseInt(linkUpdateMatch[1]);
    return requireSession(async () => {
      return withCors(await handleDeleteLink(env.DB, id));
    });
  }

  // Link stats
  const linkStatsMatch = path.match(/^\/api\/links\/(\d+)\/stats$/);
  if (linkStatsMatch && method === 'GET') {
    const id = parseInt(linkStatsMatch[1]);
    return requireSession(async () => {
      return withCors(await handleGetLinkStats(env.DB, id));
    });
  }

  // === API Key routes ===
  if (path === '/api/api-keys' && method === 'GET') {
    return requireSession(async () => {
      return withCors(await handleListApiKeys(env.DB));
    });
  }

  if (path === '/api/api-keys' && method === 'POST') {
    return requireSession(async () => {
      const body = await request.json().catch(() => ({})) as { name?: string };
      return withCors(await handleCreateApiKey(env.DB, body));
    });
  }

  const apiKeyMatch = path.match(/^\/api\/api-keys\/(\d+)$/);
  if (apiKeyMatch && method === 'DELETE') {
    const id = parseInt(apiKeyMatch[1]);
    return requireSession(async () => {
      return withCors(await handleDeleteApiKey(env.DB, id));
    });
  }

  return withCors(new Response(JSON.stringify({ error: 'Not Found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  }));
}

async function handleV1Shorten(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const auth = await checkAuth(env.DB, request);
  if (!auth.authenticated || auth.type !== 'api_key') {
    return new Response(JSON.stringify({ error: '需要有效的 API Key' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const body = await request.json().catch(() => ({})) as { target_url?: string; slug?: string; title?: string };
  const resp = await handleCreateLink(env.DB, body, auth);

  const headers = new Headers(resp.headers);
  for (const [k, v] of Object.entries(corsHeaders)) {
    headers.set(k, v);
  }
  return new Response(resp.body, {
    status: resp.status,
    statusText: resp.statusText,
    headers,
  });
}

async function handleAdminPanel(): Promise<Response> {
  return new Response(ADMIN_HTML, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function parseCookiesSimple(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx > 0) {
      cookies[pair.substring(0, idx).trim()] = pair.substring(idx + 1).trim();
    }
  });
  return cookies;
}
