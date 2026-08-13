const { DISHES, starText, getCustomDishes } = require('../../utils/data');

Page({
  data: { tab: '全部', query: '', tabs: [], list: [] },
  onShow() {
    const saved = wx.getStorageSync('libTab');
    if (saved) { wx.removeStorageSync('libTab'); this.setData({ tab: saved }); }
    this.refresh();
  },
  refresh() {
    const custom = getCustomDishes();
    const all = DISHES.concat(custom);
    const counts = { '全部': all.length + 69, '想吃': all.filter(d => d.status === '想吃').length + 14, '做过': all.filter(d => d.status !== '想吃').length + 55, '常做': all.filter(d => d.status === '常做').length + 9 };
    const tabs = ['全部', '想吃', '做过', '常做'].map(k => ({ key: k, label: k + ' ' + counts[k] }));
    const { tab, query } = this.data;
    let list = tab === '全部' ? all : tab === '做过' ? all.filter(d => d.status !== '想吃') : all.filter(d => d.status === tab);
    if (query) list = list.filter(d => (d.name + d.ing).includes(query));
    list = list.map(d => ({ ...d, tagColor: d.status === '做过' ? '#8A8072' : '#A93226', starText: starText(d.stars) }));
    this.setData({ tabs, list });
  },
  pickTab(e) { this.setData({ tab: e.currentTarget.dataset.key }, () => this.refresh()); },
  onSearch(e) { this.setData({ query: e.detail.value }, () => this.refresh()); },
  openDish(e) { wx.navigateTo({ url: '/pages/dish/dish?name=' + e.currentTarget.dataset.name }); }
});
