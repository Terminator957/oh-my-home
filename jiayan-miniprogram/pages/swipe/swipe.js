const { DISHES, starText, setToday } = require('../../utils/data');

Page({
  data: { idx: 0, cur: null, tilt: 0, fly: 0, liked: ['冬瓜排骨汤'], counter: '' },
  onLoad() { this.show(0); },
  show(idx) {
    const d = DISHES[idx % DISHES.length];
    this.setData({ idx, cur: { ...d, starText: starText(d.stars) }, counter: (idx % DISHES.length + 1) + ' / ' + DISHES.length });
  },
  advance(like) {
    if (this._busy) return;
    this._busy = true;
    const { idx, cur, liked } = this.data;
    this.setData({
      tilt: like ? 14 : -14,
      fly: like ? 620 : -620,
      liked: like && !liked.includes(cur.name) ? liked.concat(cur.name) : liked
    });
    setTimeout(() => {
      this.setData({ tilt: 0, fly: 0 });
      this.show(idx + 1);
      this._busy = false;
    }, 230);
  },
  like() { this.advance(true); },
  skip() { this.advance(false); },
  touchStart(e) { this._x = e.changedTouches[0].clientX; },
  touchEnd(e) {
    const dx = e.changedTouches[0].clientX - this._x;
    if (dx > 60) this.advance(true);
    else if (dx < -60) this.advance(false);
  },
  settle() {
    setToday(this.data.liked);
    wx.navigateTo({ url: '/pages/today/today' });
  }
});
