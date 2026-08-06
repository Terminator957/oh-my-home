const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { openDb } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/shares — 创建分享（需认证）
 */
router.post('/', authMiddleware, (req, res) => {
  try {
    const db = openDb();
    let menuSnapshot;

    if (req.body && Array.isArray(req.body.menuSnapshot)) {
      menuSnapshot = req.body.menuSnapshot;
    } else {
      const row = db.prepare(
        "SELECT data_json FROM user_sync WHERE user_id = ? AND resource = 'todayMenu'"
      ).get(req.user.id);
      menuSnapshot = row ? JSON.parse(row.data_json) : [];
    }

    if (!Array.isArray(menuSnapshot) || menuSnapshot.length === 0) {
      return res.status(400).json({ error: 'No menu to share. Please set todayMenu first.' });
    }

    const token = uuidv4();
    const expiresInDays = parseInt(process.env.SHARE_EXPIRES_IN_DAYS || '7', 10);
    const expiresAt = new Date(Date.now() + expiresInDays * 86400 * 1000).toISOString();

    const result = db.prepare(`
      INSERT INTO shares (user_id, token, menu_snapshot_json, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(req.user.id, token, JSON.stringify(menuSnapshot), expiresAt);

    const share = db.prepare('SELECT * FROM shares WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      id: share.id,
      token: share.token,
      menuSnapshot: JSON.parse(share.menu_snapshot_json),
      expiresAt: share.expires_at,
      revoked: false,
      createdAt: share.created_at
    });
  } catch (err) {
    console.error('shares post error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/shares/:id — 撤销分享（需认证）
 */
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const db = openDb();
    const share = db.prepare('SELECT * FROM shares WHERE id = ?').get(req.params.id);

    if (!share) {
      return res.status(404).json({ error: 'Share not found' });
    }
    if (share.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Share not found' });
    }

    db.prepare('UPDATE shares SET revoked = 1 WHERE id = ?').run(share.id);
    res.status(204).end();
  } catch (err) {
    console.error('shares delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/shares/:token — 匿名读取有效的分享（无需认证）
 * 注意：此路由必须在 DELETE /:id 之后，否则 :token 会匹配 "123" 等数字
 */
router.get('/:token', (req, res) => {
  try {
    const db = openDb();
    const share = db.prepare('SELECT * FROM shares WHERE token = ?').get(req.params.token);

    if (!share) {
      return res.status(404).json({ error: 'Share not found' });
    }

    if (share.revoked) {
      return res.status(404).json({ error: 'Share has been revoked' });
    }

    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return res.status(404).json({ error: 'Share has expired' });
    }

    res.json({
      id: share.id,
      token: share.token,
      menuSnapshot: JSON.parse(share.menu_snapshot_json),
      expiresAt: share.expires_at,
      createdAt: share.created_at
    });
  } catch (err) {
    console.error('shares get error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
