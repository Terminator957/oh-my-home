Page({
  data: {
    name: '香菇滑鸡', ingCount: 6, kcal: 386,
    contrib: [
      { name: '鸡腿肉', kcal: '167 千卡', pct: '62%' },
      { name: '食用油', kcal: '92 千卡', pct: '34%' },
      { name: '干香菇', kcal: '48 千卡', pct: '18%' },
      { name: '淀粉', kcal: '42 千卡', pct: '16%' },
      { name: '生抽', kcal: '22 千卡', pct: '8%' },
      { name: '姜片', kcal: '15 千卡', pct: '6%' }
    ]
  },
  onLoad() {
    const a = wx.getStorageSync('analysisData');
    if (a) this.setData({ name: a.name, ingCount: a.ings.length, kcal: a.kcal });
  },
  fix() { wx.navigateBack(); },
  save() {
    const a = wx.getStorageSync('analysisData');
    if (a) {
      const custom = wx.getStorageSync('customDishes') || [];
      if (!custom.find(d => d.name === a.name)) {
        custom.push({
          name: a.name, status: a.status, cat: '荤菜',
          ing: a.ings.slice(0, 3).map(i => i.name).join(' · '),
          ingFull: a.ings.map(i => i.name + ' ' + i.amount).join(' ｜ '),
          time: '30 分钟', level: '简单', made: '刚记下 · 还没做过',
          stars: 0, kcal: a.kcal, flavor: a.flavors[0] || '咸鲜', log: []
        });
        wx.setStorageSync('customDishes', custom);
      }
    }
    wx.showToast({ title: '已存进小本子', icon: 'none' });
    setTimeout(() => wx.switchTab({ url: '/pages/library/library' }), 800);
  }
});
