/* =========================================================
   utils.js – Hàm tiện ích dùng chung (định dạng, chuỗi, ngẫu nhiên có seed…)
   ========================================================= */
(function () {
  'use strict';
  const U = {};

  U.$ = (sel, root) => (root || document).querySelector(sel);
  U.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /** Chống chèn HTML khi in dữ liệu người dùng ra giao diện */
  U.esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /** 129000 -> "₫129.000" */
  U.money = (n) => '₫' + Math.round(n || 0).toLocaleString('vi-VN');
  /** Giá có ký hiệu ₫ nhỏ (dùng trong thẻ sản phẩm) */
  U.moneyHtml = (n) => '<small>₫</small>' + Math.round(n || 0).toLocaleString('vi-VN');

  /** 1234 -> "1,2k" ; 2300000 -> "2,3tr" */
  U.compact = (n) => {
    n = n || 0;
    const f = (x) => (Math.floor(x * 10) / 10).toString().replace('.', ',');
    if (n >= 1e6) return f(n / 1e6) + 'tr';
    if (n >= 1e3) return f(n / 1e3) + 'k';
    return String(n);
  };

  /** Bỏ dấu tiếng Việt để tìm kiếm không phân biệt dấu */
  U.normalize = (s) =>
    String(s || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .trim();

  /** Tách chuỗi thành các từ đã bỏ dấu: "Áo sơ-mi" -> ["ao","so","mi"] */
  U.words = (s) => U.normalize(s).split(/[^a-z0-9]+/).filter(Boolean);
  /** Chuỗi s có từ nào bắt đầu bằng cụm q không (không phân biệt dấu) */
  U.wordMatch = (s, q) => {
    const n = U.words(q).join(' ');
    return !!n && (' ' + U.words(s).join(' ')).includes(' ' + n);
  };

  /** Băm chuỗi -> số nguyên 32 bit (FNV-1a) */
  U.hash = (str) => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };

  /** Bộ sinh số ngẫu nhiên có seed (mulberry32) – để dữ liệu sinh ra luôn giống nhau */
  U.rng = (seed) => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  U.pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  U.shuffle = (r, arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  U.uid = (prefix) => (prefix || '') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /** Mã đơn hàng kiểu "261102K7QZ3M8A" */
  U.orderCode = (date) => {
    const d = date || new Date();
    const p = (x) => String(x).padStart(2, '0');
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate()) + s;
  };

  const pad = (x) => String(x).padStart(2, '0');
  U.fmtDate = (iso, withTime) => {
    const d = new Date(iso);
    const s = `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
    return withTime ? `${pad(d.getHours())}:${pad(d.getMinutes())} ${s}` : s;
  };
  /** "5 Th11" */
  U.fmtDay = (d) => `${d.getDate()} Th${d.getMonth() + 1}`;
  U.addDays = (d, n) => new Date(d.getTime() + n * 86400000);
  U.daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

  U.timeAgo = (iso) => {
    const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (s < 60) return 'Vừa xong';
    if (s < 3600) return Math.floor(s / 60) + ' phút trước';
    if (s < 86400) return Math.floor(s / 3600) + ' giờ trước';
    if (s < 86400 * 30) return Math.floor(s / 86400) + ' ngày trước';
    return U.fmtDate(iso);
  };

  U.debounce = (fn, ms) => {
    let t;
    return (...a) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...a), ms);
    };
  };

  /** Tạo query string từ object, bỏ qua giá trị rỗng */
  U.qs = (obj) => {
    const p = new URLSearchParams();
    Object.keys(obj).forEach((k) => {
      const v = obj[k];
      if (v !== undefined && v !== null && v !== '' && v !== false) p.set(k, v);
    });
    const s = p.toString();
    return s ? '?' + s : '';
  };

  /** Ảnh thay thế (emoji) khi không tải được ảnh sản phẩm (ví dụ: mất mạng) */
  U.placeholder = (emoji) =>
    'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#fff4ef"/><text x="50" y="55" font-size="44" text-anchor="middle" dominant-baseline="middle">${emoji || '🛍️'}</text></svg>`
    );

  /**
   * "Băm" mật khẩu cho bản demo (cyrb53). KHÔNG an toàn cho hệ thống thật –
   * hệ thống thật phải băm ở máy chủ bằng bcrypt/argon2 kèm salt.
   */
  U.hashPassword = (str, seed = 2026) => {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
      ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  };

  U.maskName = (name) => (name.length <= 2 ? name[0] + '*' : name[0] + '*****' + name[name.length - 1]);

  window.SV = window.SV || {};
  SV.U = U;
  SV.pages = {}; // mỗi file trong pages/ đăng ký một trang vào đây

  /* ---------- Event bus đơn giản: các module báo cho nhau khi dữ liệu đổi ---------- */
  const listeners = {};
  SV.on = (evt, fn) => {
    (listeners[evt] = listeners[evt] || []).push(fn);
  };
  SV.emit = (evt, data) => (listeners[evt] || []).forEach((fn) => fn(data));

  /** Điều hướng trong SPA */
  SV.go = (path) => {
    if (location.hash === '#' + path) SV.router && SV.router.render();
    else location.hash = path;
  };

  /** Lỗi tải ảnh -> dùng ảnh emoji thay thế */
  SV.imgErr = (el) => {
    el.onerror = null;
    el.src = U.placeholder(el.dataset.emoji);
  };
})();
