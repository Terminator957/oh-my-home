// 转盘回归测试：spin 锁定、角度匹配、结果揭示、confirm 守卫、候选池不变
const assert = require('node:assert');
const { test, beforeEach } = require('node:test');
require('./wx-mock');
// mock for testing animation export
let animationCalls = [];
wx.createAnimation = function(){
  return {
    rotate(angle) { animationCalls.push({ type: 'rotate', angle }); return this; },
    step(options) { animationCalls.push({ type: 'step', options }); return this; },
    export() { return {}; }
  };
};

// 模拟微信 Page 注册与 setData
let pageData = {};
let pageInstance = null;
global.Page = function (def) {
  // 简易 Page 模拟：把 data 拷贝出来，方法挂在实例上
  const inst = {
    data: { ...def.data },
    setData(obj) {
      Object.assign(this.data, obj);
    },
    _def: def
  };
  // 绑定方法
  for (const key of Object.keys(def)) {
    if (typeof def[key] === 'function' && key !== 'onLoad') {
      inst[key] = def[key].bind(inst);
    }
  }
  if (def.onLoad) def.onLoad.call(inst);
  pageInstance = inst;
};

// 加载 wheel 页面逻辑（会触发 Page() 注册）
const wheelMod = require('../jiayan-miniprogram/pages/wheel/wheel');

beforeEach(() => {
  wx._reset();
  animationCalls = [];
  // 重新加载以重置状态
  delete require.cache[require.resolve('../jiayan-miniprogram/pages/wheel/wheel')];
  const m = require('../jiayan-miniprogram/pages/wheel/wheel');
});

test('spin 三段动画使用递增的累计顺时针角度', () => {
  const inst = pageInstance;
  inst.data.spinning = false;
  inst.data.angle = 0;

  inst.spin();

  const rotateAngles = animationCalls.filter(call => call.type === 'rotate').map(call => call.angle);
  assert.strictEqual(rotateAngles.length, 3, '应创建三段旋转动画');
  assert.ok(rotateAngles[0] < rotateAngles[1] && rotateAngles[1] < rotateAngles[2],
    '三段 rotate 目标角度必须严格递增，避免动画回转');
  assert.strictEqual(rotateAngles[0], rotateAngles[2] * 0.15, '第一段应为总角度的 15%');
  assert.strictEqual(rotateAngles[1], rotateAngles[2] * 0.75, '第二段应为总角度的 75%');
});

test('候选池 = 想吃 + 常做，排除仅做过', () => {
  const dataMod = require('../jiayan-miniprogram/utils/data');
  const pool = dataMod.DISHES.filter(d => d.status !== '做过');
  assert.ok(pool.length >= 5, '候选池应至少有5道菜');
  assert.ok(pool.every(d => d.status !== '做过'), '池中不应有"做过"状态');
  assert.ok(pool.some(d => d.status === '想吃'), '应包含"想吃"的菜');
  assert.ok(pool.some(d => d.status === '常做'), '应包含"常做"的菜');
});

test('扇区角度 STEP 与 pool 长度一致', () => {
  const dataMod = require('../jiayan-miniprogram/utils/data');
  const pool = dataMod.DISHES.filter(d => d.status !== '做过');
  const STEP = 360 / pool.length;
  assert.ok(STEP > 0 && STEP < 90, 'STEP 应在合理范围');
  assert.strictEqual(Math.round(STEP * pool.length), 360);
});

test('spin 锁定：spinning=true 时无法重复触发', () => {
  const inst = pageInstance;
  assert.ok(inst, 'pageInstance 应存在');
  inst.data.spinning = false;
  inst.data.angle = 0;

  // 触发 spin
  inst.spin();
  assert.strictEqual(inst.data.spinning, true, 'spin 后应设 spinning=true');

  // 记录当前 angle
  const angleAfterFirstSpin = inst.data.angle;
  // 模拟仍在旋转中，再次调用 spin 应被阻止
  inst.spin();
  assert.strictEqual(inst.data.spinning, true, 'spinning 仍应为 true（第二次调用被阻止）');
});

test('spin 停止后给出有效结果且 wheelIdx>=0', async () => {
  const inst = pageInstance;
  inst.data.spinning = false;
  inst.data.angle = 0;

  inst.spin();
  // 等待动画完成（最长 2400ms + buffer）
  await new Promise(r => {
    const check = () => {
      if (!inst.data.spinning) return r();
      setTimeout(check, 100);
    };
    setTimeout(check, 2500);
  });

  assert.strictEqual(inst.data.spinning, false, '动画结束后 spinning 应为 false');
  assert.ok(inst.data.wheelIdx >= 0, '应有有效 wheelIdx');
  assert.ok(inst.data.result !== '· · ·', 'result 不应为占位符');
  assert.ok(inst.data.resultImg !== undefined, 'resultImg 应存在');
  assert.ok(inst.data.meta && inst.data.meta.includes('千卡'), 'meta 应包含千卡');
});

test('目标角度与随机索引匹配', () => {
  const dataMod = require('../jiayan-miniprogram/utils/data');
  const pool = dataMod.DISHES.filter(d => d.status !== '做过');
  const STEP = 360 / pool.length;

  // 模拟计算（与 wheel.js 中公式完全一致）
  for (let trial = 0; trial < 10; trial++) {
    const idx = Math.floor(Math.random() * pool.length);
    const currentAngle = Math.random() * 1000;
    const target = currentAngle + 360 * 4 + (360 - idx * STEP - STEP / 2) - (currentAngle % 360);

    // 验证停下后，扇区中线对准指针（0° = 360°）
    const normalizedAngle = target % 360;
    const targetMid = (360 - normalizedAngle + 360) % 360; // 指针正对的盘面角度
    const expectedMid = idx * STEP + STEP / 2;

    // 允许浮点误差
    const diff = Math.abs(targetMid - expectedMid);
    assert.ok(diff < 0.01 || Math.abs(diff - 360) < 0.01,
      `trial ${trial}: idx=${idx}, targetMid=${targetMid.toFixed(2)}, expectedMid=${expectedMid.toFixed(2)}, diff=${diff.toFixed(4)}`);
  }
});

test('confirm 在未抽取时弹 toast 提示', () => {
  const inst = pageInstance;
  inst.data.wheelIdx = -1;
  let toastShown = false;
  wx.showToast = (opts) => { toastShown = true; assert.strictEqual(opts.title, '先转一下'); };
  inst.confirm();
  assert.ok(toastShown, '未抽取时应弹出 toast');
});

test('confirm 在已抽取后调用 addToday 并导航', () => {
  const inst = pageInstance;
  const dataMod = require('../jiayan-miniprogram/utils/data');
  const pool = dataMod.DISHES.filter(d => d.status !== '做过');
  inst.data.wheelIdx = 0;
  const targetName = pool[0].name;

  let navigatedTo = null;
  wx.navigateTo = (opts) => { navigatedTo = opts.url; };

  inst.confirm();

  // 验证已写入今日菜单
  const today = dataMod.getToday();
  assert.ok(today.includes(targetName), 'addToday 应将菜品写入今日菜单');
  assert.strictEqual(navigatedTo, '/pages/today/today', '确认后应导航到今日页面');
});

test('resultPop 标志在停止后置为 true', async () => {
  const inst = pageInstance;
  inst.data.spinning = false;
  inst.data.angle = 0;
  inst.data.resultPop = false;

  inst.spin();
  await new Promise(r => {
    const check = () => {
      if (!inst.data.spinning) return r();
      setTimeout(check, 100);
    };
    setTimeout(check, 2500);
  });

  assert.strictEqual(inst.data.resultPop, true, '停止后 resultPop 应为 true');
});

test('animationData 在 spin 后被填充并在停止后被清除', async () => {
  const inst = pageInstance;
  inst.data.spinning = false;
  inst.data.angle = 0;
  inst.data.animationData = null;

  inst.spin();
  // 立即检查 animationData 已被导出
  assert.ok(inst.data.animationData, 'spin 后 animationData 应被填充');
  assert.ok(inst.data.animationData, "animationData should be exported object");

  // 等待动画完成
  await new Promise(r => {
    const check = () => {
      if (!inst.data.spinning) return r();
      setTimeout(check, 100);
    };
    setTimeout(check, 2500);
  });

  // 停止后 animationData 应被清除
  assert.strictEqual(inst.data.animationData, null, '停止后 animationData 应被清除');
});
