const { MOOD_MAP, findDish, starText, addToday } = require('../../utils/data');

Page({
  data: { moods: Object.keys(MOOD_MAP), mood: '想喝汤', list: [], showList: true },
  onLoad() { this.refresh(); },
  refresh() {
    const list = MOOD_MAP[this.data.mood].map(n => {
      const d = findDish(n);
      return { name: d.name, img: d.img, meta: d.ing + ' ｜ ' + d.time, kcal: d.kcal, starText: starText(d.stars) };
    });
    this.setData({ list, showList: true });
  },
  pick(e) {
    const mood = e.currentTarget.dataset.m;
    if (mood === this.data.mood) return;
    // 先卸载列表再重建,触发逐项错落入场动画
    this.setData({ mood, showList: false });
    setTimeout(() => this.refresh(), 30);
  },
  choose(e) {
    addToday(e.currentTarget.dataset.name);
    wx.navigateTo({ url: '/pages/today/today' });
  }
});
