// Admin panel SPA HTML template
// This is imported by the Worker and served as the admin panel
export const ADMIN_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Short URL - 管理后台</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<style>
  :root {
    --primary: #4f46e5;
    --primary-hover: #4338ca;
    --danger: #ef4444;
    --danger-hover: #dc2626;
    --success: #10b981;
    --warning: #f59e0b;
    --bg: #f8fafc;
    --card: #ffffff;
    --text: #1e293b;
    --text-muted: #64748b;
    --border: #e2e8f0;
    --radius: 8px;
    --shadow: 0 1px 3px rgba(0,0,0,0.08);
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; }

  /* Login */
  .login-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
  .login-card { background: white; padding: 2.5rem; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); width: 100%; max-width: 400px; }
  .login-card h1 { text-align: center; margin-bottom: 0.5rem; font-size: 1.5rem; color: #333; }
  .login-card .subtitle { text-align: center; color: var(--text-muted); margin-bottom: 1.5rem; font-size: 0.875rem; }
  .form-group { margin-bottom: 1rem; }
  .form-group label { display: block; margin-bottom: 0.25rem; font-weight: 500; font-size: 0.875rem; }
  .form-group input, .form-group select { width: 100%; padding: 0.625rem 0.75rem; border: 1px solid var(--border); border-radius: var(--radius); font-size: 0.875rem; transition: border-color 0.2s; }
  .form-group input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(79,70,229,0.1); }
  .btn { padding: 0.625rem 1.25rem; border: none; border-radius: var(--radius); font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 0.5rem; }
  .btn-primary { background: var(--primary); color: white; }
  .btn-primary:hover { background: var(--primary-hover); }
  .btn-danger { background: var(--danger); color: white; }
  .btn-danger:hover { background: var(--danger-hover); }
  .btn-outline { background: transparent; border: 1px solid var(--border); color: var(--text); }
  .btn-outline:hover { background: #f1f5f9; }
  .btn-sm { padding: 0.375rem 0.75rem; font-size: 0.75rem; }
  .btn-block { width: 100%; justify-content: center; }
  .btn:disabled { opacity: 0.6; cursor: not-allowed; }

  /* Layout */
  .app-layout { display: none; }
  .app-layout.active { display: flex; min-height: 100vh; }
  .sidebar { width: 220px; background: var(--card); border-right: 1px solid var(--border); padding: 1.5rem 0; display: flex; flex-direction: column; }
  .sidebar .logo { padding: 0 1.25rem; font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem; }
  .sidebar nav { flex: 1; }
  .sidebar nav a { display: flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1.25rem; color: var(--text-muted); text-decoration: none; font-size: 0.875rem; transition: all 0.15s; border-left: 3px solid transparent; }
  .sidebar nav a:hover { background: #f1f5f9; color: var(--text); }
  .sidebar nav a.active { color: var(--primary); background: #eef2ff; border-left-color: var(--primary); }
  .sidebar .user-info { padding: 1rem 1.25rem; border-top: 1px solid var(--border); font-size: 0.75rem; color: var(--text-muted); }
  .sidebar .user-info .username { font-weight: 600; color: var(--text); }
  .main-content { flex: 1; padding: 1.5rem; overflow-x: auto; }
  .page { display: none; }
  .page.active { display: block; }
  .page-header { margin-bottom: 1.5rem; }
  .page-header h2 { font-size: 1.25rem; margin-bottom: 0.25rem; }
  .page-header p { color: var(--text-muted); font-size: 0.875rem; }

  /* Cards */
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
  .stat-card { background: var(--card); padding: 1.25rem; border-radius: var(--radius); box-shadow: var(--shadow); }
  .stat-card .label { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
  .stat-card .value { font-size: 1.5rem; font-weight: 700; }

  /* Table */
  .card { background: var(--card); border-radius: var(--radius); box-shadow: var(--shadow); overflow: hidden; }
  .card-header { padding: 1rem 1.25rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; }
  .card-body { padding: 0; }
  table { width: 100%; border-collapse: collapse; }
  table th { text-align: left; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); padding: 0.75rem 1.25rem; background: #f8fafc; border-bottom: 1px solid var(--border); }
  table td { padding: 0.75rem 1.25rem; border-bottom: 1px solid var(--border); font-size: 0.875rem; }
  table tr:last-child td { border-bottom: none; }
  table tr:hover td { background: #f8fafc; }
  .slug-cell { font-family: 'SF Mono', 'Fira Code', monospace; font-weight: 600; color: var(--primary); }
  .url-cell { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
  .badge { display: inline-block; padding: 0.125rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; }
  .badge-active { background: #d1fae5; color: #065f46; }
  .badge-inactive { background: #fee2e2; color: #991b1b; }

  /* Modal */
  .modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; justify-content: center; align-items: center; }
  .modal-overlay.active { display: flex; }
  .modal { background: white; border-radius: 12px; padding: 1.5rem; width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
  .modal h3 { margin-bottom: 1rem; }
  .modal-actions { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1.5rem; }

  /* Search */
  .search-box { display: flex; gap: 0.5rem; }
  .search-box input { padding: 0.5rem 0.75rem; border: 1px solid var(--border); border-radius: var(--radius); font-size: 0.875rem; min-width: 200px; }
  .search-box input:focus { outline: none; border-color: var(--primary); }

  /* Pagination */
  .pagination { display: flex; gap: 0.25rem; justify-content: center; padding: 1rem; }
  .pagination button { padding: 0.375rem 0.75rem; border: 1px solid var(--border); border-radius: var(--radius); background: white; cursor: pointer; font-size: 0.75rem; }
  .pagination button:hover { background: #f1f5f9; }
  .pagination button.active { background: var(--primary); color: white; border-color: var(--primary); }
  .pagination button:disabled { opacity: 0.4; cursor: not-allowed; }

  /* Copy toast */
  .toast { position: fixed; bottom: 1.5rem; right: 1.5rem; background: #333; color: white; padding: 0.75rem 1.25rem; border-radius: var(--radius); font-size: 0.875rem; z-index: 200; display: none; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
  .toast.show { display: block; animation: fadeIn 0.2s; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

  .empty-state { text-align: center; padding: 3rem 1rem; color: var(--text-muted); }
  .empty-state .icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
  .api-key-display { background: #f1f5f9; padding: 0.75rem; border-radius: var(--radius); font-family: 'SF Mono', monospace; font-size: 0.875rem; word-break: break-all; margin: 0.5rem 0; position: relative; }
  .api-key-display .copy-btn { position: absolute; right: 0.5rem; top: 50%; transform: translateY(-50%); }

  @media (max-width: 768px) {
    .app-layout { flex-direction: column; }
    .sidebar { width: 100%; flex-direction: row; flex-wrap: wrap; padding: 0.75rem; align-items: center; }
    .sidebar .logo { margin: 0; padding: 0; font-size: 1rem; }
    .sidebar nav { display: flex; gap: 0.25rem; flex: 1; justify-content: center; }
    .sidebar nav a { border-left: none; border-bottom: 2px solid transparent; padding: 0.5rem 0.75rem; font-size: 0.75rem; }
    .sidebar nav a.active { border-left: none; border-bottom-color: var(--primary); }
    .sidebar .user-info { display: none; }
  }
</style>
</head>
<body>
<div id="loginPage" class="login-container">
  <div class="login-card">
    <h1>🔗 Short URL</h1>
    <p class="subtitle">管理后台登录</p>
    <form id="loginForm">
      <div class="form-group">
        <label for="username">用户名</label>
        <input type="text" id="username" required autocomplete="username">
      </div>
      <div class="form-group">
        <label for="password">密码</label>
        <input type="password" id="password" required autocomplete="current-password">
      </div>
      <div id="loginError" style="color: var(--danger); font-size: 0.75rem; margin-bottom: 0.5rem; display: none;"></div>
      <button type="submit" class="btn btn-primary btn-block">登录</button>
    </form>
  </div>
</div>

<div id="appLayout" class="app-layout">
  <aside class="sidebar">
    <div class="logo">🔗 Short URL</div>
    <nav>
      <a href="#dashboard" data-page="dashboard" class="active">📊 仪表盘</a>
      <a href="#links" data-page="links">🔗 链接管理</a>
      <a href="#apikeys" data-page="apikeys">🔑 API Keys</a>
      <a href="#settings" data-page="settings">⚙️ 设置</a>
    </nav>
    <div class="user-info">
      当前用户: <span class="username" id="currentUsername">—</span>
      <br><a href="#" id="logoutBtn" style="color: var(--danger);">退出登录</a>
    </div>
  </aside>
  <main class="main-content">
    <!-- Dashboard -->
    <div id="page-dashboard" class="page active">
      <div class="page-header">
        <h2>📊 仪表盘</h2>
        <p>短链接服务概览</p>
      </div>
      <div class="stats-grid">
        <div class="stat-card"><div class="label">总链接数</div><div class="value" id="statTotalLinks">—</div></div>
        <div class="stat-card"><div class="label">总点击量</div><div class="value" id="statTotalClicks">—</div></div>
      </div>
      <div class="card" style="margin-bottom: 1rem;">
        <div class="card-header">📈 每日趋势（近30天）</div>
        <div class="card-body" style="padding: 1rem;">
          <canvas id="dailyChart" style="max-height: 300px;"></canvas>
        </div>
      </div>
      <div class="card">
        <div class="card-header">🔥 热门链接 Top 10</div>
        <div class="card-body">
          <table>
            <thead><tr><th>#</th><th>短码</th><th>目标 URL</th><th>点击量</th></tr></thead>
            <tbody id="topLinksTableBody"><tr><td colspan="4" class="empty-state"><div class="icon">📭</div>暂无数据</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Links -->
    <div id="page-links" class="page">
      <div class="page-header">
        <h2>🔗 链接管理</h2>
        <p>管理所有短链接</p>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="search-box">
            <input type="text" id="linkSearch" placeholder="搜索短码/URL/标题...">
            <button class="btn btn-outline btn-sm" id="linkSearchBtn">搜索</button>
          </div>
          <button class="btn btn-primary btn-sm" id="createLinkBtn">+ 创建链接</button>
        </div>
        <div class="card-body">
          <table>
            <thead><tr><th>短码</th><th>目标 URL</th><th>标题</th><th>点击量</th><th>状态</th><th>创建时间</th><th>操作</th></tr></thead>
            <tbody id="linksTableBody"><tr><td colspan="7" class="empty-state"><div class="icon">📭</div>暂无数据</td></tr></tbody>
          </table>
          <div class="pagination" id="linksPagination"></div>
        </div>
      </div>
    </div>

    <!-- API Keys -->
    <div id="page-apikeys" class="page">
      <div class="page-header">
        <h2>🔑 API Keys</h2>
        <p>管理 API Key，用于 MCP 和 REST API 访问</p>
      </div>
      <div class="card" style="margin-bottom: 1rem;">
        <div class="card-header">
          <span>所有 API Keys</span>
          <button class="btn btn-primary btn-sm" id="createApiKeyBtn">+ 创建 Key</button>
        </div>
        <div class="card-body">
          <table>
            <thead><tr><th>名称</th><th>前缀</th><th>创建时间</th><th>最后使用</th><th>操作</th></tr></thead>
            <tbody id="apiKeysTableBody"><tr><td colspan="5" class="empty-state"><div class="icon">🔑</div>暂无 API Key</td></tr></tbody>
          </table>
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
        <div class="card">
          <div class="card-header">📡 REST API 使用说明</div>
          <div class="card-body" style="padding: 1rem; font-size: 0.8rem;">
            <p style="margin-bottom: 0.5rem; font-weight: 600;">创建短链接</p>
            <pre style="background:#1e293b;color:#e2e8f0;padding:0.75rem;border-radius:6px;overflow-x:auto;font-size:0.75rem;line-height:1.5;">curl -X POST <span class="api-base-url"></span>/api/v1/shorten \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer &lt;API_KEY&gt;" \\\n  -d '{"target_url": "https://example.com"}'</pre>
            <p style="margin: 0.75rem 0 0.5rem; font-weight: 600;">可选参数</p>
            <pre style="background:#1e293b;color:#e2e8f0;padding:0.75rem;border-radius:6px;overflow-x:auto;font-size:0.75rem;line-height:1.5;">{\n  "target_url": "https://example.com",\n  "slug": "custom-code",       // 可选，自定义短码\n  "title": "链接描述"           // 可选，备注标题\n}</pre>
            <p style="margin-top:0.75rem;color:var(--text-muted);">返回: <code>{"id":1,"slug":"xxx","target_url":"...","short_url":"<span class="api-base-url"></span>/xxx"}</code></p>
          </div>
        </div>
        <div class="card">
          <div class="card-header">🤖 MCP 集成说明</div>
          <div class="card-body" style="padding: 1rem; font-size: 0.8rem;">
            <p style="margin-bottom: 0.5rem; font-weight: 600;">Claude Desktop 配置</p>
            <p style="color:var(--text-muted);margin-bottom:0.5rem;">编辑 <code>claude_desktop_config.json</code>：</p>
            <pre style="background:#1e293b;color:#e2e8f0;padding:0.75rem;border-radius:6px;overflow-x:auto;font-size:0.75rem;line-height:1.5;">{\n  "mcpServers": {\n    "short-url": {\n      "type": "http",\n      "url": "<span class="api-base-url"></span>/mcp",\n      "headers": {\n        "Authorization": "Bearer &lt;API_KEY&gt;"\n      }\n    }\n  }\n}</pre>
            <p style="margin: 0.75rem 0 0.5rem; font-weight: 600;">可用工具</p>
            <table style="font-size:0.75rem;">
              <thead><tr><th>工具</th><th>说明</th></tr></thead>
              <tbody>
                <tr><td><code>create_short_link</code></td><td>创建短链接，参数：url (必填), slug (可选), title (可选)</td></tr>
                <tr><td><code>get_link_info</code></td><td>查询链接详情，参数：slug (必填)</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Settings -->
    <div id="page-settings" class="page">
      <div class="page-header">
        <h2>⚙️ 设置</h2>
        <p>修改用户名和密码</p>
      </div>
      <div class="card" style="max-width: 500px;">
        <div class="card-header">修改用户名</div>
        <div class="card-body" style="padding: 1.25rem;">
          <form id="profileForm">
            <div class="form-group">
              <label for="newUsername">新用户名</label>
              <input type="text" id="newUsername" required minlength="2">
            </div>
            <button type="submit" class="btn btn-primary">保存</button>
          </form>
        </div>
      </div>
      <div class="card" style="max-width: 500px; margin-top: 1rem;">
        <div class="card-header">修改密码</div>
        <div class="card-body" style="padding: 1.25rem;">
          <form id="passwordForm">
            <div class="form-group">
              <label for="oldPassword">旧密码</label>
              <input type="password" id="oldPassword" required>
            </div>
            <div class="form-group">
              <label for="newPassword">新密码（至少6位）</label>
              <input type="password" id="newPassword" required minlength="6">
            </div>
            <button type="submit" class="btn btn-primary">修改密码</button>
          </form>
        </div>
      </div>
    </div>
  </main>
</div>

<!-- Link Edit Modal -->
<div class="modal-overlay" id="linkModal">
  <div class="modal">
    <h3 id="linkModalTitle">创建短链接</h3>
    <form id="linkForm">
      <input type="hidden" id="linkId">
      <div class="form-group">
        <label for="linkTargetUrl">目标 URL *</label>
        <input type="url" id="linkTargetUrl" required placeholder="https://example.com">
      </div>
      <div class="form-group">
        <label for="linkSlug">自定义短码（留空自动生成）</label>
        <input type="text" id="linkSlug" placeholder="my-link" pattern="[a-zA-Z0-9_-]{2,20}">
      </div>
      <div class="form-group">
        <label for="linkTitle">标题/备注</label>
        <input type="text" id="linkTitle" placeholder="可选描述">
      </div>
      <div class="form-group" id="linkStatusGroup" style="display:none;">
        <label for="linkStatus">状态</label>
        <select id="linkStatus"><option value="1">启用</option><option value="0">禁用</option></select>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-outline" id="linkModalCancel">取消</button>
        <button type="submit" class="btn btn-primary">保存</button>
      </div>
    </form>
  </div>
</div>

<!-- API Key Result Modal -->
<div class="modal-overlay" id="apiKeyModal">
  <div class="modal">
    <h3>✅ API Key 已创建</h3>
    <p style="font-size: 0.875rem; color: var(--danger); margin-bottom: 0.5rem;">⚠️ 请立即复制此 Key，关闭后无法再次查看！</p>
    <div class="api-key-display" id="newApiKeyDisplay"></div>
    <div class="modal-actions">
      <button class="btn btn-outline btn-sm" id="copyApiKeyBtn">📋 复制</button>
      <button class="btn btn-primary btn-sm" id="apiKeyModalClose">关闭</button>
    </div>
  </div>
</div>

<!-- Toast -->
<div class="toast" id="toast"></div>

<script>
// ============ State ============
let currentPage = 1;
let linkPageSize = 20;
let linkSearchTerm = '';
let editingLinkId = null;

// ============ API Helpers ============
async function api(path, options = {}) {
  const resp = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (resp.status === 401 && !path.includes('/auth/login')) {
    // Session expired, redirect to login
    showLogin();
    throw new Error('Session expired');
  }
  return resp;
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

// ============ Navigation ============
document.querySelectorAll('.sidebar nav a').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const page = link.dataset.page;
    navigateTo(page);
  });
});

function navigateTo(page) {
  if (window.location.hash !== '#' + page) {
    window.location.hash = page;
  }
  document.querySelectorAll('.sidebar nav a').forEach(a => a.classList.remove('active'));
  document.querySelector(\`[data-page="\${page}"]\`).classList.add('active');
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  if (page === 'dashboard') loadDashboard();
  if (page === 'links') loadLinks();
  if (page === 'apikeys') loadApiKeys();
}

// ============ Auth ============
function showLogin() {
  document.getElementById('loginPage').style.display = 'flex';
  document.getElementById('appLayout').classList.remove('active');
}

function showApp() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('appLayout').classList.add('active');
  fillBaseUrl();
}

document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('loginError');
  errorEl.style.display = 'none';

  try {
    const resp = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    const data = await resp.json();
    if (resp.ok) {
      document.getElementById('currentUsername').textContent = username;
      showApp();
      navigateTo('dashboard');
    } else {
      errorEl.textContent = data.error || '登录失败';
      errorEl.style.display = 'block';
    }
  } catch (err) {
    errorEl.textContent = '网络错误';
    errorEl.style.display = 'block';
  }
});

document.getElementById('logoutBtn').addEventListener('click', async e => {
  e.preventDefault();
  await api('/api/auth/logout', { method: 'POST' });
  showLogin();
});

// Check login status on load
(async function checkSession() {
  try {
    const resp = await api('/api/stats');
    if (resp.ok) {
      const data = await resp.json();
      showApp();
      // 恢复刷新前的页面状态
      const hash = window.location.hash.replace('#', '');
      const page = ['dashboard','links','apikeys','settings'].includes(hash) ? hash : 'dashboard';
      navigateTo(page);
    } else {
      showLogin();
    }
  } catch {
    showLogin();
  }
})();

// 监听浏览器前进/后退按钮
window.addEventListener('hashchange', () => {
  const hash = window.location.hash.replace('#', '');
  if (['dashboard','links','apikeys','settings'].includes(hash)) {
    navigateTo(hash);
  }
});

// ============ Dashboard ============
let dailyChart = null;

async function loadDashboard() {
  // Load basic stats
  const resp = await api('/api/stats');
  if (resp.ok) {
    const data = await resp.json();
    document.getElementById('statTotalLinks').textContent = data.totalLinks || 0;
    document.getElementById('statTotalClicks').textContent = data.totalClicks || 0;
  }

  // Load daily stats for chart
  const dailyResp = await api('/api/stats/daily?days=30');
  if (dailyResp.ok) {
    const daily = await dailyResp.json();
    const labels = [];
    const newLinksData = [];
    const clicksData = [];
    // Fill all 30 days, merging with returned data
    const newLinksMap = {};
    const clicksMap = {};
    daily.newLinks.forEach(d => { newLinksMap[d.date] = d.count; });
    daily.clicks.forEach(d => { clicksMap[d.date] = d.count; });
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      labels.push(key.slice(5)); // MM-DD
      newLinksData.push(newLinksMap[key] || 0);
      clicksData.push(clicksMap[key] || 0);
    }
    renderChart(labels, newLinksData, clicksData);
  }

  // Load top links
  const topResp = await api('/api/stats/top-links?limit=10');
  if (topResp.ok) {
    const topLinks = await topResp.json();
    const tbody = document.getElementById('topLinksTableBody');
    if (topLinks.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-state"><div class="icon">📭</div>暂无数据</td></tr>';
    } else {
      tbody.innerHTML = topLinks.map((l, i) => \`
        <tr>
          <td>\${i + 1}</td>
          <td><span class="slug-cell">\${esc(l.slug)}</span></td>
          <td><a href="\${esc(l.target_url)}" target="_blank" class="url-cell" title="\${esc(l.target_url)}">\${esc(truncate(l.target_url, 50))}</a></td>
          <td><strong>\${l.clicks}</strong></td>
        </tr>\`
      ).join('');
    }
  }
}

function renderChart(labels, newLinksData, clicksData) {
  const ctx = document.getElementById('dailyChart').getContext('2d');
  if (dailyChart) dailyChart.destroy();
  dailyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: '新增链接',
          data: newLinksData,
          backgroundColor: 'rgba(79, 70, 229, 0.7)',
          borderColor: '#4f46e5',
          borderWidth: 1,
          borderRadius: 4,
          order: 1,
        },
        {
          label: '访问量',
          data: clicksData,
          type: 'line',
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#10b981',
          tension: 0.3,
          fill: true,
          order: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 },
        },
      },
    },
  });
}

// ============ Links Management ============
async function loadLinks(page = 1) {
  currentPage = page;
  const params = new URLSearchParams({ page, pageSize: linkPageSize });
  if (linkSearchTerm) params.set('search', linkSearchTerm);

  const resp = await api('/api/links?' + params);
  if (!resp.ok) return;
  const data = await resp.json();

  const tbody = document.getElementById('linksTableBody');
  if (data.links.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><div class="icon">📭</div>暂无数据</td></tr>';
  } else {
    tbody.innerHTML = data.links.map(l => \`
      <tr>
        <td><span class="slug-cell">\${esc(l.slug)}</span></td>
        <td><a href="\${esc(l.target_url)}" target="_blank" class="url-cell" title="\${esc(l.target_url)}">\${esc(truncate(l.target_url, 50))}</a></td>
        <td>\${esc(l.title || '—')}</td>
        <td>\${l.clicks}</td>
        <td><span class="badge \${l.is_active ? 'badge-active' : 'badge-inactive'}">\${l.is_active ? '启用' : '禁用'}</span></td>
        <td>\${formatDate(l.created_at)}</td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="editLink(\${l.id})">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="deleteLinkConfirm(\${l.id})">🗑</button>
        </td>
      </tr>\`
    ).join('');
  }

  // Pagination
  const pagEl = document.getElementById('linksPagination');
  const totalPages = data.totalPages || 1;
  let pagHtml = '';
  pagHtml += \`<button \${currentPage <= 1 ? 'disabled' : ''} onclick="loadLinks(\${currentPage - 1})">‹</button>\`;
  for (let i = 1; i <= totalPages; i++) {
    pagHtml += \`<button class="\${i === currentPage ? 'active' : ''}" onclick="loadLinks(\${i})">\${i}</button>\`;
  }
  pagHtml += \`<button \${currentPage >= totalPages ? 'disabled' : ''} onclick="loadLinks(\${currentPage + 1})">›</button>\`;
  pagEl.innerHTML = pagHtml;
}

document.getElementById('linkSearchBtn').addEventListener('click', () => {
  linkSearchTerm = document.getElementById('linkSearch').value.trim();
  loadLinks(1);
});
document.getElementById('linkSearch').addEventListener('keydown', e => {
  if (e.key === 'Enter') { linkSearchTerm = e.target.value.trim(); loadLinks(1); }
});

// Create/Edit Link Modal
document.getElementById('createLinkBtn').addEventListener('click', () => openLinkModal());
document.getElementById('linkModalCancel').addEventListener('click', closeLinkModal);
document.getElementById('linkForm').addEventListener('submit', async e => {
  e.preventDefault();
  const body = {
    target_url: document.getElementById('linkTargetUrl').value,
    slug: document.getElementById('linkSlug').value || undefined,
    title: document.getElementById('linkTitle').value || undefined,
  };
  if (editingLinkId) {
    body.is_active = parseInt(document.getElementById('linkStatus').value);
  }

  const method = editingLinkId ? 'PUT' : 'POST';
  const url = editingLinkId ? \`/api/links/\${editingLinkId}\` : '/api/links';
  const resp = await api(url, { method, body: JSON.stringify(body) });
  const data = await resp.json();
  if (resp.ok) {
    closeLinkModal();
    toast(editingLinkId ? '链接已更新' : '链接已创建');
    loadLinks(currentPage);
  } else {
    toast('错误: ' + (data.error || '操作失败'));
  }
});

function openLinkModal(linkData = null) {
  editingLinkId = linkData?.id || null;
  document.getElementById('linkModalTitle').textContent = linkData ? '编辑短链接' : '创建短链接';
  document.getElementById('linkId').value = linkData?.id || '';
  document.getElementById('linkTargetUrl').value = linkData?.target_url || '';
  document.getElementById('linkSlug').value = linkData?.slug || '';
  document.getElementById('linkTitle').value = linkData?.title || '';
  document.getElementById('linkStatusGroup').style.display = linkData ? 'block' : 'none';
  if (linkData) document.getElementById('linkStatus').value = linkData.is_active ? '1' : '0';
  document.getElementById('linkModal').classList.add('active');
}

function closeLinkModal() {
  document.getElementById('linkModal').classList.remove('active');
  editingLinkId = null;
}

async function editLink(id) {
  const resp = await api(\`/api/links/\${id}/stats\`);
  if (resp.ok) {
    const data = await resp.json();
    openLinkModal(data);
  }
}

async function deleteLinkConfirm(id) {
  if (!confirm('确定要删除此链接吗？此操作不可恢复。')) return;
  const resp = await api(\`/api/links/\${id}\`, { method: 'DELETE' });
  if (resp.ok) {
    toast('链接已删除');
    loadLinks(currentPage);
  }
}

// ============ API Keys Management ============
async function loadApiKeys() {
  const resp = await api('/api/api-keys');
  if (!resp.ok) return;
  const data = await resp.json();
  const tbody = document.getElementById('apiKeysTableBody');
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><div class="icon">🔑</div>暂无 API Key</td></tr>';
  } else {
    tbody.innerHTML = data.map(k => \`
      <tr>
        <td>\${esc(k.name)}</td>
        <td><code>\${esc(k.key_prefix)}...</code></td>
        <td>\${formatDate(k.created_at)}</td>
        <td>\${k.last_used_at ? formatDate(k.last_used_at) : '从未使用'}</td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="deleteApiKeyConfirm(\${k.id})">🗑</button>
        </td>
      </tr>\`
    ).join('');
  }
}

document.getElementById('createApiKeyBtn').addEventListener('click', async () => {
  const name = prompt('API Key 名称：');
  if (!name || !name.trim()) return;
  const resp = await api('/api/api-keys', {
    method: 'POST',
    body: JSON.stringify({ name: name.trim() }),
  });
  const data = await resp.json();
  if (resp.ok) {
    document.getElementById('newApiKeyDisplay').textContent = data.key;
    document.getElementById('apiKeyModal').classList.add('active');
    loadApiKeys();
  } else {
    toast('错误: ' + (data.error || '创建失败'));
  }
});

document.getElementById('apiKeyModalClose').addEventListener('click', () => {
  document.getElementById('apiKeyModal').classList.remove('active');
});
document.getElementById('copyApiKeyBtn').addEventListener('click', () => {
  const text = document.getElementById('newApiKeyDisplay').textContent;
  navigator.clipboard.writeText(text).then(() => toast('已复制到剪贴板'));
});

async function deleteApiKeyConfirm(id) {
  if (!confirm('确定要删除此 API Key 吗？使用该 Key 的服务将立即失效。')) return;
  const resp = await api(\`/api/api-keys/\${id}\`, { method: 'DELETE' });
  if (resp.ok) {
    toast('API Key 已删除');
    loadApiKeys();
  }
}

// ============ Settings ============
document.getElementById('profileForm').addEventListener('submit', async e => {
  e.preventDefault();
  const username = document.getElementById('newUsername').value;
  const resp = await api('/api/auth/profile', {
    method: 'PUT',
    body: JSON.stringify({ username }),
  });
  const data = await resp.json();
  if (resp.ok) {
    document.getElementById('currentUsername').textContent = username;
    toast('用户名已更新');
  } else {
    toast('错误: ' + (data.error || '更新失败'));
  }
});

document.getElementById('passwordForm').addEventListener('submit', async e => {
  e.preventDefault();
  const old_password = document.getElementById('oldPassword').value;
  const new_password = document.getElementById('newPassword').value;
  const resp = await api('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ old_password, new_password }),
  });
  const data = await resp.json();
  if (resp.ok) {
    toast('密码已修改，下次登录生效');
    document.getElementById('passwordForm').reset();
  } else {
    toast('错误: ' + (data.error || '修改失败'));
  }
});

// ============ Utilities ============
function fillBaseUrl() {
  document.querySelectorAll('.api-base-url').forEach(el => {
    el.textContent = location.origin;
  });
}
function esc(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
function truncate(str, len) {
  return str.length > len ? str.substring(0, len) + '...' : str;
}
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('zh-CN');
}
// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('active');
  });
});
</script>
</body>
</html>`;
