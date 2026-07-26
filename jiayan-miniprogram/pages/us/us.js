Page({
  data: {
    stats: [
      { v: '63', k: '做过的菜' },
      { v: '218', k: '下厨次数' },
      { v: '14', k: '请客场次' },
      { v: '红烧肉', k: '最常做' }
    ]
  },
  goOrders() { wx.navigateTo({ url: '/pages/host-order/host-order' }); },
  todo() { wx.showToast({ title: '体验版暂未开放', icon: 'none' }); },
  onShareAppMessage() {
    return { title: 'WXJ和WJ的家宴菜单', path: '/pages/guest/guest' };
  }
});
