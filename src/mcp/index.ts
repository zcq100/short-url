import { D1Database } from '@cloudflare/workers-types';
import { validateApiKey } from '../auth';
import { createLink, getLinkBySlug, slugExists } from '../db';

// ============ JSON-RPC 2.0 Types ============

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: number | string | null;
  method: string;
  params?: any;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id?: number | string | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

// ============ MCP Tool Definitions ============

const TOOLS = [
  {
    name: 'create_short_link',
    description: '创建一个新的短链接，返回短链接 URL。可以指定自定义短码或自动生成。',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: '要缩短的目标 URL（必填）',
        },
        slug: {
          type: 'string',
          description: '自定义短码（可选，2-20位字母、数字、下划线和连字符。不提供则自动生成6位短码）',
        },
        title: {
          type: 'string',
          description: '链接标题/备注（可选）',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'get_link_info',
    description: '根据 slug 查询短链接的详细信息，包括目标 URL、点击量、创建时间等。',
    inputSchema: {
      type: 'object',
      properties: {
        slug: {
          type: 'string',
          description: '要查询的短链接 slug（必填）',
        },
      },
      required: ['slug'],
    },
  },
];

// ============ Tool Handlers ============

// Nanoid-like generator
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
  return generateSlug(8);
}

async function handleCreateShortLink(
  db: D1Database,
  args: { url: string; slug?: string; title?: string },
  workerUrl: string
): Promise<any> {
  const { url, slug, title } = args;

  // Validate URL
  try {
    new URL(url);
  } catch {
    throw new Error('无效的 URL 格式');
  }

  let finalSlug = slug;

  if (finalSlug) {
    if (!/^[a-zA-Z0-9_-]{2,20}$/.test(finalSlug)) {
      throw new Error('自定义短码格式无效：2-20位字母、数字、下划线和连字符');
    }
    if (await slugExists(db, finalSlug)) {
      throw new Error('该短码已被使用，请换一个');
    }
  } else {
    finalSlug = await ensureUniqueSlug(db);
  }

  const link = await createLink(db, {
    slug: finalSlug,
    target_url: url,
    title: title || '',
  });

  const baseUrl = workerUrl.replace(/\/+$/, '');

  return {
    id: link.id,
    slug: link.slug,
    short_url: `${baseUrl}/${link.slug}`,
    target_url: link.target_url,
    title: link.title,
    created_at: link.created_at,
  };
}

async function handleGetLinkInfo(
  db: D1Database,
  args: { slug: string }
): Promise<any> {
  const { slug } = args;

  if (!slug) {
    throw new Error('slug 不能为空');
  }

  const link = await getLinkBySlug(db, slug);
  if (!link) {
    throw new Error(`短链接 "${slug}" 不存在或已失效`);
  }

  return {
    id: link.id,
    slug: link.slug,
    target_url: link.target_url,
    title: link.title,
    clicks: link.clicks,
    is_active: link.is_active === 1,
    created_at: link.created_at,
    updated_at: link.updated_at,
  };
}

// ============ Main MCP Handler ============

export async function handleMcpRequest(
  db: D1Database,
  request: Request
): Promise<Response> {
  // CORS preflight
  if (request.method === 'OPTIONS') {
    return corsResponse(new Response(null, { status: 204 }));
  }

  if (request.method !== 'POST') {
    return corsResponse(
      jsonRpcError(null, -32600, 'MCP endpoint only accepts POST requests')
    );
  }

  // Authenticate via API Key
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return corsResponse(
      jsonRpcError(null, -32001, '需要 API Key 认证：Authorization: Bearer <api_key>')
    );
  }

  const apiKey = authHeader.substring(7);
  const keyRecord = await validateApiKey(db, apiKey);
  if (!keyRecord) {
    return corsResponse(
      jsonRpcError(null, -32001, '无效的 API Key')
    );
  }

  // Parse JSON-RPC request
  let rpcRequest: JsonRpcRequest;
  try {
    rpcRequest = await request.json();
  } catch {
    return corsResponse(
      jsonRpcError(null, -32700, 'JSON 解析失败')
    );
  }

  if (rpcRequest.jsonrpc !== '2.0') {
    return corsResponse(
      jsonRpcError(rpcRequest.id ?? null, -32600, '仅支持 JSON-RPC 2.0')
    );
  }

  // Build worker URL for short link generation
  const url = new URL(request.url);
  const workerUrl = `${url.protocol}//${url.host}`;

  try {
    const result = await handleMethod(db, rpcRequest, workerUrl);
    return corsResponse(result);
  } catch (err: any) {
    return corsResponse(
      jsonRpcError(rpcRequest.id ?? null, -32000, err.message || 'Internal error')
    );
  }
}

async function handleMethod(
  db: D1Database,
  req: JsonRpcRequest,
  workerUrl: string
): Promise<Response> {
  switch (req.method) {
    case 'initialize':
      return jsonRpcResult(req.id ?? null, {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: 'short-url',
          version: '1.0.0',
        },
      });

    case 'notifications/initialized':
      // No response needed for notifications
      return new Response(null, { status: 204 });

    case 'tools/list':
      return jsonRpcResult(req.id ?? null, {
        tools: TOOLS,
      });

    case 'tools/call': {
      const { name, arguments: args } = req.params || {};
      const tool = TOOLS.find(t => t.name === name);
      if (!tool) {
        return jsonRpcError(req.id ?? null, -32601, `未知工具: ${name}`);
      }

      let result: any;
      try {
        switch (name) {
          case 'create_short_link':
            result = await handleCreateShortLink(db, args || {}, workerUrl);
            break;
          case 'get_link_info':
            result = await handleGetLinkInfo(db, args || {});
            break;
          default:
            return jsonRpcError(req.id ?? null, -32601, `未知工具: ${name}`);
        }
      } catch (err: any) {
        // Return error as tool result (not JSON-RPC error) for tool execution failures
        return jsonRpcResult(req.id ?? null, {
          content: [{ type: 'text', text: `错误: ${err.message}` }],
          isError: true,
        });
      }

      return jsonRpcResult(req.id ?? null, {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      });
    }

    case 'ping':
      return jsonRpcResult(req.id ?? null, {});

    default:
      return jsonRpcError(req.id ?? null, -32601, `未知方法: ${req.method}`);
  }
}

// ============ Response Helpers ============

function jsonRpcResult(id: number | string | null, result: any): Response {
  const body: JsonRpcResponse = {
    jsonrpc: '2.0',
    id,
    result,
  };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function jsonRpcError(
  id: number | string | null,
  code: number,
  message: string,
  data?: any
): Response {
  const body: JsonRpcResponse = {
    jsonrpc: '2.0',
    id,
    error: { code, message, ...(data ? { data } : {}) },
  };
  return new Response(JSON.stringify(body), {
    status: code === -32001 ? 401 : 400,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function corsResponse(response: Response): Response {
  const newHeaders = new Headers(response.headers);
  newHeaders.set('Access-Control-Allow-Origin', '*');
  newHeaders.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}
