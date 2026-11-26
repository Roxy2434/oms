/* =========================================================
   Đăng nhập / Đăng ký – Route: #/login, #/register
   ========================================================= */
(function () {
  'use strict';
  const U = SV.U;
  const ui = SV.ui;

  const brand = () => `<div class="auth-brand">${SV.logo(170)}<div class="brand-name">ShopVui</div><div class="slogan">Mua sắm vui – Giá hời mỗi ngày</div></div>`;
  const pwField = (name, ph, ac) =>
    `<div class="fld pw"><input class="input" name="${name}" type="password" aria-label="${ph}" placeholder="${ph}" autocomplete="${ac}" required><button type="button" class="eye" data-eye aria-label="Hiện mật khẩu">${SV.icon('eyeOff', 18)}</button><div class="msg"></div></div>`;
  function bindEyes(el) {
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-eye]');
      if (!b) return;
      const i = b.parentElement.querySelector('input');
      i.type = i.type === 'password' ? 'text' : 'password';
      b.innerHTML = SV.icon(i.type === 'password' ? 'eyeOff' : 'eye', 18);
    });
  }
  let challengeScript;
  function loadChallenge() {
    if (window.turnstile) return Promise.resolve();
    if (!challengeScript) challengeScript = new Promise((resolve, reject) => {
      const script = document.createElement('script'); script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      const timer = setTimeout(() => { challengeScript = null; reject(new Error('Mạng chậm chưa tải kịp bước xác minh bảo mật. Vui lòng tải lại trang.')); }, 8000);
      script.onload = () => { clearTimeout(timer); resolve(); };
      script.onerror = () => { clearTimeout(timer); challengeScript = null; reject(new Error('Không tải được xác minh chống bot. Hãy tải lại trang.')); };
      document.head.append(script);
    });
    return challengeScript;
  }
  const nextOf = (ctx) => {
    const n = ctx.query.get('next') || '/';
    return n.startsWith('/') && !n.startsWith('/login') && !n.startsWith('/register') ? n : '/';
  };
  function social(el) {
    el.querySelectorAll('[data-social]').forEach((b) => b.addEventListener('click', () => ui.toast('Tính năng liên kết mạng xã hội đang bảo trì. Vui lòng đăng nhập bằng tài khoản ShopVui.', 'info', 2200)));
  }

  SV.pages.login = {
    title: 'Đăng nhập | ShopVui',
    render(el, ctx) {
      if (SV.auth.current()) return SV.go(nextOf(ctx));
      const next = nextOf(ctx);
      el.innerHTML = `<div class="auth-bg"><div class="auth-wrap">${brand()}
        <form class="auth-card" data-login novalidate>
          <h2>Đăng nhập</h2>
          <p>Đăng nhập để mua sắm, theo dõi đơn hàng và sử dụng Ví ShopVuiPay.</p>
          <div class="fld"><input class="input" name="account" aria-label="Email, số điện thoại hoặc tên đăng nhập" placeholder="Email/Số điện thoại/Tên đăng nhập" autocomplete="username" required><div class="msg"></div></div>
          ${pwField('pw', 'Mật khẩu', 'current-password')}
          <div class="auth-err" data-err role="alert"></div>
          <button class="btn btn-primary btn-block btn-lg" type="submit">ĐĂNG NHẬP</button>
          <div class="auth-links"><button type="button" class="link" data-forgot>Quên mật khẩu</button><button type="button" class="link" data-forgot>Đăng nhập với SMS</button></div>
          <div class="or">HOẶC</div>
          <div class="social"><button type="button" class="btn" data-social>${SV.icon('facebook', 18)} Facebook</button><button type="button" class="btn" data-social><b class="g">G</b> Google</button></div>
          <div class="auth-foot">Bạn mới biết đến ShopVui? <a href="#/register${next !== '/' ? '?next=' + encodeURIComponent(next) : ''}">Đăng ký</a></div>
        </form></div></div>`;
      bindEyes(el);
      social(el);
      const f = el.querySelector('[data-login]');
      f.querySelectorAll('[data-forgot]').forEach((b) => b.addEventListener('click', () => ui.toast('Vui lòng liên hệ tổng đài CSKH 1900 6868 để được hỗ trợ khôi phục tài khoản.', 'info', 2600)));
      f.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = f.querySelector('[type=submit]'); if (btn.disabled) return;
        btn.disabled = true; f.setAttribute('aria-busy', 'true');
        const r = await SV.auth.login(f.account.value, f.pw.value);
        btn.disabled = false; f.setAttribute('aria-busy', 'false');
        if (!r.ok) {
          f.querySelector('[data-err]').textContent = r.error;
          return;
        }
        ui.toast('Đăng nhập thành công');
        SV.go(next);
      });
      if (f.isConnected) f.account.focus({ preventScroll: true });
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
          <p>Ưu đãi thành viên mới — tặng ngay <b>6.000.000₫</b> vào <b>Ví ShopVuiPay</b> khi mở tài khoản.</p>
          <div class="fld"><input class="input" name="username" aria-label="Tên đăng nhập" placeholder="Tên đăng nhập" autocomplete="username" required><div class="msg"></div></div>
          <div class="fld"><input class="input" name="contact" aria-label="Email hoặc số điện thoại" placeholder="Email hoặc Số điện thoại" autocomplete="email" required><div class="msg"></div></div>
          ${pwField('password', 'Mật khẩu', 'new-password')}
          ${pwField('confirm', 'Nhập lại mật khẩu', 'new-password')}
          <div data-challenge aria-label="Xác minh chống bot"></div>
          <ul class="pw-rules"><li data-rule="len">8–16 ký tự</li><li data-rule="case">Có chữ hoa và chữ thường</li><li data-rule="num">Có ít nhất 1 chữ số</li></ul>
          <div class="auth-err" data-err role="alert"></div>
          <button class="btn btn-primary btn-block btn-lg" type="submit">ĐĂNG KÝ</button>
          <div class="or">HOẶC</div>
          <div class="social"><button type="button" class="btn" data-social>${SV.icon('facebook', 18)} Facebook</button><button type="button" class="btn" data-social><b class="g">G</b> Google</button></div>
          <p class="terms">Bằng việc đăng ký, bạn đã đồng ý với ShopVui về <a class="link" href="#/help">Điều khoản dịch vụ</a> &amp; <a class="link" href="#/help">Chính sách bảo mật</a></p>
          <div class="auth-foot">Bạn đã có tài khoản? <a href="#/login">Đăng nhập</a></div>
        </form></div></div>`;
      bindEyes(el);
      social(el);
      const f = el.querySelector('[data-register]');
      let captchaToken = '', widget, captchaRequired = false;
      const submit = f.querySelector('[type=submit]'); submit.disabled = true;
      SV.account.call('security').then(async cfg => {
        captchaRequired = cfg.captchaRequired;
        if (!captchaRequired) { submit.disabled = false; return; }
        await loadChallenge(); if (!f.isConnected) return;
        widget = window.turnstile.render(f.querySelector('[data-challenge]'), { sitekey: cfg.siteKey, action: 'register',
          callback: token => { captchaToken = token; submit.disabled = false; },
          'expired-callback': () => { captchaToken = ''; submit.disabled = true; },
          'error-callback': () => { captchaToken = ''; submit.disabled = true; f.querySelector('[data-err]').textContent = 'Xác minh chống bot chưa thành công. Vui lòng tải lại trang.'; }
        });
      }).catch(e => { f.querySelector('[data-err]').textContent = e.message; });
      f.password.addEventListener('input', () => {
        const v = f.password.value;
        const set = (k, ok) => f.querySelector(`[data-rule="${k}"]`).classList.toggle('ok', ok);
        set('len', v.length >= 8 && v.length <= 16);
        set('case', /[a-z]/.test(v) && /[A-Z]/.test(v));
        set('num', /\d/.test(v));
      });
      f.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (f.password.value !== f.confirm.value) return ui.fieldError(f, 'confirm', 'Mật khẩu nhập lại không khớp');
        const btn = f.querySelector('[type=submit]'); if (btn.disabled) return;
        btn.disabled = true; f.setAttribute('aria-busy', 'true');
        if (captchaRequired && !captchaToken) { btn.disabled = false; f.setAttribute('aria-busy', 'false'); f.querySelector('[data-err]').textContent = 'Vui lòng hoàn thành xác minh chống bot.'; return; }
        const r = await SV.auth.register({ username: f.username.value, contact: f.contact.value, password: f.password.value, captchaToken });
        if (!r.ok && captchaRequired && widget !== undefined) { captchaToken = ''; window.turnstile.reset(widget); }
        btn.disabled = false; f.setAttribute('aria-busy', 'false');
        if (!r.ok) { f.querySelector('[data-err]').textContent = r.error; if (r.field) ui.fieldError(f, r.field, r.error); return; }
        ui.toast('Đăng ký thành công! Chào mừng ' + r.user.username);
        SV.go(next);
      });
      if (f.isConnected) f.username.focus({ preventScroll: true });
    },
  };
})();
