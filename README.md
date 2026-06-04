# 🔗 Short URL - Cloudflare Worker 短链接服务

基于 Cloudflare Workers + D1 的短链接服务，支持管理后台、API Key 管理和 MCP 协议。

## 功能

- 📎 **短链接跳转** — `GET /:slug` 301 重定向
- 🖥️ **管理后台** — Web UI 管理链接、API Key、修改密码
- 🔑 **API Key** — 支持程序化创建短链接
- 🤖 **MCP Server** — 支持 AI Agent（Claude Desktop 等）直接创建短链接
- 📊 **点击统计** — 每个链接的点击量追踪

## 部署

### 1. 前置条件

```bash
npm install -g wrangler
npm install
```

### 2. 创建 D1 数据库

```bash
wrangler d1 create short-url-db
```

将输出的 `database_id` 填入 `wrangler.toml` 的 `[[d1_databases]].database_id` 字段。

### 3. 运行数据库迁移

```bash
# 本地开发
wrangler d1 execute short-url-db --local --file=./migrations/0001_init.sql

# 生产环境
wrangler d1 execute short-url-db --file=./migrations/0001_init.sql
```

### 4. 本地开发

```bash
npm run dev
```

### 5. 部署到 Cloudflare

```bash
npm run deploy
```

## 使用

### 默认管理员账户

首次启动时自动创建:
- 用户名: `admin`
- 密码: `admin123`

⚠️ **部署后请立即修改密码！**

### 管理后台

访问 `https://<your-worker>.workers.dev/admin` 进入管理后台。

### REST API 创建短链接

```bash
curl -X POST https://<your-worker>.workers.dev/api/v1/shorten \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <api-key>" \
  -d '{"target_url": "https://example.com", "slug": "my-link"}'
```

### MCP 客户端配置

在 Claude Desktop 的 `claude_desktop_config.json` 中添加:

```json
{
  "mcpServers": {
    "short-url": {
      "type": "http",
      "url": "https://<your-worker>.workers.dev/mcp",
      "headers": {
        "Authorization": "Bearer <your-api-key>"
      }
    }
  }
}
```

配置后，AI Agent 可以直接调用 `create_short_link` 和 `get_link_info` 工具。

### MCP 工具列表

| 工具名 | 描述 | 参数 |
|--------|------|------|
| `create_short_link` | 创建短链接 | `url` (必填), `slug` (可选), `title` (可选) |
| `get_link_info` | 查询链接信息 | `slug` (必填) |

## 项目结构

```
short-url/
├── wrangler.toml
├── package.json
├── tsconfig.json
├── migrations/
│   └── 0001_init.sql
├── src/
│   ├── index.ts          # Worker 入口
│   ├── db.ts             # 数据库操作
│   ├── auth.ts           # 认证模块
│   ├── redirect.ts       # 短链接跳转
│   ├── api/
│   │   ├── auth.ts       # 认证 API
│   │   ├── links.ts      # 链接管理 API
│   │   └── apikeys.ts    # API Key 管理 API
│   ├── mcp/
│   │   └── index.ts      # MCP Server
│   └── admin/
│       └── html.ts       # 管理后台 HTML
```

## 技术栈

- **运行时**: Cloudflare Workers
- **数据库**: Cloudflare D1 (SQLite)
- **管理后台**: 原生 HTML/CSS/JS (SPA, 零框架依赖)
- **MCP 协议**: JSON-RPC 2.0 over HTTP (Streamable HTTP transport)
