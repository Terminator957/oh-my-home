const jwt = require('jsonwebtoken');
const { openDb } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me';

/** Express 中间件：验证 Bearer JWT 并注入 req.user */
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = header.slice(7);
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const db = openDb();
  const user = db.prepare('SELECT id, openid, nickname FROM users WHERE id = ?').get(payload.sub);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  req.user = user;
  next();
}

/** 签发 JWT */
function signToken(user) {
  return jwt.sign(
    { sub: user.id, openid: user.openid },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

module.exports = { authMiddleware, signToken, JWT_SECRET };
