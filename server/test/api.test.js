// 家宴小本子服务端 — 接口测试套件
// 使用 node:test + supertest
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

// 每次测试使用独立数据库
const TEST_DB = path.join(__dirname, '..', 'data', `test-${Date.now()}.db`);

// 设置测试环境变量（必须在 require server 之前）
process.env.PORT = '3099';
process.env.JWT_SECRET = 'test-secret-key';
process.env.WECHAT_TEST_MODE = 'true';
process.env.DB_PATH = TEST_DB;
process.env.JWT_EXPIRES_IN = '1h';
process.env.SHARE_EXPIRES_IN_DAYS = '7';

const { initDb, closeDb, openDb } = require('../db');
const app = require('../server');

initDb();  // 初始化数据库表结构（必须在 supertest 请求之前）
let request;
async function getRequest() {
  if (!request) {
    const supertest = require('supertest');
    request = supertest(app);
  }
  return request;
}

// 清理函数
after(async () => {
  closeDb();
  try { fs.unlinkSync(TEST_DB); } catch {}
  try { fs.unlinkSync(TEST_DB + '-wal'); } catch {}
  try { fs.unlinkSync(TEST_DB + '-shm'); } catch {}
});

// 工具函数：登录并获取 token
async function login(openid = 'test_user_a') {
  const req = await getRequest();
  const res = await req.post('/api/auth/wechat').send({ code: openid });
  return res.body.token;
}

// =================================================================
// ACC-001: 健康检查
// =================================================================
describe('GET /health', () => {
  it('返回 200 和数据库就绪信息', async () => {
    const req = await getRequest();
    const res = await req.get('/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
    assert.strictEqual(res.body.db, 'connected');
    assert.ok(typeof res.body.users === 'number');
    assert.ok(res.body.timestamp);
  });
});

// =================================================================
// REQ-001: 微信登录
// =================================================================
describe('POST /api/auth/wechat', () => {
  it('测试模式：使用 test_openid_xxx 登录成功并返回 token', async () => {
    const req = await getRequest();
    const res = await req.post('/api/auth/wechat').send({ code: 'test_openid_alice' });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.token);
    assert.strictEqual(res.body.user.openid, 'test_openid_alice');
    assert.ok(res.body.user.id);
  });

  it('测试模式：相同 openid 重复登录返回相同用户', async () => {
    const req = await getRequest();
    const res1 = await req.post('/api/auth/wechat').send({ code: 'test_openid_bob' });
    const res2 = await req.post('/api/auth/wechat').send({ code: 'test_openid_bob' });
    assert.strictEqual(res1.body.user.id, res2.body.user.id);
  });

  it('测试模式：不返回 AppSecret', async () => {
    const req = await getRequest();
    const res = await req.post('/api/auth/wechat').send({ code: 'test_openid_carol' });
    assert.strictEqual(res.status, 200);
    assert.ok(!res.body.appSecret);
    assert.ok(!res.body.secret);
    assert.ok(!res.body.appid);
  });

  it('缺少 code 返回 400', async () => {
    const req = await getRequest();
    const res = await req.post('/api/auth/wechat').send({});
    assert.strictEqual(res.status, 400);
  });

  it('非 test_ 开头 code 在测试模式返回 400', async () => {
    const req = await getRequest();
    const res = await req.post('/api/auth/wechat').send({ code: 'invalid' });
    assert.strictEqual(res.status, 400);
  });
});

// =================================================================
// REQ-002: Bearer 令牌保护与用户隔离
// =================================================================
describe('认证拦截', () => {
  it('未带 Authorization 访问 /api/sync 返回 401', async () => {
    const req = await getRequest();
    const res = await req.get('/api/sync');
    assert.strictEqual(res.status, 401);
  });

  it('无效 token 访问 /api/sync 返回 401', async () => {
    const req = await getRequest();
    const res = await req.get('/api/sync').set('Authorization', 'Bearer invalid-token');
    assert.strictEqual(res.status, 401);
  });

  it('错误格式 Authorization 返回 401', async () => {
    const req = await getRequest();
    const res = await req.get('/api/sync').set('Authorization', 'Basic abc123');
    assert.strictEqual(res.status, 401);
  });

  it('/api/dishes 无认证返回 401', async () => {
    const req = await getRequest();
    const res = await req.get('/api/dishes');
    assert.strictEqual(res.status, 401);
  });

  it('/api/custom-dishes 无认证返回 401', async () => {
    const req = await getRequest();
    const res = await req.get('/api/custom-dishes');
    assert.strictEqual(res.status, 401);
  });

  it('/api/stats 无认证返回 401', async () => {
    const req = await getRequest();
    const res = await req.get('/api/stats');
    assert.strictEqual(res.status, 401);
  });

  it('POST /api/shares 无认证返回 401', async () => {
    const req = await getRequest();
    const res = await req.post('/api/shares').send({ menuSnapshot: ['红烧肉'] });
    assert.strictEqual(res.status, 401);
  });
});

// =================================================================
// REQ-002: 用户数据隔离
// =================================================================
describe('用户数据隔离', () => {
  let tokenA, tokenB;

  before(async () => {
    tokenA = await login('test_isolated_a');
    tokenB = await login('test_isolated_b');
  });

  it('用户 A 的 sync 数据与用户 B 隔离', async () => {
    const req = await getRequest();
    // A 写入 todayMenu
    await req.put('/api/sync/todayMenu')
      .set('Authorization', `Bearer ${tokenA}`)
      .send(['红烧肉', '麻婆豆腐']);

    // B 写入不同的 todayMenu
    await req.put('/api/sync/todayMenu')
      .set('Authorization', `Bearer ${tokenB}`)
      .send(['酸菜鱼']);

    // A 读取应该只有自己的
    const resA = await req.get('/api/sync')
      .set('Authorization', `Bearer ${tokenA}`);
    assert.deepStrictEqual(resA.body.todayMenu, ['红烧肉', '麻婆豆腐']);

    // B 读取应该只有自己的
    const resB = await req.get('/api/sync')
      .set('Authorization', `Bearer ${tokenB}`);
    assert.deepStrictEqual(resB.body.todayMenu, ['酸菜鱼']);
  });

  it('用户 A 不能访问用户 B 的自定义菜品（跨用户 404）', async () => {
    const req = await getRequest();
    // B 创建自定义菜品
    const createRes = await req.post('/api/custom-dishes')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'B的私房菜' });
    assert.strictEqual(createRes.status, 201);
    const dishId = createRes.body.id;

    // A 尝试删除 B 的菜品 → 404
    const delRes = await req.delete(`/api/custom-dishes/${dishId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    assert.strictEqual(delRes.status, 404);
  });
});

// =================================================================
// REQ-003: 四类同步 (customDishes, ratings, todayMenu, guestCart)
// =================================================================
describe('同步 (sync)', () => {
  let token;

  before(async () => {
    token = await login('test_sync_user');
  });

  describe('GET /api/sync', () => {
    it('新用户返回默认空数据结构', async () => {
      const req = await getRequest();
      const res = await req.get('/api/sync')
        .set('Authorization', `Bearer ${token}`);
      assert.strictEqual(res.status, 200);
      assert.deepStrictEqual(res.body.customDishes, []);
      assert.deepStrictEqual(res.body.ratings, {});
      assert.deepStrictEqual(res.body.todayMenu, []);
      assert.deepStrictEqual(res.body.guestCart, []);
    });
  });

  describe('PUT /api/sync/todayMenu', () => {
    it('幂等替换 todayMenu', async () => {
      const req = await getRequest();
      // 第一次写入
      const res1 = await req.put('/api/sync/todayMenu')
        .set('Authorization', `Bearer ${token}`)
        .send(['红烧肉', '白灼菜心', '麻婆豆腐']);
      assert.strictEqual(res1.status, 200);
      assert.strictEqual(res1.body.resource, 'todayMenu');
      assert.strictEqual(res1.body.version, 1);

      // 第二次替换
      const res2 = await req.put('/api/sync/todayMenu')
        .set('Authorization', `Bearer ${token}`)
        .send(['酸菜鱼']);
      assert.strictEqual(res2.status, 200);
      assert.strictEqual(res2.body.version, 2);

      // 读取验证
      const getRes = await req.get('/api/sync')
        .set('Authorization', `Bearer ${token}`);
      assert.deepStrictEqual(getRes.body.todayMenu, ['酸菜鱼']);
    });

    it('非数组返回 400', async () => {
      const req = await getRequest();
      const res = await req.put('/api/sync/todayMenu')
        .set('Authorization', `Bearer ${token}`)
        .send({ not: 'array' });
      assert.strictEqual(res.status, 400);
    });
  });

  describe('PUT /api/sync/guestCart', () => {
    it('幂等替换 guestCart', async () => {
      const req = await getRequest();
      const res = await req.put('/api/sync/guestCart')
        .set('Authorization', `Bearer ${token}`)
        .send(['红烧肉', '蒜蓉粉丝虾']);
      assert.strictEqual(res.status, 200);

      const getRes = await req.get('/api/sync')
        .set('Authorization', `Bearer ${token}`);
      assert.deepStrictEqual(getRes.body.guestCart, ['红烧肉', '蒜蓉粉丝虾']);
    });
  });

  describe('PUT /api/sync/ratings', () => {
    it('幂等替换 ratings', async () => {
      const req = await getRequest();
      const res = await req.put('/api/sync/ratings')
        .set('Authorization', `Bearer ${token}`)
        .send({ '红烧肉': 5, '麻婆豆腐': 4, '白灼菜心': 3 });
      assert.strictEqual(res.status, 200);

      const getRes = await req.get('/api/sync')
        .set('Authorization', `Bearer ${token}`);
      assert.deepStrictEqual(getRes.body.ratings, { '红烧肉': 5, '麻婆豆腐': 4, '白灼菜心': 3 });
    });

    it('非对象返回 400', async () => {
      const req = await getRequest();
      const res = await req.put('/api/sync/ratings')
        .set('Authorization', `Bearer ${token}`)
        .send(['array']);
      assert.strictEqual(res.status, 400);
    });

    it('评分值超出范围返回 400', async () => {
      const req = await getRequest();
      const res = await req.put('/api/sync/ratings')
        .set('Authorization', `Bearer ${token}`)
        .send({ '红烧肉': 6 });
      assert.strictEqual(res.status, 400);
    });
  });

  describe('PUT /api/sync/customDishes', () => {
    it('幂等替换 customDishes', async () => {
      const req = await getRequest();
      const dishes = [
        { name: '香菇滑鸡', status: '想做', cat: '荤菜', ing: '香菇·鸡', ingFull: '香菇 50g ｜ 鸡 500g', time: '30 分钟', level: '简单', made: '还没做过', stars: 0, kcal: 380, flavor: '咸鲜', log: [] }
      ];
      const res = await req.put('/api/sync/customDishes')
        .set('Authorization', `Bearer ${token}`)
        .send(dishes);
      assert.strictEqual(res.status, 200);

      const getRes = await req.get('/api/sync')
        .set('Authorization', `Bearer ${token}`);
      assert.strictEqual(getRes.body.customDishes.length, 1);
      assert.strictEqual(getRes.body.customDishes[0].name, '香菇滑鸡');
    });

    it('缺少 name 字段返回 400', async () => {
      const req = await getRequest();
      const res = await req.put('/api/sync/customDishes')
        .set('Authorization', `Bearer ${token}`)
        .send([{ status: '想做' }]);
      assert.strictEqual(res.status, 400);
    });
  });

  describe('PUT /api/sync/:resource — 无效资源', () => {
    it('未知资源返回 400', async () => {
      const req = await getRequest();
      const res = await req.put('/api/sync/invalidResource')
        .set('Authorization', `Bearer ${token}`)
        .send([]);
      assert.strictEqual(res.status, 400);
    });
  });
});

// =================================================================
// REQ-004: 内置菜品查询 + 自定义菜品 CRUD
// =================================================================
describe('菜品管理', () => {
  let token;

  before(async () => {
    token = await login('test_dishes_user');
  });

  describe('GET /api/dishes — 内置受控菜品', () => {
    it('返回 12 个内置菜品', async () => {
      const req = await getRequest();
      const res = await req.get('/api/dishes')
        .set('Authorization', `Bearer ${token}`);
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.strictEqual(res.body.length, 12);
    });

    it('每个菜品包含必填字段', async () => {
      const req = await getRequest();
      const res = await req.get('/api/dishes')
        .set('Authorization', `Bearer ${token}`);
      const dish = res.body[0];
      assert.ok(dish.name);
      assert.ok(dish.status);
      assert.ok(dish.cat);
      assert.ok(dish.ing);
      assert.ok(dish.ingFull);
      assert.ok(dish.time);
      assert.ok(dish.level);
      assert.ok(typeof dish.stars === 'number');
      assert.ok(typeof dish.kcal === 'number');
      assert.ok(dish.flavor);
      assert.ok(Array.isArray(dish.log));
    });
  });

  describe('POST /api/custom-dishes — 创建', () => {
    it('创建自定义菜品成功', async () => {
      const req = await getRequest();
      const res = await req.post('/api/custom-dishes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '家传红烧排骨',
          status: '常做',
          cat: '荤菜',
          ing: '排骨 · 冰糖 · 酱油',
          ingFull: '排骨 800g ｜ 冰糖 30g ｜ 酱油 2 勺',
          time: '60 分钟',
          level: '中等',
          stars: 5,
          kcal: 480,
          flavor: '下饭',
          log: ['第一次就成功']
        });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.name, '家传红烧排骨');
      assert.strictEqual(res.body.stars, 5);
      assert.ok(res.body.id);
    });

    it('缺少 name 返回 400', async () => {
      const req = await getRequest();
      const res = await req.post('/api/custom-dishes')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: '想做' });
      assert.strictEqual(res.status, 400);
    });

    it('不允许覆盖内置菜品名', async () => {
      const req = await getRequest();
      const res = await req.post('/api/custom-dishes')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '红烧肉', status: '想吃' });
      assert.strictEqual(res.status, 400);
    });
  });

  describe('GET /api/custom-dishes — 读取', () => {
    it('读取用户自定义菜品列表', async () => {
      const req = await getRequest();
      const res = await req.get('/api/custom-dishes')
        .set('Authorization', `Bearer ${token}`);
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.ok(res.body.length >= 1);
      assert.strictEqual(res.body[0].name, '家传红烧排骨');
    });
  });

  describe('PUT /api/custom-dishes/:id — 更新', () => {
    it('更新自定义菜品', async () => {
      const req = await getRequest();
      // 先创建一个
      const createRes = await req.post('/api/custom-dishes')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '测试更新菜品' });
      const id = createRes.body.id;

      const res = await req.put(`/api/custom-dishes/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ stars: 4, flavor: '清淡' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.stars, 4);
      assert.strictEqual(res.body.flavor, '清淡');
      assert.strictEqual(res.body.name, '测试更新菜品'); // 未改的字段保留
    });

    it('跨用户更新返回 404', async () => {
      const req = await getRequest();
      const otherToken = await login('test_other_update');
      const createRes = await req.post('/api/custom-dishes')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ name: '别人的菜' });

      const res = await req.put(`/api/custom-dishes/${createRes.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ stars: 1 });
      assert.strictEqual(res.status, 404);
    });

    it('不存在的菜品返回 404', async () => {
      const req = await getRequest();
      const res = await req.put('/api/custom-dishes/99999')
        .set('Authorization', `Bearer ${token}`)
        .send({ stars: 1 });
      assert.strictEqual(res.status, 404);
    });
  });

  describe('DELETE /api/custom-dishes/:id — 删除', () => {
    it('删除自定义菜品', async () => {
      const req = await getRequest();
      const createRes = await req.post('/api/custom-dishes')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '待删除菜品' });

      const delRes = await req.delete(`/api/custom-dishes/${createRes.body.id}`)
        .set('Authorization', `Bearer ${token}`);
      assert.strictEqual(delRes.status, 204);

      // 确认已删除
      const getRes = await req.get('/api/custom-dishes')
        .set('Authorization', `Bearer ${token}`);
      const found = getRes.body.find(d => d.name === '待删除菜品');
      assert.strictEqual(found, undefined);
    });
  });
});

// =================================================================
// REQ-005: 统计与分享
// =================================================================
describe('统计与分享', () => {
  let token;

  before(async () => {
    token = await login('test_stats_share_user');

    // 准备数据
    const req = await getRequest();
    await req.put('/api/sync/todayMenu')
      .set('Authorization', `Bearer ${token}`)
      .send(['红烧肉', '麻婆豆腐', '白灼菜心']);
    await req.put('/api/sync/ratings')
      .set('Authorization', `Bearer ${token}`)
      .send({ '红烧肉': 5, '麻婆豆腐': 4, '白灼菜心': 3, '酸菜鱼': 2 });
    await req.post('/api/custom-dishes')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '统计用菜1', cat: '荤菜', status: '常做', stars: 4 });
    await req.post('/api/custom-dishes')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '统计用菜2', cat: '素菜', status: '想吃', stars: 0 });
  });

  describe('GET /api/stats', () => {
    it('返回用户统计数据', async () => {
      const req = await getRequest();
      const res = await req.get('/api/stats')
        .set('Authorization', `Bearer ${token}`);
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.customDishes);
      assert.strictEqual(res.body.customDishes.total, 2);
      assert.ok(res.body.ratings);
      assert.strictEqual(res.body.ratings.total, 4);
      assert.ok(res.body.ratings.avgStars > 0);
      assert.ok(res.body.todayMenu);
      assert.strictEqual(res.body.todayMenu.itemCount, 3);
      assert.ok(res.body.shares);
    });
  });

  describe('分享', () => {
    let shareToken;

    it('POST /api/shares — 创建分享', async () => {
      const req = await getRequest();
      const res = await req.post('/api/shares')
        .set('Authorization', `Bearer ${token}`)
        .send({ menuSnapshot: ['红烧肉', '麻婆豆腐', '白灼菜心'] });
      assert.strictEqual(res.status, 201);
      assert.ok(res.body.token);
      assert.ok(res.body.menuSnapshot);
      assert.strictEqual(res.body.menuSnapshot.length, 3);
      assert.ok(res.body.expiresAt);
      shareToken = res.body.token;
    });

    it('GET /api/shares/:token — 匿名读取有效分享', async () => {
      const req = await getRequest();
      const res = await req.get(`/api/shares/${shareToken}`);
      assert.strictEqual(res.status, 200);
      assert.deepStrictEqual(res.body.menuSnapshot, ['红烧肉', '麻婆豆腐', '白灼菜心']);
    });

    it('不存在的分享 token 返回 404', async () => {
      const req = await getRequest();
      const res = await req.get('/api/shares/nonexistent-token-12345');
      assert.strictEqual(res.status, 404);
    });

    it('DELETE /api/shares/:id — 撤销分享', async () => {
      const req = await getRequest();
      // 先创建一个新分享
      const createRes = await req.post('/api/shares')
        .set('Authorization', `Bearer ${token}`)
        .send({ menuSnapshot: ['酸菜鱼'] });
      const id = createRes.body.id;
      const revokeToken = createRes.body.token;

      // 撤销
      const delRes = await req.delete(`/api/shares/${id}`)
        .set('Authorization', `Bearer ${token}`);
      assert.strictEqual(delRes.status, 204);

      // 匿名读取应返回 404
      const getRes = await req.get(`/api/shares/${revokeToken}`);
      assert.strictEqual(getRes.status, 404);
    });

    it('跨用户撤销返回 404', async () => {
      const req = await getRequest();
      const otherToken = await login('test_other_share_user');
      const createRes = await req.post('/api/shares')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ menuSnapshot: ['红烧肉'] });

      const res = await req.delete(`/api/shares/${createRes.body.id}`)
        .set('Authorization', `Bearer ${token}`);
      assert.strictEqual(res.status, 404);
    });

    it('无 todayMenu 时创建分享返回 400', async () => {
      const req = await getRequest();
      const emptyUserToken = await login('test_empty_menu_user');
      const res = await req.post('/api/shares')
        .set('Authorization', `Bearer ${emptyUserToken}`)
        .send({ menuSnapshot: [] });
      assert.strictEqual(res.status, 400);
    });
  });
});

// =================================================================
// REQ-006: 复现性
// =================================================================
describe('REQ-006: 可复现性', () => {
  it('健康检查响应格式稳定', async () => {
    const req = await getRequest();
    const res1 = await req.get('/health');
    const res2 = await req.get('/health');
    assert.strictEqual(res1.body.status, res2.body.status);
    assert.strictEqual(res1.body.db, res2.body.db);
  });

  it('404 路由返回 JSON 错误', async () => {
    const req = await getRequest();
    const res = await req.get('/api/nonexistent');
    assert.strictEqual(res.status, 404);
    assert.ok(res.body.error);
  });
});
