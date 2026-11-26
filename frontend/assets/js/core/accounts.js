/* Server-owned ShopVui identities, wallet and EZMART orders. LocalStorage is a UI cache, never a payment authority. */
(function () {
  'use strict';
  const db = () => SV.db.data();
  const base = window.SV_OMS.base.replace(/\/integrations\/shopvui\/?$/, '/storefront');
  let balance = 0, entries = [], refreshing = null;
  async function call(action, body) {
    const res = await fetch(base + '/' + action, { method: body === undefined ? 'GET' : 'POST', credentials: 'include', headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw Object.assign(new Error(data.error || 'Không kết nối được ShopVui.'), { field: data.field, status: res.status });
    return data;
  }
  function clear() {
    const d = db(); d.session = null; d.users = []; d.orders = []; d.addresses = []; d.walletTx = []; balance = 0; entries = []; SV.db.save();
  }
  function hydrate(state) {
    if (!state.user) { clear(); return; }
    const d = db(), before = new Map(d.orders.filter(o => o.server).map(o => [o.id, o]));
    d.users = [state.user]; d.session = state.user.id;
    d.addresses = state.addresses.map(a => Object.assign({ server: true }, a));
    const orders = state.orders.map(o => { if (before.get(o.id)?.reviewed) o.reviewed = true; o.items.forEach(it => { const p = SV.catalog.get(it.productId); if (p) { it.image = p.thumbnail; it.emoji = SV.catalog.emoji(p); } }); return o; });
    d.orders = orders; balance = state.balance; entries = state.wallet; SV.db.save();
    for (const o of orders) if (before.get(o.id)?.status === 'UNPAID' && o.payment.paid && o.payment.method === 'bank') SV.emit('paid', o);
  }
  async function refresh() {
    if (refreshing) return refreshing;
    refreshing = call('session').then(state => { hydrate(state); return state; }).finally(() => { refreshing = null; });
    return refreshing;
  }
  const result = async (action, body) => { try { const state = await call(action, body); hydrate(state); SV.emit('auth'); return { ok: true, user: state.user }; } catch (e) { return { ok: false, field: e.field, error: e.message }; } };
  SV.account = { call, hydrate, refresh, async bootstrap() { clear(); try { await refresh(); } catch { clear(); } } };
  SV.auth.login = (identifier, password) => result('login', { identifier, password });
  SV.auth.register = data => result('register', data);
  SV.auth.logout = async () => { try { await call('logout', {}); clear(); SV.emit('auth'); return { ok: true }; } catch (e) { return { ok: false, error: e.message }; } };
  SV.auth.updateProfile = data => result('profile', data);
  SV.auth.changePassword = (old, next) => result('password', { old, new: next });
  SV.wallet.list = () => entries.slice();
  SV.wallet.balance = () => SV.auth.current()?.server ? balance : 0;
  SV.wallet.refundTo = () => 0; // Real refunds must NEVER mint simulated credit; server reconciles wallet purchases only.
  const addressMethods = {};
  for (const action of ['save', 'remove', 'setDefault']) {
    addressMethods[action] = SV.address[action].bind(SV.address);
    SV.address[action] = async (...args) => {
      const before = db().addresses.map(a => Object.assign({}, a));
      const r = addressMethods[action](...args); if (r && !r.ok) return r;
      try { const addresses = SV.address.list().map(a => ({ ...a })); hydrate(await call('addresses', { addresses })); return r || { ok: true }; }
      catch (e) { db().addresses = before; SV.db.save(); return { ok: false, error: e.message }; }
    };
  }
  SV.orders.place = async (st, calc) => {
    if (!SV.auth.current()?.server) return { ok: false, error: 'Vui lòng đăng nhập tài khoản ShopVui trên máy chủ.' };
    if (!st.address) return { ok: false, error: 'Vui lòng thêm địa chỉ giao hàng tại Hà Nội, Đà Nẵng hoặc TP.HCM.' };
    if (calc.groups.length !== 1 || !calc.groups[0].shop.oms) return { ok: false, error: 'Chỉ shop EZMART nhận đơn. Các shop khác là dữ liệu minh họa, không nhận thanh toán.' };
    const g = calc.groups[0]; if (!g.ship) return { ok: false, error: 'Chưa có báo phí từ EZMART. Vui lòng chờ hoặc kiểm tra địa chỉ/tồn kho.' };
    st.ids = st.ids || {}; const ref = st.ids.oms || (st.ids.oms = { oms: 'DH-' + new Date(Date.now() + 7 * 3600000).toISOString().slice(2, 10).replaceAll('-', '') + '-' + Array.from(crypto.getRandomValues(new Uint8Array(3)), b => b.toString(16).padStart(2, '0')).join('').toUpperCase() });
    const o = { code: ref.oms, address: st.address, items: g.lines, payment: { method: st.payment, realBankAcknowledged: !!st.realBankAcknowledged } };
    try {
      const response = await SV.oms.place(o); hydrate(response.accountState);
      const bought = new Set(st.lines.map(l => l.id)); db().cart = db().cart.filter(c => !bought.has(c.id)); SV.db.save();
      ['cart', 'orders', 'wallet', 'auth'].forEach(e => SV.emit(e));
      return { ok: true, orders: db().orders.filter(o => o.server && o.code === ref.oms) };
    } catch (e) { return { ok: false, error: e.message }; }
  };
  SV.orders.pay = async () => ({ ok: false, error: 'Chuyển khoản chỉ được xác nhận qua SePay.' });
  setInterval(async () => {
    if (!SV.auth.current()?.server || document.visibilityState !== 'visible') return;
    const fingerprint = () => JSON.stringify([db().orders.filter(o => o.server).map(o => [o.id, o.status, o.payment.paid, o.tracking || '', o.oms.qr?.amount, o.oms.rma?.stage, o.oms.refunded || 0]), balance]);
    const before = fingerprint();
    try { await refresh(); if (before !== fingerprint() && !/^#\/(checkout|login|register|user\/account)/.test(location.hash)) SV.router.render({ keepScroll: true }); }
    catch (e) { console.warn('Chưa đồng bộ tài khoản ShopVui:', e.message); }
  }, 10000);
})();
