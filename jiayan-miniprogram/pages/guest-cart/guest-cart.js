const { DISHES, getGuestCart, setGuestCart } = require('../../utils/data');

Page({
  data: { list: [], kcal: 0, perPerson: 0, note: '老王不吃香菜，我们四个人，辣的可以来两道' },
  onShow() { this.refresh(); },
  refresh() {
    const cart = getGuestCart();
    const list = cart.map(n => DISHES.find(d => d.name === n)).filter(Boolean);
    const kcal = list.reduce((a, d) => a + d.kcal, 0);
    this.setData({ list, kcal, perPerson: Math.round(kcal / 4) });
  },
  remove(e) {
    setGuestCart(getGuestCart().filter(n => n !== e.currentTarget.dataset.name));
    this.refresh();
  },
  onNote(e) { this.setData({ note: e.detail.value }); },
  submit() {
    if (!this.data.list.length) { wx.showToast({ title: '先挑几道菜', icon: 'none' }); return; }
    wx.showToast({ title: '已提交给主厨', icon: 'success' });
    setTimeout(() => wx.navigateTo({ url: '/pages/host-order/host-order' }), 900);
  }
});
