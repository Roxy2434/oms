/* =========================================================
   Trang Thanh toán – Route: #/checkout (cần đăng nhập)
   + Hộp chọn ShopVui Voucher dùng chung cho Giỏ hàng & Thanh toán
   ========================================================= */
(function () {
  'use strict';
  const U = SV.U;
  const C = SV.catalog;
  const ui = SV.ui;
  SV.state = SV.state || { platformVoucher: null, shipVoucher: 'FREESHIP30' };

  const etaText = (o) => {
    if (o.id === 'express') return 'Nhận hàng trong 2 giờ';
    const d1 = U.fmtDay(new Date(o.etaFrom)), d2 = U.fmtDay(new Date(o.etaTo));
    if (o.id === 'oms' && o.etaHours) return d1 === d2 ? `Dự kiến nhận ${d2} (trong ~${Math.ceil(o.etaHours)} giờ)` : `Dự kiến nhận ${d1} - ${d2} (~${Math.ceil(o.etaHours)} giờ)`;
    return d1 === d2 ? `Nhận hàng vào ${d2}` : `Nhận hàng vào ${d1} - ${d2}`;
  };

  /** Hộp chọn voucher của sàn. calc: kết quả SV.checkout.calc; opts.ship: có chọn mã freeship không */
  SV.voucherPicker = (calc, opts) => {
    opts = opts || {};
    const merch = calc.subtotal - calc.shopDiscountTotal;
    const mallMerch = calc.groups.filter((g) => g.shop.isMall).reduce((s, g) => s + g.subtotal - g.shopDiscount, 0);
    const curP = opts.current ? opts.current.platformVoucher : SV.state.platformVoucher;
    const curS = opts.current ? opts.current.shipVoucher : SV.state.shipVoucher;
    const item = (v, kind) => {
      const ev = SV.vouchers.evaluate(v, v.mallOnly ? mallMerch : merch, calc.ctx);
      const checked = (kind === 'ship' ? curS : curP) === v.code && ev.ok;
      return `<label class="vp-item">${ui.voucher(v, { state: ev.ok ? 'ok' : 'disabled', reason: ev.ok ? '' : ev.reason, action: `<input type="radio" name="${kind}" value="${v.code}" ${checked ? 'checked' : ''} ${ev.ok ? '' : 'disabled'} aria-label="Chọn ${v.code}">` })}</label>`;
    };
    const vs = SV.vouchers.platform();
    return ui.modal({
      title: 'Chọn ShopVui Voucher', width: 560, okText: 'OK',
      body: `<div class="vp-input"><span>Mã Voucher</span><input class="input" name="code" placeholder="Mã ShopVui Voucher"><button type="button" class="btn" data-apply>Áp dụng</button></div><div class="vp-msg"></div>
        <div class="vp-scroll">
        ${opts.ship ? `<h4 class="vp-h">Mã Miễn Phí Vận Chuyển <small>Có thể chọn 1 Voucher</small></h4>${vs.filter((v) => v.kind === 'ship').map((v) => item(v, 'ship')).join('')}` : ''}
        <h4 class="vp-h">Mã Giảm Giá <small>Có thể chọn 1 Voucher</small></h4>${vs.filter((v) => v.kind === 'discount').map((v) => item(v, 'discount')).join('')}</div>`,
      onOpen(m) {
        // Cho phép bỏ chọn voucher bằng cách bấm lại
        m.addEventListener('mousedown', (e) => {
          const r = e.target.closest('.vp-item') && e.target.closest('.vp-item').querySelector('input[type=radio]');
          if (r) r.dataset.was = r.checked ? '1' : '';
        });
        m.addEventListener('click', (e) => {
          const lab = e.target.closest('.vp-item');
          if (lab) {
            const r = lab.querySelector('input[type=radio]');
            if (r && r.dataset.was === '1' && e.target === r) r.checked = false;
          }
          if (e.target.closest('[data-apply]')) {
            const code = m.querySelector('[name=code]').value.trim().toUpperCase();
            const msg = m.querySelector('.vp-msg');
            const radio = code && m.querySelector(`input[type=radio][value="${CSS.escape(code)}"]`);
            if (!radio) msg.textContent = 'Mã voucher không hợp lệ hoặc không tồn tại';
            else if (radio.disabled) msg.textContent = 'Đơn hàng chưa đủ điều kiện áp dụng mã này';
            else {
              radio.checked = true;
              msg.textContent = '';
            }
          }
        });
      },
      onOk(m) {
        const p = m.querySelector('input[name=discount]:checked');
        const s = m.querySelector('input[name=ship]:checked');
        return { platformVoucher: p ? p.value : null, shipVoucher: opts.ship ? (s ? s.value : null) : curS };
      },
    });
  };

  SV.pages.checkout = {
    render(el) {
      document.title = 'Thanh Toán | ShopVui';
      const lines = SV.cart.selected();
      if (!lines.length) {
        el.innerHTML = `<div class="container">${ui.empty('🧾', 'Không có sản phẩm nào để thanh toán', '<a class="btn btn-primary" href="#/cart">Quay lại Giỏ hàng</a>')}</div>`;
        return;
      }
      const def = SV.address.getDefault();
      const st = { addressId: def && def.id, shipChoice: {}, notes: {}, shopVoucher: {}, platformVoucher: SV.state.platformVoucher, shipVoucher: SV.state.shipVoucher, payment: 'cod' };
      // Tự động áp dụng voucher shop giảm nhiều nhất
      SV.checkout.calc({ lines, address: null }).groups.forEach((g) => {
        let best = null, bd = 0;
        g.shop.vouchers.forEach((v) => {
          const ev = SV.vouchers.evaluate(v, g.subtotal);
          if (ev.ok && ev.discount > bd) {
            best = v;
            bd = ev.discount;
          }
        });
        if (best) st.shopVoucher[g.shop.id] = best.code;
      });
      let calc;
      SV.oms.setOnQuote(() => el.isConnected && draw());

      function draw() {
        const address = st.addressId ? SV.address.get(st.addressId) : null;
        calc = SV.checkout.calc({ lines, address, shipChoice: st.shipChoice, shopVoucher: st.shopVoucher, platformVoucher: st.platformVoucher, shipVoucher: st.shipVoucher });
        const quoteLoading = !!address && calc.groups.some((g) => g.shop.oms && !g.ship && SV.oms.quoteState(address, g.lines).state !== 'error');
        const quoteError = !!address && calc.groups.some((g) => g.shop.oms && !g.ship && SV.oms.quoteState(address, g.lines).state === 'error');
        const pay = SV.const.PAYMENTS.find((p) => p.id === st.payment);
        el.innerHTML = `<div class="container co-page">
          <section class="co-addr"><h3>${SV.icon('pin', 18)} Địa Chỉ Nhận Hàng</h3>
            ${address
              ? `<div class="line"><b>${U.esc(address.name)} (+84) ${U.esc(address.phone.replace(/^0/, ''))}</b><span>${U.esc(SV.address.text(address))}</span>${address.isDefault ? '<span class="def">Mặc Định</span>' : ''}<button type="button" class="link" data-act="addr">Thay Đổi</button></div>`
              : `<div class="line"><span class="muted">Bạn chưa có địa chỉ nhận hàng.</span><button type="button" class="btn btn-primary btn-sm" data-act="addr">${SV.icon('plus', 14)} Thêm Địa Chỉ Mới</button></div>`}
          </section>

          <section class="co-box">
            <div class="co-head"><span class="t">Sản phẩm</span><span>Đơn giá</span><span>Số lượng</span><span class="r">Thành tiền</span></div>
            ${calc.groups
              .map((g) => `<div class="co-group">
                <div class="co-shop-name">${ui.shopLabel(g.shop.type)} <b>${U.esc(g.shop.name)}</b> <button type="button" class="chat-mini teal" data-chat-shop-btn="${g.shop.id}">${SV.icon('chat', 14)} Chat ngay</button></div>
                ${g.lines.map((l) => `<div class="co-item"><div class="p">${ui.img(l.product.thumbnail, C.emoji(l.product))}<span class="nm">${U.esc(l.product.name)}</span>${l.variant ? `<span class="var">Loại: ${U.esc(l.variant)}</span>` : '<span></span>'}</div><span>${U.money(l.unit)}</span><span>${l.qty}</span><span class="r">${U.money(l.unit * l.qty)}</span></div>`).join('')}
                <div class="co-shop-v"><span>${SV.icon('ticket', 18)} Voucher của Shop</span><span class="rr">${g.shopVoucher ? `<span class="vchip">-${U.money(g.shopDiscount)}</span>` : ''}<button type="button" class="link" data-shopv="${g.shop.id}">${g.shopVoucher ? 'Thay đổi' : 'Chọn Voucher'}</button></span></div>
                <div class="co-shop-ft">
                  <div class="co-msg"><label>Lời nhắn:</label><input class="input" data-note="${g.shop.id}" maxlength="200" placeholder="Lưu ý cho Người bán..." value="${U.esc(st.notes[g.shop.id] || '')}"></div>
                  <div class="co-ship">${g.ship
                    ? `<span class="lbl">Phương thức vận chuyển:</span><div><b>${g.ship.name}</b><div class="muted small">${etaText(g.ship)}</div></div><button type="button" class="link" data-ship="${g.shop.id}">Thay Đổi</button><span class="fee">${U.money(g.shipFee)}</span>`
                    : g.shop.oms && address
                    ? `<span class="muted">${SV.oms.quoteState(address, g.lines).state === 'error' ? U.esc(SV.oms.quoteState(address, g.lines).error) : 'Đang tính phí giao từ kho EZMART…'}</span>`
                    : '<span class="muted">Vui lòng chọn địa chỉ để tính phí vận chuyển</span>'}</div>
                </div>
                <div class="co-shop-total">Tổng số tiền (${g.qty} sản phẩm): <b>${U.money(g.subtotal - g.shopDiscount + g.shipFee)}</b></div>
              </div>`)
              .join('')}
          </section>

          <section class="co-box co-voucher"><span class="vlabel">${SV.icon('ticket', 20)} ShopVui Voucher</span>
            <span class="rr">${calc.shipVoucher && calc.shipDiscount ? `<span class="vchip teal">Freeship -${U.money(calc.shipDiscount)}</span>` : ''}${calc.platformVoucher && calc.platformDiscount ? `<span class="vchip">-${U.money(calc.platformDiscount)}</span>` : ''}<button type="button" class="link" data-act="voucher">Chọn Voucher</button></span></section>

          <section class="co-box co-pay">
            <div class="co-pay-hd"><span class="t">Phương thức thanh toán</span><div class="co-pay-methods">${SV.const.PAYMENTS.filter(p => p.id !== 'bank' || SV.oms.bankAvailable).map((p) => `<button type="button" class="pm ${st.payment === p.id ? 'on' : ''}" data-pay="${p.id}">${p.label}</button>`).join('')}</div></div>
            ${st.payment === 'bank' && SV.oms.realBankConsentRequired ? `<label class="check"><input type="checkbox" data-bank-consent ${st.realBankAcknowledged ? 'checked' : ''} aria-describedby="bank-real-warning"> Xác nhận thanh toán chuyển khoản ngân hàng qua SePay.</label><p id="bank-real-warning">Giao dịch chuyển khoản ngân hàng được hệ thống tự động đối soát theo mã đơn hàng.${SV.oms.refundContact ? ` Hỗ trợ tra soát hoàn tiền: ${U.esc(SV.oms.refundContact)}.` : ''}</p><p role="alert" data-bank-error></p>` : ''}
            <div class="co-pay-desc">${SV.icon(st.payment === 'cod' ? 'truck' : st.payment === 'wallet' ? 'wallet' : 'card', 18)} ${pay.desc}${st.payment === 'wallet' ? ` Số dư ví: <b>${U.money(SV.wallet.balance())}</b>.${SV.wallet.balance() < calc.total ? ` <span class="co-wallet-low">Không đủ để thanh toán ${U.money(calc.total)}.</span> Vui lòng chọn cách thanh toán khác.` : ''}` : ''}</div>
            <div class="co-summary"><div class="grid2">
              <span>Tổng tiền hàng</span><span>${U.money(calc.subtotal)}</span>
              ${calc.shopDiscountTotal ? `<span>Voucher của Shop</span><span>-${U.money(calc.shopDiscountTotal)}</span>` : ''}
              <span>Tổng tiền phí vận chuyển</span><span>${U.money(calc.shippingTotal)}</span>
              ${calc.shipDiscount ? `<span>Giảm giá phí vận chuyển</span><span>-${U.money(calc.shipDiscount)}</span>` : ''}
              ${calc.platformDiscount ? `<span>Tổng cộng Voucher giảm giá</span><span>-${U.money(calc.platformDiscount)}</span>` : ''}
              <span class="tl">Tổng thanh toán</span><span class="tot">${U.money(calc.total)}</span>
            </div></div>
            <div class="co-place"><span class="muted">Nhấn "Đặt hàng" đồng nghĩa với việc bạn đồng ý tuân theo <a class="link" href="#/help">Điều khoản ShopVui</a></span><button type="button" class="btn btn-primary btn-lg" data-act="place" ${quoteLoading || quoteError ? 'disabled' : ''}>${quoteLoading ? 'Đang tính phí giao…' : 'Đặt hàng'}</button></div>
          </section>
        </div>`;
      }
      draw();

      async function chooseAddress() {
        const list = SV.address.list();
        let r = 'new';
        if (list.length) {
          r = await ui.modal({
            title: 'Địa Chỉ Của Tôi', width: 560, okText: 'Xác nhận', cancelText: 'Huỷ',
            body: `<div class="addr-choose">${list
              .map((a) => `<label class="addr-opt"><input type="radio" name="addr" value="${a.id}" ${a.id === st.addressId ? 'checked' : ''}><div class="ad"><div><b>${U.esc(a.name)}</b> <span class="muted">| (+84) ${U.esc(a.phone.replace(/^0/, ''))}</span></div><div class="muted">${U.esc(a.detail)}</div><div class="muted">${U.esc(a.ward)}, ${U.esc(a.province)}</div>${a.isDefault ? '<span class="def">Mặc định</span>' : ''}</div><button type="button" class="link" data-edit="${a.id}">Cập nhật</button></label>`)
              .join('')}</div><button type="button" class="btn" data-new>${SV.icon('plus', 14)} Thêm Địa Chỉ Mới</button>`,
            onOpen(m, close) {
              m.addEventListener('click', (e) => {
                if (e.target.closest('[data-new]')) close('new');
                const ed = e.target.closest('[data-edit]');
                if (ed) {
                  e.preventDefault();
                  close('edit:' + ed.dataset.edit);
                }
              });
            },
            onOk: (m) => {
              const c = m.querySelector('[name=addr]:checked');
              return c ? c.value : false;
            },
          });
        }
        if (r === 'new') {
          const a = await ui.addressModal();
          if (a) st.addressId = a.id;
        } else if (r && r.startsWith('edit:')) {
          const a = await ui.addressModal(SV.address.get(r.slice(5)));
          if (a) st.addressId = a.id;
        } else if (r) st.addressId = r;
        draw();
      }

      el.addEventListener('input', (e) => {
        if (e.target.matches('[data-bank-consent]')) st.realBankAcknowledged = e.target.checked;
        if (e.target.dataset.note) st.notes[e.target.dataset.note] = e.target.value;
      });
      el.addEventListener('click', async (e) => {
        const pm = e.target.closest('[data-pay]');
        if (pm) {
          st.payment = pm.dataset.pay;
          st.realBankAcknowledged = false;
          return draw();
        }
        const cs = e.target.closest('[data-chat-shop-btn]');
        if (cs) return SV.openChat(cs.dataset.chatShopBtn);
        const sh = e.target.closest('[data-ship]');
        if (sh) {
          const g = calc.groups.find((x) => x.shop.id === sh.dataset.ship);
          const r = await ui.modal({
            title: 'Chọn phương thức vận chuyển', width: 520, okText: 'Xác nhận',
            body: g.options.map((o) => `<label class="ship-opt"><input type="radio" name="ship" value="${o.id}" ${o.id === g.ship.id ? 'checked' : ''}><div><div><b>${o.name}</b><span class="fee">${U.money(o.fee)}</span></div><div class="muted small">${etaText(o)} · ${o.note}</div></div></label>`).join(''),
            onOk: (m) => m.querySelector('[name=ship]:checked').value,
          });
          if (r) {
            st.shipChoice[g.shop.id] = r;
            draw();
          }
          return;
        }
        const sv = e.target.closest('[data-shopv]');
        if (sv) {
          const g = calc.groups.find((x) => x.shop.id === sv.dataset.shopv);
          const r = await ui.modal({
            title: `Voucher của ${U.esc(g.shop.name)}`, width: 560, okText: 'OK',
            body: `<div class="vp-scroll">${g.shop.vouchers
              .map((v) => {
                const ev = SV.vouchers.evaluate(v, g.subtotal);
                return `<label class="vp-item">${ui.voucher(v, { shop: g.shop, state: ev.ok ? 'ok' : 'disabled', reason: ev.ok ? '' : ev.reason, action: `<input type="radio" name="sv" value="${v.code}" ${st.shopVoucher[g.shop.id] === v.code ? 'checked' : ''} ${ev.ok ? '' : 'disabled'}>` })}</label>`;
              })
              .join('')}<label class="check none-opt"><input type="radio" name="sv" value="" ${st.shopVoucher[g.shop.id] ? '' : 'checked'}> Không dùng voucher của shop</label></div>`,
            onOk: (m) => {
              const c = m.querySelector('[name=sv]:checked');
              return { code: c ? c.value : '' };
            },
          });
          if (r) {
            st.shopVoucher[g.shop.id] = r.code;
            draw();
          }
          return;
        }
        const act = e.target.closest('[data-act]');
        if (!act) return;
        if (act.dataset.act === 'addr') chooseAddress();
        else if (act.dataset.act === 'voucher') {
          const r = await SV.voucherPicker(calc, { ship: true, current: st });
          if (r) {
            st.platformVoucher = SV.state.platformVoucher = r.platformVoucher;
            st.shipVoucher = SV.state.shipVoucher = r.shipVoucher;
            draw();
          }
        } else if (act.dataset.act === 'place') placeOrder();
      });

      let placing = false;
      async function placeOrder() {
        const address = st.addressId ? SV.address.get(st.addressId) : null;
        if (!address) {
          ui.toast('Vui lòng thêm địa chỉ nhận hàng', 'error');
          return chooseAddress();
        }
        if (calc && calc.groups.some((g) => g.shop.oms && !g.ship)) {
          return ui.toast('Đang tính phí vận chuyển từ kho, vui lòng đợi giây lát', 'error');
        }
        if (placing) return;
        if (st.payment === 'bank' && SV.oms.realBankConsentRequired && !st.realBankAcknowledged) {
          el.querySelector('[data-bank-error]').textContent = 'Cần đọc cảnh báo và xác nhận chuyển tiền thật trước khi đặt đơn.';
          el.querySelector('[data-bank-consent]').focus(); return;
        }
        placing = true;
        const btn = el.querySelector('[data-act=place]');
        if (btn) btn.disabled = true;
        // st.ids giữ mã đơn giữa các lần bấm lại để OMS không tạo trùng.
        st.ids = st.ids || {};
        const r = await SV.orders.place({ lines, address, notes: st.notes, payment: st.payment, realBankAcknowledged: !!st.realBankAcknowledged, ids: st.ids }, calc).finally(() => {
          placing = false;
          if (btn) btn.disabled = false;
        });
        if (!r.ok) return ui.toast(r.error, 'error');
        SV.state.platformVoucher = null;
        if (st.payment === 'bank') {
          // No self-attested bank payments: only SePay can confirm that money arrived.
          return SV.go('/payment/' + r.orders[0].id);
        }
        // COD / ví: sang trang Đặt hàng thành công (có pháo bông chúc mừng).
        SV.go('/order-success/' + r.orders.map((o) => o.id).join(','));
      }
    },
  };

  // Trang thành công tự vẽ lại khi trạng thái đơn đổi (đồng bộ OMS): hiệu ứng hiện lên chỉ chạy lần đầu, các lần sau đứng yên.
  const shown = new Set();
  const enter = (key) => (shown.has(key) ? ' is-static' : (shown.add(key), ''));

  /* ---------- Trang Đặt hàng thành công: #/order-success/:ids (các đơn tạo cùng lần đặt, cách nhau bởi dấu phẩy) ---------- */
  SV.pages.orderSuccess = {
    title: 'Đặt hàng thành công | ShopVui',
    render(el, ctx) {
      const ids = ctx.params.ids.split(',');
      const list = ids.map((id) => SV.orders.get(id)).filter(Boolean);
      if (!list.length) {
        el.innerHTML = `<div class="container">${ui.empty('🧾', 'Không tìm thấy đơn hàng', '<a class="btn btn-primary" href="#/user/purchase">Xem đơn mua</a>')}</div>`;
        return;
      }
      const o = list[0], to = o.address, pay = o.payment;
      const total = list.reduce((s, x) => s + x.amounts.total, 0);
      const paidTag = '<span class="ok-tag">Đã thanh toán</span>';
      const payLabel = pay.method === 'wallet' ? 'Ví ShopVuiPay ' + paidTag : pay.method === 'bank' ? 'Chuyển khoản ngân hàng ' + (pay.paid ? paidTag : '') : 'Thanh toán khi nhận hàng (COD)';
      const eta = o.shipping && o.shipping.etaFrom ? `${U.fmtDay(new Date(o.shipping.etaFrom))} - ${U.fmtDay(new Date(o.shipping.etaTo))}` : '';
      const row = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
      const items = list.flatMap((x) => x.items);
      el.innerHTML = `<div class="container pay-page"><section class="pay-card pay-success order-success${enter('order:' + ids.join(','))}" aria-labelledby="os-title">
        <div class="ok-halo">${SV.icon('check', 34)}</div>
        <h1 id="os-title">Đặt hàng thành công!</h1>
        <p class="muted">Cảm ơn bạn đã mua sắm tại ShopVui. ${pay.method === 'cod' ? 'Vui lòng chuẩn bị tiền mặt khi nhận hàng.' : 'Shop sẽ sớm chuẩn bị hàng cho bạn.'}</p>
        <div class="pay-total">${U.money(total)}</div>
        <dl class="pay-receipt">
          ${row(list.length > 1 ? 'Mã đơn hàng (' + list.length + ' shop)' : 'Mã đơn hàng', list.map((x) => `<b>${U.esc(x.code)}</b>`).join('<br>'))}
          ${row('Thanh toán', payLabel)}
          ${row('Giao đến', `${U.esc(to.name)} · ${U.esc(to.phone)}<small>${U.esc([to.detail, to.ward, to.province].filter(Boolean).join(', '))}</small>`)}
          ${eta ? row('Dự kiến giao', eta) : ''}
        </dl>
        <ul class="os-items" aria-label="Sản phẩm đã đặt">${items
          .map((i) => `<li>${ui.img(i.image, i.emoji, 'os-thumb', i.name)}<div class="os-name"><span>${U.esc(i.name)}</span>${i.variant ? `<small>Phân loại: ${U.esc(i.variant)}</small>` : ''}</div><span class="os-qty">x${i.qty}</span><b class="os-price">${U.money(i.price * i.qty)}</b></li>`)
          .join('')}</ul>
        <div class="pay-actions"><a class="btn" href="#/">Tiếp tục mua sắm</a><a class="btn btn-primary" href="${list.length > 1 ? '#/user/purchase' : '#/user/order/' + o.id}">Xem đơn hàng</a></div>
      </section></div>`;
      ui.confetti('order:' + ids.join(','));
    },
  };

  /* ---------- Trang thanh toán chuyển khoản: #/payment/:id ----------
     Chờ: mã VietQR + thông tin chuyển khoản thủ công (có nút sao chép), tự hỏi OMS mỗi 3 giây.
     Ngân hàng báo nhận tiền: chính trang này đổi sang biên nhận "Thanh toán thành công". */
  SV.pages.payment = {
    title: 'Thanh Toán | ShopVui',
    render(el, ctx) {
      const o = SV.orders.get(ctx.params.id);
      if (!o || !o.oms) {
        el.innerHTML = `<div class="container">${ui.empty('🧾', 'Không tìm thấy đơn cần thanh toán', '<a class="btn btn-primary" href="#/user/purchase">Xem đơn mua</a>')}</div>`;
        return;
      }
      const paidAt = (o.history.find((h) => h.code === 'PAID') || {}).at;
      if (o.payment.paid) {
        const row = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
        el.innerHTML = `<div class="container pay-page"><section class="pay-card pay-success${enter('paid:' + o.id)}" aria-labelledby="pay-ok-title">
          <div class="ok-halo">${SV.icon('check', 34)}</div>
          <h1 id="pay-ok-title">Thanh toán thành công</h1>
          <p class="muted">Cảm ơn bạn! Shop đã nhận được tiền và đang chuẩn bị hàng.</p>
          <div class="pay-total">${U.money(o.oms.paidAmount || o.amounts.total)}</div>
          <dl class="pay-receipt">
            ${row('Mã đơn hàng', `<b>${U.esc(o.code)}</b>`)}
            ${row('Shop', U.esc(o.shopName))}
            ${row('Phương thức', 'Chuyển khoản ngân hàng (MB Bank)')}
            ${paidAt ? row('Thời gian', U.fmtDate(paidAt, true)) : ''}
            ${row('Trạng thái đơn', `<span class="pay-badge">${SV.const.STATUS[o.status].label}</span>`)}
          </dl>
          <div class="pay-actions"><a class="btn" href="#/">Tiếp tục mua sắm</a><a class="btn btn-primary" href="#/user/order/${o.id}">Xem đơn hàng</a></div>
        </section></div>`;
        ui.confetti('paid:' + o.id);
        return;
      }
      if (o.status === 'CANCELLED') {
        // Quá hạn thanh toán (OMS tự hủy, hàng trả về kho) hoặc người mua đã hủy.
        el.innerHTML = `<div class="container pay-page"><section class="pay-card pay-success pay-cancelled" aria-labelledby="pay-x-title">
          <div class="x-halo">${SV.icon('close', 30)}</div>
          <h1 id="pay-x-title">Đơn hàng đã bị hủy</h1>
          <p class="muted">${U.esc(o.cancelReason || 'Đơn đã hủy.')}</p>
          <p class="muted">Bạn chưa bị trừ tiền cho đơn này. Nếu đã lỡ chuyển khoản, shop sẽ liên hệ hoàn lại.</p>
          <div class="pay-actions"><a class="btn" href="#/">Tiếp tục mua sắm</a><a class="btn btn-primary" href="#/user/order/${o.id}">Xem đơn hàng</a></div>
        </section></div>`;
        return;
      }
      if (!SV.oms.hasQr(o)) {
        el.innerHTML = `<div class="container">${ui.empty('🧾', 'Đơn này chưa có mã chuyển khoản', '<a class="btn btn-primary" href="#/user/purchase?type=unpaid">Xem đơn chờ thanh toán</a>')}</div>`;
        return;
      }
      const q = o.oms.qr;
      const copy = (label, value, shown) => `<div class="pay-row"><dt>${label}</dt><dd><span>${shown || U.esc(value)}</span><button type="button" class="pay-copy" data-copy="${U.esc(value)}" aria-label="Sao chép ${label.toLowerCase()}">Sao chép</button></dd></div>`;
      el.innerHTML = `<div class="container pay-page"><section class="pay-card" aria-labelledby="pay-title">
        <header class="pay-head"><div><h1 id="pay-title">Thanh toán đơn hàng</h1><p class="muted">Mã đơn <b>${U.esc(o.code)}</b> · ${U.esc(o.shopName)}</p></div>
          <div class="pay-head-amt"><span class="muted">Số tiền cần thanh toán</span><b>${U.money(q.amount)}</b>${q.payBy ? `<span class="pay-deadline" data-deadline>Thanh toán trước ${U.fmtDate(q.payBy, true)}</span>` : ''}</div></header>
        <p class="notice" role="note" style="overflow-wrap:anywhere">Quét mã VietQR hoặc chuyển khoản đúng số tiền và nội dung bên dưới để hệ thống tự động xác nhận ngay.${SV.oms.refundContact ? ' Hỗ trợ đối soát thanh toán: ' + U.esc(SV.oms.refundContact) + '.' : ''}</p>
        <div class="pay-body">
          <div class="pay-qr">
            <div class="pay-qr-frame"><img src="${U.esc(q.url)}" alt="Mã VietQR chuyển khoản đơn ${U.esc(o.code)}" width="240" height="240"></div>
            <p>Mở app ngân hàng bất kỳ và chọn <b>Quét mã QR</b></p>
          </div>
          <div class="pay-info">
            <h2>Hoặc chuyển khoản thủ công</h2>
            <dl>
              <div class="pay-row"><dt>Ngân hàng</dt><dd><span>${U.esc(q.bankName || 'MB Bank')}</span></dd></div>
              ${q.holder ? `<div class="pay-row"><dt>Chủ tài khoản</dt><dd><span>${U.esc(q.holder)}</span></dd></div>` : ''}
              ${q.account ? copy('Số tài khoản', q.account) : ''}
              ${copy('Số tiền', String(q.amount), `<b class="pay-amt-inline">${U.money(q.amount)}</b>`)}
              ${copy('Nội dung', q.note, `<b>${U.esc(q.note)}</b>`)}
            </dl>
            <p class="pay-warn">${SV.icon('shield', 16)}<span>Nhập <b>đúng số tiền và nội dung</b> để đơn được xác nhận tự động.</span></p>
          </div>
        </div>
        <div class="pay-status" role="status"><span class="pay-spinner" aria-hidden="true"></span><div><b>Đang chờ thanh toán</b><small>Trang tự cập nhật ngay khi ngân hàng báo đã nhận tiền.</small></div></div>
        <footer class="pay-actions"><a class="btn" href="#/user/purchase?type=unpaid">Thanh toán sau</a><button type="button" class="btn btn-primary" data-check>Kiểm tra thanh toán</button></footer>
      </section></div>`;
      el.addEventListener('click', async (e) => {
        const c = e.target.closest('[data-copy]');
        if (c) {
          try {
            await navigator.clipboard.writeText(c.dataset.copy);
            ui.toast('Đã sao chép', 'success', 1200);
          } catch (err) {
            ui.toast(c.dataset.copy, 'info', 3000);
          }
        }
        const chk = e.target.closest('[data-check]');
        if (chk) {
          chk.disabled = true;
          await SV.oms.checkNow(o);
          if (!o.payment.paid) {
            chk.disabled = false;
            ui.toast('Chưa nhận được tiền. Giao dịch có thể mất vài phút để ngân hàng báo về.', 'info', 2600);
          }
        }
      });
      // Tiền về: checkNow vẽ lại trang hiện tại, nên chính trang này chuyển sang trạng thái thành công.
      const timer = setInterval(() => document.visibilityState === 'visible' && SV.oms.checkNow(o), 3000);
      // Đồng hồ hạn thanh toán: còn mm:ss; hết giờ thì báo và hỏi OMS (OMS tự hủy đơn, trang chuyển sang "Đơn hàng đã bị hủy").
      const dl = el.querySelector('[data-deadline]');
      const tick = () => {
        if (!dl) return;
        const left = Math.max(0, new Date(q.payBy).getTime() - Date.now());
        const mm = String(Math.floor(left / 60000)).padStart(2, '0'), ss = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
        dl.textContent = left ? `Còn ${mm}:${ss} để thanh toán` : 'Đã hết hạn thanh toán';
        dl.classList.toggle('urgent', left < 5 * 60000);
      };
      tick();
      const clock = setInterval(tick, 1000);
      return () => {
        clearInterval(timer);
        clearInterval(clock);
      };
    },
  };
})();
