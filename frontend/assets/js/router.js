/* =========================================================
   router.js – Điều hướng phía client bằng hash (#/duong-dan?tham=so)
   Chạy được cả khi mở trực tiếp file index.html (không cần máy chủ).
   ========================================================= */
(function () {
  'use strict';
  // layout: main | simple | auth | seller ; auth: true = bắt buộc đăng nhập
  const routes = [
    { path: '/', page: 'home', layout: 'main' },
    { path: '/search', page: 'search', layout: 'main' },
    { path: '/category/:id', page: 'search', layout: 'main' },
    { path: '/flash-sale', page: 'flashsale', layout: 'main' },
    { path: '/product/:id', page: 'product', layout: 'main' },
    { path: '/shop/:id', page: 'shop', layout: 'main' },
    { path: '/cart', page: 'cart', layout: 'simple', title: 'Giỏ Hàng', search: true, auth: true },
    { path: '/checkout', page: 'checkout', layout: 'simple', title: 'Thanh Toán', auth: true },
    { path: '/payment/:id', page: 'payment', layout: 'simple', title: 'Thanh Toán', auth: true },
    { path: '/order-success/:ids', page: 'orderSuccess', layout: 'simple', title: 'Đặt Hàng Thành Công', auth: true },
    { path: '/login', page: 'login', layout: 'auth', title: 'Đăng nhập' },
    { path: '/register', page: 'register', layout: 'auth', title: 'Đăng ký' },
    { path: '/user/:section', page: 'user', layout: 'main', auth: true },
    { path: '/user/:section/:sub', page: 'user', layout: 'main', auth: true },
    { path: '/seller', page: 'seller', layout: 'seller', auth: true },
    { path: '/seller/:section', page: 'seller', layout: 'seller', auth: true },
    { path: '/seller/:section/:sub', page: 'seller', layout: 'seller', auth: true },
    { path: '/help', page: 'help', layout: 'main' },
  ];

  function match(path) {
    const segs = path.split('/').filter(Boolean);
    for (const r of routes) {
      const rs = r.path.split('/').filter(Boolean);
      if (rs.length !== segs.length) continue;
      const params = {};
      let ok = true;
      for (let i = 0; i < rs.length && ok; i++) {
        if (rs[i].startsWith(':')) params[rs[i].slice(1)] = decodeURIComponent(segs[i]);
        else ok = rs[i] === segs[i];
      }
      if (ok) return { route: r, params };
    }
    return null;
  }

  let cleanup = null;
  function render(opts) {
    const keepScroll = opts && opts.keepScroll === true;
    const raw = location.hash.replace(/^#/, '') || '/';
    const [path, qs] = raw.split('?');
    const query = new URLSearchParams(qs || '');
    const m = match(path) || { route: { page: 'notFound', layout: 'main' }, params: {} };
    if (m.route.auth && !SV.auth.current()) {
      location.replace('#/login?next=' + encodeURIComponent(raw));
      return;
    }
    if (cleanup) {
      try {
        cleanup();
      } catch (e) {}
      cleanup = null;
    }
    SV.layout.apply(m.route.layout, { title: m.route.title, search: m.route.search, keyword: path === '/search' ? query.get('keyword') || '' : '' });
    const page = SV.pages[m.route.page];
    const el = document.createElement('div');
    el.className = 'page page-' + m.route.page;
    document.getElementById('app').replaceChildren(el);
    document.title = page.title || 'ShopVui';
    if (!keepScroll) window.scrollTo(0, 0);
    const r = page.render(el, { params: m.params, query, path });
    if (typeof r === 'function') cleanup = r;
  }

  SV.router = { render, routes };
})();
