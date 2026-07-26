const { findDish, getRating, setRating, addToday } = require('../../utils/data');

Page({
  data: { d: null, rating: 0, pct: 0, macros: [] },
  onLoad(options) {
    const d = findDish(options.name) || findDish('红烧肉');
    const protein = Math.round(d.kcal * 0.16 / 4);
    const carb = Math.round(d.kcal * 0.10 / 4);
    const fat = Math.round(d.kcal * 0.70 / 9);
    const max = Math.max(protein, carb, fat);
    this.setData({
      d,
      rating: getRating(d.name),
      pct: Math.round(d.kcal / 1250 * 100),
      macros: [
        { k: '蛋白', g: protein, pct: Math.round(protein / max * 90), color: '#1F1C18' },
        { k: '碳水', g: carb, pct: Math.round(carb / max * 90), color: '#6B6355' },
        { k: '脂肪', g: fat, pct: Math.round(fat / max * 90), color: '#A93226' }
      ]
    });
    wx.setNavigationBarTitle({ title: d.name });
  },
  setRating(e) {
    const n = e.currentTarget.dataset.n;
    setRating(this.data.d.name, n);
    this.setData({ rating: n, pop: n });
    setTimeout(() => this.setData({ pop: 0 }), 320);
  },
  want() { wx.showToast({ title: '已记到想吃清单', icon: 'none' }); },
  cookToday() {
    addToday(this.data.d.name);
    wx.navigateTo({ url: '/pages/today/today' });
  },
  edit() { wx.showToast({ title: '体验版暂未开放', icon: 'none' }); }
});
