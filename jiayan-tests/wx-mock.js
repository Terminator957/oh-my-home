// 模拟微信小程序 wx 全局对象（storage 部分），供 Node 环境跑单元/接口测试
const store = new Map();

global.wx = {
  getStorageSync(key) {
    return store.has(key) ? store.get(key) : '';
  },
  setStorageSync(key, value) {
    store.set(key, value);
  },
  removeStorageSync(key) {
    store.delete(key);
  },
  _reset() {
    store.clear();
  }
};

module.exports = global.wx;
