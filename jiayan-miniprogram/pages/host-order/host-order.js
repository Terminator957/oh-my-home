const ORDERS = [
  { name: '凉拌木耳', by: '小李' },
  { name: '口水鸡', by: '小李' },
  { name: '红烧肉', by: '老王 · 阿May' },
  { name: '酸菜鱼', by: '老王' },
  { name: '蒜蓉粉丝虾', by: '阿May' },
  { name: '麻婆豆腐', by: '阿May' },
  { name: '白灼菜心', by: '老王' },
  { name: '冬瓜排骨汤', by: '小李' },
  { name: '葱油面', by: '阿May' }
];
const SHOPPING = '五花肉 500g · 黑鱼 1 条 · 鸡腿 4 只 · 虾 500g · 黑木耳 60g · 酸菜 200g · 粉丝 2 把 · 蒜 2 头';

Page({
  data: { orders: ORDERS, shown: [], expanded: false, shopping: SHOPPING },
  onLoad() { this.render(); },
  render() {
    const src = this.data.expanded ? ORDERS : ORDERS.slice(0, 5);
    this.setData({ shown: src.map((o, i) => ({ ...o, no: (i + 1 < 10 ? '0' : '') + (i + 1) })) });
  },
  expand() { this.setData({ expanded: true }, () => this.render()); },
  exportList() {
    wx.setClipboardData({ data: SHOPPING, success: () => wx.showToast({ title: '采购单已复制', icon: 'none' }) });
  },
  start() { wx.showToast({ title: '开工！周六见', icon: 'none' }); }
});
