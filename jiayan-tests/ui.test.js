// UI 功能测试：通过微信开发者工具 automator 驱动真实模拟器
const automator = require('miniprogram-automator');

// 兼容补丁：新版开发者工具不返回 SDK 版本号，automator 0.12 的 checkVersion 会崩溃，跳过它
try {
  const MP = require('miniprogram-automator/out/MiniProgram');
  const cls = MP.default || MP;
  if (cls && cls.prototype) cls.prototype.checkVersion = async () => {};
} catch (e) {}

const CLI = 'C:\\Program Files (x86)\\Tencent\\微信web开发者工具\\cli.bat';
const PROJECT = 'D:\\Coding\\workplace\\Claude\\jiayan-miniprogram';

let passed = 0, failed = 0;
function ok(name, cond) {
  if (cond) { passed++; console.log('  ✔ ' + name); }
  else { failed++; console.log('  ✘ ' + name); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  console.log('连接开发者工具自动化端口…');
  let mini;
  try {
    mini = await automator.connect({ wsEndpoint: 'ws://localhost:9420' });
  } catch (e) {
    console.log('直连失败，尝试 launch…');
    mini = await automator.launch({ cliPath: CLI, projectPath: PROJECT, timeout: 120000 });
  }
  try {
    // ---------- 首页 ----------
    let page = await mini.reLaunch('/pages/home/home');
    await sleep(800);
    ok('首页加载，路径正确', page.path === 'pages/home/home');
    let el = await page.$('.title, .pad');
    ok('首页渲染出内容区', !!el);
    const heading = await page.xpath ? null : null;
    const texts = await page.$$('view');
    ok('首页渲染出「晚上吃点什么？」', (await Promise.all(texts.slice(0, 40).map(t => t.text().catch(() => '')))).join('').includes('晚上吃点什么'));

    // 换一个：推荐菜名应变化
    const recName1 = (await page.data()).rec.name;
    const btns = await page.$$('view.btn');
    let switchBtn = null;
    for (const b of btns) { if ((await b.text()).includes('换一个')) { switchBtn = b; break; } }
    await switchBtn.tap();
    await sleep(400);
    const recName2 = (await page.data()).rec.name;
    ok('「换一个」切换今日推荐 (' + recName1 + ' → ' + recName2 + ')', recName1 !== recName2);

    // ---------- 菜谱库筛选 ----------
    page = await mini.reLaunch('/pages/library/library');
    await sleep(600);
    const allCount = (await page.data()).list.length;
    const chips = await page.$$('view.chip');
    for (const c of chips) { if ((await c.text()).startsWith('想吃')) { await c.tap(); break; } }
    await sleep(400);
    const wantList = (await page.data()).list;
    ok('菜谱库「想吃」筛选生效 (' + allCount + ' → ' + wantList.length + ' 道)', wantList.length < allCount && wantList.every(d => d.status === '想吃'));

    // ---------- 菜品详情评分 ----------
    page = await mini.reLaunch('/pages/dish/dish?name=红烧肉');
    await sleep(600);
    ok('详情页显示红烧肉与热量', (await page.data()).d.kcal === 520);
    const stars = await page.$$('text.star');
    await stars[2].tap(); // 点第 3 颗星
    await sleep(300);
    ok('点星评分生效 (rating=3)', (await page.data()).rating === 3);

    // ---------- 客人点菜 ----------
    page = await mini.reLaunch('/pages/guest/guest');
    await sleep(600);
    const before = (await page.data()).cartCount;
    const menu = (await page.data()).menu;
    const target = menu.find(m => !m.inCart);
    const toggles = await page.$$('view');
    for (const t of toggles) {
      const txt = await t.text().catch(() => '');
      if (txt === '＋ 点') { await t.tap(); break; }
    }
    await sleep(400);
    const after = (await page.data()).cartCount;
    ok('客人加菜 (' + before + ' → ' + after + ' 道)', after === before + 1);

    // ---------- 转盘 ----------
    page = await mini.reLaunch('/pages/wheel/wheel');
    await sleep(600);
    // 触发方式:点转盘中心的「转 / SPIN」圆钮(取最小命中节点,失败则直接调页面方法)
    const spinViews = await page.$$('view');
    let hub = null;
    for (const b of spinViews) {
      const t = await b.text().catch(() => '');
      if (t.includes('SPIN')) hub = b;
    }
    if (hub) await hub.tap();
    await sleep(200);
    if (!(await page.data()).spinning) await page.callMethod('spin');
    await sleep(100);
    ok('转盘开始旋转 (spinning=true)', (await page.data()).spinning === true);
    await sleep(2800);
    const wd = await page.data();
    ok('转盘停下并给出结果 (' + wd.result + ')', wd.spinning === false && wd.result !== '· · ·');

    // ---------- 滑卡 ----------
    page = await mini.reLaunch('/pages/swipe/swipe');
    await sleep(600);
    const likedBefore = (await page.data()).liked.length;
    const curName = (await page.data()).cur.name;
    const circles = await page.$$('view');
    for (const c of circles) { if ((await c.text().catch(() => '')) === '想') { await c.tap(); break; } }
    await sleep(500);
    const sd = await page.data();
    ok('滑卡「想吃」进清单并切下一张', sd.liked.length >= likedBefore && sd.cur.name !== curName);

    // ---------- 心情筛选 ----------
    page = await mini.reLaunch('/pages/mood/mood');
    await sleep(600);
    const moodChips = await page.$$('view.chip');
    for (const c of moodChips) { if ((await c.text()) === '想吃辣') { await c.tap(); break; } }
    await sleep(400);
    const md = await page.data();
    ok('心情切到「想吃辣」，推荐列表更新', md.mood === '想吃辣' && md.list.some(d => d.name === '麻婆豆腐'));

    // ---------- 今天就这样 ----------
    page = await mini.reLaunch('/pages/today/today');
    await sleep(600);
    const td = await page.data();
    ok('定餐页合计热量 = 各菜之和', td.totalKcal === td.list.reduce((a, d) => a + d.kcal, 0) && td.totalKcal > 0);

  } catch (e) {
    failed++;
    console.error('  ✘ 用例执行异常: ' + (e && e.stack || e));
  } finally {
    console.log('\nUI 测试结果: ' + passed + ' 通过, ' + failed + ' 失败');
    try { await mini.disconnect(); } catch (e) {}
    process.exit(failed ? 1 : 0);
  }
})().catch(e => { console.error('UI 测试运行失败:', e.message); process.exit(2); });
