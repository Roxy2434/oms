/* =========================================================
   components.js – Các thành phần giao diện tái sử dụng:
   thẻ sản phẩm, sao đánh giá, phân trang, toast, hộp thoại (modal),
   voucher, form địa chỉ…
   ========================================================= */
(function () {
  'use strict';
  const U = SV.U;
  const C = SV.catalog;
  const ui = {};
  const AV = ['#f4511e', '#00bfa5', '#2673dd', '#8e44ad', '#e67e22', '#16a085', '#c0392b', '#546e7a'];

  ui.img = (src, emoji, cls, alt) =>
    `<img class="${cls || ''}" src="${src ? U.esc(src) : U.placeholder(emoji)}" data-emoji="${emoji || '🛍️'}" alt="${U.esc(alt || '')}" loading="lazy" onerror="SV.imgErr(this)">`;

  ui.avatar = (name, size, color) => {
    const ch = String(name || '?').trim().charAt(0).toUpperCase() || '?';
    const c = color || AV[U.hash(String(name)) % AV.length];
    return `<span class="avatar" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.42)}px;background:${c}">${U.esc(ch)}</span>`;
  };

  ui.stars = (rating, size, cls) => {
    const pct = Math.max(0, Math.min(100, ((rating || 0) / 5) * 100));
    const row = SV.icon('star', size || 12).repeat(5);
    return `<span class="stars ${cls || ''}" aria-label="${(rating || 0).toFixed(1)} sao"><span class="bg">${row}</span><span class="fg" style="width:${pct}%">${row}</span></span>`;
  };

  ui.shopLabel = (type) =>
    type === 'mall' ? '<span class="lbl-mall">Mall</span>' : type === 'preferred_plus' ? '<span class="lbl-fav">Yêu thích+</span>' : type === 'preferred' ? '<span class="lbl-fav">Yêu thích</span>' : '';

  ui.discountFlag = (d) => (d > 0 ? `<div class="flag-disc"><span>${d}%</span><b>GIẢM</b></div>` : '');

  /** Thẻ sản phẩm (dùng ở trang chủ, tìm kiếm, shop…) */
  ui.productCard = (p) => {
    const shop = C.shopRaw(p.shopId) || {};
    const d = C.discountOf(p);
    const flash = C.flash(p);
    const labels = p.labels || [];
    const tags = [];
    if (flash) tags.push('<span class="tag tag-red">Flash Sale</span>');
    if (labels.includes('re')) tags.push('<span class="tag">Rẻ Vô Địch</span>');
    if (labels.includes('freeship')) tags.push('<span class="tag tag-teal">Freeship</span>');
    if (labels.includes('xu')) tags.push('<span class="tag">Hoàn Xu</span>');
    return `<a class="card" href="#/product/${p.id}">
      <div class="card-img">${ui.img(p.thumbnail, C.emoji(p), '', p.name)}${ui.discountFlag(d)}${p.stock <= 0 ? '<div class="card-soldout">Hết hàng</div>' : ''}</div>
      <div class="card-body">
        <div class="card-name">${ui.shopLabel(shop.type)} ${U.esc(p.name)}</div>
        <div class="card-tags">${tags.slice(0, 2).join('')}</div>
        <div class="card-bottom"><span class="card-price">${U.moneyHtml(C.basePrice(p))}</span><span class="card-sold">Đã bán ${U.compact(p.sold)}</span></div>
        <div class="card-loc">${U.esc(p.location)}</div>
      </div>
      <div class="card-similar" data-similar="${p.id}">Tìm sản phẩm tương tự</div>
    </a>`;
  };
  ui.grid = (list, cls) => `<div class="grid ${cls || ''}">${list.map(ui.productCard).join('')}</div>`;

  ui.pagination = (page, pages) => {
    if (pages <= 1) return '';
    const out = [];
    let lastDots = false;
    for (let i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || Math.abs(i - page) <= 2) {
        out.push(`<button class="${i === page ? 'on' : ''}" data-page="${i}">${i}</button>`);
        lastDots = false;
      } else if (!lastDots) {
        out.push('<span class="pg-dots">…</span>');
        lastDots = true;
      }
    }
    return `<div class="pagination"><button class="arrow" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''} aria-label="Trang trước">${SV.icon('left', 18)}</button>${out.join('')}<button class="arrow" data-page="${page + 1}" ${page >= pages ? 'disabled' : ''} aria-label="Trang sau">${SV.icon('right', 18)}</button></div>`;
  };

  ui.qty = (value, max, attrs) =>
    `<div class="qty" ${attrs || ''}><button type="button" data-q="-" ${value <= 1 ? 'disabled' : ''} aria-label="Giảm">${SV.icon('minus', 14)}</button><input type="text" inputmode="numeric" value="${value}" data-max="${max}" aria-label="Số lượng"><button type="button" data-q="+" ${value >= max ? 'disabled' : ''} aria-label="Tăng">${SV.icon('plus', 14)}</button></div>`;

  ui.empty = (emoji, text, action) => `<div class="empty"><div class="em">${emoji}</div><p>${text}</p>${action || ''}</div>`;

  /* ----------------------------- Toast ----------------------------- */
  ui.toast = (msg, type, ms) => {
    type = type || 'success';
    const root = document.getElementById('toast-root');
    const el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.setAttribute('role', 'status');
    const ic = type === 'success' ? SV.icon('check', 30) : type === 'error' ? SV.icon('close', 30) : '';
    el.innerHTML = (ic ? `<div class="toast-ic">${ic}</div>` : '') + `<div>${U.esc(msg)}</div>`;
    root.innerHTML = '';
    root.appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 250);
    }, ms || (type === 'info' ? 1600 : 1900));
  };

  /* ----------------------------- Modal ----------------------------- */
  /**
   * ui.modal({ title, body, okText, cancelText, width, onOpen(modal, close), onOk(modal) })
   * -> Promise: giá trị trả về của onOk (hoặc true), null nếu đóng/huỷ
   */
  ui.modal = (o) =>
    new Promise((resolve) => {
      const bg = document.createElement('div');
      bg.className = 'modal-bg';
      const foot = o.hideFooter
        ? ''
        : `<div class="modal-ft">${o.cancelText === false ? '' : `<button type="button" class="btn btn-text" data-m="cancel">${o.cancelText || 'Trở lại'}</button>`}<button type="button" class="btn btn-primary" data-m="ok">${o.okText || 'OK'}</button></div>`;
      bg.innerHTML = `<div class="modal ${o.cls || ''}" style="width:${o.width || 500}px" role="dialog" aria-modal="true">${o.title ? `<div class="modal-hd">${o.title}</div>` : ''}<div class="modal-bd">${o.body || ''}</div>${foot}</div>`;
      document.getElementById('modal-root').appendChild(bg);
      const modal = bg.firstElementChild;
      const onKey = (e) => e.key === 'Escape' && close(null);
      function close(val) {
        bg.remove();
        document.removeEventListener('keydown', onKey);
        resolve(val);
      }
      document.addEventListener('keydown', onKey);
      bg.addEventListener('mousedown', (e) => e.target === bg && close(null));
      modal.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-m]');
        if (!b) return;
        if (b.dataset.m === 'cancel') return close(null);
        if (o.onOk) {
          const r = await o.onOk(modal);
          if (r === false) return;
          close(r === undefined ? true : r);
        } else close(true);
      });
      if (o.onOpen) o.onOpen(modal, close);
      const first = modal.querySelector('input:not([type=radio]):not([type=checkbox]),textarea');
      if (first) setTimeout(() => first.focus(), 30);
    });

  /**
   * Hộp báo thành công (đặt hàng / thanh toán): dấu tích, tiêu đề, số tiền và bảng tóm tắt.
   * rows: [[nhãn, giá trị HTML đã escape], ...]. Trả về Promise như ui.modal (true = nút chính).
   */
  ui.success = ({ title, sub, amountLabel, amount, rows, okText, cancelText }) =>
    ui.modal({
      width: 460, cls: 'ok-modal', okText, cancelText,
      body: `<div class="ok-sheet" role="status"><div class="ok-halo">${SV.icon('check', 34)}</div><h3>${title}</h3>${sub ? `<p class="ok-sub">${sub}</p>` : ''}${amount ? `<div class="ok-amount"><span>${amountLabel || 'Tổng thanh toán'}</span><b>${amount}</b></div>` : ''}<dl class="ok-rows">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl></div>`,
    });

  /**
   * Pháo bông chúc mừng (~4 giây, canvas, không thư viện): hai ống giấy màu bắn chéo từ hai góc dưới, mưa giấy màu từ trên,
   * và năm chùm pháo hoa nổ so le trên cao. Chuyển động tính theo thời gian thật nên màn 60Hz hay 120Hz đều như nhau.
   * key: chỉ bắn một lần cho mỗi key trong phiên (trang vẽ lại nhiều lần không bắn lại). Tắt khi người dùng chọn giảm chuyển động.
   */
  const celebrated = new Set();
  ui.confetti = (key) => {
    if (key && celebrated.has(key)) return;
    if (key) celebrated.add(key);
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const c = document.createElement('canvas');
    c.className = 'confetti';
    c.setAttribute('aria-hidden', 'true');
    document.body.appendChild(c);
    const ctx = c.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = innerWidth, H = innerHeight;
    c.width = W * dpr;
    c.height = H * dpr;
    ctx.scale(dpr, dpr);
    const colors = ['#f4511e', '#ff7337', '#ffd424', '#00bfa5', '#26aa99', '#4f8df5', '#ff4d8d', '#a66cff'];
    const pick = () => colors[Math.floor(Math.random() * colors.length)];
    const rnd = (a, b) => a + Math.random() * (b - a);
    const parts = [];
    const k = Math.max(0.75, Math.min(1.25, H / 800)); // lực bắn theo chiều cao màn hình
    // Giấy màu: bắn lên rồi rơi lơ lửng, vừa lật vừa đung đưa.
    const paper = (x, y, vx, vy, delay) =>
      parts.push({ kind: 'paper', x, y, vx, vy, g: 0.42, drag: 0.982, maxFall: rnd(1.6, 2.6), w: rnd(7, 12), h: rnd(4, 7), r: rnd(0, 6.28), vr: rnd(-0.18, 0.18), sway: rnd(0, 6.28), color: pick(), born: delay, life: rnd(2600, 3800) });
    const cannon = (x, dir, delay) => {
      for (let i = 0; i < 90; i++) {
        const a = -Math.PI / 2 + dir * rnd(0.12, 0.62), v = rnd(16, 27) * k;
        paper(x, H + 10, Math.cos(a) * v, Math.sin(a) * v, delay + rnd(0, 120));
      }
    };
    cannon(0, 1, 0);
    cannon(W, -1, 0);
    for (let i = 0; i < 70; i++) paper(rnd(0, W), rnd(-60, -10), rnd(-1, 1), rnd(0, 1.5), rnd(300, 1400));
    // Pháo hoa: chùm tia nổ tròn có vệt sáng, thêm chấm lấp lánh, tắt nhanh.
    const firework = (x, y, delay) => {
      const color = pick(), n = 64;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rnd(-0.05, 0.05), v = rnd(4.5, 8.5) * k;
        parts.push({ kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 0.07, drag: 0.955, size: rnd(1.6, 2.8), color: Math.random() < 0.25 ? '#fff3b0' : color, born: delay, life: rnd(900, 1300) });
      }
      parts.push({ kind: 'flash', x, y, born: delay, life: 260, color });
    };
    [[0.5, 0.2, 150], [0.22, 0.28, 500], [0.78, 0.25, 800], [0.36, 0.14, 1150], [0.66, 0.16, 1450]].forEach(([fx, fy, d]) => firework(W * fx, H * fy, d));
    let raf, last = performance.now();
    const t0 = last;
    function frame(now) {
      const dt = Math.min(3, (now - last) / 16.67); // 1 = một khung hình 60Hz
      last = now;
      const el = now - t0;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
      let alive = 0;
      for (const p of parts) {
        const age = el - p.born;
        if (age < 0) {
          alive++;
          continue;
        }
        if (age > p.life || p.dead) {
          p.dead = true;
          continue;
        }
        alive++;
        const fade = Math.min(1, (p.life - age) / 450);
        if (p.kind === 'flash') {
          const q = age / p.life;
          ctx.globalAlpha = 1 - q;
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 70 * k);
          g.addColorStop(0, 'rgba(255,255,255,.9)');
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 70 * k, 0, 6.29);
          ctx.fill();
          continue;
        }
        const d = Math.pow(p.drag, dt);
        p.vx *= d;
        p.vy = p.vy * d + p.g * dt;
        if (p.kind === 'paper') {
          if (p.vy > p.maxFall) p.vy = p.maxFall; // giấy rơi chậm như có lực cản không khí
          p.sway += 0.06 * dt;
          p.x += (p.vx + Math.sin(p.sway) * 0.9) * dt;
          p.y += p.vy * dt;
          p.r += p.vr * dt;
          ctx.globalAlpha = fade;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.r);
          ctx.scale(1, Math.cos(p.sway * 2.2)); // lật như giấy thật
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        } else {
          const px = p.x, py = p.y;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          ctx.globalAlpha = Math.min(1, (p.life - age) / 350);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(px - p.vx * 2.5, py - p.vy * 2.5);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      if (alive) raf = requestAnimationFrame(frame);
      else stop();
    }
    // Rời trang giữa chừng: dọn ngay.
    function stop() {
      cancelAnimationFrame(raf);
      c.remove();
      removeEventListener('hashchange', stop);
    }
    addEventListener('hashchange', stop);
    raf = requestAnimationFrame(frame);
  };

  ui.confirm = (msg, opts) =>
    ui.modal({ body: `<div class="confirm-msg">${msg}</div>`, okText: (opts && opts.okText) || 'Xác nhận', cancelText: (opts && opts.cancelText) || 'Trở lại', width: 440 }).then(Boolean);

  /* ----------------------------- Form helpers ----------------------------- */
  ui.formData = (root) => {
    const o = {};
    root.querySelectorAll('input[name],select[name],textarea[name]').forEach((el) => {
      if (el.type === 'checkbox') o[el.name] = el.checked;
      else if (el.type === 'radio') {
        if (el.checked) o[el.name] = el.value;
      } else o[el.name] = el.value;
    });
    return o;
  };
  ui.fieldError = (root, field, msg) => {
    root.querySelectorAll('.err').forEach((el) => { el.classList.remove('err'); el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby'); });
    root.querySelectorAll('.msg').forEach((el) => (el.textContent = ''));
    const el = field && root.querySelector(`[name="${field}"]`);
    if (el) {
      el.classList.add('err'); el.setAttribute('aria-invalid', 'true');
      const m = el.closest('.fld') && el.closest('.fld').querySelector('.msg');
      if (m) { m.textContent = msg; m.id = m.id || 'field-error-' + crypto.randomUUID(); m.setAttribute('role', 'alert'); el.setAttribute('aria-describedby', m.id); }
      el.focus();
    } else if (msg) ui.toast(msg, 'error');
  };

  ui.requireLogin = () => {
    if (SV.auth.current()) return true;
    const next = location.hash.slice(1) || '/';
    SV.go('/login?next=' + encodeURIComponent(next));
    return false;
  };

  /* ----------------------------- Địa chỉ ----------------------------- */
  ui.addressModal = (a) => {
    a = a || {};
    const v = (k) => U.esc(a[k] || '');
    return ui.modal({
      title: a.id ? 'Cập nhật địa chỉ' : 'Địa chỉ mới',
      width: 560,
      okText: 'Hoàn thành',
      body: `<div class="form-grid">
        <div class="fld"><input class="input" name="name" placeholder="Họ và tên" value="${v('name')}"><div class="msg"></div></div>
        <div class="fld"><input class="input" name="phone" placeholder="Số điện thoại" value="${v('phone')}"><div class="msg"></div></div>
        <div class="fld full"><select class="input" name="province"><option value="">Tỉnh/Thành phố</option>${['Hà Nội', 'Đà Nẵng', 'TP. Hồ Chí Minh'].map((p) => `<option ${p === a.province ? 'selected' : ''}>${p}</option>`).join('')}</select><div class="msg"></div></div>
        <div class="fld full"><input class="input" name="ward" placeholder="Phường/Xã" value="${v('ward')}"><div class="msg"></div></div>
        <div class="fld full"><input class="input" name="detail" placeholder="Địa chỉ cụ thể (số nhà, tên đường…)" value="${v('detail')}"><div class="msg"></div></div>
        <div class="fld full"><div class="lbl-sm">Loại địa chỉ:</div><div class="seg">
          <label><input type="radio" name="type" value="home" ${a.type !== 'office' ? 'checked' : ''}><span>Nhà Riêng</span></label>
          <label><input type="radio" name="type" value="office" ${a.type === 'office' ? 'checked' : ''}><span>Văn Phòng</span></label></div></div>
        <label class="check full"><input type="checkbox" name="isDefault" ${a.isDefault ? 'checked disabled' : ''}> Đặt làm địa chỉ mặc định</label>
        <p class="note full">EZMART hiện hỗ trợ giao tại Hà Nội, Đà Nẵng và TP. Hồ Chí Minh.</p>
      </div>`,
      async onOk(m) {
        const data = ui.formData(m);
        data.id = a.id;
        if (a.isDefault) data.isDefault = true;
        const r = await SV.address.save(data);
        if (!r.ok) {
          ui.fieldError(m, r.field, r.error);
          return false;
        }
        return r.address;
      },
    });
  };

  /* ----------------------------- Voucher ----------------------------- */
  /** v: voucher; opts: { shop, state: 'ok'|'disabled', reason, action (html) } */
  ui.voucher = (v, opts) => {
    opts = opts || {};
    const shop = opts.shop;
    const left = shop
      ? `<div class="v-left v-shop">${ui.avatar(shop.name, 44)}<span>${U.esc(shop.name)}</span></div>`
      : v.kind === 'ship'
      ? `<div class="v-left v-ship">${SV.icon('truck', 30)}<span>FREESHIP</span></div>`
      : `<div class="v-left v-sv">${SV.logo(34)}<span>ShopVui</span></div>`;
    const title = v.label ? v.label : v.type === 'percent' ? `Giảm ${v.value}%` : `Giảm ${U.money(v.value)}`;
    const desc = v.desc || `${v.type === 'percent' ? `Giảm ${v.value}%` : 'Giảm ' + U.money(v.value)}${v.maxDiscount ? ' tối đa ' + U.money(v.maxDiscount) : ''} · Đơn từ ${U.money(v.minSpend)}`;
    return `<div class="voucher ${opts.state === 'disabled' ? 'disabled' : ''}">
      ${left}
      <div class="v-mid"><b>${U.esc(title)}</b><span>${U.esc(desc)}</span>${opts.reason ? `<em>${U.esc(opts.reason)}</em>` : `<small>${v.expires ? 'HSD: ' + U.fmtDate(v.expires) : 'Mã: ' + v.code}</small>`}</div>
      <div class="v-right">${opts.action || ''}</div>
    </div>`;
  };

  /** Mô tả ngắn voucher shop: "Giảm ₫10k" / "Giảm 5%" */
  ui.shopVoucherShort = (v) => (v.type === 'percent' ? `Giảm ${v.value}%` : `Giảm ₫${U.compact(v.value)}`);

  SV.ui = ui;
})();
