/* =========================================================
   Đăng nhập / Đăng ký – Route: #/login, #/register
   ========================================================= */
(function () {
  'use strict';
  const U = SV.U;
  const ui = SV.ui;

  const brand = () => `<div class="auth-brand">${SV.logo(170)}<div class="brand-name">ShopVui</div><div class="slogan">Mua sắm vui – Giá hời mỗi ngày</div></div>`;
  const pwField = (name, ph, ac) =>
    `<div class="fld pw"><input class="input" name="${name}" type="password" placeholder="${ph}" autocomplete="${ac}"><button type="button" class="eye" data-eye aria-label="Hiện mật khẩu">${SV.icon('eyeOff', 18)}</button><div class="msg"></div></div>`;
  function bindEyes(el) {
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-eye]');
      if (!b) return;
      const i = b.parentElement.querySelector('input');
      i.type = i.type === 'password' ? 'text' : 'password';
      b.innerHTML = SV.icon(i.type === 'password' ? 'eyeOff' : 'eye', 18);
    });
  }
  const nextOf = (ctx) => {
    const n = ctx.query.get('next') || '/';
    return n.startsWith('/') && !n.startsWith('/login') && !n.startsWith('/register') ? n : '/';
  };
  function social(el) {
    el.querySelectorAll('[data-social]').forEach((b) => b.addEventListener('click', () => ui.toast('Đăng nhập bằng mạng xã hội không có trong bản demo', 'info', 2200)));
  }

  SV.pages.login = {
    title: 'Đăng nhập | ShopVui',
    render(el, ctx) {
      if (SV.auth.current()) return SV.go(nextOf(ctx));
      const next = nextOf(ctx);
      el.innerHTML = `<div class="auth-bg"><div class="auth-wrap">${brand()}
        <form class="auth-card" data-login novalidate>
          <h2>Đăng nhập</h2>
          <div class="demo-hint">${SV.icon('help', 16)} Tài khoản demo: <b>demo</b> / <b>Demo1234</b> <button type="button" class="link" data-fill>Điền nhanh</button></div>
          <div class="fld"><input class="input" name="account" placeholder="Email/Số điện thoại/Tên đăng nhập" autocomplete="username"><div class="msg"></div></div>
          ${pwField('pw', 'Mật khẩu', 'current-password')}
          <div class="auth-err" data-err></div>
          <button class="btn btn-primary btn-block btn-lg" type="submit">ĐĂNG NHẬP</button>
          <div class="auth-links"><button type="button" class="link" data-forgot>Quên mật khẩu</button><button type="button" class="link" data-forgot>Đăng nhập với SMS</button></div>
          <div class="or">HOẶC</div>
          <div class="social"><button type="button" class="btn" data-social>${SV.icon('facebook', 18)} Facebook</button><button type="button" class="btn" data-social><b class="g">G</b> Google</button></div>
          <div class="auth-foot">Bạn mới biết đến ShopVui? <a href="#/register${next !== '/' ? '?next=' + encodeURIComponent(next) : ''}">Đăng ký</a></div>
        </form></div></div>`;
      bindEyes(el);
      social(el);
      const f = el.querySelector('[data-login]');
      f.querySelector('[data-fill]').addEventListener('click', () => {
        f.account.value = 'demo';
        f.pw.value = 'Demo1234';
      });
      f.querySelectorAll('[data-forgot]').forEach((b) => b.addEventListener('click', () => ui.toast('Bản demo không gửi email/SMS. Hãy dùng tài khoản demo hoặc Đăng ký tài khoản mới.', 'info', 2600)));
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        const r = SV.auth.login(f.account.value, f.pw.value);
        if (!r.ok) {
          f.querySelector('[data-err]').textContent = r.error;
          return;
        }
        ui.toast('Đăng nhập thành công');
        SV.go(next);
      });
      setTimeout(() => f.account.focus(), 50);
    },
  };

  SV.pages.register = {
    title: 'Đăng ký | ShopVui',
    render(el, ctx) {
      if (SV.auth.current()) return SV.go('/');
      const next = nextOf(ctx);
      el.innerHTML = `<div class="auth-bg"><div class="auth-wrap">${brand()}
        <form class="auth-card" data-register novalidate>
          <h2>Đăng ký</h2>
          <div class="fld"><input class="input" name="username" placeholder="Tên đăng nhập" autocomplete="username"><div class="msg"></div></div>
          <div class="fld"><input class="input" name="contact" placeholder="Email hoặc Số điện thoại" autocomplete="email"><div class="msg"></div></div>
          ${pwField('password', 'Mật khẩu', 'new-password')}
          ${pwField('confirm', 'Nhập lại mật khẩu', 'new-password')}
          <ul class="pw-rules"><li data-rule="len">8–16 ký tự</li><li data-rule="case">Có chữ hoa và chữ thường</li><li data-rule="num">Có ít nhất 1 chữ số</li></ul>
          <button class="btn btn-primary btn-block btn-lg" type="submit">ĐĂNG KÝ</button>
          <div class="or">HOẶC</div>
          <div class="social"><button type="button" class="btn" data-social>${SV.icon('facebook', 18)} Facebook</button><button type="button" class="btn" data-social><b class="g">G</b> Google</button></div>
          <p class="terms">Bằng việc đăng ký, bạn đã đồng ý với ShopVui về <a class="link" href="#/help">Điều khoản dịch vụ</a> &amp; <a class="link" href="#/help">Chính sách bảo mật</a></p>
          <div class="auth-foot">Bạn đã có tài khoản? <a href="#/login">Đăng nhập</a></div>
        </form></div></div>`;
      bindEyes(el);
      social(el);
      const f = el.querySelector('[data-register]');
      f.password.addEventListener('input', () => {
        const v = f.password.value;
        const set = (k, ok) => f.querySelector(`[data-rule="${k}"]`).classList.toggle('ok', ok);
        set('len', v.length >= 8 && v.length <= 16);
        set('case', /[a-z]/.test(v) && /[A-Z]/.test(v));
        set('num', /\d/.test(v));
      });
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        if (f.password.value !== f.confirm.value) return ui.fieldError(f, 'confirm', 'Mật khẩu nhập lại không khớp');
        const r = SV.auth.register({ username: f.username.value, contact: f.contact.value, password: f.password.value });
        if (!r.ok) return ui.fieldError(f, r.field, r.error);
        ui.toast('Đăng ký thành công! Chào mừng ' + r.user.username);
        SV.go(next);
      });
      setTimeout(() => f.username.focus(), 50);
    },
  };
})();
