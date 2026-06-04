-- 0002_click_logs.sql: 点击日志表，用于统计图表

CREATE TABLE IF NOT EXISTS click_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  link_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_click_logs_link_id ON click_logs(link_id);
CREATE INDEX IF NOT EXISTS idx_click_logs_created_at ON click_logs(created_at DESC);
