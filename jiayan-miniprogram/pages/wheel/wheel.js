const { DISHES, addToday } = require('../../utils/data');

const POOL = DISHES.filter(d => d.status !== '做过');
const STEP = 360 / POOL.length;

Page({
  data: {
    pool: POOL.map((d, i) => ({ name: d.name, deg: i * STEP })),
    halfStep: STEP / 2,
    wheelBg: 'conic-gradient(' + POOL.map((d, i) => (i % 2 ? '#F4EDDF' : '#FBF8F2') + ' ' + (i * STEP) + 'deg ' + ((i + 1) * STEP) + 'deg').join(',') + ')',
    angle: 0, spinning: false, wheelIdx: -1,
    hint: '指针停在哪就吃哪', result: '· · ·', resultImg: '', meta: '共 ' + POOL.length + ' 道候选'
  },
  spin() {
    if (this.data.spinning) return;
    const idx = Math.floor(Math.random() * POOL.length);
    const target = this.data.angle + 360 * 4 + (360 - idx * STEP - STEP / 2) - (this.data.angle % 360);
    this.setData({ spinning: true, angle: target, wheelIdx: -1, hint: '指针停在哪就吃哪', result: '· · ·', resultImg: '', meta: '共 ' + POOL.length + ' 道候选' });
    setTimeout(() => {
      const d = POOL[idx];
      try { wx.vibrateShort({ type: 'medium' }); } catch (e) {}
      this.setData({ spinning: false, wheelIdx: idx, hint: '今晚就这道', result: d.name, resultImg: d.img || '', meta: d.time + ' · ' + d.level + ' · ' + d.kcal + ' 千卡' });
    }, 2450);
  },
  confirm() {
    if (this.data.wheelIdx < 0) { wx.showToast({ title: '先转一下', icon: 'none' }); return; }
    addToday(POOL[this.data.wheelIdx].name);
    wx.navigateTo({ url: '/pages/today/today' });
  }
});
