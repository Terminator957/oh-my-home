const assert = require('node:assert');
const { afterEach, beforeEach, test } = require('node:test');
require('./wx-mock');

const data = require('../jiayan-miniprogram/utils/data');
const flush = () => new Promise(resolve => setImmediate(resolve));

let requests;
function enableNetwork(responder) {
  requests = [];
  wx.request = options => {
    requests.push(options);
    responder(options, requests.length);
  };
}

beforeEach(() => wx._reset());
afterEach(() => { delete wx.request; delete wx.login; });

test('初始化登录、缓存 token，并以本地优先规则合并四类资源', async () => {
  wx.setStorageSync('apiBaseUrl', 'http://localhost:3000/');
  wx.setStorageSync('syncTestMode', true);
  wx.setStorageSync('todayMenu', ['本地菜单']);
  wx.setStorageSync('ratings', { 红烧肉: 3 });
  enableNetwork(options => {
    if (options.url.endsWith('/api/auth/wechat')) return options.success({ statusCode: 200, data: { token: 'token-1' } });
    assert.deepStrictEqual(options.header, { Authorization: 'Bearer token-1' });
    options.success({ statusCode: 200, data: {
      customDishes: [{ name: '远端菜' }], ratings: { 红烧肉: 5, 麻婆豆腐: 4 }, todayMenu: ['远端菜单'], guestCart: ['远端购物车']
    } });
  });

  await data.initSync();
  assert.match(requests[0].data.code, /^test_openid_/);
  assert.strictEqual(wx.getStorageSync('syncToken'), 'token-1');
  assert.deepStrictEqual(data.getToday(), ['本地菜单']);
  assert.deepStrictEqual(data.getCustomDishes(), [{ name: '远端菜' }]);
  assert.deepStrictEqual(wx.getStorageSync('ratings'), { 红烧肉: 3, 麻婆豆腐: 4 });
  assert.deepStrictEqual(data.getGuestCart(), ['远端购物车']);
});

test('正式登录路径使用 wx.login code，网络或登录失败不破坏本地数据', async () => {
  wx.setStorageSync('apiBaseUrl', 'http://localhost:3000');
  wx.setStorageSync('todayMenu', ['离线菜单']);
  wx.login = ({ success }) => success({ code: 'real-login-code' });
  enableNetwork(options => {
    assert.strictEqual(options.data.code, 'real-login-code');
    options.fail(new Error('offline'));
  });

  await data.initSync();
  assert.deepStrictEqual(data.getToday(), ['离线菜单']);
  assert.strictEqual(wx.getStorageSync('syncToken'), '');
});

test('四类写操作先落本地，首次 PUT 失败后恰好重试一次', async () => {
  wx.setStorageSync('apiBaseUrl', 'http://localhost:3000');
  wx.setStorageSync('syncToken', 'token-2');
  const attempts = new Map();
  enableNetwork(options => {
    assert.deepStrictEqual(options.header, { Authorization: 'Bearer token-2' });
    const count = (attempts.get(options.url) || 0) + 1;
    attempts.set(options.url, count);
    if (count === 1) options.fail(new Error('first failure'));
    else options.success({ statusCode: 200, data: {} });
  });

  data.setToday(['菜单']);
  data.setGuestCart(['购物车']);
  data.setCustomDishes([{ name: '自定义菜' }]);
  data.setRating('红烧肉', 2);
  assert.deepStrictEqual(data.getToday(), ['菜单']);
  assert.deepStrictEqual(data.getGuestCart(), ['购物车']);
  assert.deepStrictEqual(data.getCustomDishes(), [{ name: '自定义菜' }]);
  assert.strictEqual(data.getRating('红烧肉'), 2);
  await flush();
  await flush();
  assert.strictEqual(requests.length, 8);
  assert.deepStrictEqual(requests.map(request => request.url.replace('http://localhost:3000/api/sync/', '')).sort(), ['customDishes', 'customDishes', 'guestCart', 'guestCart', 'ratings', 'ratings', 'todayMenu', 'todayMenu']);
});

test('没有网络能力时维持原有本地 getter 和 setter 语义', () => {
  data.setToday(['本地']);
  data.setGuestCart([]);
  data.setCustomDishes([{ name: '本地菜' }]);
  data.setRating('红烧肉', 1);
  assert.deepStrictEqual(data.getToday(), ['本地']);
  assert.deepStrictEqual(data.getGuestCart(), []);
  assert.deepStrictEqual(data.getCustomDishes(), [{ name: '本地菜' }]);
  assert.strictEqual(data.getRating('红烧肉'), 1);
});
