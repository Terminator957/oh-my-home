const express = require('express');
const { openDb } = require('../db');
const { signToken } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/wechat
 * Body: { code: string }
 *
 * 测试模式 (WECHAT_TEST_MODE=true)：code 格式 "test_openid_xxx" 直接登录。
 * 生产模式：调用微信 code2session，仅使用 openid，不保存或返回 AppSecret。
 */
router.post('/wechat', async (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid code' });
    }

    const testMode = process.env.WECHAT_TEST_MODE === 'true';

    let openid;
    if (testMode && code.startsWith('test_')) {
      // 测试 mock：code 中提取 openid
      // 格式: test_openid_<任意字符> → openid = "test_openid_<任意字符>"
      openid = code;
    } else if (testMode) {
      return res.status(400).json({ error: 'Test mode expects code starting with "test_"' });
    } else {
      // 生产模式：调用微信 code2session
      const appId = process.env.WECHAT_APP_ID;
      const appSecret = process.env.WECHAT_APP_SECRET;
      if (!appId || !appSecret) {
        return res.status(500).json({ error: 'WECHAT_APP_ID and WECHAT_APP_SECRET are required in production mode' });
      }

      const wxUrl = 'https://api.weixin.qq.com/sns/jscode2session' +
        `?appid=${encodeURIComponent(appId)}` +
        `&secret=${encodeURIComponent(appSecret)}` +
        `&js_code=${encodeURIComponent(code)}` +
        `&grant_type=authorization_code`;

      let wxResp;
      try {
        wxResp = await fetch(wxUrl);
      } catch {
        return res.status(502).json({ error: 'Failed to reach WeChat server' });
      }

      const wxData = await wxResp.json();

      if (wxData.errcode) {
        return res.status(502).json({ error: `WeChat error: ${wxData.errmsg || 'unknown'}` });
      }

      openid = wxData.openid;
    }

    if (!openid) {
      return res.status(502).json({ error: 'No openid returned' });
    }

    // 创建或查找用户
    const db = openDb();
    let user = db.prepare('SELECT id, openid, nickname FROM users WHERE openid = ?').get(openid);
    if (!user) {
      const result = db.prepare('INSERT INTO users (openid) VALUES (?)').run(openid);
      user = { id: result.lastInsertRowid, openid, nickname: '' };
    } else {
      // 更新最近登录时间
      db.prepare("UPDATE users SET updated_at = datetime('now') WHERE id = ?").run(user.id);
    }

    const token = signToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        openid: user.openid,
        nickname: user.nickname
      }
    });
  } catch (err) {
    console.error('auth/wechat error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
