const { DISHES, starText, setToday } = require('../../utils/data');

const THRESHOLD = 90; // px,超过即判定滑出

Page({
  data: { idx: 0, cur: null, dragX: 0, dragging: false, gone: false, liked: ['冬瓜排骨汤'], counter: '' },
  onLoad() { this.show(0); },
  show(idx) {
    const d = DISHES[idx % DISHES.length];
    this.setData({ idx, cur: { ...d, starText: starText(d.stars) }, counter: (idx % DISHES.length + 1) + ' / ' + DISHES.length });
  },
  commit(like) {
    if (this._busy) return;
    this._busy = true;
    const { idx, cur, liked } = this.data;
    if (like) { try { wx.vibrateShort({ type: 'light' }); } catch (e) {} }
    this.setData({
      dragging: false,
      gone: true,
      dragX: like ? 400 : -400,
      liked: like && !liked.includes(cur.name) ? liked.concat(cur.name) : liked
    });
    setTimeout(() => {
      this.setData({ dragX: 0, gone: false });
      this.show(idx + 1);
      this._busy = false;
    }, 290);
  },
  like() { this.commit(true); },
  skip() { this.commit(false); },
  touchStart(e) {
    if (this._busy) return;
    this._x = e.changedTouches[0].clientX;
    this._t = 0;
    this.setData({ dragging: true });
  },
  touchMove(e) {
    if (this._busy || !this.data.dragging) return;
    const now = Date.now();
    if (now - this._t < 30) return; // 节流,避免高频 setData
    this._t = now;
    this.setData({ dragX: e.changedTouches[0].clientX - this._x });
  },
  touchEnd(e) {
    if (this._busy) return;
    const dx = e.changedTouches[0].clientX - this._x;
    if (dx > THRESHOLD) this.commit(true);
    else if (dx < -THRESHOLD) this.commit(false);
    else this.setData({ dragging: false, dragX: 0 }); // 回弹
  },
  settle() {
    setToday(this.data.liked);
    wx.navigateTo({ url: '/pages/today/today' });
  }
});
