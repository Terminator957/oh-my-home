const { DISHES, addToday } = require('../../utils/data');

const POOL = DISHES.filter(d => d.status !== '做过');
const STEP = 360 / POOL.length;

Page({
  data: {
    pool: POOL.map((d, i) => ({ name: d.name, deg: i * STEP, mid: i * STEP + STEP / 2 })),
    halfStep: STEP / 2,
    // 相邻扇区不同色(候选数为奇数时最后一格用第三种色调收尾)
    wheelBg: 'conic-gradient(' + POOL.map((d, i) => {
      const c = (i === POOL.length - 1 && POOL.length % 2 === 1) ? '#F0E6D2' : (i % 2 ? '#F4EBD9' : '#FBF8F2');
      return c + ' ' + (i * STEP) + 'deg ' + ((i + 1) * STEP) + 'deg';
    }).join(',') + ')',
    angle: 0, spinning: false, wheelIdx: -1,
    hint: '指针停在哪就吃哪', result: '· · ·', resultImg: '', meta: '共 ' + POOL.length + ' 道候选',
    resultPop: false
  },


  onUnload() {
    if (this._spinTimer) {
      clearTimeout(this._spinTimer);
      this._spinTimer = null;
    }
  },

  spin() {
    if (this.data.spinning) return;
    const idx = Math.floor(Math.random() * POOL.length);
    const targetAngle = this.data.angle + 360 * 4 + (360 - idx * STEP - STEP / 2) - (this.data.angle % 360);

    this.setData({
      spinning: true, wheelIdx: -1, hint: '指针停在哪就吃哪',
      result: '· · ·', resultImg: '', meta: '共 ' + POOL.length + ' 道候选',
      resultPop: false, animationData: null
    });

    const dur1 = 540, dur2 = 1080, dur3 = 780;
    const totalDur = dur1 + dur2 + dur3;
    const totalDelta = targetAngle - this.data.angle;
    const d1 = totalDelta * 0.15;
    const d2 = totalDelta * 0.75;

    const animation = wx.createAnimation({ duration: dur1, timingFunction: 'ease-in' });
    animation.rotate(d1).step();
    animation.rotate(d2).step({ duration: dur2, timingFunction: 'linear' });
    animation.rotate(totalDelta).step({ duration: dur3, timingFunction: 'ease-out' });

    this.setData({ animationData: animation.export() });

    this._spinTimer = setTimeout(() => {
      this.setData({ angle: targetAngle, animationData: null });
      const d = POOL[idx];
      try { wx.vibrateShort({ type: 'medium' }); } catch (e) {}
      this.setData({
        spinning: false, wheelIdx: idx, hint: '今晚就这道',
        result: d.name, resultImg: d.img || '',
        meta: d.time + ' · ' + d.level + ' · ' + d.kcal + ' 千卡',
        resultPop: true
      });
    }, totalDur);
  },

  confirm() {
    if (this.data.wheelIdx < 0) { wx.showToast({ title: '先转一下', icon: 'none' }); return; }
    addToday(POOL[this.data.wheelIdx].name);
    wx.navigateTo({ url: '/pages/today/today' });
  }
});
