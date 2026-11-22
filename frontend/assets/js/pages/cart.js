/* =========================================================
   Trang Giỏ hàng – Route: #/cart (cần đăng nhập)
   ========================================================= */
(function () {
  'use strict';
  const U = SV.U;
  const C = SV.catalog;
  const ui = SV.ui;
  SV.state = SV.state || { platformVoucher: null, shipVoucher: 'FREESHIP30' };

  function qtyBox(l) {
    const max = l.product ? l.product.stock : 1;
    return `<div class="qty" data-qline="${l.id}"><button type="button" data-q="-" aria-label="Giảm">${SV.icon('minus', 14)}</button><input type="text" inputmode="numeric" value="${l.qty}" aria-label="Số lượng"><button type="button" data-q="+" ${l.qty >= max ? 'disabled' : ''} aria-label="Tăng">${SV.icon('plus', 14)}</button></div>`;
  }

  function row(l) {
    const p = l.product;
    if (!p)
      return `<div class="cart-row disabled"><label class="ck"><input type="checkbox" disabled></label><div class="cart-prod"><span class="cart-img">${ui.img('', '❔')}</span><div class="nm">Sản phẩm không còn tồn tại</div></div><div></div><div></div><div></div><div class="cart-act"><button type="button" data-del="${l.id}">Xóa</button></div></div>`;
    const flash = C.flash(p);
    return `<div class="cart-row ${l.available ? '' : 'disabled'}">
      <label class="ck"><input type="checkbox" data-line="${l.id}" ${l.selected && l.available ? 'checked' : ''} ${l.available ? '' : 'disabled'} aria-label="Chọn sản phẩm"></label>
      <div class="cart-prod">
        <a class="cart-img" href="#/product/${p.id}">${ui.img(p.thumbnail, C.emoji(p))}</a>
        <div class="cart-name"><a class="nm" href="#/product/${p.id}">${U.esc(p.name)}</a>
          <div class="tags">${flash ? '<span class="tag tag-red">Flash Sale</span>' : ''}${(p.labels || []).includes('freeship') ? '<span class="tag tag-teal">Freeship</span>' : ''}${!l.available ? '<span class="tag tag-gray">' + (p.hidden ? 'Ngừng bán' : 'Hết hàng') + '</span>' : ''}</div></div>
        ${(p.variants || []).length ? `<button type="button" class="var-btn" data-var="${l.id}"><span class="lb">Phân Loại Hàng: ${SV.icon('down', 12)}</span><span class="vv">${U.esc(l.variant)}</span></button>` : '<span></span>'}
      </div>
      <div class="cart-price">${l.unitOriginal > l.unit ? `<s>${U.money(l.unitOriginal)}</s>` : ''}<span>${U.money(l.unit)}</span></div>
      <div>${l.available ? qtyBox(l) : ''}</div>
      <div class="cart-total">${U.money(l.unit * l.qty)}</div>
      <div class="cart-act"><button type="button" data-del="${l.id}">Xóa</button><a class="similar" href="#/category/${p.categoryId}?sub=${encodeURIComponent(p.subCategory)}">Tìm sản phẩm tương tự ${SV.icon('down', 12)}</a></div>
    </div>`;
  }

  SV.pages.cart = {
    render(el) {
      document.title = 'Giỏ Hàng | ShopVui';
      function draw() {
        const lines = SV.cart.lines();
        if (!lines.length) {
          el.innerHTML = `<div class="container"><div class="cart-empty"><div class="em">🛒</div><p>Giỏ hàng của bạn còn trống</p><a class="btn btn-primary" href="#/">Mua Ngay</a></div>
            <section class="more-sec"><div class="more-hd"><h3>Có Thể Bạn Cũng Thích</h3></div>${ui.grid(C.daily().slice(0, 12))}</section></div>`;
          return;
        }
        const groups = [];
        lines.forEach((l) => {
          const sid = l.product ? l.product.shopId : '_';
          let g = groups.find((x) => x.sid === sid);
          if (!g) groups.push((g = { sid, lines: [] }));
          g.lines.push(l);
        });
        const avail = lines.filter((l) => l.available);
        const selected = avail.filter((l) => l.selected);
        const allOn = avail.length > 0 && selected.length === avail.length;
        const calc = SV.checkout.calc({ lines: selected, address: null, platformVoucher: SV.state.platformVoucher });
        const pv = calc.platformVoucher;
        const firstProduct = lines.find((l) => l.product);

        el.innerHTML = `<div class="container cart-page">
          <div class="cart-notice">${SV.icon('truck', 18)} Nhấn vào mục Mã giảm giá ở cuối trang để hưởng miễn phí vận chuyển bạn nhé!</div>
          <div class="cart-head"><label class="ck"><input type="checkbox" data-all ${allOn ? 'checked' : ''} aria-label="Chọn tất cả"></label><span>Sản Phẩm</span><span>Đơn Giá</span><span>Số Lượng</span><span>Số Tiền</span><span>Thao Tác</span></div>
          ${groups
            .map((g) => {
              const shop = C.shop(g.sid);
              const gAvail = g.lines.filter((l) => l.available);
              const gOn = gAvail.length > 0 && gAvail.every((l) => l.selected);
              const bestV = shop && shop.vouchers.reduce((m, v) => Math.max(m, v.type === 'fixed' ? v.value : v.maxDiscount || 0), 0);
              return `<section class="cart-shop">
                <div class="cart-shop-hd"><label class="ck"><input type="checkbox" data-shop="${g.sid}" ${gOn ? 'checked' : ''} ${gAvail.length ? '' : 'disabled'} aria-label="Chọn cả shop"></label>
                  ${shop ? `${ui.shopLabel(shop.type)}<a class="sname" href="#/shop/${shop.id}">${U.esc(shop.name)}</a><button type="button" class="chat-mini" data-chat-shop-btn="${shop.id}" aria-label="Chat với shop">${SV.icon('chat', 16)}</button>` : '<span>Sản phẩm không khả dụng</span>'}</div>
                ${g.lines.map(row).join('')}
                ${shop && bestV ? `<div class="cart-shop-ft">${SV.icon('ticket', 18)}<span>Voucher giảm đến ₫${U.compact(bestV)}</span><a class="link" href="#/shop/${shop.id}">Xem thêm voucher</a></div>` : ''}
                <div class="cart-shop-ft">${SV.icon('truck', 18)}<span>Giảm ₫30.000 phí vận chuyển đơn tối thiểu ₫0</span><a class="link" href="#/help">Tìm hiểu thêm</a></div>
              </section>`;
            })
            .join('')}
          <div class="cart-bar">
            <div class="r1"><span class="vlabel">${SV.icon('ticket', 20)} ShopVui Voucher</span>${pv ? `<span class="vchip">-${U.money(calc.platformDiscount)}</span>` : ''}<button type="button" class="link" data-act="voucher">${pv ? 'Đổi mã ' + pv.code : 'Chọn hoặc nhập mã'}</button></div>
            <div class="r2">
              <label class="ck"><input type="checkbox" data-all ${allOn ? 'checked' : ''}> Chọn Tất Cả (${avail.length})</label>
              <button type="button" class="plain" data-act="del-selected">Xóa</button>
              <button type="button" class="plain hide-sm" data-act="like-selected">Lưu vào mục Đã thích</button>
              <div class="sum"><div class="t">Tổng thanh toán (${calc.qty} Sản phẩm): <b>${U.money(calc.subtotal - calc.platformDiscount)}</b></div>${calc.savings ? `<div class="save">Tiết kiệm <b>${U.money(calc.savings)}</b></div>` : ''}</div>
              <button type="button" class="btn btn-primary btn-buy" data-act="buy">Mua Hàng</button>
            </div>
          </div>
          <section class="more-sec"><div class="more-hd"><h3>Có Thể Bạn Cũng Thích</h3></div>${ui.grid(firstProduct ? C.related(firstProduct.product, 12) : C.daily().slice(0, 12))}</section>
        </div>`;
      }
      draw();

      const selectedIds = () => SV.cart.lines().filter((l) => l.selected && l.available).map((l) => l.id);
      el.addEventListener('change', (e) => {
        const t = e.target;
        if (t.matches('[data-all]')) SV.cart.setSelected(SV.cart.lines().filter((l) => l.available).map((l) => l.id), t.checked);
        else if (t.matches('[data-shop]')) SV.cart.setSelected(SV.cart.lines().filter((l) => l.available && l.product.shopId === t.dataset.shop).map((l) => l.id), t.checked);
        else if (t.matches('[data-line]')) SV.cart.update(t.dataset.line, { selected: t.checked });
        else if (t.closest('[data-qline]')) SV.cart.update(t.closest('[data-qline]').dataset.qline, { qty: t.value });
        else return;
        draw();
      });
      el.addEventListener('click', async (e) => {
        const q = e.target.closest('[data-q]');
        if (q) {
          const id = q.closest('[data-qline]').dataset.qline;
          const l = SV.cart.lines().find((x) => x.id === id);
          if (q.dataset.q === '-' && l.qty <= 1) {
            if (await ui.confirm(`Bạn chắc chắn muốn bỏ sản phẩm này?<p class="muted">${U.esc(l.product.name)}</p>`, { okText: 'Có', cancelText: 'Không' })) SV.cart.remove(id);
          } else SV.cart.update(id, { qty: l.qty + (q.dataset.q === '+' ? 1 : -1) });
          return draw();
        }
        const del = e.target.closest('[data-del]');
        if (del) {
          SV.cart.remove(del.dataset.del);
          return draw();
        }
        const cs = e.target.closest('[data-chat-shop-btn]');
        if (cs) return SV.openChat(cs.dataset.chatShopBtn);
        const vb = e.target.closest('[data-var]');
        if (vb) {
          const l = SV.cart.lines().find((x) => x.id === vb.dataset.var);
          const cur = C.parseVariant(l.variant);
          const r = await ui.modal({
            title: 'Phân Loại Hàng', width: 480, okText: 'Xác nhận',
            body: (l.product.variants || []).map((g, gi) => `<div class="var-group"><div class="lbl-sm">${U.esc(g.name)}</div><div class="opt-list">${g.options.map((o) => `<button type="button" class="opt ${cur[gi] === o ? 'on' : ''}" data-g="${gi}" data-o="${U.esc(o)}">${U.esc(o)}</button>`).join('')}</div></div>`).join(''),
            onOpen(m) {
              m.addEventListener('click', (ev) => {
                const b = ev.target.closest('.opt');
                if (!b) return;
                m.querySelectorAll(`.opt[data-g="${b.dataset.g}"]`).forEach((x) => x.classList.toggle('on', x === b));
              });
            },
            onOk: (m) => l.product.variants.map((g, gi) => (m.querySelector(`.opt.on[data-g="${gi}"]`) || { dataset: { o: g.options[0] } }).dataset.o).join(', '),
          });
          if (r && r !== l.variant) {
            SV.cart.update(l.id, { variant: r });
            draw();
          }
          return;
        }
        const act = e.target.closest('[data-act]');
        if (!act) return;
        const a = act.dataset.act;
        if (a === 'buy') {
          if (!selectedIds().length) return ui.toast('Bạn vẫn chưa chọn sản phẩm nào để mua.', 'error');
          SV.go('/checkout');
        } else if (a === 'del-selected') {
          const ids = selectedIds();
          if (!ids.length) return ui.toast('Vui lòng chọn sản phẩm', 'info');
          if (await ui.confirm(`Bạn có muốn bỏ ${ids.length} sản phẩm?`, { okText: 'Có', cancelText: 'Trở lại' })) {
            SV.cart.remove(ids);
            draw();
          }
        } else if (a === 'like-selected') {
          const lines = SV.cart.lines().filter((l) => l.selected && l.available);
          if (!lines.length) return ui.toast('Vui lòng chọn sản phẩm', 'info');
          lines.forEach((l) => !SV.likes.has(l.productId) && SV.likes.toggle(l.productId));
          SV.cart.remove(lines.map((l) => l.id));
          ui.toast('Đã chuyển vào mục Đã thích');
          draw();
        } else if (a === 'voucher') {
          const sel = SV.cart.selected();
          const r = await SV.voucherPicker(SV.checkout.calc({ lines: sel, address: null }), { ship: false });
          if (r) {
            SV.state.platformVoucher = r.platformVoucher;
            draw();
          }
        }
      });
    },
  };
})();
