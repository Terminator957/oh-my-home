const { findDish, getToday, setToday } = require('../../utils/data');

const DEFAULT_MENU = ['冬瓜排骨汤', '麻婆豆腐', '白灼菜心'];

Page({
  data: { dateLabel: '', list: [], totalKcal: 0, perPerson: 0, minutes: 0, shopping: '' },
  onShow() {
    let names = getToday();
    if (!names.length) { names = DEFAULT_MENU; setToday(names); }
    const list = names.map(n => {
      const d = findDish(n);
      if (!d) return null;
      const tag = d.status === '想吃' ? '她想吃' : d.status === '常做' ? '常做' : '快手';
      return { name: d.name, img: d.img, kcal: d.kcal, tag, time: parseInt(d.time) || 30, ing: d.ing };
    }).filter(Boolean);
    const totalKcal = list.reduce((a, d) => a + d.kcal, 0);
    const minutes = Math.max.apply(null, list.map(d => d.time).concat([0])) + 15;
    const d = new Date();
    this.setData({
      dateLabel: (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日',
      list, totalKcal,
      perPerson: Math.round(totalKcal / 2),
      minutes,
      shopping: list.map(x => x.ing.split(' · ').join(' · ')).join(' · ')
    });
  },
  openDish(e) { wx.navigateTo({ url: '/pages/dish/dish?name=' + e.currentTarget.dataset.name }); },
  remove(e) {
    setToday(getToday().filter(n => n !== e.currentTarget.dataset.name));
    this.onShow();
  },
  back() { wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/home' }) }); },
  cook() { wx.showToast({ title: '开火！', icon: 'none' }); }
});
