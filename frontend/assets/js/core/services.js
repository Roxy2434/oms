/* =========================================================
   services.js – Tầng nghiệp vụ (business logic):
   Tài khoản, Địa chỉ, Giỏ hàng, Voucher, Tính tiền thanh toán, Đơn hàng,
   Đánh giá, Yêu thích, Theo dõi shop, Thông báo, Chat, Kênh người bán.
   Giao diện (pages) chỉ gọi các hàm ở đây, không sửa trực tiếp db.
   ========================================================= */
(function () {
  'use strict';
  const U = SV.U;
  const C = SV.catalog;
  const db = () => SV.db.data();
  const save = (events) => {
    SV.db.save();
    [].concat(events || []).forEach((e) => SV.emit(e));
  };
  const uid = () => db().session;
  const now = () => new Date().toISOString();

  /* ============================ Hằng số nghiệp vụ ============================ */
  // 34 tỉnh/thành sau sắp xếp đơn vị hành chính (hiệu lực từ 01/07/2025)
  const PROVINCES = ['TP. Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Huế', 'An Giang', 'Bắc Ninh', 'Cà Mau', 'Cao Bằng', 'Đắk Lắk', 'Điện Biên', 'Đồng Nai', 'Đồng Tháp', 'Gia Lai', 'Hà Tĩnh', 'Hưng Yên', 'Khánh Hòa', 'Lai Châu', 'Lâm Đồng', 'Lạng Sơn', 'Lào Cai', 'Nghệ An', 'Ninh Bình', 'Phú Thọ', 'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị', 'Sơn La', 'Tây Ninh', 'Thái Nguyên', 'Thanh Hóa', 'Tuyên Quang', 'Vĩnh Long'];
  const NORTH = ['Hà Nội', 'Hải Phòng', 'Bắc Ninh', 'Cao Bằng', 'Điện Biên', 'Hưng Yên', 'Lai Châu', 'Lạng Sơn', 'Lào Cai', 'Ninh Bình', 'Phú Thọ', 'Quảng Ninh', 'Sơn La', 'Thái Nguyên', 'Tuyên Quang'];
  const CENTRAL = ['Đà Nẵng', 'Huế', 'Hà Tĩnh', 'Nghệ An', 'Thanh Hóa', 'Quảng Trị', 'Quảng Ngãi', 'Gia Lai', 'Khánh Hòa', 'Đắk Lắk', 'Lâm Đồng'];
  const region = (prov) => (NORTH.includes(prov) ? 'N' : CENTRAL.includes(prov) ? 'C' : 'S');

  const PAYMENTS = [
    { id: 'cod', label: 'Thanh toán khi nhận hàng (COD)', desc: 'Thanh toán bằng tiền mặt cho nhân viên giao hàng khi kiểm tra và nhận kiện hàng.' },
    { id: 'wallet', label: 'Ví ShopVuiPay', desc: 'Thanh toán tức thì từ số dư Ví ShopVuiPay. Hoàn tiền tự động về ví khi hủy đơn hoặc trả hàng.' },
    { id: 'bank', label: 'Chuyển khoản ngân hàng (VietQR)', desc: 'Quét mã VietQR chuyển khoản nhanh 24/7. Hệ thống tự động xác nhận ngay khi nhận được thanh toán.' },
  ];

  const VOUCHERS = [
    { code: 'FREESHIP30', kind: 'ship', type: 'fixed', value: 30000, minSpend: 0, label: 'Miễn Phí Vận Chuyển', desc: 'Giảm tối đa ₫30k phí vận chuyển · Đơn từ ₫0', expires: '2026-11-30' },
    { code: 'FREESHIPXTRA', kind: 'ship', type: 'fixed', value: 70000, minSpend: 300000, label: 'Freeship Xtra', desc: 'Giảm tối đa ₫70k phí vận chuyển · Đơn từ ₫300k', expires: '2026-11-15' },
    { code: 'SVNEW30K', kind: 'discount', type: 'fixed', value: 30000, minSpend: 99000, newUserOnly: true, label: 'Bạn Mới', desc: 'Giảm ₫30k cho đơn hàng đầu tiên từ ₫99k', expires: '2026-12-31' },
    { code: 'SALE1111', kind: 'discount', type: 'percent', value: 11, maxDiscount: 111000, minSpend: 300000, label: '11.11 Siêu Sale', desc: 'Giảm 11% tối đa ₫111k · Đơn từ ₫300k', expires: '2026-11-11' },
    { code: 'SV100K', kind: 'discount', type: 'fixed', value: 100000, minSpend: 1000000, label: 'Voucher Xtra', desc: 'Giảm ₫100k · Đơn từ ₫1tr', expires: '2026-11-30' },
    { code: 'MALL12', kind: 'discount', type: 'percent', value: 12, maxDiscount: 500000, minSpend: 2000000, mallOnly: true, label: 'ShopVui Mall', desc: 'Giảm 12% tối đa ₫500k cho sản phẩm Mall · Đơn từ ₫2tr', expires: '2026-11-30' },
  ];

  const STATUS = {
    UNPAID: { label: 'Chờ thanh toán', tab: 'unpaid', color: 'orange' },
    TO_SHIP: { label: 'Chờ xác nhận', tab: 'toship', color: 'blue' },
    SHIPPING: { label: 'Đang giao', tab: 'shipping', color: 'blue' },
    COMPLETED: { label: 'Hoàn thành', tab: 'completed', color: 'green' },
    CANCELLED: { label: 'Đã hủy', tab: 'cancelled', color: 'red' },
    RETURN: { label: 'Trả hàng/Hoàn tiền', tab: 'return', color: 'gray' },
  };

  SV.const = { PROVINCES, PAYMENTS, VOUCHERS, STATUS };

  /* ================================ Tài khoản ================================ */
  const RE_USER = /^[a-zA-Z0-9_.]{4,20}$/;
  const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const RE_PHONE = /^(0|\+84)(3|5|7|8|9)\d{8}$/;
  const RE_PASS = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,16}$/;

  SV.auth = {
    rules: { RE_USER, RE_EMAIL, RE_PHONE, RE_PASS },
    current() {
      const d = db();
      return d.session ? d.users.find((u) => u.id === d.session) || null : null;
    },
    login(identifier, password) {
      const key = String(identifier || '').trim().toLowerCase();
      if (!key || !password) return { ok: false, error: 'Vui lòng nhập đầy đủ thông tin đăng nhập' };
      const u = db().users.find((x) => [x.username, x.email, x.phone].filter(Boolean).some((v) => v.toLowerCase() === key));
      if (!u || u.password !== U.hashPassword(password)) return { ok: false, error: 'Tên tài khoản hoặc mật khẩu không đúng, vui lòng thử lại' };
      db().session = u.id;
      save('auth');
      return { ok: true, user: u };
    },
    register({ username, contact, password }) {
      const d = db();
      username = String(username || '').trim();
      contact = String(contact || '').trim();
      if (!RE_USER.test(username)) return { ok: false, field: 'username', error: 'Tên đăng nhập gồm 4–20 ký tự: chữ, số, dấu _ hoặc .' };
      const isEmail = contact.includes('@');
      if (isEmail ? !RE_EMAIL.test(contact) : !RE_PHONE.test(contact)) return { ok: false, field: 'contact', error: 'Email hoặc số điện thoại không hợp lệ' };
      if (!RE_PASS.test(password || '')) return { ok: false, field: 'password', error: 'Mật khẩu 8–16 ký tự, gồm chữ hoa, chữ thường và số' };
      const lower = (s) => (s || '').toLowerCase();
      if (d.users.some((x) => lower(x.username) === lower(username))) return { ok: false, field: 'username', error: 'Tên đăng nhập đã tồn tại' };
      if (d.users.some((x) => lower(x.email) === lower(contact) || x.phone === contact)) return { ok: false, field: 'contact', error: 'Email/Số điện thoại đã được đăng ký' };
      const u = { id: SV.db.nextId('u'), username, email: isEmail ? contact : '', phone: isEmail ? '' : contact, password: U.hashPassword(password), name: username, gender: '', birthday: '', createdAt: now() };
      d.users.push(u);
      d.session = u.id;
      SV.notify.add(u.id, { type: 'system', title: 'Chào mừng bạn đến với ShopVui! 🎉', body: 'Voucher Bạn Mới giảm ₫30k đã được thêm vào Kho Voucher. Mua sắm ngay thôi!', link: '#/user/vouchers' });
      save(['auth', 'notify']);
      return { ok: true, user: u };
    },
    logout() {
      db().session = null;
      save('auth');
    },
    updateProfile(data) {
      const u = this.current();
      if (!u) return { ok: false };
      if (data.email && !RE_EMAIL.test(data.email)) return { ok: false, error: 'Email không hợp lệ' };
      if (data.phone && !RE_PHONE.test(data.phone)) return { ok: false, error: 'Số điện thoại không hợp lệ' };
      Object.assign(u, { name: data.name, email: data.email, phone: data.phone, gender: data.gender, birthday: data.birthday });
      save('auth');
      return { ok: true };
    },
    changePassword(oldPw, newPw) {
      const u = this.current();
      if (!u || u.password !== U.hashPassword(oldPw)) return { ok: false, field: 'old', error: 'Mật khẩu hiện tại không đúng' };
      if (!RE_PASS.test(newPw)) return { ok: false, field: 'new', error: 'Mật khẩu 8–16 ký tự, gồm chữ hoa, chữ thường và số' };
      u.password = U.hashPassword(newPw);
      save();
      return { ok: true };
    },
  };

  /* ================================ Địa chỉ ================================ */
  SV.address = {
    list: () => db().addresses.filter((a) => a.userId === uid()).sort((a, b) => b.isDefault - a.isDefault),
    get: (id) => db().addresses.find((a) => a.id === id && a.userId === uid()),
    getDefault() {
      const l = this.list();
      return l.find((a) => a.isDefault) || l[0] || null;
    },
    text: (a) => (a ? [a.detail, a.ward, a.province].filter(Boolean).join(', ') : ''),
    save(a) {
      if (!a.name || a.name.trim().length < 2) return { ok: false, field: 'name', error: 'Vui lòng nhập họ và tên' };
      if (!RE_PHONE.test(a.phone || '')) return { ok: false, field: 'phone', error: 'Số điện thoại không hợp lệ' };
      if (!PROVINCES.includes(a.province)) return { ok: false, field: 'province', error: 'Vui lòng chọn Tỉnh/Thành phố' };
      if (!a.ward || !a.ward.trim()) return { ok: false, field: 'ward', error: 'Vui lòng nhập Phường/Xã' };
      if (!a.detail || a.detail.trim().length < 3) return { ok: false, field: 'detail', error: 'Vui lòng nhập địa chỉ cụ thể' };
      const d = db();
      const mine = this.list();
      let rec = a.id && this.get(a.id);
      if (!rec) {
        rec = { id: SV.db.nextId('a'), userId: uid() };
        d.addresses.push(rec);
      }
      Object.assign(rec, { name: a.name.trim(), phone: a.phone.trim(), province: a.province, ward: a.ward.trim(), detail: a.detail.trim(), type: a.type || 'home', isDefault: !!a.isDefault || mine.length === 0 });
      if (rec.isDefault) d.addresses.forEach((x) => x.userId === uid() && x.id !== rec.id && (x.isDefault = false));
      save('address');
      return { ok: true, address: rec };
    },
    remove(id) {
      const d = db();
      const a = this.get(id);
      if (!a) return;
      d.addresses = d.addresses.filter((x) => x.id !== id);
      if (a.isDefault) {
        const first = d.addresses.find((x) => x.userId === uid());
        if (first) first.isDefault = true;
      }
      save('address');
    },
    setDefault(id) {
      db().addresses.forEach((x) => x.userId === uid() && (x.isDefault = x.id === id));
      save('address');
    },
  };

  /* ================================ Giỏ hàng ================================ */
  function enrich(line) {
    const p = C.get(line.productId);
    const available = !!p && !p.hidden && p.stock > 0;
    return Object.assign({}, line, {
      product: p,
      available,
      unit: p ? C.unitPrice(p, line.variant) : 0,
      unitOriginal: p ? C.unitOriginal(p, line.variant) : 0,
    });
  }
  SV.cart = {
    lines: () =>
      db()
        .cart.filter((c) => c.userId === uid())
        .sort((a, b) => (a.addedAt < b.addedAt ? 1 : -1))
        .map(enrich),
    count() {
      return uid() ? db().cart.filter((c) => c.userId === uid()).length : 0;
    },
    selected() {
      return this.lines().filter((l) => l.selected && l.available);
    },
    add(productId, variant, qty, opts) {
      if (!uid()) return { ok: false, error: 'login' };
      const p = C.get(productId);
      if (!p || p.hidden) return { ok: false, error: 'Sản phẩm không tồn tại' };
      if (!p.omsSku) return { ok: false, error: 'Gian hàng này tạm ngừng nhận đơn mới. Mời bạn chọn sản phẩm tại EZMART Official Store.' };
      if ((p.variants || []).length && C.parseVariant(variant).length !== p.variants.length) return { ok: false, error: 'Vui lòng chọn Phân loại hàng' };
      qty = Math.max(1, parseInt(qty, 10) || 1);
      const d = db();
      let line = d.cart.find((c) => c.userId === uid() && c.productId === productId && c.variant === (variant || ''));
      const buyNow = !!(opts && opts.buyNow);
      // Mua Ngay buys exactly the quantity just chosen; only "Thêm vào giỏ" accumulates onto what is already in the cart.
      const current = line && !buyNow ? line.qty : 0;
      if (current + qty > p.stock) return { ok: false, error: `Số lượng bạn chọn đã đạt mức tối đa của sản phẩm này (còn ${p.stock})` };
      if (line) {
        line.qty = current + qty;
        line.addedAt = now();
      } else {
        line = { id: SV.db.nextId('c'), userId: uid(), productId, variant: variant || '', qty, selected: false, addedAt: now() };
        d.cart.push(line);
      }
      if (opts && opts.buyNow) d.cart.forEach((c) => c.userId === uid() && (c.selected = c.id === line.id));
      save('cart');
      return { ok: true, line };
    },
    update(id, patch) {
      const line = db().cart.find((c) => c.id === id && c.userId === uid());
      if (!line) return { ok: false };
      const p = C.get(line.productId);
      if (patch.qty !== undefined) line.qty = Math.max(1, Math.min(p ? p.stock : 1, parseInt(patch.qty, 10) || 1));
      if (patch.variant !== undefined) {
        const dup = db().cart.find((c) => c.userId === uid() && c.id !== id && c.productId === line.productId && c.variant === patch.variant);
        if (dup) {
          dup.qty = Math.min(p.stock, dup.qty + line.qty);
          db().cart = db().cart.filter((c) => c.id !== id);
        } else line.variant = patch.variant;
      }
      if (patch.selected !== undefined) line.selected = !!patch.selected;
      save('cart');
      return { ok: true };
    },
    setSelected(ids, value) {
      const set = new Set(ids);
      db().cart.forEach((c) => c.userId === uid() && set.has(c.id) && (c.selected = !!value));
      save('cart');
    },
    remove(ids) {
      const set = new Set([].concat(ids));
      db().cart = db().cart.filter((c) => !(c.userId === uid() && set.has(c.id)));
      save('cart');
    },
  };

  /* ================================ Voucher ================================ */
  function evalVoucher(v, amount, ctx) {
    ctx = ctx || {};
    if (v.mallOnly && !ctx.hasMall) return { ok: false, reason: 'Chỉ áp dụng cho sản phẩm ShopVui Mall' };
    if (v.newUserOnly && ctx.hasOrders) return { ok: false, reason: 'Chỉ áp dụng cho đơn hàng đầu tiên' };
    if (amount < v.minSpend) return { ok: false, reason: `Mua thêm ${U.money(v.minSpend - amount)} để sử dụng` };
    let d = v.type === 'percent' ? Math.floor((amount * v.value) / 100 / 1000) * 1000 : v.value;
    if (v.maxDiscount) d = Math.min(d, v.maxDiscount);
    return { ok: true, discount: Math.min(d, amount) };
  }
  SV.vouchers = {
    platform: () => VOUCHERS,
    get: (code) => VOUCHERS.find((v) => v.code === code),
    evaluate: evalVoucher,
    isSaved: (code) => db().savedVouchers.some((s) => s.userId === uid() && s.code === code),
    saveCode(code) {
      if (!uid()) return { ok: false, error: 'login' };
      if (!this.isSaved(code)) db().savedVouchers.push({ userId: uid(), code, savedAt: now() });
      save('voucher');
      return { ok: true };
    },
    savedShopVouchers() {
      const codes = new Set(db().savedVouchers.filter((s) => s.userId === uid()).map((s) => s.code));
      const out = [];
      C.shops().forEach((s) => s.vouchers.forEach((v) => codes.has(v.code) && out.push(Object.assign({ shop: s }, v))));
      return out;
    },
  };

  /* ============================ Tính tiền thanh toán ============================ */
  SV.checkout = {
    /** Phương thức vận chuyển & phí theo vị trí shop – địa chỉ nhận hàng */
    shippingOptions(shop, address, qty) {
      const foreign = shop.location === 'Nước ngoài';
      const same = !foreign && address && shop.location === address.province;
      const near = !foreign && address && region(shop.location) === region(address.province);
      const extra = Math.max(0, (qty || 1) - 1) * 2000;
      const base = foreign ? 45000 : same ? 15000 : near ? 22000 : 32000;
      const eta = foreign ? [7, 12] : same ? [1, 2] : near ? [2, 3] : [3, 5];
      const today = new Date();
      const opt = (id, name, fee, e, note) => ({ id, name, fee, etaFrom: U.addDays(today, e[0]).toISOString(), etaTo: U.addDays(today, e[1]).toISOString(), note });
      const list = [opt('fast', 'Nhanh', base + extra, eta, 'Đảm bảo nhận hàng đúng hẹn')];
      if (same) list.push(opt('express', 'Hỏa Tốc', 45000 + extra, [0, 0], 'Nhận hàng trong 2 giờ'));
      list.push(opt('saving', 'Tiết Kiệm', Math.max(10000, base - 4000 + extra), [eta[0] + 2, eta[1] + 3], 'Phí thấp hơn, giao chậm hơn'));
      return list;
    },
    /**
     * st = { lines, address, shipChoice:{shopId:id}, shopVoucher:{shopId:code}, platformVoucher, shipVoucher }
     * Kết quả: từng nhóm shop (mỗi nhóm sẽ thành 1 đơn hàng) + tổng cộng.
     */
    calc(st) {
      const map = new Map();
      st.lines.forEach((l) => {
        if (!map.has(l.product.shopId)) map.set(l.product.shopId, []);
        map.get(l.product.shopId).push(l);
      });
      const groups = [];
      map.forEach((lines, shopId) => {
        const shop = C.shop(shopId);
        const qty = lines.reduce((s, l) => s + l.qty, 0);
        const subtotal = lines.reduce((s, l) => s + l.unit * l.qty, 0);
        const original = lines.reduce((s, l) => s + l.unitOriginal * l.qty, 0);
        // Shop OMS: phí giao do OMS tính (chọn kho gần nhất, tách kiện); chưa có báo phí thì để trống.
        const options = !st.address ? [] : shop.oms ? [SV.oms.shippingOption(st.address, lines)].filter(Boolean) : this.shippingOptions(shop, st.address, qty);
        const ship = options.find((o) => o.id === (st.shipChoice || {})[shopId]) || options[0] || null;
        let shopVoucher = null, shopDiscount = 0;
        const code = (st.shopVoucher || {})[shopId];
        const v = code && shop.vouchers.find((x) => x.code === code);
        if (v) {
          const ev = evalVoucher(v, subtotal);
          if (ev.ok) {
            shopVoucher = v;
            shopDiscount = ev.discount;
          }
        }
        groups.push({ shop, lines, qty, subtotal, original, options, ship, shipFee: ship ? ship.fee : 0, shopVoucher, shopDiscount });
      });
      const net = (g) => g.subtotal - g.shopDiscount;
      const merch = groups.reduce((s, g) => s + net(g), 0);
      // Voucher sàn/freeship không áp cho shop OMS: OMS thu đúng giá hàng + phí giao do OMS tính.
      const promo = groups.filter((g) => !g.shop.oms);
      const promoMerch = promo.reduce((s, g) => s + net(g), 0);
      const promoShipping = promo.reduce((s, g) => s + g.shipFee, 0);
      const mallMerch = groups.filter((g) => g.shop.isMall).reduce((s, g) => s + net(g), 0);
      const shippingTotal = groups.reduce((s, g) => s + g.shipFee, 0);
      const ctx = { hasMall: mallMerch > 0, hasOrders: db().orders.some((o) => o.userId === uid()) };

      let platformVoucher = null, platformDiscount = 0;
      const pv = st.platformVoucher && SV.vouchers.get(st.platformVoucher);
      if (pv) {
        const ev = evalVoucher(pv, pv.mallOnly ? mallMerch : promoMerch, ctx);
        if (ev.ok) {
          platformVoucher = pv;
          platformDiscount = ev.discount;
        }
      }
      let shipVoucher = null, shipDiscount = 0;
      const sv = st.shipVoucher && SV.vouchers.get(st.shipVoucher);
      if (sv && st.address && evalVoucher(sv, promoMerch, ctx).ok) {
        shipVoucher = sv;
        shipDiscount = Math.min(sv.value, promoShipping);
      }
      // Chia phần giảm giá của sàn cho từng đơn theo tỉ lệ
      distribute(groups, platformDiscount, (g) => (g.shop.oms || (platformVoucher && platformVoucher.mallOnly && !g.shop.isMall) ? 0 : net(g)), 'platformShare');
      distribute(groups, shipDiscount, (g) => (g.shop.oms ? 0 : g.shipFee), 'shipDiscountShare');
      groups.forEach((g) => (g.total = net(g) - g.platformShare + g.shipFee - g.shipDiscountShare));

      const subtotal = groups.reduce((s, g) => s + g.subtotal, 0);
      const shopDiscountTotal = groups.reduce((s, g) => s + g.shopDiscount, 0);
      const productSaving = groups.reduce((s, g) => s + (g.original - g.subtotal), 0);
      return {
        groups, ctx, subtotal, shopDiscountTotal, shippingTotal, platformDiscount, shipDiscount,
        platformVoucher, shipVoucher,
        total: merch - platformDiscount + shippingTotal - shipDiscount,
        savings: productSaving + shopDiscountTotal + platformDiscount + shipDiscount,
        qty: groups.reduce((s, g) => s + g.qty, 0),
      };
    },
  };
  function distribute(groups, amount, weightFn, key) {
    const w = groups.map(weightFn);
    const W = w.reduce((a, b) => a + b, 0);
    groups.forEach((g) => (g[key] = 0));
    if (!amount || !W) return;
    const unit = amount % 1000 === 0 ? 1000 : 1; // chia theo bội số ₫1.000
    let left = amount;
    groups.forEach((g, i) => {
      g[key] = Math.floor((amount * w[i]) / W / unit) * unit;
      left -= g[key];
    });
    groups[w.indexOf(Math.max(...w))][key] += left;
  }

  /* ================================ Đơn hàng ================================ */
  // Mã tham chiếu gửi OMS: ngẫu nhiên, không trùng giữa các trình duyệt (id đơn ShopVui chỉ là bộ đếm cục bộ).
  // Mã đơn của shop OMS do ShopVui đặt ngay khi bấm Đặt hàng, đúng định dạng OMS (DH-YYMMDD-XXXXXX, ngày giờ Việt Nam).
  // OMS dùng chính mã này làm mã đơn: khách, nhân viên và hai hệ thống chỉ có một mã; mã có trước khi gửi nên gửi lại không tạo trùng.
  const omsOrderCode = () => {
    const hex = Array.from(crypto.getRandomValues(new Uint8Array(3)), (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    return 'DH-' + new Date(Date.now() + 7 * 3600000).toISOString().slice(2, 10).replaceAll('-', '') + '-' + hex;
  };
  function adjustStock(pid, delta) {
    const p = C.get(pid);
    if (!p || p.omsSku) return; // tồn hàng shop OMS do OMS quản lý
    const patches = db().productPatches;
    patches[pid] = Object.assign({}, patches[pid], { stock: Math.max(0, p.stock + delta) });
  }
  function addHistory(o, code, text, at) {
    o.history.push({ code, text, at: at || now() });
  }
  function orderNotify(o, title, body) {
    SV.notify.add(o.userId, { type: 'order', title, body, link: '#/user/order/' + o.id, image: o.items[0].image, emoji: o.items[0].emoji });
  }

  /* ============================ Ví ShopVuiPay (mô phỏng) ============================
     Sổ giao dịch walletTx: OPEN (+, số dư có sẵn khi mở ví), PAY (−, trả đơn), REFUND (+, tiền shop/OMS hoàn).
     Số dư luôn tính lại từ sổ, không lưu riêng, nên không thể lệch với lịch sử. Không có nạp tiền. */
  const OPENING = 6000000;
  /** Sổ của một người dùng; lần đầu chạm tới thì mở ví với số dư có sẵn (tài khoản cũ lẫn mới đều có). */
  const walletTx = (userId) => {
    const all = (db().walletTx = db().walletTx || []);
    if (userId && !all.some((t) => t.userId === userId && t.type === 'OPEN')) {
      all.push({ id: SV.db.nextId('w'), userId, type: 'OPEN', amount: OPENING, note: 'Ưu đãi mở Ví ShopVuiPay cho thành viên mới', at: now() });
      SV.db.save();
    }
    return all;
  };
  SV.wallet = {
    OPENING,
    list: (userId = uid()) => walletTx(userId).filter((t) => t.userId === userId).sort((a, b) => (a.at < b.at ? 1 : -1)),
    balance: (userId = uid()) => walletTx(userId).reduce((s, t) => s + (t.userId === userId ? t.amount : 0), 0),
    /** Tổng đã hoàn về ví cho một đơn. */
    refundedFor: (orderId) => walletTx().reduce((s, t) => s + (t.type === 'REFUND' && t.orderId === orderId ? t.amount : 0), 0),
    /** Đưa số tiền đã hoàn của đơn lên đúng `total` (chỉ cộng phần chênh): gọi lại nhiều lần không cộng hai lần. Trả về số vừa cộng. */
    refundTo(o, total, note) {
      const add = Math.round(total) - this.refundedFor(o.id);
      if (!(add > 0)) return 0;
      walletTx(o.userId).push({ id: SV.db.nextId('w'), userId: o.userId, type: 'REFUND', amount: add, orderId: o.id, note: note + ' · Đơn ' + o.code, at: now() });
      SV.notify.add(o.userId, { type: 'wallet', title: 'Ví ShopVuiPay +' + U.money(add), body: `Đã hoàn ${U.money(add)} của đơn ${o.code} về Ví ShopVuiPay. Số dư: ${U.money(this.balance(o.userId))}.`, link: '#/user/wallet', image: o.items[0].image, emoji: o.items[0].emoji });
      return add;
    },
  };

  SV.orders = {
    TABS: [
      ['all', 'Tất cả'],
      ['unpaid', 'Chờ thanh toán'],
      ['toship', 'Vận chuyển'],
      ['shipping', 'Chờ giao hàng'],
      ['completed', 'Hoàn thành'],
      ['cancelled', 'Đã hủy'],
      ['return', 'Trả hàng/Hoàn tiền'],
    ],
    statusText(o) {
      if (o.status === 'TO_SHIP') return o.confirmed ? 'Chờ lấy hàng' : 'Chờ xác nhận';
      if (o.status === 'RETURN') return o.refunded ? 'Đã hoàn tiền' : 'Trả hàng/Hoàn tiền';
      return STATUS[o.status].label;
    },
    lastEvent: (o) => o.history[o.history.length - 1],
    list({ userId, shopId, tab, q } = {}) {
      let l = db().orders.slice();
      if (userId) l = l.filter((o) => o.userId === userId);
      if (shopId) l = l.filter((o) => o.shopId === shopId);
      if (tab && tab !== 'all') l = l.filter((o) => STATUS[o.status].tab === tab);
      if (q) {
        const n = U.normalize(q);
        l = l.filter((o) => U.normalize([o.code, o.shopName].concat(o.items.map((i) => i.name)).join(' ')).includes(n));
      }
      return l.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    },
    get: (id) => db().orders.find((o) => o.id === id),
    countByTab(userId) {
      const c = {};
      db().orders.filter((o) => o.userId === userId).forEach((o) => (c[STATUS[o.status].tab] = (c[STATUS[o.status].tab] || 0) + 1));
      return c;
    },

    /** Đặt hàng: tách thành 1 đơn cho mỗi shop */
    async place(st, calc) {
      const d = db();
      if (!st.address) return { ok: false, error: 'Vui lòng thêm địa chỉ nhận hàng' };
      if (!calc.groups.length) return { ok: false, error: 'Không có sản phẩm nào để thanh toán' };
      for (const g of calc.groups)
        for (const l of g.lines) {
          const p = C.get(l.productId);
          if (!p || p.hidden || p.stock < l.qty) return { ok: false, error: `Sản phẩm "${l.product.name}" không đủ hàng` };
        }
      for (const g of calc.groups)
        if (g.shop.oms && !g.ship) {
          const q = SV.oms.quoteState(st.address, g.lines);
          return { ok: false, error: q.state === 'error' ? 'Shop EZMART: ' + q.error : 'Đang tính phí giao từ kho EZMART, vui lòng thử lại sau giây lát' };
        }
      const pay = PAYMENTS.find((p) => p.id === st.payment) || PAYMENTS[0];
      if (pay.id === 'wallet' && SV.wallet.balance() < calc.total)
        return { ok: false, error: `Số dư Ví ShopVuiPay (${U.money(SV.wallet.balance())}) không đủ để thanh toán ${U.money(calc.total)}. Vui lòng chọn cách thanh toán khác.` };
      const created = [];
      // Mã đơn giữ nguyên giữa các lần bấm lại (st.ids) để OMS không tạo trùng nếu lần trước mất phản hồi.
      const ids = (st.ids = st.ids || {});
      const drafts = calc.groups.map((g) => {
        const ref = ids[g.shop.id] || (ids[g.shop.id] = { id: SV.db.nextId('o'), oms: g.shop.oms ? omsOrderCode() : null });
        const o = {
          id: ref.id,
          code: ref.oms || U.orderCode(),
          userId: uid(),
          shopId: g.shop.id,
          shopName: g.shop.name,
          items: g.lines.map((l) => ({ productId: l.productId, name: l.product.name, image: l.product.thumbnail, emoji: C.emoji(l.product), variant: l.variant, price: l.unit, originalPrice: l.unitOriginal, qty: l.qty })),
          address: Object.assign({}, st.address),
          shipping: { id: g.ship.id, name: g.ship.name, fee: g.shipFee, etaFrom: g.ship.etaFrom, etaTo: g.ship.etaTo },
          note: ((st.notes || {})[g.shop.id] || '').trim(),
          payment: { method: pay.id, label: pay.label, paid: pay.id === 'wallet' },
          amounts: { subtotal: g.subtotal, shopDiscount: g.shopDiscount, platformDiscount: g.platformShare, shipping: g.shipFee, shipDiscount: g.shipDiscountShare, total: g.total },
          vouchers: { shop: g.shopVoucher && g.shopVoucher.code, platform: calc.platformVoucher && calc.platformVoucher.code, ship: calc.shipVoucher && calc.shipVoucher.code },
          status: pay.id === 'bank' ? 'UNPAID' : 'TO_SHIP',
          confirmed: false,
          reviewed: false,
          history: [],
          createdAt: now(),
        };
        return { g, o, ref };
      });
      // Đơn của shop OMS: gửi sang OMS trước; OMS từ chối (hết hàng…) thì không tạo đơn nào.
      for (const { g, o, ref } of drafts) {
        if (!g.shop.oms) continue;
        try {
          const r = await SV.oms.place(o);
          o.oms = Object.assign({ token: r.token }, r.qr ? { qr: r.qr } : {});
          if (r.shippingFee !== o.shipping.fee) {
            o.amounts.total += r.shippingFee - o.shipping.fee;
            o.amounts.shipping = o.shipping.fee = r.shippingFee;
          }
        } catch (e) {
          return { ok: false, error: 'Shop EZMART: ' + e.message };
        }
      }
      drafts.forEach(({ g, o }) => {
        addHistory(o, 'PLACED', o.oms ? 'Đơn hàng đã được đặt và chuyển đến kho EZMART' : 'Đơn hàng đã được đặt');
        if (pay.id === 'wallet') {
          walletTx(o.userId).push({ id: SV.db.nextId('w'), userId: o.userId, type: 'PAY', amount: -o.amounts.total, orderId: o.id, note: 'Thanh toán đơn ' + o.code + ' · ' + o.shopName, at: now() });
          addHistory(o, 'PAID', 'Đã thanh toán ' + U.money(o.amounts.total) + ' qua Ví ShopVuiPay');
        }
        d.orders.push(o);
        g.lines.forEach((l) => {
          adjustStock(l.productId, -l.qty);
          if (C.flash(l.product)) d.flashSold[l.productId] = (d.flashSold[l.productId] || 0) + l.qty;
        });
        created.push(o);
      });
      const bought = new Set(st.lines.map((l) => l.id));
      d.cart = d.cart.filter((c) => !bought.has(c.id));
      SV.notify.add(uid(), {
        type: 'order',
        title: 'Đặt hàng thành công',
        body: `Đơn hàng ${created.map((o) => o.code).join(', ')} đã được đặt thành công.` + (pay.id === 'bank' ? ' Vui lòng hoàn tất thanh toán để shop chuẩn bị hàng.' : ' Shop sẽ sớm xác nhận và chuẩn bị hàng cho bạn.'),
        link: '#/user/purchase',
        image: created[0].items[0].image,
        emoji: created[0].items[0].emoji,
      });
      C.invalidate();
      save(['cart', 'orders', 'notify', 'wallet']);
      return { ok: true, orders: created };
    },

    async pay(id) {
      const o = this.get(id);
      if (!o || o.status !== 'UNPAID') return { ok: false };
      if (o.oms)
        try {
          await SV.oms.pay(o);
        } catch (e) {
          return { ok: false, error: e.message };
        }
      o.status = 'TO_SHIP';
      o.payment.paid = true;
      addHistory(o, 'PAID', 'Đã xác nhận thanh toán chuyển khoản');
      save('orders');
      return { ok: true };
    },
    async cancel(id, reason, by) {
      const o = this.get(id);
      // Chỉ hủy được khi chưa thanh toán hoặc người bán chưa xác nhận
      if (!o || !(o.status === 'UNPAID' || (o.status === 'TO_SHIP' && !o.confirmed))) return { ok: false, error: 'Đơn hàng không thể hủy ở trạng thái hiện tại' };
      if (o.oms)
        try {
          await SV.oms.cancel(o, reason);
        } catch (e) {
          return { ok: false, error: e.message };
        }
      o.status = 'CANCELLED';
      o.cancelReason = reason;
      addHistory(o, 'CANCELLED', (by === 'seller' ? 'Người bán đã hủy đơn. ' : 'Bạn đã hủy đơn. ') + 'Lý do: ' + reason);
      o.items.forEach((i) => adjustStock(i.productId, i.qty));
      if (o.payment.paid) {
        // Shop thường: hoàn ngay về ví. Shop OMS: tiền vào ví khi OMS ghi nhận khoản hoàn (đồng bộ ngay bên dưới; chuyển khoản ngân hàng chờ shop đối soát).
        if (!o.oms) SV.wallet.refundTo(o, o.amounts.total, 'Hoàn tiền đơn đã hủy');
        addHistory(o, 'REFUNDED', !o.oms || o.payment.method === 'wallet' ? 'Đã hoàn ' + U.money(o.amounts.total) + ' về Ví ShopVuiPay' : 'Shop đang xử lý hoàn tiền về tài khoản ngân hàng đã thanh toán');
      }
      if (by === 'seller') orderNotify(o, 'Đơn hàng đã bị hủy', `Đơn hàng ${o.code} đã bị người bán hủy. Lý do: ${reason}`);
      C.invalidate();
      save(['orders', 'notify', 'wallet']);
      if (o.oms && o.payment.paid) SV.oms.checkNow(o);
      return { ok: true };
    },
    confirmReceived(id) {
      const o = this.get(id);
      if (!o || o.status !== 'SHIPPING' || o.oms) return { ok: false };
      complete(o, 'Bạn đã xác nhận đã nhận được hàng');
      save(['orders', 'notify']);
      return { ok: true };
    },
    returnDays: (o) => (o && o.oms ? 7 : 15), // shop OMS theo chính sách trả hàng của OMS
    /** pick = { items: [{ index, qty }], note, photos: [dataURL] } từ form trả hàng; thiếu pick = trả cả đơn. */
    async requestReturn(id, reason, pick = {}) {
      const o = this.get(id);
      if (!o || o.status !== 'COMPLETED') return { ok: false };
      const done = (o.history.find((h) => h.code === 'DELIVERED') || {}).at || o.createdAt;
      const days = this.returnDays(o);
      if (Date.now() - new Date(done).getTime() > days * 86400000) return { ok: false, error: 'Đã quá ' + days + ' ngày kể từ khi nhận hàng' };
      const chosen = (pick.items || o.items.map((it, index) => ({ index, qty: it.qty }))).map((x) => ({ item: o.items[x.index], qty: x.qty }));
      const what = chosen.map((x) => x.item.name + ' × ' + x.qty).join(', ');
      let rmaText = '';
      if (o.oms)
        try {
          const items = chosen.map((x) => ({ sku: (C.get(x.item.productId) || {}).omsSku, qty: x.qty }));
          if (items.some((x) => !x.sku)) return { ok: false, error: 'Sản phẩm không còn trên EZMART, vui lòng liên hệ shop' };
          const r = await SV.oms.requestReturn(o, reason, { items, note: pick.note || undefined, photos: pick.photos || [] });
          o.oms.rma = { stage: r.returns.some((x) => x.status === 'CHO_DUYET') ? 'requested' : 'approved', cases: r.returns };
          rmaText = ' · Hồ sơ ' + r.returns.map((x) => x.code + ' (vận đơn hoàn ' + x.trackingCode + ')').join(', ');
        } catch (e) {
          return { ok: false, error: e.message };
        }
      o.status = 'RETURN';
      o.returnReason = reason;
      o.returnItems = chosen.map((x) => ({ productId: x.item.productId, variant: x.item.variant, qty: x.qty })); // ảnh không lưu ở trình duyệt, chỉ gửi OMS
      addHistory(o, 'RETURN_REQUESTED', 'Yêu cầu trả hàng/hoàn tiền: ' + what + '. Lý do: ' + reason + (pick.note ? '. Mô tả: ' + pick.note : '') + (pick.photos && pick.photos.length ? ' · ' + pick.photos.length + ' ảnh' : '') + rmaText);
      save('orders');
      return { ok: true };
    },
    rebuy(id) {
      const o = this.get(id);
      if (!o) return { ok: false };
      let added = 0;
      o.items.forEach((i) => {
        const p = C.get(i.productId);
        if (!p || p.hidden || !p.stock) return;
        const r = SV.cart.add(i.productId, i.variant, Math.min(i.qty, p.stock));
        if (r.ok) {
          SV.cart.update(r.line.id, { selected: true });
          added++;
        }
      });
      return { ok: added > 0, added };
    },

    /** Áp trạng thái OMS gửi về (xem core/oms.js), rồi cộng vào ví phần tiền OMS mới hoàn. Trả về true nếu có thay đổi. */
    applyOms(s) {
      const changed = this.applyOmsState(s);
      const o = db().orders.find((x) => x.oms && x.code === s.orderId);
      if (!o || typeof s.refunded !== 'number') return changed;
      o.oms.refunded = s.refunded;
      return SV.wallet.refundTo(o, s.refunded, 'Hoàn tiền từ shop EZMART') > 0 || changed;
    },
    applyOmsState(s) {
      const o = db().orders.find((x) => x.oms && x.code === s.orderId);
      if (o && o.status === 'RETURN') return applyOmsReturn(o, s.rma);
      if (!o) return false;
      let paidNow = false; // tiền về: áp luôn trạng thái kho trong cùng lượt, để trang chỉ vẽ lại một lần
      if (o.status === 'UNPAID') {
        if (s.qr) o.oms.qr = s.qr; // số tiền còn phải chuyển có thể đổi (vd. kho hủy bớt một kiện)
        if (s.paid) {
          o.status = 'TO_SHIP';
          o.payment.paid = true;
          o.oms.paidAmount = o.oms.qr ? o.oms.qr.amount : o.amounts.total;
          delete o.oms.qr;
          addHistory(o, 'PAID', 'Ngân hàng đã xác nhận nhận tiền chuyển khoản');
          orderNotify(o, 'Thanh toán thành công', 'Đơn hàng ' + o.code + ' đã nhận được tiền chuyển khoản.');
          SV.emit('paid', o); // core/oms.js hiện màn thanh toán thành công
          paidNow = true;
        }
      }
      // Older versions cancelled a split order when only one parcel came back: restore it from what OMS now reports.
      if (o.status === 'CANCELLED' && o.oms.stage === 'returned' && s.status !== 'CANCELLED') {
        o.status = s.status;
        o.oms.stage = s.stage;
        addHistory(o, 'CORRECTED', 'Điều chỉnh: đơn không bị hủy — ' + s.note);
        if (s.status === 'COMPLETED') complete(o, 'Giao hàng thành công (kho EZMART xác nhận)');
        applyRts(o, s);
        return true;
      }
      if (o.status === 'COMPLETED' || o.status === 'CANCELLED') return applyRts(o, s);
      if (['RETURN'].includes(o.status) || o.oms.stage === s.stage) return applyRts(o, s) || paidNow;
      if (o.status === 'UNPAID' && s.status === 'TO_SHIP') return false; // chưa thanh toán thì giữ "Chờ thanh toán"
      o.oms.stage = s.stage;
      if (s.tracking.length) o.tracking = s.tracking.join(', ');
      backfill(o, s);
      if (s.status === 'COMPLETED') complete(o, 'Giao hàng thành công (kho EZMART xác nhận)');
      else if (s.status === 'CANCELLED') {
        o.status = 'CANCELLED';
        delete o.oms.qr; // hết hạn / bị hủy: không còn mã chuyển khoản
        o.cancelReason = s.note;
        addHistory(o, 'CANCELLED', s.note);
        // Hàng chuyển hoàn: tiền hoàn do OMS báo khi kho nhận lại hàng (applyRts), không tự hứa hoàn cả đơn.
        if (o.payment.paid && s.stage !== 'returned') addHistory(o, 'REFUNDED', o.payment.method === 'wallet' ? 'Đã hoàn tiền đơn hủy về Ví ShopVuiPay' : 'Shop đang xử lý hoàn tiền về tài khoản ngân hàng đã thanh toán');
        orderNotify(o, 'Đơn hàng đã bị hủy', 'Đơn hàng ' + o.code + ': ' + s.note + '.');
      } else {
        o.status = s.status;
        o.confirmed = true;
        const text = s.stage === 'shipping' ? s.note + ' · Mã vận đơn ' + o.tracking : s.note;
        addHistory(o, s.stage === 'shipping' ? 'SHIPPED' : 'CONFIRMED', text);
        if (s.stage === 'shipping' || s.stage === 'failed') orderNotify(o, 'Cập nhật giao hàng', 'Đơn hàng ' + o.code + ': ' + text + '.');
      }
      applyRts(o, s);
      return true;
    },

    /* ---- Thao tác của Người bán / Đơn vị vận chuyển (mô phỏng) ---- */
    sellerConfirm(id) {
      const o = this.get(id);
      if (o && o.oms) return { ok: false, error: 'Đơn của shop EZMART do kho EZMART xử lý' };
      if (!o || o.status !== 'TO_SHIP' || o.confirmed) return { ok: false };
      o.confirmed = true;
      addHistory(o, 'CONFIRMED', 'Người bán đã xác nhận và đang chuẩn bị hàng');
      orderNotify(o, 'Đơn hàng đã được xác nhận', `Đơn hàng ${o.code} đã được người bán xác nhận và đang chuẩn bị hàng.`);
      save(['orders', 'notify']);
      return { ok: true };
    },
    sellerShip(id) {
      const o = this.get(id);
      if (o && o.oms) return { ok: false, error: 'Đơn của shop EZMART do kho EZMART xử lý' };
      if (!o || o.status !== 'TO_SHIP' || !o.confirmed) return { ok: false };
      o.status = 'SHIPPING';
      o.tracking = 'SVX' + Math.floor(1e9 + Math.random() * 9e9);
      addHistory(o, 'SHIPPED', `Đã giao cho đơn vị vận chuyển SVExpress · Mã vận đơn ${o.tracking}`);
      orderNotify(o, 'Đơn hàng đang được giao', `Đơn hàng ${o.code} đã được giao cho đơn vị vận chuyển và đang trên đường đến bạn.`);
      save(['orders', 'notify']);
      return { ok: true };
    },
    carrierDeliver(id) {
      const o = this.get(id);
      if (o && o.oms) return { ok: false, error: 'Đơn của shop EZMART do kho EZMART xử lý' };
      if (!o || o.status !== 'SHIPPING') return { ok: false };
      complete(o, 'Giao hàng thành công');
      save(['orders', 'notify']);
      return { ok: true };
    },
    sellerRefund(id) {
      const o = this.get(id);
      if (o && o.oms) return { ok: false, error: 'Hoàn tiền đơn shop EZMART do EZMART xử lý sau kiểm định' };
      if (!o || o.status !== 'RETURN' || o.refunded) return { ok: false };
      o.refunded = true;
      SV.wallet.refundTo(o, o.amounts.total, 'Hoàn tiền trả hàng');
      addHistory(o, 'REFUNDED', 'Người bán đồng ý hoàn tiền ' + U.money(o.amounts.total) + ' về Ví ShopVuiPay');
      orderNotify(o, 'Yêu cầu hoàn tiền được chấp nhận', `Đơn hàng ${o.code} đã được hoàn ${U.money(o.amounts.total)} về Ví ShopVuiPay.`);
      save(['orders', 'notify', 'wallet']);
      return { ok: true };
    },
  };
  /** Tiến độ hồ sơ trả RMA bên OMS → lịch sử, thông báo và trạng thái hoàn tiền của đơn ShopVui. */
  const RMA_TEXT = {
    requested: 'Yêu cầu trả hàng quá 7 ngày, đang chờ shop duyệt',
    approved: 'Shop đã duyệt trả hàng. Vui lòng gửi hàng theo mã vận đơn hoàn',
    inspecting: 'Kho EZMART đã nhận hàng trả và đang kiểm định',
    closed: 'Hồ sơ trả hàng đã hoàn tất',
    rejected: 'Shop từ chối yêu cầu trả hàng',
  };
  function applyOmsReturn(o, rma) {
    if (!rma || (o.oms.rma && o.oms.rma.stage === rma.stage)) return false;
    o.oms.rma = rma;
    const codes = rma.cases.map((x) => x.code).join(', ');
    if (rma.stage === 'closed') {
      o.refunded = true;
      const text = rma.refunded > 0 ? 'Kho EZMART đã kiểm định hàng trả và hoàn ' + U.money(rma.refunded) + (o.payment.method === 'wallet' ? ' về Ví ShopVuiPay' : ' qua chuyển khoản ngân hàng') : 'Kho EZMART đã nhận và kiểm định hàng trả; đơn chưa phát sinh khoản thu nên không có tiền hoàn';
      addHistory(o, 'REFUNDED', text + ' (' + codes + ')');
      orderNotify(o, 'Trả hàng/hoàn tiền hoàn tất', 'Đơn hàng ' + o.code + ': ' + text + '.');
    } else {
      addHistory(o, 'RETURN_' + rma.stage.toUpperCase(), RMA_TEXT[rma.stage] + ' (' + codes + ')');
      if (rma.stage === 'rejected') orderNotify(o, 'Yêu cầu trả hàng bị từ chối', 'Đơn hàng ' + o.code + ': ' + RMA_TEXT.rejected + '.');
    }
    return true;
  }
  /** OMS có thể xử lý nhiều bước giữa hai lần đồng bộ (10 giây): ghi bù mốc "xác nhận" / "giao cho ĐVVC" còn thiếu, theo giờ OMS ghi nhận. */
  function backfill(o, s) {
    const has = (c) => o.history.some((h) => h.code === c);
    if (['shipping', 'failed', 'delivered'].includes(s.stage) && !has('CONFIRMED')) addHistory(o, 'CONFIRMED', 'Kho EZMART đã xác nhận và giữ hàng', s.confirmedAt || undefined);
    if (['failed', 'delivered'].includes(s.stage) && !has('SHIPPED')) addHistory(o, 'SHIPPED', 'Đã giao cho đơn vị vận chuyển' + (o.tracking ? ' · Mã vận đơn ' + o.tracking : ''), s.handedOverAt || undefined);
  }
  /** Kiện bị chuyển hoàn: ghi đúng số tiền OMS đã hoàn cho phần đó (đơn tách kho có thể chỉ hoàn một phần). */
  function applyRts(o, s) {
    o.oms.rtsOpen = !!s.rtsOpen;
    const done = o.oms.rtsRefunded || 0;
    if (!(s.rtsRefunded > done)) return false;
    o.oms.rtsRefunded = s.rtsRefunded;
    const text = 'Kho EZMART đã nhận lại hàng chuyển hoàn và hoàn ' + U.money(s.rtsRefunded - done) + (o.payment.method === 'wallet' ? ' về Ví ShopVuiPay' : ' qua chuyển khoản ngân hàng');
    addHistory(o, 'REFUNDED', text);
    orderNotify(o, 'Hoàn tiền phần hàng chuyển hoàn', 'Đơn hàng ' + o.code + ': ' + text + '.');
    return true;
  }
  function complete(o, text) {
    o.status = 'COMPLETED';
    if (!o.payment.paid) {
      o.payment.paid = true;
      addHistory(o, 'PAID', 'Đã thanh toán ' + U.money(o.amounts.total) + ' cho shipper (COD)');
    }
    addHistory(o, 'DELIVERED', text);
    const d = db();
    o.items.forEach((i) => (d.soldDelta[i.productId] = (d.soldDelta[i.productId] || 0) + i.qty));
    C.invalidate();
    orderNotify(o, 'Giao hàng thành công', `Đơn hàng ${o.code} đã giao thành công. Hãy đánh giá sản phẩm để giúp người mua khác nhé!`);
  }

  /* ================================ Đánh giá ================================ */
  SV.reviews = {
    add(orderId, entries) {
      const o = SV.orders.get(orderId);
      const u = SV.auth.current();
      if (!o || !u || o.status !== 'COMPLETED' || o.reviewed) return { ok: false, error: 'Không thể đánh giá đơn hàng này' };
      entries.forEach((e) => {
        db().reviews.push({ id: SV.db.nextId('r'), productId: e.productId, userId: u.id, username: U.maskName(u.username), orderId, rating: e.rating, comment: (e.comment || '').trim(), variant: e.variant || '', createdAt: now() });
      });
      o.reviewed = true;
      addHistory(o, 'REVIEWED', 'Bạn đã đánh giá sản phẩm');
      save('orders');
      return { ok: true };
    },
  };

  /* ============================ Yêu thích & Theo dõi ============================ */
  SV.likes = {
    has: (pid) => !!uid() && db().likes.some((l) => l.userId === uid() && l.productId === pid),
    count(p) {
      return Math.floor(p.sold * 0.18 + (U.hash(p.id) % 50)) + (this.has(p.id) ? 1 : 0);
    },
    toggle(pid) {
      if (!uid()) return { ok: false, error: 'login' };
      const d = db();
      if (this.has(pid)) d.likes = d.likes.filter((l) => !(l.userId === uid() && l.productId === pid));
      else d.likes.push({ userId: uid(), productId: pid, at: now() });
      save('likes');
      return { ok: true, liked: this.has(pid) };
    },
    list: () =>
      db()
        .likes.filter((l) => l.userId === uid())
        .map((l) => C.get(l.productId))
        .filter(Boolean),
  };
  SV.follows = {
    has: (shopId) => !!uid() && db().follows.some((f) => f.userId === uid() && f.shopId === shopId),
    toggle(shopId) {
      if (!uid()) return { ok: false, error: 'login' };
      const d = db();
      if (this.has(shopId)) d.follows = d.follows.filter((f) => !(f.userId === uid() && f.shopId === shopId));
      else d.follows.push({ userId: uid(), shopId, at: now() });
      save('follows');
      return { ok: true, following: this.has(shopId) };
    },
  };

  /* ================================ Thông báo ================================ */
  SV.notify = {
    add(userId, n) {
      db().notifications.push(Object.assign({ id: SV.db.nextId('n'), userId, read: false, createdAt: now() }, n));
    },
    list: () =>
      db()
        .notifications.filter((n) => n.userId === uid())
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    unread() {
      return this.list().filter((n) => !n.read).length;
    },
    read(id) {
      const n = db().notifications.find((x) => x.id === id);
      if (n && !n.read) {
        n.read = true;
        save('notify');
      }
    },
    readAll() {
      db().notifications.forEach((n) => n.userId === uid() && (n.read = true));
      save('notify');
    },
  };

  /* ================================ Lịch sử tìm kiếm ================================ */
  SV.searchHistory = {
    list: () =>
      db()
        .searchHistory.filter((h) => h.userId === (uid() || 'guest'))
        .map((h) => h.q)
        .slice(0, 8),
    add(q) {
      q = String(q || '').trim();
      if (!q) return;
      const d = db();
      const who = uid() || 'guest';
      d.searchHistory = [{ userId: who, q }].concat(d.searchHistory.filter((h) => !(h.userId === who && h.q.toLowerCase() === q.toLowerCase()))).slice(0, 40);
      save();
    },
  };

  /* ================================ Chat ================================ */
  /** Trả lời tự động theo từ khoá (so khớp nguyên từ, không phân biệt dấu) */
  function autoReply(text) {
    const s = ' ' + U.words(text).join(' ') + ' ';
    const has = (...keys) => keys.some((k) => s.includes(' ' + k + ' '));
    if (has('ship', 'giao', 'van chuyen', 'bao lau', 'may ngay', 'khi nao')) return 'Dạ shop giao hàng toàn quốc: nội tỉnh 1–2 ngày, liên vùng 3–5 ngày. Đơn cùng tỉnh có thể chọn Hỏa Tốc 2 giờ ạ.';
    if (has('size', 'mac', 'cao', 'can nang', 'kg', 'vua')) return 'Dạ bạn cho shop xin chiều cao và cân nặng để shop tư vấn size chuẩn nhé!';
    if (has('con hang', 'con khong', 'het hang', 'con size', 'con mau')) return 'Dạ sản phẩm vẫn còn hàng ạ, bạn đặt sớm để được giao nhanh nhé!';
    if (has('doi', 'tra', 'hoan', 'loi', 'hong', 'bao hanh')) return 'Dạ shop hỗ trợ trả hàng/hoàn tiền trong 15 ngày nếu sản phẩm lỗi do nhà sản xuất. Bạn gửi giúp shop hình ảnh/video để shop xử lý ngay ạ.';
    if (has('gia', 'giam', 'voucher', 'ma giam', 'sale', 're')) return 'Dạ hiện sản phẩm đang có giá ưu đãi kèm voucher của shop, bạn nhớ bấm "Lưu" mã giảm giá trước khi đặt nhé!';
    if (has('chao', 'hello', 'hi', 'alo', 'shop oi')) return 'Dạ shop chào bạn ạ! Bạn cần shop tư vấn sản phẩm nào ạ? 😊';
    return 'Dạ shop đã nhận được tin nhắn, nhân viên sẽ phản hồi bạn trong ít phút nữa ạ ❤️';
  }
  SV.chat = {
    list: () =>
      db()
        .chats.filter((c) => c.userId === uid())
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
    unread() {
      return this.list().reduce((s, c) => s + (c.unread || 0), 0);
    },
    open(shopId) {
      const d = db();
      let c = d.chats.find((x) => x.userId === uid() && x.shopId === shopId);
      if (!c) {
        const shop = C.shop(shopId);
        c = { id: SV.db.nextId('ch'), userId: uid(), shopId, unread: 0, updatedAt: now(), messages: [{ from: 'shop', text: `Xin chào! ${shop.name} có thể giúp gì cho bạn ạ? 😊`, at: now() }] };
        d.chats.push(c);
      }
      c.unread = 0;
      save('chat');
      return c;
    },
    send(shopId, text) {
      text = String(text || '').trim();
      if (!text) return;
      const c = this.open(shopId);
      c.messages.push({ from: 'me', text, at: now() });
      c.updatedAt = now();
      save('chat');
      const userAtSend = uid();
      setTimeout(() => {
        if (uid() !== userAtSend) return;
        const cur = db().chats.find((x) => x.id === c.id);
        if (!cur) return;
        cur.messages.push({ from: 'shop', text: autoReply(text), at: now() });
        cur.updatedAt = now();
        cur.unread = (cur.unread || 0) + 1;
        save('chat');
      }, 1200);
    },
    markRead(shopId) {
      const c = db().chats.find((x) => x.userId === uid() && x.shopId === shopId);
      if (c && c.unread) {
        c.unread = 0;
        SV.db.save(); // không phát sự kiện để tránh vẽ lại lặp
      }
    },
  };

  /* ================================ Kênh Người Bán ================================ */
  SV.seller = {
    shopId: () => db().sellerShopId || 's1',
    setShop(id) {
      db().sellerShopId = id;
      save('seller');
    },
    trackView(pid) {
      const d = db();
      d.views[pid] = (d.views[pid] || 0) + 1;
      SV.db.save();
    },
    products(includeHidden) {
      return C.all(true).filter((p) => p.shopId === this.shopId() && (includeHidden || !p.hidden));
    },
    stats() {
      const sid = this.shopId();
      const orders = SV.orders.list({ shopId: sid });
      const valid = orders.filter((o) => o.status !== 'CANCELLED' && !(o.status === 'RETURN' && o.refunded));
      const revenue = valid.reduce((s, o) => s + o.amounts.subtotal - o.amounts.shopDiscount, 0);
      const d = db();
      const views = this.products(true).reduce((s, p) => s + (d.views[p.id] || 0), 0);
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const day = U.addDays(new Date(), -i);
        const key = day.toDateString();
        const sum = valid.filter((o) => new Date(o.createdAt).toDateString() === key).reduce((s, o) => s + o.amounts.subtotal - o.amounts.shopDiscount, 0);
        days.push({ label: `${day.getDate()}/${day.getMonth() + 1}`, value: sum });
      }
      const count = (f) => orders.filter(f).length;
      return {
        revenue, orders: valid.length, views,
        conversion: views ? (valid.length / views) * 100 : 0,
        days,
        todo: {
          unpaid: count((o) => o.status === 'UNPAID'),
          toConfirm: count((o) => o.status === 'TO_SHIP' && !o.confirmed),
          toPickup: count((o) => o.status === 'TO_SHIP' && o.confirmed),
          shipping: count((o) => o.status === 'SHIPPING'),
          cancelled: count((o) => o.status === 'CANCELLED'),
          returns: count((o) => o.status === 'RETURN' && !o.refunded),
          outOfStock: this.products(true).filter((p) => p.stock <= 0).length,
          hidden: this.products(true).filter((p) => p.hidden).length,
        },
      };
    },
    saveProduct(data) {
      const name = String(data.name || '').trim();
      const price = parseInt(data.price, 10);
      const orig = parseInt(data.originalPrice, 10) || price;
      const stock = parseInt(data.stock, 10);
      if (name.length < 10) return { ok: false, field: 'name', error: 'Tên sản phẩm cần ít nhất 10 ký tự' };
      if (!C.category(data.categoryId)) return { ok: false, field: 'categoryId', error: 'Vui lòng chọn ngành hàng' };
      if (!(price >= 1000)) return { ok: false, field: 'price', error: 'Giá bán tối thiểu ₫1.000' };
      if (orig < price) return { ok: false, field: 'originalPrice', error: 'Giá gốc phải lớn hơn hoặc bằng giá bán' };
      if (!(stock >= 0)) return { ok: false, field: 'stock', error: 'Kho hàng không hợp lệ' };
      const d = db();
      const groups = [];
      String(data.variants || '').split('\n').forEach((line) => {
        const [gname, opts] = line.split(':');
        if (!gname || !opts) return;
        const options = opts.split(',').map((s) => s.trim()).filter(Boolean);
        if (options.length) groups.push({ name: gname.trim(), options });
      });
      const fields = {
        name, categoryId: data.categoryId, subCategory: (data.subCategory || '').trim() || C.category(data.categoryId).subCategories[0],
        price, originalPrice: orig, discount: Math.round((1 - price / orig) * 100), stock,
        brand: (data.brand || '').trim() || 'No Brand', description: (data.description || '').trim(), variants: groups,
      };
      if (data.image) Object.assign(fields, { thumbnail: data.image, images: [data.image] });
      const existing = data.id && C.get(data.id);
      if (existing) {
        const own = d.sellerProducts.find((p) => p.id === data.id);
        if (own) Object.assign(own, fields);
        else {
          if (fields.variants.length === 0) delete fields.variants;
          d.productPatches[data.id] = Object.assign({}, d.productPatches[data.id], fields);
        }
        C.invalidate();
        save('products');
        return { ok: true, id: data.id };
      }
      const shop = C.shop(this.shopId());
      const p = Object.assign(
        {
          id: SV.db.nextId('sp'), shopId: shop.id, location: shop.location, origin: 'Việt Nam', warranty: '6 tháng', returnPolicy: 'Trả hàng miễn phí 15 ngày',
          rating: 0, ratingCount: 0, sold: 0, labels: ['freeship'], thumbnail: '', images: [], createdAt: now(),
        },
        fields
      );
      d.sellerProducts.push(p);
      C.invalidate();
      save('products');
      return { ok: true, id: p.id };
    },
    toggleHidden(id) {
      const p = C.get(id);
      if (!p) return;
      const d = db();
      d.productPatches[id] = Object.assign({}, d.productPatches[id], { hidden: !p.hidden });
      C.invalidate();
      save('products');
    },
    remove(id) {
      const d = db();
      if (d.sellerProducts.some((p) => p.id === id)) d.sellerProducts = d.sellerProducts.filter((p) => p.id !== id);
      else d.productPatches[id] = Object.assign({}, d.productPatches[id], { deleted: true });
      C.invalidate();
      save('products');
    },
  };

  /* ================================ Dữ liệu demo ================================ */
  function pickVariant(p, prefs) {
    return (p.variants || []).map((g) => g.options.find((o) => (prefs || []).includes(o)) || g.options[0]).join(', ');
  }
  function seedOrder(userId, items, status, ago, opts) {
    opts = opts || {};
    const d = db();
    const t0 = Date.now() - ago * 86400000;
    const at = (h) => new Date(t0 + h * 3600000).toISOString();
    const lines = items.map(([pid, qty, prefs]) => {
      const p = C.get(pid);
      const variant = pickVariant(p, prefs);
      return { p, qty, variant, unit: C.unitPrice(p, variant), orig: C.unitOriginal(p, variant) };
    });
    const shop = C.shop(lines[0].p.shopId);
    const addr = d.addresses.find((a) => a.userId === userId && a.isDefault);
    const qty = lines.reduce((s, l) => s + l.qty, 0);
    const ship = SV.checkout.shippingOptions(shop, addr, qty)[0];
    const subtotal = lines.reduce((s, l) => s + l.unit * l.qty, 0);
    const shipDiscount = Math.min(ship.fee, 30000);
    const method = opts.payment || 'cod';
    const pay = PAYMENTS.find((p) => p.id === method);
    const o = {
      id: SV.db.nextId('o'),
      code: U.orderCode(new Date(t0)),
      userId, shopId: shop.id, shopName: shop.name,
      items: lines.map((l) => ({ productId: l.p.id, name: l.p.name, image: l.p.thumbnail, emoji: C.emoji(l.p), variant: l.variant, price: l.unit, originalPrice: l.orig, qty: l.qty })),
      address: Object.assign({}, addr),
      shipping: { id: ship.id, name: ship.name, fee: ship.fee, etaFrom: U.addDays(new Date(t0), 2).toISOString(), etaTo: U.addDays(new Date(t0), 4).toISOString() },
      note: opts.note || '',
      payment: { method, label: pay.label, paid: false },
      amounts: { subtotal, shopDiscount: 0, platformDiscount: 0, shipping: ship.fee, shipDiscount, total: subtotal + ship.fee - shipDiscount },
      vouchers: { ship: 'FREESHIP30' },
      status, confirmed: ['SHIPPING', 'COMPLETED'].includes(status), reviewed: false, history: [], createdAt: at(0),
    };
    addHistory(o, 'PLACED', 'Đơn hàng đã được đặt', at(0));
    if (status === 'CANCELLED') {
      o.cancelReason = 'Muốn thay đổi địa chỉ giao hàng';
      addHistory(o, 'CANCELLED', 'Bạn đã hủy đơn. Lý do: Muốn thay đổi địa chỉ giao hàng', at(1));
    }
    if (o.confirmed) {
      addHistory(o, 'CONFIRMED', 'Người bán đã xác nhận và đang chuẩn bị hàng', at(2));
      o.tracking = 'SVX' + (5000000000 + U.hash(o.code) % 999999999);
      addHistory(o, 'SHIPPED', `Đã giao cho đơn vị vận chuyển SVExpress · Mã vận đơn ${o.tracking}`, at(20));
    }
    if (status === 'COMPLETED') {
      o.payment.paid = true;
      addHistory(o, 'PAID', 'Đã thanh toán ' + U.money(o.amounts.total) + ' cho shipper (COD)', at(60));
      addHistory(o, 'DELIVERED', 'Giao hàng thành công', at(60));
      if (opts.review) {
        o.reviewed = true;
        addHistory(o, 'REVIEWED', 'Bạn đã đánh giá sản phẩm', at(70));
        const u = d.users.find((x) => x.id === userId);
        d.reviews.push({ id: SV.db.nextId('r'), productId: lines[0].p.id, userId, username: U.maskName(u.username), orderId: o.id, rating: opts.review.rating, comment: opts.review.comment, variant: lines[0].variant, createdAt: at(70) });
      }
    }
    d.orders.push(o);
    return o;
  }

  SV.seedDemo = function () {
    const d = db();
    d.users.push({ id: 'u1', username: 'demo', email: 'demo@shopvui.vn', phone: '0912345678', password: U.hashPassword('Demo1234'), name: 'Nguyễn Minh Anh', gender: 'other', birthday: '2003-05-20', createdAt: U.daysAgo(420) });
    d.addresses.push({ id: 'a1', userId: 'u1', name: 'Nguyễn Minh Anh', phone: '0912345678', province: 'TP. Hồ Chí Minh', ward: 'Phường Sài Gòn', detail: '12 Nguyễn Huệ', type: 'home', isDefault: true });
    d.addresses.push({ id: 'a2', userId: 'u1', name: 'Nguyễn Minh Anh', phone: '0912345678', province: 'Hà Nội', ward: 'Phường Cầu Giấy', detail: '144 Xuân Thủy', type: 'office', isDefault: false });
    [['p84', 1, ['L']], ['p100', 1], ['p40', 2], ['p163', 1, ['M']]].forEach(([pid, qty, prefs], i) => {
      d.cart.push({ id: 'c' + (i + 1), userId: 'u1', productId: pid, variant: pickVariant(C.get(pid), prefs), qty, selected: false, addedAt: U.daysAgo(i + 1) });
    });
    seedOrder('u1', [['p1', 2]], 'COMPLETED', 20, { review: { rating: 5, comment: 'Mascara chuốt mi cong lâu, không bị lem. Giao hàng nhanh, đóng gói kỹ. Sẽ quay lại mua tiếp!' } });
    const o2 = seedOrder('u1', [['p88', 1, ['42']]], 'COMPLETED', 6);
    const o3 = seedOrder('u1', [['p165', 1, ['M']]], 'SHIPPING', 2);
    seedOrder('u1', [['p104', 1, ['Củ + Cáp 1m']], ['p108', 1, ['iPhone 12 Pro']]], 'TO_SHIP', 0.3);
    seedOrder('u1', [['p65', 1]], 'CANCELLED', 12);
    seedOrder('u1', [['p27', 1]], 'UNPAID', 0.05, { payment: 'bank' });
    const n = (title, body, link, ago, extra) => d.notifications.push(Object.assign({ id: SV.db.nextId('n'), userId: 'u1', read: ago > 3, createdAt: U.daysAgo(ago), title, body, link }, extra));
    n('Giao hàng thành công', `Đơn hàng ${o2.code} đã giao thành công. Hãy đánh giá sản phẩm để giúp người mua khác nhé!`, '#/user/order/' + o2.id, 5.9, { type: 'order', image: o2.items[0].image });
    n('11.11 Siêu Sale Sinh Nhật 🎉', 'Săn deal 1K, voucher giảm đến 50% và Freeship Xtra đang chờ bạn. Khung giờ vàng mỗi ngày!', '#/flash-sale', 1, { type: 'promo', emoji: '🎁' });
    n('Đơn hàng đang được giao', `Đơn hàng ${o3.code} đã được giao cho đơn vị vận chuyển và đang trên đường đến bạn.`, '#/user/order/' + o3.id, 1.2, { type: 'order', image: o3.items[0].image });
    n('Voucher Freeship đã về ví', 'Bạn nhận được voucher Miễn Phí Vận Chuyển ₫30k. Hạn dùng đến 30/11.', '#/user/vouchers', 0.5, { type: 'promo', emoji: '🎟️' });
    d.likes.push({ userId: 'u1', productId: 'p8', at: U.daysAgo(3) }, { userId: 'u1', productId: 'p123', at: U.daysAgo(5) }, { userId: 'u1', productId: 'p173', at: U.daysAgo(8) });
    d.follows.push({ userId: 'u1', shopId: 's4', at: U.daysAgo(30) });
    d.savedVouchers.push({ userId: 'u1', code: 'S7GIAM10K', savedAt: U.daysAgo(2) });
    d.chats.push({ id: 'ch1', userId: 'u1', shopId: 's7', unread: 1, updatedAt: U.daysAgo(0.1), messages: [
      { from: 'shop', text: 'Xin chào! Bông Fashion có thể giúp gì cho bạn ạ? 😊', at: U.daysAgo(0.12) },
      { from: 'me', text: 'Shop ơi váy hoa còn size M không ạ?', at: U.daysAgo(0.11) },
      { from: 'shop', text: 'Dạ còn ạ, bạn đặt sớm để được giao nhanh nhé! 🥰', at: U.daysAgo(0.1) },
    ] });
    // Lượt xem mẫu cho thống kê kênh người bán
    C.all().forEach((p) => (d.views[p.id] = Math.floor(p.sold * 0.05) + (U.hash(p.id) % 30)));
    SV.db.save();
  };
})();
