/* =========================================================
   Trang chủ: banner, lối tắt, danh mục, Flash Sale, Mall,
   Tìm kiếm hàng đầu, Gợi ý hôm nay
   ========================================================= */
(function () {
  'use strict';
  const U = SV.U;
  const C = SV.catalog;
  const ui = SV.ui;

  const BANNERS = [
    { cls: 'bn-1', kicker: 'SIÊU SALE SINH NHẬT', title: '11.11', sub: 'Giảm đến 50% · Voucher Xtra đến ₫500K', cta: 'Săn ngay', link: '#/flash-sale', imgs: ['p100', 'p88', 'p6'] },
    { cls: 'bn-2', kicker: 'FREESHIP XTRA', title: '0Đ', sub: 'Miễn phí vận chuyển cho mọi đơn hàng', cta: 'Lưu mã', link: '#/user/vouchers', imgs: ['p84', 'p163', 'p186'] },
    { cls: 'bn-3', kicker: 'SHOPVUI MALL', title: 'Chính Hãng', sub: 'Thương hiệu lớn · Trả hàng miễn phí 15 ngày', cta: 'Khám phá', link: '#/search?mall=1', imgs: ['p78', 'p123', 'p159'] },
    { cls: 'bn-4', kicker: 'GIAO HỎA TỐC 2H', title: 'Đi Chợ', sub: 'Rau củ, trái cây, thịt cá tươi mỗi ngày', cta: 'Đi chợ', link: '#/category/bach-hoa-online', imgs: ['p40', 'p30', 'p17'] },
    { cls: 'bn-5', kicker: 'BEAUTY DAY', title: 'Đẹp Xinh', sub: 'Mỹ phẩm, nước hoa giảm đến 40%', cta: 'Mua ngay', link: '#/category/sac-dep', imgs: ['p4', 'p8', 'p2'] },
  ];
  const SIDE = [
    { cls: 'bn-s1', kicker: 'VOUCHER XTRA', title: '₫100K', sub: 'Cho đơn từ ₫1 triệu', link: '#/user/vouchers', img: 'p101' },
    { cls: 'bn-s2', kicker: 'HOÀN XU', title: '15%', sub: 'Khi thanh toán ShopVuiPay', link: '#/category/dien-thoai-phu-kien', img: 'p107' },
  ];
  const QUICK = [
    { ic: '⚡', bg: '#fff1ec', t: 'Khung Giờ Săn Sale', link: '#/flash-sale' },
    { ic: '🚚', bg: '#e6faf6', t: 'Miễn Phí Ship - Có ShopVui', link: '#/search?freeship=1' },
    { ic: '🎟️', bg: '#fff6e5', t: 'Voucher Giảm Đến 1 Triệu', link: '#/user/vouchers' },
    { ic: '🌏', bg: '#eaf3ff', t: 'Hàng Quốc Tế', link: '#/search?loc=' + encodeURIComponent('Nước ngoài') },
    { ic: '🏬', bg: '#ffecef', t: 'ShopVui Mall', link: '#/search?mall=1' },
    { ic: '💎', bg: '#f3edff', t: 'Hàng Hiệu Giá Tốt', link: '#/category/dong-ho' },
    { ic: '🥬', bg: '#eefbea', t: 'Đi Chợ Siêu Tốc', link: '#/category/bach-hoa-online' },
    { ic: '💄', bg: '#fff0f6', t: 'Làm Đẹp Giá Hời', link: '#/category/sac-dep' },
    { ic: '🔥', bg: '#fff3e8', t: 'Bán Chạy Nhất', link: '#/search?sort=sales' },
    { ic: '🆕', bg: '#ecf6ff', t: 'Hàng Mới Về', link: '#/search?sort=ctime' },
  ];
  const TOP = [
    { kw: 'Tai nghe', pid: 'p100' },
    { kw: 'Áo sơ mi nam', pid: 'p83' },
    { kw: 'Son môi', pid: 'p4' },
    { kw: 'Giày sneaker', pid: 'p91' },
    { kw: 'Chảo chống dính', pid: 'p68' },
    { kw: 'Nước hoa nữ', pid: 'p8' },
  ];
  const PAGE = 48;

  const pimg = (id) => {
    const p = C.get(id);
    return p ? ui.img(p.thumbnail, C.emoji(p)) : '';
  };

  function banner(b) {
    return `<a class="bn ${b.cls}" href="${b.link}"><div class="bn-txt"><div class="bn-kicker">${b.kicker}</div><div class="bn-title">${b.title}</div><div class="bn-sub">${b.sub}</div><span class="bn-cta">${b.cta} ›</span></div><div class="bn-imgs">${b.imgs.map(pimg).join('')}</div></a>`;
  }

  function flashItem({ product: p, flash: f }) {
    const pct = Math.round((f.sold / f.quota) * 100);
    const label = pct >= 80 ? 'Sắp cháy hàng' : f.sold ? 'Đã bán ' + f.sold : 'Đang bán chạy';
    return `<a class="fs-item" href="#/product/${p.id}"><div class="fs-img">${ui.img(p.thumbnail, C.emoji(p))}${ui.discountFlag(C.discountOf(p))}</div>
      <div class="fs-price">${U.money(f.flashPrice)}</div>
      <div class="fs-bar"><i style="width:${Math.max(12, pct)}%"></i><span>${pct >= 80 ? '🔥 ' : ''}${label}</span></div></a>`;
  }

  function countdownHtml() {
    return '<span class="countdown" data-countdown><span>00</span><i>:</i><span>00</span><i>:</i><span>00</span></span>';
  }
  /** Cập nhật đồng hồ đếm ngược Flash Sale; trả về hàm dọn dẹp */
  SV.startCountdown = (root) => {
    const tick = () => {
      const { end } = C.flashSlot();
      let s = Math.max(0, Math.floor((end - Date.now()) / 1000));
      const v = [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((x) => String(x).padStart(2, '0'));
      root.querySelectorAll('[data-countdown]').forEach((el) => el.querySelectorAll('span').forEach((sp, i) => (sp.textContent = v[i])));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  };

  SV.pages.home = {
    title: 'ShopVui Việt Nam | Mua Sắm Online Giá Tốt',
    render(el) {
      const flash = C.flashItems();
      const mallShops = C.shops().filter((s) => s.isMall);
      const mallProducts = C.all().filter((p) => C.isMall(p)).sort((a, b) => C.discountOf(b) - C.discountOf(a));
      const tiles = [];
      mallShops.forEach((s) => {
        const p = mallProducts.find((x) => x.shopId === s.id);
        if (p) tiles.push(p);
      });
      mallProducts.forEach((p) => tiles.length < 8 && !tiles.includes(p) && tiles.push(p));
      const daily = C.daily();
      let shown = PAGE;

      el.innerHTML = `
      <section class="home-top"><div class="container">
        <div class="banner-wrap">
          <div class="slider" data-slider>
            <div class="slides">${BANNERS.map(banner).join('')}</div>
            <button class="nav prev" type="button" data-slide="-1" aria-label="Banner trước">${SV.icon('left', 22)}</button>
            <button class="nav next" type="button" data-slide="1" aria-label="Banner sau">${SV.icon('right', 22)}</button>
            <div class="dots">${BANNERS.map((_, i) => `<button type="button" data-dot="${i}" aria-label="Banner ${i + 1}" class="${i ? '' : 'on'}"></button>`).join('')}</div>
          </div>
          <div class="side-banners">${SIDE.map((b) => `<a class="bn bn-sm ${b.cls}" href="${b.link}"><div class="bn-txt"><div class="bn-kicker">${b.kicker}</div><div class="bn-title">${b.title}</div><div class="bn-sub">${b.sub}</div></div><div class="bn-imgs">${pimg(b.img)}</div></a>`).join('')}</div>
        </div>
        <nav class="quick">${QUICK.map((q) => `<a href="${q.link}" ${q.link === '#' ? 'data-soon' : ''}><span class="ico" style="background:${q.bg}">${q.ic}</span><span>${q.t}</span></a>`).join('')}</nav>
      </div></section>

      <div class="container">
        <section class="sec"><div class="sec-hd"><h3>Danh Mục</h3></div>
          <div class="cat-grid">${C.categories().map((c) => `<a class="cat-cell" href="#/category/${c.id}"><span class="img">${ui.img(c.image, c.emoji)}</span><span>${c.name}</span></a>`).join('')}</div>
        </section>

        <section class="sec fs"><div class="sec-hd"><h3 class="fs-title"><span class="fs-logo">${SV.icon('zap', 24)}FLASH SALE</span>${countdownHtml()}</h3><a class="more" href="#/flash-sale">Xem tất cả ${SV.icon('right', 14)}</a></div>
          <div class="carousel" data-carousel><button class="carousel-btn prev" type="button" data-scroll="-1" aria-label="Trước">${SV.icon('left', 18)}</button><div class="track">${flash.map(flashItem).join('')}</div><button class="carousel-btn next" type="button" data-scroll="1" aria-label="Sau">${SV.icon('right', 18)}</button></div>
        </section>

        <section class="sec mall"><div class="sec-hd"><h3 class="mall-title"><a href="#/search?mall=1">SHOPVUI MALL</a><span class="mall-perks"><span>${SV.icon('return', 16)} Trả Hàng Miễn Phí 15 Ngày</span><span>${SV.icon('shield', 16)} Hàng Chính Hãng 100%</span><span>${SV.icon('truck', 16)} Miễn Phí Vận Chuyển</span></span></h3><a class="more" href="#/search?mall=1">Xem tất cả ${SV.icon('right', 14)}</a></div>
          <div class="mall-body">
            <a class="mall-promo" href="#/search?mall=1"><div><div class="bn-kicker">SIÊU THƯƠNG HIỆU</div><div class="mp-title">Hàng Hiệu<br>Giảm Đến 50%</div><span class="bn-cta">Xem ngay ›</span></div>${pimg('p78')}</a>
            <div class="mall-grid">${tiles.map((p) => `<a class="mall-tile" href="#/product/${p.id}"><span class="img">${ui.img(p.thumbnail, C.emoji(p))}</span><span class="t">Ưu đãi đến ${Math.max(10, C.discountOf(p))}%</span></a>`).join('')}</div>
          </div>
        </section>

        <section class="sec"><div class="sec-hd"><h3 class="accent">Tìm Kiếm Hàng Đầu</h3><a class="more" href="#/search?sort=sales">Xem tất cả ${SV.icon('right', 14)}</a></div>
          <div class="top-grid">${TOP.map((t) => {
            const sales = C.search({ keyword: t.kw }).items.reduce((s, p) => s + p.sold, 0);
            return `<a class="top-item" href="#/search?keyword=${encodeURIComponent(t.kw)}"><div class="top-img"><span class="top-badge">TOP</span>${pimg(t.pid)}<div class="top-sales">Bán ${U.compact(Math.round(sales * 0.25))}+ / tháng</div></div><div class="top-name">${t.kw}</div></a>`;
          }).join('')}</div>
        </section>

        <div class="dd-tab">Gợi Ý Hôm Nay</div>
        <div data-daily>${ui.grid(daily.slice(0, shown))}</div>
        <div class="dd-more">${daily.length > shown ? '<button class="btn" type="button" data-more>Xem Thêm</button>' : ''}</div>
      </div>`;

      /* --- Banner trượt --- */
      const slider = el.querySelector('[data-slider]');
      const slides = slider.querySelector('.slides');
      let idx = 0;
      const go = (i) => {
        idx = (i + BANNERS.length) % BANNERS.length;
        slides.style.transform = `translateX(-${idx * 100}%)`;
        slider.querySelectorAll('[data-dot]').forEach((d, j) => d.classList.toggle('on', j === idx));
      };
      let timer = setInterval(() => go(idx + 1), 4500);
      slider.addEventListener('mouseenter', () => clearInterval(timer));
      slider.addEventListener('mouseleave', () => {
        clearInterval(timer);
        timer = setInterval(() => go(idx + 1), 4500);
      });

      el.addEventListener('click', (e) => {
        const s = e.target.closest('[data-slide]');
        if (s) return go(idx + +s.dataset.slide);
        const d = e.target.closest('[data-dot]');
        if (d) return go(+d.dataset.dot);
        const sc = e.target.closest('[data-scroll]');
        if (sc) {
          const track = sc.parentElement.querySelector('.track');
          track.scrollBy({ left: +sc.dataset.scroll * track.clientWidth, behavior: 'smooth' });
          return;
        }
        if (e.target.closest('[data-more]')) {
          shown += PAGE;
          el.querySelector('[data-daily]').innerHTML = ui.grid(daily.slice(0, shown));
          el.querySelector('.dd-more').innerHTML = daily.length > shown ? '<button class="btn" type="button" data-more>Xem Thêm</button>' : '<span class="muted">Bạn đã xem hết gợi ý hôm nay 🎉</span>';
        }
      });

      const stopCd = SV.startCountdown(el);
      return () => {
        clearInterval(timer);
        stopCd();
      };
    },
  };
})();
