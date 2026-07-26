const { MOOD_MAP, findDish, starText, addToday } = require('../../utils/data');

Page({
  data: { moods: Object.keys(MOOD_MAP), mood: '想喝汤', list: [] },
  onLoad() { this.refresh(); },
  refresh() {
    const list = MOOD_MAP[this.data.mood].map(n => {
      const d = findDish(n);
      return { name: d.name, meta: d.ing + ' ｜ ' + d.time, kcal: d.kcal, starText: starText(d.stars) };
    });
    this.setData({ list });
  },
  pick(e) { this.setData({ mood: e.currentTarget.dataset.m }, () => this.refresh()); },
  choose(e) {
    addToday(e.currentTarget.dataset.name);
    wx.navigateTo({ url: '/pages/today/today' });
  }
});
