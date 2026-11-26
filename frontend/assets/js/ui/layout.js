/* =========================================================
   layout.js – Khung trang: Header (4 kiểu), Footer, cửa sổ Chat
   ========================================================= */
(function () {
  'use strict';
  const U = SV.U;
  const C = SV.catalog;
  const ui = SV.ui;
  const L = { kind: null, opts: {} };
  const HOT = ['Áo sơ mi nam', 'Tai nghe bluetooth', 'Son môi', 'Giày sneaker', 'Chảo chống dính', 'Đồng hồ nam', 'Kính mát', 'Nước hoa nữ'];
  const $header = () => document.getElementById('header');
  const $footer = () => document.getElementById('footer');

  /* ----------------------------- Thanh trên cùng ----------------------------- */
  function notifPop(u) {
    if (!u)
      return `<div class="pop pop-notif"><div class="pn-guest">${SV.icon('bell', 60)}<p>Đăng nhập để xem Thông báo</p><div class="pn-btns"><a href="#/register">Đăng ký</a><a href="#/login">Đăng nhập</a></div></div></div>`;
    const list = SV.notify.list().slice(0, 5);
    return `<div class="pop pop-notif"><div class="pn-hd">Thông Báo Mới Nhận</div>${
      list.length
        ? list
            .map(
              (n) =>
                `<a class="pn-item ${n.read ? '' : 'unread'}" href="${n.link || '#/user/notifications'}" data-notif="${n.id}">${n.image ? ui.img(n.image, n.emoji, 'pn-img') : `<span class="pn-img pn-emoji">${n.emoji || '🔔'}</span>`}<div><b>${U.esc(n.title)}</b><p>${U.esc(n.body)}</p></div></a>`
            )
            .join('')
        : '<div class="pn-empty">Chưa có thông báo</div>'
    }<a class="pn-all" href="#/user/notifications">Xem tất cả</a></div>`;
  }
  function topBar() {
    const u = SV.auth.current();
    const unread = u ? SV.notify.unread() : 0;
    return `<div class="hdr-top">
      <div class="l">
        <a class="item" href="#/seller">Kênh Người Bán</a><i class="sep"></i>
        <a class="item" href="#/seller">Trở thành Người bán ShopVui</a><i class="sep"></i>
        <span class="item">Tải ứng dụng</span><i class="sep"></i>
        <span class="item">Kết nối <a class="soc" href="#/" aria-label="Facebook">${SV.icon('facebook', 15)}</a><a class="soc" href="#/" aria-label="Instagram">${SV.icon('instagram', 15)}</a></span>
      </div>
      <div class="r">
        <span class="item has-pop" id="notif-area">${SV.icon('bell', 16)} Thông Báo${unread ? `<b class="dot-badge">${unread}</b>` : ''}${notifPop(u)}</span>
        <a class="item" href="#/help">${SV.icon('help', 16)} Hỗ Trợ</a>
        <span class="item">${SV.icon('globe', 16)} Tiếng Việt ${SV.icon('down', 14)}</span>
        ${
          u
            ? `<span class="item has-pop user-item">${ui.avatar(u.username, 22)}<span class="uname">${U.esc(u.username)}</span>
                <div class="pop pop-user"><a href="#/user/account/profile">Tài Khoản Của Tôi</a><a href="#/user/purchase">Đơn Mua</a><a href="#/seller">Kênh Người Bán</a><a href="#/" data-logout>Đăng Xuất</a></div></span>`
            : `<a class="item strong" href="#/register">Đăng Ký</a><i class="sep"></i><a class="item strong" href="#/login">Đăng Nhập</a>`
        }
      </div>
    </div>`;
  }

  /* ----------------------------- Giỏ hàng mini ----------------------------- */
  function cartArea() {
    const u = SV.auth.current();
    const lines = u ? SV.cart.lines().filter((l) => l.product) : [];
    const n = lines.length;
    const pop = n
      ? `<div class="pc-hd">Sản Phẩm Mới Thêm</div>${lines
          .slice(0, 5)
          .map((l) => `<a class="pc-row" href="#/product/${l.productId}">${ui.img(l.product.thumbnail, C.emoji(l.product))}<span class="nm">${U.esc(l.product.name)}</span><span class="pr">${U.money(l.unit)}</span></a>`)
          .join('')}<div class="pc-ft"><span>${n > 5 ? n - 5 + ' Thêm Hàng Vào Giỏ' : ''}</span><a class="btn btn-primary" href="#/cart">Xem Giỏ Hàng</a></div>`
      : `<div class="pc-empty"><div class="em">🛒</div><div>Chưa Có Sản Phẩm</div></div>`;
    return `<a href="#/cart" class="cart-ic" aria-label="Giỏ hàng">${SV.icon('cart', 28)}${n ? `<span class="badge">${n > 99 ? '99+' : n}</span>` : ''}</a><div class="pop pop-cart">${pop}</div>`;
  }

  const searchForm = (cls) =>
    `<form class="search-box ${cls || ''}" data-search-form autocomplete="off" role="search"><input name="q" placeholder="ShopVui bao ship 0Đ - Đăng ký ngay!" value="${U.esc(L.opts.keyword || '')}" aria-label="Tìm kiếm sản phẩm"><button type="submit" aria-label="Tìm kiếm">${SV.icon('search', 16)}</button></form>`;
  const logo = () => `<a class="logo" href="#/" aria-label="ShopVui - Trang chủ">${SV.logo(46)}<span>ShopVui</span></a>`;

  /* ----------------------------- Các kiểu header ----------------------------- */
  const HEADERS = {
    main: () => `<header class="hdr"><div class="container">${topBar()}
      <div class="hdr-main">${logo()}
        <div class="search" data-search>${searchForm()}<div class="search-drop"></div>
          <div class="hot-keys">${HOT.map((k) => `<a href="#/search?keyword=${encodeURIComponent(k)}">${k}</a>`).join('')}</div></div>
        <div class="hdr-cart has-pop" id="cart-area">${cartArea()}</div>
      </div></div></header>`,
    simple: () => `<header class="hdr hdr-simple"><div class="container">${topBar()}</div>
      <div class="shdr"><div class="container">${logo()}<span class="shdr-title">${L.opts.title || ''}</span>
      ${L.opts.search ? `<div class="search shdr-search" data-search>${searchForm()}<div class="search-drop"></div></div>` : ''}</div></div></header>`,
    auth: () => `<header class="ahdr"><div class="container">${logo()}<span class="ahdr-title">${L.opts.title || ''}</span><a class="ahdr-help" href="#/help">Bạn cần giúp đỡ?</a></div></header>`,
    seller: () => {
      const u = SV.auth.current();
      const sid = SV.seller.shopId();
      return `<header class="sc-hdr"><div class="sc-hdr-in">${logo()}<span class="sc-title">Kênh Người Bán</span>
        <div class="sc-hdr-r"><label class="sc-shop">Shop đang quản lý <select data-seller-shop>${C.shops()
          .map((s) => `<option value="${s.id}" ${s.id === sid ? 'selected' : ''}>${U.esc(s.name)}</option>`)
          .join('')}</select></label>
        <a class="btn btn-sm" href="#/">${SV.icon('home', 14)} Về trang mua sắm</a>
        ${u ? `<span class="sc-user">${ui.avatar(u.username, 28)} ${U.esc(u.username)}</span>` : ''}</div></div></header>`;
    },
  };

  function footer() {
    const pays = ['Thẻ Tín Dụng', 'Thẻ ATM', 'COD', 'Trả Góp 0%', 'ShopVuiPay', 'VuiLater'];
    const ships = ['SVExpress', 'SV Hỏa Tốc', 'SV Tiết Kiệm', 'SV Quốc Tế'];
    return `<footer class="ftr"><div class="container">
      <div class="ftr-cols">
        <div><h4>Chăm Sóc Khách Hàng</h4><ul><li><a href="#/help">Trung Tâm Trợ Giúp</a></li><li><a href="#/help">Hướng Dẫn Mua Hàng</a></li><li><a href="#/seller">Hướng Dẫn Bán Hàng</a></li><li><a href="#/help">Thanh Toán</a></li><li><a href="#/help">Vận Chuyển</a></li><li><a href="#/help">Trả Hàng &amp; Hoàn Tiền</a></li><li><a href="#/help">Chính Sách Bảo Hành</a></li></ul></div>
        <div><h4>Về ShopVui</h4><ul><li><a href="#/help">Giới Thiệu Về ShopVui</a></li><li><a href="#/help">Điều Khoản ShopVui</a></li><li><a href="#/help">Chính Sách Bảo Mật</a></li><li><a href="#/search?mall=1">ShopVui Mall</a></li><li><a href="#/seller">Kênh Người Bán</a></li><li><a href="#/flash-sale">Flash Sale</a></li></ul></div>
        <div><h4>Thanh Toán</h4><div class="ftr-badges">${pays.map((x) => `<span>${x}</span>`).join('')}</div><h4 class="mt">Đơn Vị Vận Chuyển</h4><div class="ftr-badges">${ships.map((x) => `<span>${x}</span>`).join('')}</div></div>
        <div><h4>Theo Dõi ShopVui</h4><ul class="ftr-social"><li>${SV.icon('facebook', 16)} Facebook</li><li>${SV.icon('instagram', 16)} Instagram</li></ul></div>
        <div><h4>Tải Ứng Dụng ShopVui</h4><p class="ftr-note">Mua sắm tiện lợi mọi lúc mọi nơi trên iOS &amp; Android, nhận thông báo trạng thái đơn hàng tức thì.</p></div>
      </div>
      <div class="ftr-bottom"><span>© 2026 ShopVui Việt Nam. Tất cả các quyền được bảo lưu.</span><span>Quốc gia &amp; Khu vực: Việt Nam</span></div>
    </div>
    <div class="ftr-legal"><div class="container">
      <p>Công ty TNHH Thương Mại Điện Tử ShopVui · Tòa nhà Trung tâm Thương mại, Quận 1, TP. Hồ Chí Minh · Tổng đài CSKH: 1900 6868</p>
      <p>Chính sách bảo mật · Quy chế hoạt động · Chính sách vận chuyển &amp; kiểm hàng · Chính sách đổi trả &amp; hoàn tiền</p>
    </div></div></footer>`;
  }

  /* ----------------------------- Áp dụng layout ----------------------------- */
  /** kind: main | simple | auth | seller ; opts: { title, search, keyword, footer } */
  L.apply = (kind, opts) => {
    L.kind = kind;
    L.opts = opts || {};
    $header().innerHTML = HEADERS[kind]();
    $footer().innerHTML = kind === 'seller' || kind === 'auth' ? (kind === 'auth' ? miniFooter() : '') : footer();
    document.body.dataset.layout = kind;
    measureHeader();
    L.renderChat();
  };
  /** Biến CSS --hdr-h = chiều cao header đang dính (để các thanh tab dính ngay bên dưới) */
  function measureHeader() {
    const h = $header();
    const sticky = getComputedStyle(h).position === 'sticky';
    document.documentElement.style.setProperty('--hdr-h', (sticky && L.kind === 'main' ? h.offsetHeight : 0) + 'px');
  }
  const miniFooter = () => `<footer class="ftr ftr-mini"><div class="container"><span>© 2026 ShopVui Việt Nam · Mua sắm trực tuyến an toàn &amp; tiện lợi</span></div></footer>`;

  L.refreshHeader = () => {
    if (!L.kind) return;
    const input = $header().querySelector('[data-search-form] input');
    const keep = input && document.activeElement === input ? input.value : null;
    $header().innerHTML = HEADERS[L.kind]();
    if (keep !== null) {
      const i = $header().querySelector('[data-search-form] input');
      i.value = keep;
    }
  };
  L.refreshCart = () => {
    const el = document.getElementById('cart-area');
    if (el) el.innerHTML = cartArea();
    else if (L.kind === 'simple') L.refreshHeader();
  };

  /* ----------------------------- Ô tìm kiếm & gợi ý ----------------------------- */
  function renderDrop(box) {
    const drop = box.querySelector('.search-drop');
    const q = box.querySelector('input').value.trim();
    let html = '';
    if (!q) {
      const h = SV.searchHistory.list();
      if (h.length) html = '<div class="sd-hd">Lịch sử tìm kiếm</div>' + h.map((x) => `<a href="#/search?keyword=${encodeURIComponent(x)}" data-sd>${SV.icon('clock', 14)} ${U.esc(x)}</a>`).join('');
    } else {
      const s = C.suggest(q);
      const shop = C.shops().find((x) => U.wordMatch(x.name, q));
      html =
        (shop ? `<a class="sd-shop" href="#/shop/${shop.id}" data-sd>${SV.icon('store', 16)} Tìm Shop "<b>${U.esc(q)}</b>": ${U.esc(shop.name)}</a>` : '') +
        s.map((x) => `<a href="#/search?keyword=${encodeURIComponent(x)}" data-sd>${U.esc(x)}</a>`).join('');
    }
    drop.innerHTML = html;
    box.classList.toggle('open', !!html);
  }

  function initEvents() {
    const header = $header();
    header.addEventListener('submit', (e) => {
      const f = e.target.closest('[data-search-form]');
      if (!f) return;
      e.preventDefault();
      const q = f.q.value.trim();
      SV.searchHistory.add(q);
      f.closest('[data-search]') && f.closest('[data-search]').classList.remove('open');
      f.q.blur();
      SV.go('/search' + U.qs({ keyword: q }));
    });
    const onInput = U.debounce((box) => renderDrop(box), 120);
    header.addEventListener('input', (e) => {
      const box = e.target.closest('[data-search]');
      if (box) onInput(box);
    });
    header.addEventListener('focusin', (e) => {
      const box = e.target.closest('[data-search]');
      if (box && e.target.name === 'q') renderDrop(box);
    });
    header.addEventListener('focusout', (e) => {
      const box = e.target.closest('[data-search]');
      if (box) setTimeout(() => box.classList.remove('open'), 150);
    });
    header.addEventListener('mousedown', (e) => {
      const a = e.target.closest('[data-sd]');
      if (a) {
        const q = a.textContent.trim();
        if (a.getAttribute('href').includes('keyword=')) SV.searchHistory.add(q);
      }
    });
    header.addEventListener('change', (e) => {
      if (e.target.matches('[data-seller-shop]')) {
        SV.seller.setShop(e.target.value);
        SV.router.render();
      }
    });
    document.addEventListener('click', async (e) => {
      if (e.target.closest('[data-logout]')) {
        e.preventDefault();
        const r = await SV.auth.logout();
        if (!r.ok) return ui.toast(r.error, 'error');
        ui.toast('Đã đăng xuất', 'info');
        SV.go('/');
        return;
      }
      const n = e.target.closest('[data-notif]');
      if (n) SV.notify.read(n.dataset.notif);
      if (e.target.closest('[data-reset-demo]')) {
        if (await ui.confirm('Xóa bộ nhớ đệm và dữ liệu minh họa trên trình duyệt? Tài khoản, ví và đơn EZMART trên máy chủ không bị xóa.', { okText: 'Khôi phục' })) SV.db.reset();
      }
      const sim = e.target.closest('[data-similar]');
      if (sim) {
        e.preventDefault();
        const p = C.get(sim.dataset.similar);
        if (p) SV.go(`/category/${p.categoryId}?sub=${encodeURIComponent(p.subCategory)}`);
      }
    });
    SV.on('cart', L.refreshCart);
    SV.on('auth', () => {
      L.refreshHeader();
      L.renderChat();
    });
    SV.on('notify', () => {
      const a = document.getElementById('notif-area');
      if (a) L.refreshHeader();
    });
    SV.on('chat', () => L.renderChat());
  }

  /* ----------------------------- Chat ----------------------------- */
  const chat = { open: false, shopId: null };
  L.renderChat = () => {
    const root = document.getElementById('chat-root');
    if (!root) return;
    if (L.kind === 'auth' || L.kind === 'seller') {
      root.innerHTML = '';
      return;
    }
    const u = SV.auth.current();
    if (chat.open && u && chat.shopId) SV.chat.markRead(chat.shopId);
    const unread = u ? SV.chat.unread() : 0;
    if (!chat.open) {
      if (L.kind === 'simple') {
        root.innerHTML = '';
        return;
      }
      root.innerHTML = `<button class="chat-fab" type="button" data-chat="toggle">${SV.icon('chat', 22)} Chat${unread ? `<span class="badge">${unread}</span>` : ''}</button>`;
      return;
    }
    if (!u) {
      root.innerHTML = `<div class="chat-win chat-guest"><div class="chat-hd"><b>Chat</b><button type="button" data-chat="toggle" aria-label="Thu nhỏ">${SV.icon('down', 18)}</button></div>
        <div class="chat-empty">${SV.icon('chat', 56)}<b>Đăng nhập để chat với Người bán</b><a class="btn btn-primary" href="#/login" data-chat="toggle">Đăng nhập</a></div></div>`;
      return;
    }
    const prev = root.querySelector('.chat-input input');
    const draft = prev ? prev.value : '';
    const hadFocus = prev && document.activeElement === prev;
    const convs = SV.chat.list();
    const cur = chat.shopId && convs.find((c) => c.shopId === chat.shopId);
    const shopOf = (id) => C.shopRaw(id) || { name: 'Shop' };
    root.innerHTML = `<div class="chat-win">
      <div class="chat-hd"><b>Chat</b>${unread ? `<span class="muted">(${unread})</span>` : ''}<button type="button" data-chat="toggle" aria-label="Thu nhỏ">${SV.icon('down', 18)}</button></div>
      <div class="chat-bd">
        <div class="chat-list">${
          convs.length
            ? convs
                .map((c) => {
                  const last = c.messages[c.messages.length - 1];
                  return `<a class="${c.shopId === chat.shopId ? 'on' : ''}" data-chat-shop="${c.shopId}">${ui.avatar(shopOf(c.shopId).name, 34)}<div class="ct"><div class="nm">${U.esc(shopOf(c.shopId).name)}</div><div class="last">${U.esc(last ? last.text : '')}</div></div>${c.unread ? `<span class="badge">${c.unread}</span>` : ''}</a>`;
                })
                .join('')
            : '<div class="chat-none">Chưa có cuộc trò chuyện nào</div>'
        }</div>
        <div class="chat-conv">${
          cur
            ? `<div class="top"><a href="#/shop/${cur.shopId}">${U.esc(shopOf(cur.shopId).name)}</a></div>
               <div class="chat-msgs">${cur.messages.map((m) => `<div class="msg ${m.from === 'me' ? 'me' : ''}">${U.esc(m.text)}<time>${U.fmtDate(m.at, true).slice(0, 5)}</time></div>`).join('')}</div>
               <form class="chat-input" data-chat-form><input name="msg" placeholder="Nhập nội dung tin nhắn" autocomplete="off" value="${U.esc(draft)}"><button type="submit" aria-label="Gửi">${SV.icon('send', 18)}</button></form>`
            : `<div class="chat-empty">${SV.icon('chat', 56)}<b>Chào mừng bạn đến với ShopVui Chat</b><span>Chọn một cuộc trò chuyện hoặc bấm "Chat Ngay" ở trang sản phẩm.</span></div>`
        }</div>
      </div></div>`;
    const msgs = root.querySelector('.chat-msgs');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
    if (hadFocus || (cur && !prev)) {
      const i = root.querySelector('.chat-input input');
      if (i) i.focus();
    }
  };
  SV.openChat = (shopId) => {
    if (!ui.requireLogin()) return;
    SV.chat.open(shopId);
    chat.open = true;
    chat.shopId = shopId;
    L.renderChat();
  };
  function initChat() {
    const root = document.getElementById('chat-root');
    root.addEventListener('click', (e) => {
      const t = e.target.closest('[data-chat]');
      if (t) {
        chat.open = !chat.open;
        L.renderChat();
        return;
      }
      const s = e.target.closest('[data-chat-shop]');
      if (s) {
        chat.shopId = s.dataset.chatShop;
        L.renderChat();
      }
    });
    root.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = e.target.msg;
      const text = input.value.trim();
      if (!text || !chat.shopId) return;
      input.value = '';
      SV.chat.send(chat.shopId, text);
    });
  }

  L.init = () => {
    initEvents();
    initChat();
    if (window.ResizeObserver) new ResizeObserver(measureHeader).observe($header());
    window.addEventListener('resize', measureHeader);
  };
  SV.layout = L;
})();
