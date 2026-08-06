const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { initDb } = require('./db');

const app = express();

// --------------- 中间件 ---------------
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// --------------- 健康检查（无需认证） ---------------
app.get('/health', (req, res) => {
  try {
    const db = require('./db').openDb();
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      db: 'connected',
      users: userCount,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'disconnected', error: err.message });
  }
});

// --------------- 路由 ---------------
app.use('/api/auth', require('./routes/auth'));
app.use('/api/sync', require('./routes/sync'));
app.use('/api', require('./routes/dishes'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/shares', require('./routes/shares'));

// --------------- 全局错误处理 ---------------
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// --------------- 404 ---------------
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// --------------- 启动 ---------------
const PORT = parseInt(process.env.PORT || '3000', 10);

if (require.main === module) {
  initDb();
  app.listen(PORT, () => {
    console.log(`家宴小本子服务端已启动 → http://127.0.0.1:${PORT}`);
    console.log(`健康检查: http://127.0.0.1:${PORT}/health`);
  });
}

module.exports = app;
