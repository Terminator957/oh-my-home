const express = require('express');
const { openDb } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// ========== GET /api/dishes ==========
router.get('/dishes', authMiddleware, (req, res) => {
  try {
    const db = openDb();
    const dishes = db.prepare('SELECT * FROM builtin_dishes ORDER BY id').all();
    const result = dishes.map(d => ({
      id: d.id,
      name: d.name,
      status: d.status,
      cat: d.cat,
      ing: d.ing,
      ingFull: d.ingFull,
      time: d.time,
      level: d.level,
      stars: d.stars,
      kcal: d.kcal,
      flavor: d.flavor,
      log: JSON.parse(d.log_json)
    }));
    res.json(result);
  } catch (err) {
    console.error('dishes get error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========== /api/custom-dishes ==========

// GET: 获取当前用户的所有自定义菜品
router.get('/custom-dishes', authMiddleware, (req, res) => {
  try {
    const db = openDb();
    const dishes = db.prepare(
      'SELECT * FROM custom_dishes WHERE user_id = ? ORDER BY id'
    ).all(req.user.id);

    const result = dishes.map(d => ({
      id: d.id,
      name: d.name,
      status: d.status,
      cat: d.cat,
      ing: d.ing,
      ingFull: d.ingFull,
      time: d.time,
      level: d.level,
      made: d.made,
      stars: d.stars,
      kcal: d.kcal,
      flavor: d.flavor,
      log: JSON.parse(d.log_json),
      created_at: d.created_at,
      updated_at: d.updated_at
    }));
    res.json(result);
  } catch (err) {
    console.error('custom-dishes get error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST: 创建自定义菜品
router.post('/custom-dishes', authMiddleware, (req, res) => {
  try {
    const db = openDb();
    const { name, status, cat, ing, ingFull, time, level, made, stars, kcal, flavor, log } = req.body || {};

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'name is required' });
    }

    // 不允许覆盖内置菜品（按名称检查）
    const builtin = db.prepare('SELECT id FROM builtin_dishes WHERE name = ?').get(name);
    if (builtin) {
      return res.status(400).json({ error: 'Cannot override built-in dish' });
    }

    const result = db.prepare(`
      INSERT INTO custom_dishes (user_id, name, status, cat, ing, ingFull, time, level, made, stars, kcal, flavor, log_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id,
      name,
      status || '想吃',
      cat || '荤菜',
      ing || '',
      ingFull || '',
      time || '30 分钟',
      level || '简单',
      made || '还没做过',
      stars ?? 0,
      kcal ?? 0,
      flavor || '咸鲜',
      JSON.stringify(log || [])
    );

    const dish = db.prepare('SELECT * FROM custom_dishes WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({
      id: dish.id,
      name: dish.name,
      status: dish.status,
      cat: dish.cat,
      ing: dish.ing,
      ingFull: dish.ingFull,
      time: dish.time,
      level: dish.level,
      made: dish.made,
      stars: dish.stars,
      kcal: dish.kcal,
      flavor: dish.flavor,
      log: JSON.parse(dish.log_json),
      created_at: dish.created_at,
      updated_at: dish.updated_at
    });
  } catch (err) {
    console.error('custom-dishes post error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT: 更新自定义菜品（仅限当前用户的菜品）
router.put('/custom-dishes/:id', authMiddleware, (req, res) => {
  try {
    const db = openDb();
    const dish = db.prepare('SELECT * FROM custom_dishes WHERE id = ?').get(req.params.id);

    if (!dish) {
      return res.status(404).json({ error: 'Custom dish not found' });
    }
    if (dish.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Custom dish not found' });
    }

    const { name, status, cat, ing, ingFull, time, level, made, stars, kcal, flavor, log } = req.body || {};

    // 如果改名字，检查不与内置冲突
    if (name && name !== dish.name) {
      const builtin = db.prepare('SELECT id FROM builtin_dishes WHERE name = ?').get(name);
      if (builtin) {
        return res.status(400).json({ error: 'Cannot override built-in dish' });
      }
    }

    db.prepare(`
      UPDATE custom_dishes SET
        name = COALESCE(?, name),
        status = COALESCE(?, status),
        cat = COALESCE(?, cat),
        ing = COALESCE(?, ing),
        ingFull = COALESCE(?, ingFull),
        time = COALESCE(?, time),
        level = COALESCE(?, level),
        made = COALESCE(?, made),
        stars = ?, kcal = ?,
        flavor = COALESCE(?, flavor),
        log_json = COALESCE(?, log_json),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      name ?? null, status ?? null, cat ?? null, ing ?? null, ingFull ?? null,
      time ?? null, level ?? null, made ?? null,
      stars !== undefined ? stars : dish.stars,
      kcal !== undefined ? kcal : dish.kcal,
      flavor ?? null,
      log !== undefined ? JSON.stringify(log) : null,
      dish.id
    );

    const updated = db.prepare('SELECT * FROM custom_dishes WHERE id = ?').get(dish.id);
    res.json({
      id: updated.id,
      name: updated.name,
      status: updated.status,
      cat: updated.cat,
      ing: updated.ing,
      ingFull: updated.ingFull,
      time: updated.time,
      level: updated.level,
      made: updated.made,
      stars: updated.stars,
      kcal: updated.kcal,
      flavor: updated.flavor,
      log: JSON.parse(updated.log_json),
      created_at: updated.created_at,
      updated_at: updated.updated_at
    });
  } catch (err) {
    console.error('custom-dishes put error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE: 删除自定义菜品（仅限当前用户的菜品）
router.delete('/custom-dishes/:id', authMiddleware, (req, res) => {
  try {
    const db = openDb();
    const dish = db.prepare('SELECT * FROM custom_dishes WHERE id = ?').get(req.params.id);

    if (!dish) {
      return res.status(404).json({ error: 'Custom dish not found' });
    }
    if (dish.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Custom dish not found' });
    }

    db.prepare('DELETE FROM custom_dishes WHERE id = ?').run(dish.id);
    res.status(204).end();
  } catch (err) {
    console.error('custom-dishes delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
