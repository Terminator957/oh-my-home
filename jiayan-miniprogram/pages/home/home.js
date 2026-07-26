const { DISHES, starText, addToday } = require('../../utils/data');

const RECS = DISHES.filter(d => d.status === '想吃');

Page({
  data: {
    dateLabel: '',
    rec: RECS.find(d => d.name === '冬瓜排骨汤') || RECS[0],
    recIdx: 0,
    showRec: true,
    wantCount: DISHES.filter(d => d.status === '想吃').length + 14,
    madeCount: DISHES.filter(d => d.status !== '想吃').length + 55,
    recent: [
      { name: '番茄牛腩', date: '7.21', starText: starText(4) },
      { name: '蒜蓉粉丝虾', date: '7.18', starText: starText(5) },
      { name: '干煸豆角', date: '7.15', starText: starText(3) }
    ],
    bars: [
      { h: 40 }, { h: 62 }, { h: 34 }, { h: 78, hot: true }, { h: 52 }, { h: 66 }, { h: 20 }
    ]
  },
  onLoad() {
    const d = new Date();
    const cn = ['一','二','三','四','五','六','七','八','九','十','十一','十二'];
    this.setData({ dateLabel: cn[d.getMonth()] + '月' + d.getDate() + '日 · 小暑' });
    const idx = RECS.findIndex(r => r.name === this.data.rec.name);
    this.setData({ recIdx: idx < 0 ? 0 : idx });
  },
  pickRec() {
    addToday(this.data.rec.name);
    wx.navigateTo({ url: '/pages/today/today' });
  },
  nextRec() {
    const idx = (this.data.recIdx + 1) % RECS.length;
    this.setData({ showRec: false });
    setTimeout(() => this.setData({ recIdx: idx, rec: RECS[idx], showRec: true }), 40);
  },
  goWant() { wx.setStorageSync('libTab', '想吃'); wx.switchTab({ url: '/pages/library/library' }); },
  goMade() { wx.setStorageSync('libTab', '做过'); wx.switchTab({ url: '/pages/library/library' }); },
  goGuest() { wx.navigateTo({ url: '/pages/guest/guest' }); },
  goWheel() { wx.navigateTo({ url: '/pages/wheel/wheel' }); },
  goSwipe() { wx.navigateTo({ url: '/pages/swipe/swipe' }); },
  goMood() { wx.navigateTo({ url: '/pages/mood/mood' }); },
  openDish(e) { wx.navigateTo({ url: '/pages/dish/dish?name=' + e.currentTarget.dataset.name }); },
  onShareAppMessage() {
    return { title: '阿宁和小周的家宴菜单', path: '/pages/guest/guest' };
  }
});
