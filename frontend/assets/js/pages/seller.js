/* =========================================================
   Kênh Người Bán – Route: #/seller, #/seller/orders, #/seller/products,
   #/seller/products/new, #/seller/products/:id, #/seller/reviews
   (Chế độ demo: chọn shop bất kỳ ở góc trên để quản lý)
   ========================================================= */
(function () {
  'use strict';
  const U = SV.U;
  const C = SV.catalog;
  const ui = SV.ui;

  const ORDER_TABS = [
    ['all', 'Tất cả', () => true],
    ['unpaid', 'Chờ thanh toán', (o) => o.status === 'UNPAID'],
    ['confirm', 'Chờ xác nhận', (o) => o.status === 'TO_SHIP' && !o.confirmed],
    ['pickup', 'Chờ lấy hàng', (o) => o.status === 'TO_SHIP' && o.confirmed],
    ['shipping', 'Đang giao', (o) => o.status === 'SHIPPING'],
    ['completed', 'Đã giao', (o) => o.status === 'COMPLETED'],
    ['cancelled', 'Đơn hủy', (o) => o.status === 'CANCELLED'],
    ['return', 'Trả hàng/Hoàn tiền', (o) => o.status === 'RETURN'],
  ];
  const PILL = { UNPAID: 'orange', TO_SHIP: 'blue', SHIPPING: 'blue', COMPLETED: 'green', CANCELLED: 'red', RETURN: 'gray' };

  function side(section, tab) {
    const a = (href, on, text) => `<a class="${on ? 'on' : ''}" href="${href}">${text}</a>`;
    return `<aside class="sc-side">
      <h6>${SV.icon('chart', 16)} Tổng Quan</h6>${a('#/seller', section === 'dashboard', 'Bảng Điều Khiển')}
      <h6>${SV.icon('orders', 16)} Quản Lý Đơn Hàng</h6>${a('#/seller/orders', section === 'orders' && !['cancelled', 'return'].includes(tab), 'Tất Cả')}${a('#/seller/orders?tab=cancelled', section === 'orders' && tab === 'cancelled', 'Đơn Hủy')}${a('#/seller/orders?tab=return', section === 'orders' && tab === 'return', 'Trả Hàng/Hoàn Tiền')}
      <h6>${SV.icon('box', 16)} Quản Lý Sản Phẩm</h6>${a('#/seller/products', section === 'products', 'Tất Cả Sản Phẩm')}${a('#/seller/products/new', section === 'product-form' && tab === 'new', 'Thêm Sản Phẩm')}
      <h6>${SV.icon('store', 16)} Quản Lý Shop</h6>${a('#/seller/reviews', section === 'reviews', 'Đánh Giá Shop')}${a('#/shop/' + SV.seller.shopId(), false, 'Xem Trang Shop')}
    </aside>`;
  }

  /* ---------------- Biểu đồ doanh số 7 ngày (SVG, 1 chuỗi dữ liệu) ---------------- */
  function niceStep(raw) {
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
  }
  function revenueChart(days) {
    const W = 640, H = 230, L = 64, R = 12, T = 26, B = 30;
    const max = Math.max(...days.map((d) => d.value));
    const step = niceStep(Math.max(max, 400000) / 4);
    const top = Math.ceil(Math.max(max, 1) / step) * step;
    const band = (W - L - R) / days.length;
    const bw = Math.min(24, band * 0.5);
    const x = (i) => L + (i + 0.5) * band;
    const y = (v) => T + (H - T - B) * (1 - v / top);
    const ticks = [];
    for (let v = 0; v <= top + 1; v += step) ticks.push(v);
    const maxIdx = max > 0 ? days.findIndex((d) => d.value === max) : -1;
    const bar = (d, i) => {
      if (!d.value) return '';
      const x0 = x(i) - bw / 2, x1 = x(i) + bw / 2, y0 = y(0), y1 = y(d.value);
      const r = Math.min(4, y0 - y1, bw / 2);
      return `<path class="bar" d="M${x0} ${y0}V${y1 + r}Q${x0} ${y1} ${x0 + r} ${y1}H${x1 - r}Q${x1} ${y1} ${x1} ${y1 + r}V${y0}Z"/>`;
    };
    return `<div class="chart-wrap" data-chart>
      <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Doanh số 7 ngày gần nhất">
        ${ticks.map((t) => `<line class="gridline" x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}"/><text class="tick" x="${L - 8}" y="${y(t) + 4}" text-anchor="end">${t ? '₫' + U.compact(t) : '0'}</text>`).join('')}
        ${days.map(bar).join('')}
        ${maxIdx >= 0 ? `<text class="val" x="${x(maxIdx)}" y="${y(max) - 8}" text-anchor="middle">${U.money(max)}</text>` : ''}
        ${days.map((d, i) => `<text class="tick" x="${x(i)}" y="${H - 10}" text-anchor="middle">${d.label}</text>`).join('')}
        ${days.map((d, i) => `<rect class="hit" x="${x(i) - band / 2}" y="${T}" width="${band}" height="${H - T - B}" data-tip="${d.label}: ${U.money(d.value)}"/>`).join('')}
      </svg><div class="chart-tip" hidden></div>
      ${max ? '' : '<div class="chart-empty">Chưa có doanh số trong 7 ngày qua</div>'}
      <details class="chart-table"><summary>Xem dạng bảng</summary><table class="tbl"><thead><tr><th>Ngày</th><th>Doanh số</th></tr></thead><tbody>${days.map((d) => `<tr><td>${d.label}</td><td>${U.money(d.value)}</td></tr>`).join('')}</tbody></table></details>
    </div>`;
  }
  function bindChart(root) {
    const wrap = root.querySelector('[data-chart]');
    if (!wrap) return;
    const tip = wrap.querySelector('.chart-tip');
    wrap.addEventListener('mousemove', (e) => {
      const h = e.target.closest('[data-tip]');
      if (!h) return (tip.hidden = true);
      const r = wrap.getBoundingClientRect();
      tip.textContent = h.dataset.tip;
      tip.hidden = false;
      tip.style.left = e.clientX - r.left + 12 + 'px';
      tip.style.top = e.clientY - r.top - 34 + 'px';
    });
    wrap.addEventListener('mouseleave', () => (tip.hidden = true));
  }

  /** Shop khác đang có đơn cần xử lý – giúp chọn đúng shop để duyệt đơn (chế độ demo) */
  function pendingElsewhere() {
    const cur = SV.seller.shopId();
    const need = (o) => o.status === 'TO_SHIP' || o.status === 'SHIPPING' || (o.status === 'RETURN' && !o.refunded);
    const counts = {};
    SV.orders.list().forEach((o) => {
      if (o.shopId !== cur && need(o)) counts[o.shopId] = (counts[o.shopId] || 0) + 1;
    });
    const ids = Object.keys(counts);
    if (!ids.length) return '';
    return `<div class="sc-other">${SV.icon('orders', 16)}<span>Đơn đang chờ xử lý ở shop khác — bấm để chuyển sang quản lý shop đó:</span>${ids
      .map((id) => `<a class="btn btn-sm" href="#/seller/orders?shop=${id}">${U.esc(C.shopRaw(id).name)} (${counts[id]})</a>`)
      .join('')}</div>`;
  }

  /* ---------------- Các mục ---------------- */
  const buyerName = (o) => {
    const u = SV.db.data().users.find((x) => x.id === o.userId);
    return u ? u.username : 'khách';
  };

  function dashboard(main) {
    const s = SV.seller.stats();
    const shop = C.shop(SV.seller.shopId());
    const top = SV.seller.products(true).sort((a, b) => b.sold - a.sold).slice(0, 5);
    const todo = [
      ['Chờ Xác Nhận', s.todo.toConfirm, '#/seller/orders?tab=confirm'],
      ['Chờ Lấy Hàng', s.todo.toPickup, '#/seller/orders?tab=pickup'],
      ['Đang Giao', s.todo.shipping, '#/seller/orders?tab=shipping'],
      ['Chờ Thanh Toán', s.todo.unpaid, '#/seller/orders?tab=unpaid'],
      ['Đơn Hủy', s.todo.cancelled, '#/seller/orders?tab=cancelled'],
      ['Trả Hàng/Hoàn Tiền Chờ Xử Lý', s.todo.returns, '#/seller/orders?tab=return'],
      ['Sản Phẩm Hết Hàng', s.todo.outOfStock, '#/seller/products?tab=out'],
      ['Sản Phẩm Đang Ẩn', s.todo.hidden, '#/seller/products?tab=hidden'],
    ];
    main.innerHTML = `${pendingElsewhere()}
      <div class="sc-tip">${SV.icon('help', 16)} <span><b>Mẹo demo:</b> đăng nhập tài khoản demo, đặt hàng ở trang mua sắm, rồi quay lại đây chọn đúng shop để <b>Xác nhận → Giao cho ĐVVC → Đã giao</b>. Mở 2 tab (người mua / người bán) để thấy dữ liệu đồng bộ.</span></div>
      <section class="sc-card"><h3>Danh sách cần làm</h3><div class="sub">Những việc bạn sẽ phải làm của shop <b>${U.esc(shop.name)}</b></div>
        <div class="todo">${todo.map(([t, n, href]) => `<a href="${href}"><b>${n}</b><span>${t}</span></a>`).join('')}</div></section>
      <section class="sc-card"><h3>Phân Tích Bán Hàng</h3><div class="sub">Tổng quan dữ liệu của shop (đơn đã đặt, trừ đơn hủy/hoàn tiền)</div>
        <div class="kpis">
          <div class="kpi"><div class="k">Doanh số</div><div class="v">${U.money(s.revenue)}</div></div>
          <div class="kpi"><div class="k">Đơn hàng</div><div class="v">${s.orders.toLocaleString('vi-VN')}</div></div>
          <div class="kpi"><div class="k">Lượt truy cập</div><div class="v">${s.views.toLocaleString('vi-VN')}</div></div>
          <div class="kpi"><div class="k">Tỉ lệ chuyển đổi</div><div class="v">${s.conversion.toFixed(2).replace('.', ',')}%</div></div>
        </div>
        <h4 class="chart-title">Doanh số 7 ngày gần nhất</h4>${revenueChart(s.days)}
      </section>
      <section class="sc-card"><h3>Sản phẩm bán chạy</h3><div class="sub">Top 5 theo số lượng đã bán</div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Sản phẩm</th><th>Giá</th><th>Kho</th><th>Đã bán</th></tr></thead><tbody>
        ${top.map((p) => `<tr><td><a class="tp" href="#/product/${p.id}">${ui.img(p.thumbnail, C.emoji(p))}<span>${U.esc(p.name)}</span></a></td><td>${U.money(p.price)}</td><td>${p.stock}</td><td>${p.sold.toLocaleString('vi-VN')}</td></tr>`).join('')}
        </tbody></table></div></section>`;
    bindChart(main);
  }

  function orders(main, ctx, redraw) {
    const tab = ctx.query.get('tab') || 'all';
    const all = SV.orders.list({ shopId: SV.seller.shopId() });
    const cur = ORDER_TABS.find((t) => t[0] === tab) || ORDER_TABS[0];
    const list = all.filter(cur[2]);
    const btn = (act, id, text, primary) => `<button type="button" class="btn btn-sm ${primary ? 'btn-primary' : ''}" data-sact="${act}" data-id="${id}">${text}</button>`;
    const actions = (o) => {
      if (o.oms && ['UNPAID', 'TO_SHIP', 'SHIPPING', 'RETURN'].includes(o.status)) return '<span class="muted small">Kho EZMART xử lý</span>';
      if (o.status === 'TO_SHIP' && !o.confirmed) return btn('confirm', o.id, 'Xác nhận đơn', true) + btn('cancel', o.id, 'Hủy đơn');
      if (o.status === 'TO_SHIP') return btn('ship', o.id, 'Giao cho ĐVVC', true);
      if (o.status === 'SHIPPING') return btn('deliver', o.id, 'Đã giao (mô phỏng)', true);
      if (o.status === 'RETURN' && !o.refunded) return btn('refund', o.id, 'Chấp nhận hoàn tiền', true);
      if (o.status === 'UNPAID') return '<span class="muted small">Chờ người mua thanh toán</span>';
      return '<span class="muted small">—</span>';
    };
    main.innerHTML = `${pendingElsewhere()}<section class="sc-card"><h3>Quản Lý Đơn Hàng</h3><div class="sub">${all.length} đơn hàng của shop</div>
      <nav class="sc-tabs">${ORDER_TABS.map(([k, l, f]) => `<a class="${k === tab ? 'on' : ''}" href="#/seller/orders?tab=${k}">${l} <span class="muted">(${all.filter(f).length})</span></a>`).join('')}</nav>
      ${list.length
        ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Sản phẩm</th><th>Mã đơn / Người mua</th><th>Tổng đơn hàng</th><th>Trạng thái</th><th>Vận chuyển</th><th>Thao tác</th></tr></thead><tbody>
          ${list.map((o) => `<tr>
            <td><div class="tp">${ui.img(o.items[0].image, o.items[0].emoji)}<span>${U.esc(o.items[0].name)}${o.items[0].variant ? `<br><span class="muted small">${U.esc(o.items[0].variant)} · x${o.items[0].qty}</span>` : `<br><span class="muted small">x${o.items[0].qty}</span>`}${o.items.length > 1 ? `<br><span class="muted small">+${o.items.length - 1} sản phẩm khác</span>` : ''}</span></div></td>
            <td><b>${o.code}</b><br><span class="muted small">${U.esc(buyerName(o))} · ${U.fmtDate(o.createdAt, true)}</span></td>
            <td><b>${U.money(o.amounts.total)}</b><br><span class="muted small">${o.payment.label}</span></td>
            <td><span class="pill ${PILL[o.status]}">${SV.orders.statusText(o)}</span></td>
            <td>${o.shipping.name}${o.tracking ? `<br><span class="muted small">${o.tracking}</span>` : ''}</td>
            <td class="acts">${actions(o)}</td></tr>`).join('')}
          </tbody></table></div>`
        : ui.empty('📦', 'Không có đơn hàng nào')}</section>`;
    main.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-sact]');
      if (!b) return;
      const id = b.dataset.id;
      const a = b.dataset.sact;
      let r = { ok: false };
      if (a === 'confirm') r = SV.orders.sellerConfirm(id);
      else if (a === 'ship') r = SV.orders.sellerShip(id);
      else if (a === 'deliver') r = SV.orders.carrierDeliver(id);
      else if (a === 'refund') r = SV.orders.sellerRefund(id);
      else if (a === 'cancel') {
        const reason = await ui.modal({
          title: 'Hủy đơn hàng', width: 460, okText: 'Hủy đơn',
          body: ['Hết hàng', 'Không liên lạc được người mua', 'Người mua yêu cầu hủy', 'Sai thông tin sản phẩm/giá'].map((x, i) => `<label class="radio-row"><input type="radio" name="r" value="${x}" ${i ? '' : 'checked'}> ${x}</label>`).join(''),
          onOk: (m) => m.querySelector('[name=r]:checked').value,
        });
        if (!reason) return;
        r = await SV.orders.cancel(id, reason, 'seller');
      }
      ui.toast(r.ok ? 'Cập nhật đơn hàng thành công' : r.error || 'Không thể cập nhật', r.ok ? 'success' : 'error');
      redraw();
    });
  }

  function products(main, ctx, redraw) {
    const tab = ctx.query.get('tab') || 'all';
    const q = ctx.query.get('q') || '';
    const all = SV.seller.products(true).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)); // mới nhất trước
    const tabs = [
      ['all', 'Tất cả', () => true],
      ['active', 'Đang hoạt động', (p) => !p.hidden && p.stock > 0],
      ['out', 'Hết hàng', (p) => p.stock <= 0],
      ['hidden', 'Đã ẩn', (p) => p.hidden],
    ];
    const cur = tabs.find((t) => t[0] === tab) || tabs[0];
    const list = all.filter(cur[2]).filter((p) => !q || U.wordMatch(p.name, q));
    main.innerHTML = `<section class="sc-card"><div class="sc-card-hd"><div><h3>Sản Phẩm</h3><div class="sub">${all.length} sản phẩm của shop</div></div><a class="btn btn-primary" href="#/seller/products/new">${SV.icon('plus', 14)} Thêm 1 sản phẩm mới</a></div>
      <nav class="sc-tabs">${tabs.map(([k, l, f]) => `<a class="${k === tab ? 'on' : ''}" href="#/seller/products?tab=${k}">${l} <span class="muted">(${all.filter(f).length})</span></a>`).join('')}</nav>
      <form class="sc-search" data-psearch><input class="input" name="q" placeholder="Tìm tên sản phẩm" value="${U.esc(q)}"><button class="btn" type="submit">${SV.icon('search', 14)} Tìm</button></form>
      ${list.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tên sản phẩm</th><th>Phân loại</th><th>Giá</th><th>Kho hàng</th><th>Đã bán</th><th>Thao tác</th></tr></thead><tbody>
        ${list.map((p) => `<tr class="${p.hidden ? 'row-muted' : ''}">
          <td><a class="tp" href="#/product/${p.id}">${ui.img(p.thumbnail, C.emoji(p))}<span>${U.esc(p.name)}<br><span class="muted small">ID: ${p.id}${p.hidden ? ' · <span class="pill gray">Đã ẩn</span>' : ''}</span></span></a></td>
          <td class="small">${(p.variants || []).map((g) => `${U.esc(g.name)}: ${g.options.length}`).join('<br>') || '—'}</td>
          <td>${U.money(p.price)}${p.originalPrice > p.price ? `<br><s class="muted small">${U.money(p.originalPrice)}</s>` : ''}</td>
          <td>${p.stock <= 0 ? '<span class="pill red">Hết hàng</span>' : p.stock}</td>
          <td>${p.sold.toLocaleString('vi-VN')}</td>
          <td class="acts"><a class="link" href="#/seller/products/${p.id}">Sửa</a><button type="button" class="link" data-hide="${p.id}">${p.hidden ? 'Hiển thị' : 'Ẩn'}</button><button type="button" class="link danger" data-del="${p.id}">Xóa</button></td></tr>`).join('')}
        </tbody></table></div>` : ui.empty('📦', 'Không tìm thấy sản phẩm')}</section>`;
    main.querySelector('[data-psearch]').addEventListener('submit', (e) => {
      e.preventDefault();
      SV.go('/seller/products' + U.qs({ tab: tab === 'all' ? '' : tab, q: e.target.q.value.trim() }));
    });
    main.addEventListener('click', async (e) => {
      const h = e.target.closest('[data-hide]');
      if (h) {
        SV.seller.toggleHidden(h.dataset.hide);
        ui.toast('Đã cập nhật trạng thái hiển thị', 'info');
        return redraw();
      }
      const d = e.target.closest('[data-del]');
      if (d && (await ui.confirm('Xóa sản phẩm này? Người mua sẽ không còn thấy sản phẩm.', { okText: 'Xóa' }))) {
        SV.seller.remove(d.dataset.del);
        ui.toast('Đã xóa sản phẩm');
        redraw();
      }
    });
  }

  /** Ảnh chọn từ máy được thu nhỏ (tối đa 480px) để không làm đầy LocalStorage */
  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => {
        const img = new Image();
        img.onload = () => {
          const k = Math.min(1, 480 / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * k);
          c.height = Math.round(img.height * k);
          const g = c.getContext('2d');
          g.fillStyle = '#fff';
          g.fillRect(0, 0, c.width, c.height);
          g.drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = reject;
        img.src = fr.result;
      };
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  function productForm(main, ctx) {
    const id = ctx.params.sub !== 'new' ? ctx.params.sub : null;
    const p = id ? C.get(id) : null;
    if (id && (!p || p.shopId !== SV.seller.shopId())) {
      main.innerHTML = ui.empty('📦', 'Sản phẩm không thuộc shop đang quản lý', '<a class="btn btn-primary" href="#/seller/products">Quay lại</a>');
      return;
    }
    const v = (k) => U.esc(p ? (p[k] == null ? '' : p[k]) : '');
    const cats = C.categories();
    let image = p ? p.thumbnail : '';
    let imageChanged = false; // chỉ ghi đè ảnh khi người bán đổi ảnh
    main.innerHTML = `<section class="sc-card"><h3>${p ? 'Sửa sản phẩm' : 'Thêm 1 sản phẩm mới'}</h3><div class="sub">Vui lòng điền đầy đủ thông tin sản phẩm. Các trường có dấu * là bắt buộc.</div>
      <form class="sc-form" data-pform novalidate>
        <div class="form-row"><label>Hình ảnh sản phẩm</label><div class="fld"><div class="img-pick"><span class="img-prev" data-prev>${ui.img(image, '🖼️')}</span><div class="img-in"><input class="input" name="imageUrl" placeholder="Dán đường dẫn ảnh (https://…)" value="${image && !image.startsWith('data:') ? U.esc(image) : ''}"><label class="btn btn-sm">${SV.icon('image', 14)} Chọn ảnh từ máy<input type="file" accept="image/*" hidden data-file></label></div></div><div class="msg"></div></div></div>
        <div class="form-row"><label>* Tên sản phẩm</label><div class="fld"><input class="input" name="name" maxlength="120" value="${v('name')}" placeholder="Tên sản phẩm + Thương hiệu + Đặc điểm (10–120 ký tự)"><div class="msg"></div></div></div>
        <div class="form-row"><label>* Ngành hàng</label><div class="fld"><select class="input" name="categoryId"><option value="">-- Chọn ngành hàng --</option>${cats.map((c) => `<option value="${c.id}" ${p && p.categoryId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}</select><div class="msg"></div></div></div>
        <div class="form-row"><label>Danh mục con</label><div class="fld"><input class="input" name="subCategory" list="sc-subs" value="${v('subCategory')}" placeholder="Ví dụ: Áo sơ mi & Áo thun"><datalist id="sc-subs">${[...new Set(cats.flatMap((c) => c.subCategories))].map((s) => `<option value="${U.esc(s)}">`).join('')}</datalist></div></div>
        <div class="form-row"><label>Thương hiệu</label><div class="fld"><input class="input" name="brand" value="${v('brand')}" placeholder="No Brand"></div></div>
        <div class="form-row top"><label>Mô tả sản phẩm</label><div class="fld"><textarea class="input" name="description" rows="6" placeholder="Mô tả chi tiết: chất liệu, kích thước, hướng dẫn sử dụng…">${p && p.description ? U.esc(p.description) : ''}</textarea></div></div>
        <div class="form-row top"><label>Phân loại hàng</label><div class="fld"><textarea class="input" name="variants" rows="3" placeholder="Mỗi dòng một nhóm phân loại, ví dụ:&#10;Màu sắc: Đen, Trắng&#10;Size: S, M, L">${p ? U.esc((p.variants || []).map((g) => g.name + ': ' + g.options.join(', ')).join('\n')) : ''}</textarea><div class="muted small">Định dạng: <code>Tên nhóm: lựa chọn 1, lựa chọn 2</code></div></div></div>
        <div class="form-row"><label>* Giá bán (₫)</label><div class="fld"><input class="input" name="price" inputmode="numeric" value="${v('price')}"><div class="msg"></div></div></div>
        <div class="form-row"><label>Giá gốc (₫)</label><div class="fld"><input class="input" name="originalPrice" inputmode="numeric" value="${v('originalPrice')}" placeholder="Để trống nếu không giảm giá"><div class="msg"></div></div></div>
        <div class="form-row"><label>* Kho hàng</label><div class="fld"><input class="input" name="stock" inputmode="numeric" value="${p ? p.stock : ''}"><div class="msg"></div></div></div>
        <div class="form-row"><label></label><div class="btn-row"><a class="btn" href="#/seller/products">Hủy</a><button class="btn btn-primary" type="submit">Lưu &amp; Hiển thị</button></div></div>
      </form></section>`;
    const f = main.querySelector('[data-pform]');
    const setPrev = (src) => {
      image = src;
      imageChanged = true;
      main.querySelector('[data-prev]').innerHTML = ui.img(src, '🖼️');
    };
    f.imageUrl.addEventListener('change', () => setPrev(f.imageUrl.value.trim()));
    main.querySelector('[data-file]').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        setPrev(await fileToDataUrl(file));
        f.imageUrl.value = '';
      } catch (err) {
        ui.toast('Không đọc được ảnh', 'error');
      }
    });
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = ui.formData(f);
      d.id = id;
      d.image = imageChanged ? image : '';
      ['price', 'originalPrice', 'stock'].forEach((k) => (d[k] = String(d[k]).replace(/\D/g, '')));
      const r = SV.seller.saveProduct(d);
      if (!r.ok) return ui.fieldError(f, r.field, r.error);
      ui.toast(p ? 'Đã cập nhật sản phẩm' : 'Đã thêm sản phẩm mới');
      SV.go('/seller/products');
    });
  }

  function reviews(main) {
    const prods = SV.seller.products(true);
    const list = prods
      .flatMap((p) => C.allReviews(p).slice(0, 4).map((r) => Object.assign({ product: p }, r)))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 20);
    const shop = C.shop(SV.seller.shopId());
    const total = prods.reduce((s, p) => s + C.reviewStats(p).count, 0);
    main.innerHTML = `<section class="sc-card"><h3>Đánh Giá Shop</h3><div class="sub">Điểm đánh giá shop: <b>${shop.rating}</b> / 5 · ${total.toLocaleString('vi-VN')} đánh giá · Hiển thị 20 đánh giá mới nhất</div>
      ${list.length ? list.map((r) => `<div class="rv sc-rv">${ui.avatar(r.user, 36, r.color)}<div class="rv-main"><div class="u">${U.esc(r.user)} ${ui.stars(r.rating, 12)}</div><div class="meta">${U.fmtDate(r.createdAt, true)} · <a class="link" href="#/product/${r.product.id}">${U.esc(r.product.name)}</a></div>${r.comment ? `<div class="txt">${U.esc(r.comment)}</div>` : '<div class="muted small">(Không có bình luận)</div>'}</div></div>`).join('') : ui.empty('⭐', 'Chưa có đánh giá')}</section>`;
  }

  SV.pages.seller = {
    render(el, ctx) {
      const section = ctx.params.section === 'orders' ? 'orders' : ctx.params.section === 'products' ? (ctx.params.sub ? 'product-form' : 'products') : ctx.params.section === 'reviews' ? 'reviews' : 'dashboard';
      const tab = section === 'product-form' ? ctx.params.sub : ctx.query.get('tab');
      document.title = 'Kênh Người Bán | ShopVui';
      // #/seller/orders?shop=s2 -> chuyển sang quản lý shop s2 (link từ đơn hàng của người mua)
      const qShop = ctx.query.get('shop');
      if (qShop && C.shopRaw(qShop) && qShop !== SV.seller.shopId()) {
        SV.seller.setShop(qShop);
        SV.layout.refreshHeader();
      }
      const draw = () => {
        el.innerHTML = `<div class="sc-layout">${side(section, tab)}<div class="sc-main"></div></div>`;
        const main = el.querySelector('.sc-main');
        if (section === 'orders') orders(main, ctx, draw);
        else if (section === 'products') products(main, ctx, draw);
        else if (section === 'product-form') productForm(main, ctx);
        else if (section === 'reviews') reviews(main);
        else dashboard(main);
      };
      draw();
    },
  };
})();
