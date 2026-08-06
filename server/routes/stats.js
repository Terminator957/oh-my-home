const express = require('express');
const { openDb } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /api/stats
 * 返回当前用户的统计聚合数据
 */
router.get('/', (req, res) => {
  try {
    const db = openDb();

    // 自定义菜品统计
    const customCount = db.prepare(
      'SELECT COUNT(*) as count FROM custom_dishes WHERE user_id = ?'
    ).get(req.user.id).count;

    const customByCat = db.prepare(`
      SELECT cat, COUNT(*) as count FROM custom_dishes
      WHERE user_id = ? GROUP BY cat ORDER BY count DESC
    `).all(req.user.id);

    const customByStatus = db.prepare(`
      SELECT status, COUNT(*) as count FROM custom_dishes
      WHERE user_id = ? GROUP BY status ORDER BY count DESC
    `).all(req.user.id);

    // ratings 统计
    const ratingsRow = db.prepare(
      "SELECT data_json FROM user_sync WHERE user_id = ? AND resource = 'ratings'"
    ).get(req.user.id);

    let ratingsSummary = { total: 0, avgStars: 0, topRated: [] };
    if (ratingsRow) {
      const ratings = JSON.parse(ratingsRow.data_json);
      const entries = Object.entries(ratings).filter(([, v]) => v > 0);
      ratingsSummary.total = entries.length;
      ratingsSummary.avgStars = entries.length > 0
        ? Math.round((entries.reduce((s, [, v]) => s + v, 0) / entries.length) * 10) / 10
        : 0;
      ratingsSummary.topRated = entries
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, stars]) => ({ name, stars }));
    }

    // todayMenu 统计
    const menuRow = db.prepare(
      "SELECT data_json FROM user_sync WHERE user_id = ? AND resource = 'todayMenu'"
    ).get(req.user.id);
    let menuCount = 0;
    if (menuRow) {
      menuCount = JSON.parse(menuRow.data_json).length;
    }

    // 分享统计
    const sharesCount = db.prepare(
      'SELECT COUNT(*) as count FROM shares WHERE user_id = ?'
    ).get(req.user.id).count;

    const activeShares = db.prepare(
      `SELECT COUNT(*) as count FROM shares
       WHERE user_id = ? AND revoked = 0
       AND (expires_at IS NULL OR expires_at > datetime('now'))`
    ).get(req.user.id).count;

    res.json({
      customDishes: {
        total: customCount,
        byCategory: customByCat,
        byStatus: customByStatus
      },
      ratings: ratingsSummary,
      todayMenu: { itemCount: menuCount },
      shares: { total: sharesCount, active: activeShares }
    });
  } catch (err) {
    console.error('stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
