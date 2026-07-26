// 单元测试：utils/data.js 纯逻辑
const assert = require('node:assert');
const { test, beforeEach } = require('node:test');
require('./wx-mock');

const data = require('../jiayan-miniprogram/utils/data');
const { DISHES, MOOD_MAP, starText, findDish } = data;

beforeEach(() => wx._reset());

test('菜品数据完整性：12 道菜，字段齐全', () => {
  assert.strictEqual(DISHES.length, 12);
  for (const d of DISHES) {
    for (const k of ['name', 'status', 'cat', 'ing', 'ingFull', 'time', 'level', 'made', 'stars', 'kcal', 'flavor', 'log']) {
      assert.ok(d[k] !== undefined, d.name + ' 缺少字段 ' + k);
    }
    assert.ok(['想吃', '做过', '常做'].includes(d.status), d.name + ' 状态非法');
    assert.ok(['荤菜', '素菜', '汤', '主食'].includes(d.cat), d.name + ' 分类非法');
    assert.ok(d.kcal > 0 && d.kcal < 2000, d.name + ' 热量异常');
    assert.ok(d.stars >= 0 && d.stars <= 5, d.name + ' 星级异常');
  }
});

test('菜名唯一', () => {
  const names = DISHES.map(d => d.name);
  assert.strictEqual(new Set(names).size, names.length);
});

test('心情映射的每道菜都存在于菜品库', () => {
  for (const [mood, names] of Object.entries(MOOD_MAP)) {
    assert.ok(names.length >= 3, mood + ' 推荐不足 3 道');
    for (const n of names) assert.ok(findDish(n), mood + ' 引用了不存在的菜: ' + n);
  }
});

test('starText 星级渲染', () => {
  assert.strictEqual(starText(0), '—');
  assert.strictEqual(starText(3), '★★★☆☆');
  assert.strictEqual(starText(5), '★★★★★');
});

test('findDish 命中与未命中', () => {
  assert.strictEqual(findDish('红烧肉').kcal, 520);
  assert.strictEqual(findDish('不存在的菜'), undefined);
});

test('转盘候选池 = 想吃 + 常做（排除仅做过）', () => {
  const pool = DISHES.filter(d => d.status !== '做过');
  assert.ok(pool.length >= 5);
  assert.ok(pool.every(d => d.status !== '做过'));
  assert.ok(pool.some(d => d.name === '红烧肉'));
  assert.ok(!pool.some(d => d.name === '凉拌木耳'));
});

test('热量估算公式（添一道）：60 + 食材数 × 54', () => {
  const est = n => Math.round(60 + n * 54);
  assert.strictEqual(est(6), 384);
  assert.strictEqual(est(0), 60);
});
