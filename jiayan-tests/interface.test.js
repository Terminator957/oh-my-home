// 接口测试：数据层对页面暴露的存取接口（本版本无后端，数据接口即 storage 层契约）
const assert = require('node:assert');
const { test, beforeEach } = require('node:test');
require('./wx-mock');

const data = require('../jiayan-miniprogram/utils/data');
const { getToday, setToday, addToday, getGuestCart, setGuestCart, getRating, setRating, DISHES } = data;

beforeEach(() => wx._reset());

test('今日菜单：默认空 → 添加 → 去重 → 覆盖', () => {
  assert.deepStrictEqual(getToday(), []);
  addToday('红烧肉');
  addToday('白灼菜心');
  addToday('红烧肉'); // 重复添加应去重
  assert.deepStrictEqual(getToday(), ['红烧肉', '白灼菜心']);
  setToday(['椰子鸡']);
  assert.deepStrictEqual(getToday(), ['椰子鸡']);
});

test('客人购物车：默认预置 3 道，可增删', () => {
  assert.deepStrictEqual(getGuestCart(), ['红烧肉', '酸菜鱼', '蒜蓉粉丝虾']);
  setGuestCart(['麻婆豆腐']);
  assert.deepStrictEqual(getGuestCart(), ['麻婆豆腐']);
  setGuestCart([]);
  assert.deepStrictEqual(getGuestCart(), []);
});

test('购物车热量合计与人均计算', () => {
  setGuestCart(['红烧肉', '酸菜鱼', '蒜蓉粉丝虾']);
  const kcal = getGuestCart().reduce((a, n) => a + DISHES.find(d => d.name === n).kcal, 0);
  assert.strictEqual(kcal, 520 + 610 + 280);
  assert.strictEqual(Math.round(kcal / 4), 353);
});

test('评分：默认取菜品星级，可覆盖持久化', () => {
  assert.strictEqual(getRating('红烧肉'), 5);
  setRating('红烧肉', 3);
  assert.strictEqual(getRating('红烧肉'), 3);
  assert.strictEqual(getRating('麻婆豆腐'), 5); // 未覆盖的不受影响
});

test('评分边界：未知菜品默认 0', () => {
  assert.strictEqual(getRating('不存在的菜'), 0);
});
