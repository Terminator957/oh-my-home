Page({
  data: {
    photoTaken: false,
    dishName: '香菇滑鸡',
    status: '做过',
    statusOpts: ['做过', '想吃', '常做'],
    ings: [
      { name: '鸡腿肉', amount: '300 g' },
      { name: '干香菇', amount: '8 朵' },
      { name: '姜片', amount: '3 片' },
      { name: '生抽', amount: '1 勺' },
      { name: '食用油', amount: '2 勺' },
      { name: '淀粉', amount: '1 小勺' }
    ],
    flavorOpts: ['咸鲜', '清淡', '辣', '汤', '快手', '下饭'],
    flavors: ['咸鲜'],
    analyzed: false,
    estKcal: '—',
    estNote: '填完食材点下方按钮'
  },
  mockPhoto() {
    wx.chooseMedia && wx.chooseMedia({
      count: 1, mediaType: ['image'],
      success: () => this.setData({ photoTaken: true }),
      fail: () => {}
    });
  },
  onName(e) { this.setData({ dishName: e.detail.value }); },
  pickStatus(e) { this.setData({ status: e.currentTarget.dataset.s }); },
  addIng() {
    this.setData({ ings: this.data.ings.concat({ name: '新食材', amount: '适量' }), analyzed: false, estKcal: '—', estNote: '填完食材点下方按钮' });
  },
  removeIng(e) {
    const i = e.currentTarget.dataset.i;
    this.setData({ ings: this.data.ings.filter((_, j) => j !== i), analyzed: false, estKcal: '—', estNote: '填完食材点下方按钮' });
  },
  toggleFlavor(e) {
    const f = e.currentTarget.dataset.f;
    const flavors = this.data.flavors.includes(f) ? this.data.flavors.filter(x => x !== f) : this.data.flavors.concat(f);
    this.setData({ flavors });
  },
  analyze() {
    const kcal = Math.round(60 + this.data.ings.length * 54);
    this.setData({ analyzed: true, estKcal: kcal, estNote: '照片 + ' + this.data.ings.length + ' 项食材' });
    wx.setStorageSync('analysisData', {
      name: this.data.dishName,
      status: this.data.status,
      flavors: this.data.flavors,
      ings: this.data.ings,
      kcal
    });
    wx.navigateTo({ url: '/pages/analysis/analysis' });
  }
});
