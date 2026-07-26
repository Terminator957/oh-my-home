const { DISHES, starText, getGuestCart, setGuestCart } = require('../../utils/data');

Page({
  data: { cats: ['全部', '荤菜', '素菜', '汤', '主食'], cat: '全部', menu: [], cartCount: 0, cartKcal: 0 },
  onShow() { this.refresh(); },
  refresh() {
    const cart = getGuestCart();
    const pool = this.data.cat === '全部' ? DISHES : DISHES.filter(d => d.cat === this.data.cat);
    const menu = pool.map(d => ({
      name: d.name,
      img: d.img,
      note: d.status === '想吃' ? '主厨还没做过，可以试试' : '主厨' + d.made,
      kcal: d.kcal,
      starText: starText(d.stars),
      inCart: cart.includes(d.name)
    }));
    const cartKcal = cart.reduce((a, n) => {
      const d = DISHES.find(x => x.name === n);
      return a + (d ? d.kcal : 0);
    }, 0);
    this.setData({ menu, cartCount: cart.length, cartKcal });
  },
  pickCat(e) { this.setData({ cat: e.currentTarget.dataset.c }, () => this.refresh()); },
  toggle(e) {
    const name = e.currentTarget.dataset.name;
    let cart = getGuestCart();
    cart = cart.includes(name) ? cart.filter(n => n !== name) : cart.concat(name);
    setGuestCart(cart);
    this.refresh();
  },
  goCart() { wx.navigateTo({ url: '/pages/guest-cart/guest-cart' }); },
  onShareAppMessage() {
    return { title: 'WXJ和WJ的家宴菜单', path: '/pages/guest/guest' };
  }
});
