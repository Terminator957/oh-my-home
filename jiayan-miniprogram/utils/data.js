// 菜品数据 —— 与设计稿保持一致
const DISHES = [
  { name: '红烧肉', status: '常做', cat: '荤菜', ing: '五花肉 · 冰糖 · 八角', ingFull: '五花肉 500g ｜ 冰糖 25g ｜ 生姜 3 片 ｜ 八角 2 颗 ｜ 老抽 1 勺 ｜ 黄酒 半碗', time: '90 分钟', level: '中等', made: '做过 14 次 · 上次 6.28', stars: 5, kcal: 520, flavor: '下饭',
    log: ['6.28 · 火收得刚好，她说比上次好', '5.30 · 糖多了一点，下次减 5g', '4.19 · 第一次用铸铁锅'] },
  { name: '凉拌木耳', status: '做过', cat: '素菜', ing: '黑木耳 · 香菜 · 小米辣', ingFull: '黑木耳 60g ｜ 香菜 1 把 ｜ 小米辣 3 个 ｜ 生抽 1 勺 ｜ 香醋 1 勺', time: '15 分钟', level: '简单', made: '做过 6 次 · 上次 7.09', stars: 4, kcal: 90, flavor: '清淡', log: ['7.09 · 醋放足了才爽口'] },
  { name: '酸菜鱼', status: '想吃', cat: '荤菜', ing: '黑鱼 · 酸菜 · 泡椒', ingFull: '黑鱼 1 条 ｜ 酸菜 200g ｜ 泡椒 6 个 ｜ 蛋清 1 个 ｜ 淀粉 1 勺', time: '50 分钟', level: '偏难', made: '还没做过', stars: 0, kcal: 610, flavor: '想吃辣', log: [] },
  { name: '白灼菜心', status: '做过', cat: '素菜', ing: '菜心 · 蒜 · 蚝油', ingFull: '菜心 1 把 ｜ 蒜 3 瓣 ｜ 蚝油 1 勺 ｜ 生抽 半勺', time: '10 分钟', level: '简单', made: '做过 21 次 · 上次 7.22', stars: 4, kcal: 70, flavor: '快手', log: ['7.22 · 水里加了一点油，颜色更绿'] },
  { name: '麻婆豆腐', status: '常做', cat: '荤菜', ing: '嫩豆腐 · 牛肉末 · 豆瓣', ingFull: '嫩豆腐 1 盒 ｜ 牛肉末 100g ｜ 豆瓣酱 1 勺 ｜ 花椒面 少许 ｜ 蒜苗 2 根', time: '20 分钟', level: '简单', made: '做过 11 次 · 上次 7.06', stars: 5, kcal: 320, flavor: '想吃辣', log: ['7.06 · 起锅前那勺花椒面是灵魂'] },
  { name: '冬瓜排骨汤', status: '想吃', cat: '汤', ing: '排骨 · 冬瓜 · 姜', ingFull: '排骨 400g ｜ 冬瓜 半个 ｜ 生姜 3 片 ｜ 枸杞 1 小把', time: '40 分钟', level: '简单', made: '上次 5.12', stars: 4, kcal: 220, flavor: '想喝汤', log: ['5.12 · 焯水后炖 40 分钟刚好'] },
  { name: '蒜蓉粉丝虾', status: '做过', cat: '荤菜', ing: '虾 · 粉丝 · 蒜', ingFull: '虾 500g ｜ 粉丝 2 把 ｜ 蒜 2 头 ｜ 小葱 2 根 ｜ 蒸鱼豉油 2 勺', time: '25 分钟', level: '中等', made: '做过 4 次 · 上次 7.18', stars: 5, kcal: 280, flavor: '下饭', log: ['7.18 · 蒜蓉一半生一半熟，更香'] },
  { name: '番茄牛腩', status: '常做', cat: '荤菜', ing: '牛腩 · 番茄 · 洋葱', ingFull: '牛腩 500g ｜ 番茄 4 个 ｜ 洋葱 1 个 ｜ 土豆 2 个', time: '100 分钟', level: '中等', made: '做过 9 次 · 上次 7.21', stars: 4, kcal: 430, flavor: '想喝汤', log: ['7.21 · 番茄分两批下，汤更浓'] },
  { name: '口水鸡', status: '做过', cat: '荤菜', ing: '鸡腿 · 花椒 · 红油', ingFull: '鸡腿 4 只 ｜ 花椒 1 勺 ｜ 红油 2 勺 ｜ 花生碎 1 把', time: '45 分钟', level: '中等', made: '做过 3 次 · 上次 6.14', stars: 4, kcal: 390, flavor: '想吃辣', log: ['6.14 · 冰水激过鸡皮更脆'] },
  { name: '干煸豆角', status: '做过', cat: '素菜', ing: '四季豆 · 肉末 · 干辣椒', ingFull: '四季豆 400g ｜ 肉末 80g ｜ 干辣椒 6 个 ｜ 蒜 3 瓣', time: '25 分钟', level: '简单', made: '做过 8 次 · 上次 7.15', stars: 3, kcal: 210, flavor: '下饭', log: ['7.15 · 豆角要煸到起皱'] },
  { name: '葱油面', status: '想吃', cat: '主食', ing: '小葱 · 挂面 · 酱油', ingFull: '小葱 1 大把 ｜ 挂面 2 人份 ｜ 生抽 2 勺 ｜ 老抽 半勺 ｜ 糖 1 小勺', time: '20 分钟', level: '简单', made: '还没做过', stars: 0, kcal: 460, flavor: '快手', log: [] },
  { name: '椰子鸡', status: '想吃', cat: '汤', ing: '椰青 · 鸡 · 玉米', ingFull: '椰青 2 个 ｜ 鸡半只 ｜ 玉米 1 根 ｜ 马蹄 6 个', time: '55 分钟', level: '简单', made: '还没做过', stars: 0, kcal: 340, flavor: '想喝汤', log: [] }
];

const MOOD_MAP = {
  '想喝汤': ['冬瓜排骨汤', '番茄牛腩', '椰子鸡'],
  '想吃辣': ['麻婆豆腐', '酸菜鱼', '口水鸡'],
  '清淡': ['白灼菜心', '凉拌木耳', '冬瓜排骨汤'],
  '快手': ['白灼菜心', '葱油面', '麻婆豆腐'],
  '下饭': ['红烧肉', '干煸豆角', '蒜蓉粉丝虾'],
  '想吃肉': ['红烧肉', '番茄牛腩', '口水鸡']
};

function starText(n) {
  if (!n) return '—';
  return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
}

function findDish(name) {
  return DISHES.find(d => d.name === name);
}

// 今天的菜单（storage 持久化）
function getToday() {
  return wx.getStorageSync('todayMenu') || [];
}
function setToday(names) {
  wx.setStorageSync('todayMenu', names);
}
function addToday(name) {
  const t = getToday();
  if (!t.includes(name)) t.push(name);
  setToday(t);
}

// 客人购物车
function getGuestCart() {
  const c = wx.getStorageSync('guestCart');
  return c === '' ? ['红烧肉', '酸菜鱼', '蒜蓉粉丝虾'] : c;
}
function setGuestCart(names) {
  wx.setStorageSync('guestCart', names);
}

// 评分（按菜名覆盖默认星级）
function getRating(name) {
  const map = wx.getStorageSync('ratings') || {};
  if (map[name] !== undefined) return map[name];
  const d = findDish(name);
  return d ? d.stars : 0;
}
function setRating(name, n) {
  const map = wx.getStorageSync('ratings') || {};
  map[name] = n;
  wx.setStorageSync('ratings', map);
}

module.exports = { DISHES, MOOD_MAP, starText, findDish, getToday, setToday, addToday, getGuestCart, setGuestCart, getRating, setRating };
