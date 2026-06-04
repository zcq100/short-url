import { D1Database } from '@cloudflare/workers-types';
import { getLinkBySlug, incrementClicks } from './db';

export async function handleRedirect(
  db: D1Database,
  slug: string,
  ctx: ExecutionContext
): Promise<Response> {
  const link = await getLinkBySlug(db, slug);

  if (!link) {
    return new Response(
      `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>链接不存在 - Short URL</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
  .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
  h1 { color: #e74c3c; margin-bottom: 0.5rem; }
  p { color: #666; }
</style>
</head>
<body>
  <div class="card">
    <h1>404</h1>
    <p>该短链接不存在或已失效</p>
  </div>
</body>
</html>`,
      { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  // Increment click count asynchronously (don't block redirect)
  ctx.waitUntil(incrementClicks(db, slug));

  return Response.redirect(link.target_url, 301);
}
