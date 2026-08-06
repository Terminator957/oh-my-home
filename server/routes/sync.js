const express = require('express');
const { openDb } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 全部业务端点需要认证
router.use(authMiddleware);

const VALID_RESOURCES = ['customDishes', 'ratings', 'todayMenu', 'guestCart'];

/**
 * GET /api/sync
 * 返回当前用户的所有四类同步数据
 */
router.get('/', (req, res) => {
  try {
    const db = openDb();
    const rows = db.prepare(
      'SELECT resource, data_json, version, updated_at FROM user_sync WHERE user_id = ?'
    ).all(req.user.id);

    const result = {};
    for (const r of rows) {
      try {
        result[r.resource] = JSON.parse(r.data_json);
      } catch {
        result[r.resource] = (r.resource === 'ratings' ? {} : []);
      }
    }

    // 为未初始化的资源返回默认值
    for (const r of VALID_RESOURCES) {
      if (!(r in result)) {
        result[r] = (r === 'ratings' ? {} : []);
      }
    }

    res.json(result);
  } catch (err) {
    console.error('sync get error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/sync/:resource
 * 幂等替换式同步：全量替换指定资源
 *
 * customDishes: 菜品对象数组 (同自定义菜品结构)
 * ratings: { dishName: stars, ... }
 * todayMenu: string[]
 * guestCart: string[]
 */
router.put('/:resource', (req, res) => {
  try {
    const { resource } = req.params;
    if (!VALID_RESOURCES.includes(resource)) {
      return res.status(400).json({ error: `Invalid resource. Must be one of: ${VALID_RESOURCES.join(', ')}` });
    }

    const data = req.body;

    // 校验数据类型
    if (resource === 'ratings') {
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        return res.status(400).json({ error: 'ratings must be a JSON object { dishName: stars }' });
      }
      // 验证值都是数字
      for (const [k, v] of Object.entries(data)) {
        if (typeof v !== 'number' || v < 0 || v > 5) {
          return res.status(400).json({ error: `ratings.${k} must be a number 0-5` });
        }
      }
    } else {
      if (!Array.isArray(data)) {
        return res.status(400).json({ error: `${resource} must be a JSON array` });
      }
      if (resource === 'customDishes') {
        for (const d of data) {
          if (!d.name || typeof d.name !== 'string') {
            return res.status(400).json({ error: 'Each custom dish must have a string name' });
          }
        }
      } else {
        // todayMenu / guestCart: string arrays
        for (const item of data) {
          if (typeof item !== 'string') {
            return res.status(400).json({ error: `${resource} items must be strings` });
          }
        }
      }
    }

    const db = openDb();
    const dataJson = JSON.stringify(data);

    const existing = db.prepare(
      'SELECT version FROM user_sync WHERE user_id = ? AND resource = ?'
    ).get(req.user.id, resource);

    if (existing) {
      db.prepare(
        `UPDATE user_sync SET data_json = ?, version = version + 1, updated_at = datetime('now')
         WHERE user_id = ? AND resource = ?`
      ).run(dataJson, req.user.id, resource);
    } else {
      db.prepare(
        'INSERT INTO user_sync (user_id, resource, data_json) VALUES (?, ?, ?)'
      ).run(req.user.id, resource, dataJson);
    }

    const updated = db.prepare(
      'SELECT resource, version, updated_at FROM user_sync WHERE user_id = ? AND resource = ?'
    ).get(req.user.id, resource);

    res.json({
      resource,
      version: updated.version,
      updated_at: updated.updated_at
    });
  } catch (err) {
    console.error('sync put error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
