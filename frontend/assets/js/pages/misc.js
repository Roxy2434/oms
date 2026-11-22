/* =========================================================
   Các trang còn lại: Trang Shop, Flash Sale, Trợ giúp, 404
   ========================================================= */
(function () {
  'use strict';
  const U = SV.U;
  const C = SV.catalog;
  const ui = SV.ui;

  /* ----------------------------- Trang Shop: #/shop/:id ----------------------------- */
  SV.pages.shop = {
    render(el, ctx) {
      const shop = C.shop(ctx.params.id);
      if (!shop) {
        el.innerHTML = `<div class="container">${ui.empty('🏪', 'Shop không tồn tại', '<a class="btn btn-primary" href="#/">Về trang chủ</a>')}</div>`;
        return;
      }
      document.title = shop.name + ' | ShopVui';
      const tab = ctx.query.get('tab') || 'home';
      const sub = ctx.query.get('sub') || '';
      const sort = ctx.query.get('sort') || 'sales';
      const page = Math.max(1, parseInt(ctx.query.get('page'), 10) || 1);
      const PER = 30;
      const all = C.shopProducts(shop.id);
      const subs = [...new Set(all.map((p) => p.subCategory))];
      const filtered = C.search({ shopId: shop.id, subs: sub ? [sub] : [], sort: sort === 'price-asc' || sort === 'price-desc' ? 'price' : sort, order: sort === 'price-desc' ? 'desc' : 'asc' }).items;
      const pages = Math.max(1, Math.ceil(filtered.length / PER));
      const href = (o) => '#/shop/' + shop.id + U.qs(Object.assign({ tab: tab === 'home' ? '' : tab, sub, sort: sort === 'sales' ? '' : sort }, o));
      const reviews = all.reduce((s, p) => s + (p.ratingCount || 0), 0);
      const following = SV.follows.has(shop.id);
      const sortBtn = (k, l) => `<a class="sort-btn ${sort === k ? 'on' : ''}" href="${href({ sort: k === 'sales' ? '' : k })}">${l}</a>`;

      el.innerHTML = `<section class="shop-hero"><div class="container">
          <div class="shop-card"><div class="top">${ui.avatar(shop.name, 80)}<div><div class="nm">${U.esc(shop.name)}</div>${ui.shopLabel(shop.type)}<div class="on">Online ${1 + (U.hash(shop.id) % 50)} phút trước</div></div></div>
            <div class="btns"><button type="button" data-follow>${following ? SV.icon('check', 14) + ' Đang theo dõi' : SV.icon('plus', 14) + ' Theo dõi'}</button><button type="button" data-chat>${SV.icon('chat', 14)} Chat</button></div></div>
          <div class="shop-meta">
            <div>${SV.icon('box', 16)} Sản Phẩm: <span class="v">${shop.productCount}</span></div>
            <div>${SV.icon('user', 16)} Người Theo Dõi: <span class="v">${U.compact(shop.followers)}</span></div>
            <div>${SV.icon('chat', 16)} Tỉ Lệ Phản Hồi Chat: <span class="v">${shop.responseRate}% (${shop.responseTime})</span></div>
            <div>${SV.icon('star', 16)} Đánh Giá: <span class="v">${shop.rating} (${U.compact(reviews)} Đánh Giá)</span></div>
            <div>${SV.icon('clock', 16)} Tham Gia: <span class="v">${shop.joinedYearsAgo} Năm Trước</span></div>
            <div>${SV.icon('pin', 16)} Gửi từ: <span class="v">${U.esc(shop.location)}</span></div>
          </div></div>
        <div class="container"><nav class="shop-tabs"><a class="${tab === 'home' ? 'on' : ''}" href="#/shop/${shop.id}">Dạo</a><a class="${tab === 'all' && !sub ? 'on' : ''}" href="#/shop/${shop.id}?tab=all">Tất Cả Sản Phẩm</a>${subs.map((s) => `<a class="${sub === s ? 'on' : ''}" href="#/shop/${shop.id}?tab=all&sub=${encodeURIComponent(s)}">${U.esc(s)}</a>`).join('')}</nav></div>
      </section>
      <div class="container shop-body">
        ${tab === 'home' ? `<section class="shop-sec"><h3>Mã Giảm Giá Của Shop</h3><div class="vouchers">${shop.vouchers.map((v) => ui.voucher(v, { shop, action: `<button type="button" class="btn btn-primary btn-sm" data-save="${v.code}" ${SV.vouchers.isSaved(v.code) ? 'disabled' : ''}>${SV.vouchers.isSaved(v.code) ? 'Đã lưu' : 'Lưu'}</button>` })).join('')}</div></section>
          <section class="shop-sec"><h3>Gợi Ý Cho Bạn</h3>${ui.grid(C.bestSellers(shop.id, 6))}</section>` : ''}
        <section class="shop-sec"><div class="sort-bar"><span class="lbl">Sắp xếp theo</span>${sortBtn('sales', 'Phổ Biến')}${sortBtn('ctime', 'Mới Nhất')}
          <select class="sort-select ${sort.startsWith('price') ? 'on' : ''}" data-sort aria-label="Sắp xếp theo giá"><option value="" disabled ${sort.startsWith('price') ? '' : 'selected'}>Giá</option><option value="price-asc" ${sort === 'price-asc' ? 'selected' : ''}>Giá: Thấp đến Cao</option><option value="price-desc" ${sort === 'price-desc' ? 'selected' : ''}>Giá: Cao đến Thấp</option></select>
          <div class="mini-page"><span><b>${page}</b>/${pages}</span></div></div>
          ${filtered.length ? ui.grid(filtered.slice((page - 1) * PER, page * PER), 'grid-5') + ui.pagination(page, pages) : ui.empty('📦', 'Shop chưa có sản phẩm')}</section>
      </div>`;

      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-chat]')) return SV.openChat(shop.id);
        if (e.target.closest('[data-follow]')) {
          const r = SV.follows.toggle(shop.id);
          if (r.error === 'login') return ui.requireLogin();
          ui.toast(r.following ? 'Đã theo dõi shop' : 'Đã bỏ theo dõi', 'info');
          return SV.router.render();
        }
        const s = e.target.closest('[data-save]');
        if (s) {
          const r = SV.vouchers.saveCode(s.dataset.save);
          if (r.error === 'login') return ui.requireLogin();
          s.disabled = true;
          s.textContent = 'Đã lưu';
          ui.toast('Đã lưu voucher');
        }
        const pg = e.target.closest('[data-page]');
        if (pg && !pg.disabled) location.hash = href({ page: pg.dataset.page }).slice(1);
      });
      el.addEventListener('change', (e) => {
        if (e.target.matches('[data-sort]')) location.hash = href({ sort: e.target.value }).slice(1);
      });
    },
  };

  /* ----------------------------- Flash Sale: #/flash-sale ----------------------------- */
  SV.pages.flashsale = {
    title: 'Flash Sale | ShopVui',
    render(el) {
      const slot = C.flashSlot();
      const items = C.flashItems();
      el.innerHTML = `<section class="fs-banner"><div class="container"><span class="fs-logo big">${SV.icon('zap', 34)}FLASH SALE</span><span class="fs-ends">${SV.icon('clock', 18)} KẾT THÚC TRONG <span class="countdown" data-countdown><span>00</span><i>:</i><span>00</span><i>:</i><span>00</span></span></span></div></section>
        <nav class="fs-slots"><div class="container"><a class="on"><b>${slot.label}</b><span>Đang Diễn Ra</span></a>${slot.next.map((t) => `<a><b>${t}</b><span>Sắp Diễn Ra</span></a>`).join('')}</div></nav>
        <div class="container"><div class="grid grid-5 fs-grid">${items
          .map(({ product: p, flash: f }) => {
            const pct = Math.round((f.sold / f.quota) * 100);
            return `<a class="card fs-card" href="#/product/${p.id}"><div class="card-img">${ui.img(p.thumbnail, C.emoji(p))}${ui.discountFlag(C.discountOf(p))}</div>
              <div class="card-body"><div class="card-name">${U.esc(p.name)}</div>
                <div class="fs-prices"><span class="card-price">${U.moneyHtml(f.flashPrice)}</span><s>${U.money(p.originalPrice)}</s></div>
                <div class="fs-bar"><i style="width:${Math.max(12, pct)}%"></i><span>${pct >= 80 ? '🔥 Sắp cháy hàng' : 'Đã bán ' + f.sold}</span></div>
                <span class="btn btn-primary btn-sm btn-block">Mua Ngay</span></div></a>`;
          })
          .join('')}</div></div>`;
      return SV.startCountdown(el);
    },
  };

  /* ----------------------------- Trợ giúp: #/help ----------------------------- */
  const FAQ = [
    ['Mua sắm cùng ShopVui', [
      ['Làm thế nào để đặt hàng?', 'Chọn sản phẩm → chọn phân loại và số lượng → "Thêm Vào Giỏ Hàng" hoặc "Mua Ngay" → vào Giỏ hàng chọn sản phẩm → "Mua Hàng" → kiểm tra địa chỉ, vận chuyển, voucher, phương thức thanh toán → "Đặt hàng".'],
      ['Vì sao một lần thanh toán lại tạo nhiều đơn hàng?', 'Mỗi shop xử lý và giao hàng độc lập, vì vậy giỏ hàng có sản phẩm của N shop sẽ được tách thành N đơn hàng riêng, mỗi đơn có phí vận chuyển và trạng thái riêng.'],
    ]],
    ['Khuyến mãi & Voucher', [
      ['Có thể dùng bao nhiêu voucher cho một lần thanh toán?', 'Tối đa 1 Voucher của mỗi Shop + 1 Mã Giảm Giá của ShopVui + 1 Mã Miễn Phí Vận Chuyển. Voucher chỉ áp dụng khi đơn hàng đạt giá trị tối thiểu.'],
      ['Flash Sale là gì?', 'Sản phẩm được bán với giá đặc biệt trong khung giờ 0h, 9h, 12h, 15h, 18h, 21h với số lượng suất giới hạn.'],
    ]],
    ['Thanh toán', [
      ['Có những phương thức thanh toán nào?', 'Thanh toán khi nhận hàng (COD), Ví ShopVuiPay (trừ tiền ngay) và Chuyển khoản ngân hàng (đơn ở trạng thái Chờ thanh toán cho đến khi xác nhận). Trong bản demo, mọi giao dịch đều là mô phỏng.'],
    ]],
    ['Đơn hàng & Vận chuyển', [
      ['Các trạng thái của đơn hàng?', 'Chờ thanh toán → Chờ xác nhận → Chờ lấy hàng → Đang giao → Hoàn thành. Đơn có thể bị hủy khi chưa giao cho đơn vị vận chuyển; sau khi hoàn thành có thể yêu cầu Trả hàng/Hoàn tiền trong 15 ngày.'],
      ['Phí vận chuyển được tính thế nào?', 'Cùng tỉnh: ₫15.000 · Cùng miền: ₫22.000 · Khác miền: ₫32.000 · Hàng quốc tế: ₫45.000 (+₫2.000 cho mỗi sản phẩm thêm). Hỏa Tốc 2 giờ (₫45.000) chỉ áp dụng khi shop và người mua cùng tỉnh.'],
    ]],
    ['Về bản demo này', [
      ['ShopVui có phải sàn thương mại điện tử thật không?', 'Không. Đây là website mô phỏng phục vụ tiểu luận/học tập. Dữ liệu lưu trong LocalStorage của trình duyệt, không có máy chủ, không thanh toán thật.'],
      ['Tài khoản để thử?', 'Tên đăng nhập: demo · Mật khẩu: Demo1234. Bạn cũng có thể tự đăng ký tài khoản mới. Bấm "Khôi phục dữ liệu mẫu" ở chân trang để làm lại từ đầu.'],
    ]],
  ];
  SV.pages.help = {
    title: 'Trung Tâm Trợ Giúp | ShopVui',
    render(el) {
      el.innerHTML = `<section class="help-hero"><div class="container"><h1>Xin chào, ShopVui có thể giúp gì cho bạn?</h1></div></section>
        <div class="container help">${FAQ.map(([h, qs]) => `<section class="help-sec"><h2>${h}</h2>${qs.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</section>`).join('')}</div>`;
    },
  };

  SV.pages.notFound = {
    title: 'Không tìm thấy trang | ShopVui',
    render(el) {
      el.innerHTML = `<div class="container">${ui.empty('🧭', 'Trang bạn tìm không tồn tại', '<a class="btn btn-primary" href="#/">Về trang chủ</a>')}</div>`;
    },
  };
})();
