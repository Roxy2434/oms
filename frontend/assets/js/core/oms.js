/* =========================================================
   oms.js – Kết nối shop "EZMART" với hệ thống OMS (quản lý đơn & kho):
   - lấy giá/tồn thật, báo phí giao do OMS tính (OMS tự chọn kho, tách kiện),
   - gửi đơn sang OMS khi đặt hàng, báo thanh toán/hủy,
   - đọc trạng thái đóng gói/giao từ OMS về "Đơn Mua" của người mua.
   ========================================================= */
(function () {
  'use strict';
  const cfg = window.SV_OMS;
  const C = SV.catalog;
  const db = () => SV.db.data();

  async function call(method, action, body, query) {
    let res;
    try {
      res = await fetch(cfg.base + '/' + action + (query ? '?' + query : ''), {
        method, credentials: 'include', headers: Object.assign({ 'X-ShopVui-Key': cfg.key }, body ? { 'Content-Type': 'application/json' } : {}), body: body ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      throw new Error('Không kết nối được hệ thống quản lý đơn hàng của shop EZMART. Vui lòng thử lại sau.');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || 'EZMART chưa xử lý được yêu cầu.'), { status: res.status });
    return data;
  }

  // Vẽ lại trang đang xem, trừ trang Thanh toán (đang nhập dở; trang đó tự vẽ lại khi có báo phí).
  // Form pages show no OMS data; re-rendering them would wipe what the user is typing.
  const rerender = () => !/^#\/(checkout|login|register|user\/account)/.test(location.hash) && SV.router && SV.router.render({ keepScroll: true });
  const isOmsShop = (shop) => !!(shop && shop.oms);
  const items = (lines) => lines.map((l) => ({ sku: (l.product || C.get(l.productId)).omsSku, qty: l.qty }));
  const addr = (a) => ({ province: a.province, ward: a.ward || '', detail: a.detail });

  /* ---------- Giá & tồn thật từ OMS ---------- */
  async function refreshCatalog() {
    try {
      const { products, demoMode, bankAvailable, realBankConsentRequired, refundContact } = await call('GET', 'catalog');
      let changed = SV.oms.demoMode !== !!demoMode || SV.oms.bankAvailable !== !!bankAvailable;
      SV.oms.demoMode = !!demoMode; SV.oms.bankAvailable = !!bankAvailable;
      SV.oms.realBankConsentRequired = !!realBankConsentRequired; SV.oms.refundContact = refundContact || '';
      products.forEach((x) => {
        const p = window.SV_DATA.products.find((q) => q.omsSku === x.sku);
        if (p && (p.price !== x.price || p.stock !== x.available)) {
          Object.assign(p, { price: x.price, originalPrice: Math.max(x.price, p.demoOriginalPrice || x.price), stock: x.available });
          changed = true;
        }
      });
      if (changed) {
        C.invalidate();
        rerender();
      }
    } catch (e) {
      console.warn(e.message);
    }
  }

  /* ---------- Phí giao do OMS tính (có bộ nhớ đệm, gọi bất đồng bộ) ---------- */
  const quotes = new Map();
  let onQuote = null;
  function quoteKey(address, lines) {
    return JSON.stringify([addr(address), items(lines)]);
  }
  /** Trả về phương thức giao của OMS nếu đã có báo phí; nếu chưa thì gọi OMS và báo lại qua onQuote. */
  function shippingOption(address, lines) {
    const key = quoteKey(address, lines);
    const q = quotes.get(key);
    if (q && q.state === 'ok') return { id: 'oms', name: q.name, fee: q.fee, etaFrom: q.etaFrom, etaTo: q.etaTo, etaHours: q.etaHours, note: q.note };
    if (!q) {
      quotes.set(key, { state: 'loading' });
      call('POST', 'quote', { address: addr(address), items: items(lines) })
        .then((r) => {
          const nowMs = Date.now();
          const maxH = r.etaHours || 24;
          const minH = r.minEtaHours || maxH;
          const whs = Array.isArray(r.warehouses) && r.warehouses.length ? r.warehouses : [];
          const name = r.parcels > 1 && whs.length ? `Giao từ ${r.parcels} kho (${whs.join(', ')})` : whs[0] ? `Giao từ ${whs[0]}` : 'Giao từ kho EZMART';
          const note = r.parcels > 1 ? `Tách ${r.parcels} kiện tự động · Dự kiến hoàn tất ~${Math.ceil(maxH)} giờ` : `Xuất kho trực tiếp · Dự kiến giao ~${Math.ceil(maxH)} giờ`;
          quotes.set(key, r.ok
            ? { state: 'ok', name, fee: r.shippingFee, etaHours: maxH, etaFrom: new Date(nowMs + minH * 3600000).toISOString(), etaTo: new Date(nowMs + maxH * 3600000).toISOString(), note }
            : { state: 'error', error: (r.reasons || []).join(' ') || 'Kho chưa đủ hàng cho đơn này' });
        })
        .catch((e) => quotes.set(key, { state: 'error', error: e.message }))
        .finally(() => onQuote && onQuote());
    }
    return null;
  }
  function quoteState(address, lines) {
    return quotes.get(quoteKey(address, lines)) || { state: 'loading' };
  }

  /* ---------- Đồng bộ trạng thái từ OMS ---------- */
  let syncing = false;
  // Mã đơn + token riêng của đơn (OMS cấp khi đặt): khoá tích hợp nằm công khai trong JS nên mọi thao tác trên đơn đều kèm token này.
  const ref = (o) => ({ orderId: o.code, token: o.oms.token || '' });
  const refs = (list) => 'refs=' + encodeURIComponent(list.map((o) => o.code + ':' + (o.oms.token || '')).join(','));
  // Persist the high-entropy recovery secret BEFORE the first request, so a lost response can be retried safely.
  // Never manufacture a new secret when recovering an old order; order facts are not ownership proof.
  function recoveryKey(orderId, create) {
    const key = 'shopvui_oms_recovery_v1:' + orderId;
    let value = localStorage.getItem(key);
    if (!value && create) { value = crypto.randomUUID() + crypto.randomUUID(); localStorage.setItem(key, value); }
    return value || undefined;
  }
  const placeBody = (o) => ({ orderId: o.code, name: o.address.name, phone: o.address.phone, address: addr(o.address), items: items(o.items), payment: o.payment.method, realBankAcknowledged: !!o.payment.realBankAcknowledged, token: o.oms && o.oms.token, recoveryKey: recoveryKey(o.code, false) });
  /** Missing tokens require the secret saved by THIS browser when placing; old secretless orders need staff assistance. */
  async function recoverTokens(list) {
    let changed = false;
    for (const o of list.filter((x) => !x.oms.token)) {
      try {
        o.oms.token = (await call('POST', 'orders', Object.assign({ replayOnly: true }, placeBody(o)))).token;
        changed = true;
      } catch (e) {
        if (e.status === 404) o.oms.gone = true; // OMS trả lời rõ là không có đơn này (không phải lỗi mạng)
        else console.warn('Chưa lấy được token đơn ' + o.code + ': ' + e.message);
      }
    }
    if (changed) SV.db.save();
  }

  async function syncStatuses() {
    if (syncing || !db()) return;
    // Đơn đang trả hàng vẫn theo dõi cho tới khi hồ sơ RMA bên OMS đóng hoặc bị từ chối.
    // Theo dõi tới khi xong hẳn: đơn đang trả hàng, đơn còn kiện chuyển hoàn chưa xử lý tiền, và đơn bị hủy do chuyển hoàn (để sửa nếu thực ra chỉ một phần).
    // Đơn đã trả tiền rồi bị hủy: theo dõi tới khi OMS hoàn đủ (ví được cộng ở applyOms).
    const owed = (o) => o.status === 'CANCELLED' && o.payment.paid && (o.oms.refunded || 0) < (o.oms.paidAmount || o.amounts.total);
    const open = db().orders.filter((o) => o.oms && (o.status === 'RETURN' ? !(o.oms.rma && ['closed', 'rejected'].includes(o.oms.rma.stage)) : !['COMPLETED', 'CANCELLED'].includes(o.status) || o.oms.rtsOpen || owed(o) || (o.status === 'COMPLETED' && !o.oms.deliveredItems) || (o.status === 'CANCELLED' && o.oms.stage === 'returned' && o.oms.rtsOpen !== false)));
    if (!open.length) return;
    syncing = true;
    try {
      await recoverTokens(open);
      const { orders } = await call('GET', 'status', null, refs(open));
      if (orders.some((s) => SV.orders.applyOms(s))) {
        SV.db.save();
        ['orders', 'notify'].forEach((e) => SV.emit(e));
        rerender();
      }
    } catch (e) {
      console.warn(e.message);
    } finally {
      syncing = false;
    }
  }

  SV.oms = {
    demoMode: false,
    bankAvailable: false,
    isOmsShop,
    isOrder: (o) => !!(o && o.oms),
    shippingOption,
    quoteState,
    setOnQuote: (fn) => (onQuote = fn),
    refreshCatalog,
    syncStatuses,
    place: (o) => { recoveryKey(o.code, true); return call('POST', 'orders', placeBody(o)); },
    pay: (o) => call('POST', 'pay', ref(o)),
    cancel: (o, reason) => call('POST', 'cancel', Object.assign(ref(o), { reason })).then((r) => {
      if (r.accountState && SV.account) { SV.account.hydrate(r.accountState); ['orders', 'wallet', 'auth'].forEach((e) => SV.emit(e)); }
      return r;
    }),
    requestReturn: (o, reason, extra) => call('POST', 'return', Object.assign(ref(o), { reason }, extra || {})),
    hasQr: (o) => !!(o && o.oms && o.oms.qr),
    checkNow,
  };

  /* ---------- Chuyển khoản thật (OMS bật SePay) — trang #/payment/:id dùng các hàm này ---------- */
  const U = SV.U;
  /** Hỏi OMS trạng thái một đơn ngay (không chờ lượt đồng bộ 10 giây). */
  async function checkNow(o) {
    try {
      await recoverTokens([o]);
      const { orders } = await call('GET', 'status', null, refs([o]));
      if (orders.some((s) => SV.orders.applyOms(s))) {
        SV.db.save();
        ['orders', 'notify'].forEach((e) => SV.emit(e));
        rerender();
      }
    } catch (e) {
      console.warn(e.message);
    }
  }

  // Tiền về khi người mua đang ở trang khác: báo bằng hộp thông báo, mở trang thanh toán thành công nếu muốn xem.
  // (Đang ở chính trang thanh toán của đơn đó thì trang tự đổi sang trạng thái thành công.)
  SV.on('paid', (o) => {
    if (location.hash.startsWith('#/payment/' + o.id)) return;
    SV.ui
      .success({
        title: 'Thanh toán thành công!', sub: 'Shop đã nhận được tiền chuyển khoản của bạn và đang chuẩn bị hàng.',
        amountLabel: 'Số tiền đã nhận', amount: U.money(o.oms.paidAmount || o.amounts.total), okText: 'Xem chi tiết', cancelText: 'Đóng',
        rows: [
          ['Mã đơn hàng', `<b>${U.esc(o.code)}</b>`],
          ['Phương thức', 'Chuyển khoản MB Bank'],
          ['Thời gian', U.fmtDate(new Date().toISOString(), true)],
        ],
      })
      .then((ok) => ok && SV.go('/payment/' + o.id));
  });

  // Mở trang: lấy giá/tồn thật; sau đó cứ 10 giây đọc trạng thái đơn từ OMS khi tab đang mở.
  /** Mỗi lần mở trang: hỏi OMS về MỌI đơn OMS đang lưu trong trình duyệt (kể cả đơn đã xong) và bỏ những đơn OMS trả lời là không có
   * (vd. OMS vừa dựng lại dữ liệu). Chỉ bỏ khi OMS trả lời được; lỗi mạng / OMS tắt thì giữ nguyên. */
  async function pruneMissing() {
    const d = db();
    const mine = d ? d.orders.filter((o) => o.oms) : [];
    if (!mine.length) return;
    try {
      await recoverTokens(mine);
      const gone = new Set(mine.filter((o) => o.oms.gone).map((o) => o.code));
      const withToken = mine.filter((o) => o.oms.token && !o.oms.gone);
      for (let i = 0; i < withToken.length; i += 100) (await call('GET', 'status', null, refs(withToken.slice(i, i + 100)))).missing?.forEach((ref) => gone.add(ref));
      if (!gone.size) return;
      const ids = new Set(mine.filter((o) => gone.has(o.code)).map((o) => o.id));
      d.orders = d.orders.filter((o) => !ids.has(o.id));
      d.notifications = d.notifications.filter((n) => !(n.link && [...ids].some((id) => n.link === '#/user/order/' + id)));
      SV.db.save();
      ['orders', 'notify'].forEach((e) => SV.emit(e));
      rerender();
      console.info('ShopVui: bỏ ' + ids.size + ' đơn không còn trên EZMART');
    } catch (e) {
      console.warn('Chưa kiểm tra được đơn với EZMART: ' + e.message);
    }
  }

  refreshCatalog();
  setTimeout(() => pruneMissing().then(syncStatuses), 800);
  // Có đơn đang chờ chuyển khoản thì hỏi mỗi 3 giây để báo "đã thanh toán" nhanh; bình thường 10 giây.
  let tick = 0;
  setInterval(() => {
    tick++;
    const waiting = db() && db().orders.some((o) => o.status === 'UNPAID' && o.oms && o.oms.qr);
    if (document.visibilityState === 'visible' && tick % (waiting ? 3 : 10) === 0) syncStatuses();
  }, 1000);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && (syncStatuses(), refreshCatalog()));
})();
