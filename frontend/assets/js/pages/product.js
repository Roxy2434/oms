/* =========================================================
   Trang Chi tiết sản phẩm – Route: #/product/:id
   ========================================================= */
(function () {
  'use strict';
  const U = SV.U;
  const C = SV.catalog;
  const ui = SV.ui;
  const RV_PER_PAGE = 6;

  SV.pages.product = {
    render(el, ctx) {
      const p = C.get(ctx.params.id);
      if (!p || p.hidden) {
        el.innerHTML = `<div class="container">${ui.empty('😕', 'Sản phẩm này không tồn tại hoặc đã ngừng kinh doanh', '<a class="btn btn-primary" href="#/">Về trang chủ</a>')}</div>`;
        return;
      }
      document.title = p.name + ' | ShopVui';
      SV.seller.trackView(p.id);
      const shop = C.shop(p.shopId);
      const cat = C.category(p.categoryId);
      const flash = C.flash(p);
      const images = p.images && p.images.length ? p.images : [p.thumbnail];
      const emoji = C.emoji(p);
      const sel = {};
      let qty = 1;
      let shipTo = (SV.auth.current() && SV.address.getDefault() && SV.address.getDefault().province) || 'TP. Hồ Chí Minh';
      const rv = { filter: 'all', page: 1 };
      const stats = C.reviewStats(p);
      const shopReviews = C.shopProducts(shop.id).reduce((s, x) => s + (x.ratingCount || 0), 0);

      const variantStr = () => ((p.variants || []).every((g) => sel[g.name]) ? p.variants.map((g) => sel[g.name]).join(', ') : null);

      function priceHtml() {
        const v = variantStr();
        const d = C.discountOf(p);
        let cur, orig;
        if (v !== null) {
          cur = U.money(C.unitPrice(p, v));
          orig = C.unitOriginal(p, v) > C.unitPrice(p, v) ? U.money(C.unitOriginal(p, v)) : '';
        } else {
          const [a, b] = C.priceRange(p);
          const add = b - a;
          cur = a === b ? U.money(a) : `${U.money(a)} - ${U.money(b)}`;
          const o1 = p.originalPrice || p.price;
          orig = o1 > a ? (add ? `${U.money(o1)} - ${U.money(o1 + add)}` : U.money(o1)) : '';
        }
        return `${orig ? `<span class="o">${orig}</span>` : ''}<span class="c">${cur}</span>${d ? `<span class="d">-${d}%</span>` : ''}`;
      }
      function shipHtml() {
        // Shop OMS: phí giao do OMS tính (giống lúc thanh toán); đang chờ OMS trả lời thì báo đang tính.
        if (shop.oms) {
          const addrArg = { province: shipTo, ward: '', detail: 'Ước tính phí giao' }, lineArg = [{ product: p, qty: 1 }];
          const o = SV.oms.shippingOption(addrArg, lineArg), st = SV.oms.quoteState(addrArg, lineArg);
          SV.oms.setOnQuote(() => {
            const line = el.querySelector('.ship-line');
            if (line && line.isConnected) line.outerHTML = shipHtml();
          });
          return `<div class="ship-line">${SV.icon('truck', 18)}<div>
          <div>Vận chuyển tới <a class="ship-to" data-act="ship-to">${U.esc(shipTo)} ${SV.icon('down', 12)}</a></div>
          <div class="muted">${o ? 'Phí vận chuyển: ' + U.money(o.fee) + ' · giao từ kho EZMART phù hợp theo vùng' : st.state === 'error' ? U.esc(st.error || 'Kho tạm hết hàng cho sản phẩm này') : 'Đang tính phí giao từ kho EZMART…'}</div>
          ${o ? `<div class="muted">${o.note}</div>` : ''}</div></div>`;
        }
        const opt = SV.checkout.shippingOptions(shop, { province: shipTo }, 1)[0];
        const free = (p.labels || []).includes('freeship');
        return `<div class="ship-line">${SV.icon('truck', 18)}<div>
          <div>Vận chuyển tới <a class="ship-to" data-act="ship-to">${U.esc(shipTo)} ${SV.icon('down', 12)}</a></div>
          <div class="muted">Phí vận chuyển: ${free ? `<s>${U.money(opt.fee)}</s> <b class="teal">₫0</b> với mã Freeship` : U.money(opt.fee)}</div>
          <div class="muted">Nhận hàng vào ${U.fmtDay(new Date(opt.etaFrom))} - ${U.fmtDay(new Date(opt.etaTo))}</div></div></div>`;
      }
      const vouchers = shop.vouchers;

      el.innerHTML = `<div class="container product-page">
        <nav class="breadcrumb"><a href="#/">ShopVui</a>${SV.icon('right', 12)}<a href="#/category/${cat.id}">${cat.name}</a>${SV.icon('right', 12)}<a href="#/category/${cat.id}?sub=${encodeURIComponent(p.subCategory)}">${U.esc(p.subCategory)}</a>${SV.icon('right', 12)}<span>${U.esc(p.name)}</span></nav>

        <section class="pd">
          <div class="pd-gallery">
            <div class="main" data-zoom>${ui.img(images[0], emoji, '', p.name)}${flash ? '<span class="pd-flash-tag">⚡ Flash Sale</span>' : ''}</div>
            <div class="pd-thumbs">${images.slice(0, 5).map((src, i) => `<button type="button" class="${i ? '' : 'on'}" data-thumb="${i}">${ui.img(src, emoji)}</button>`).join('')}</div>
            <div class="pd-share"><span>Chia sẻ:</span><button type="button" class="soc-btn" data-act="share" aria-label="Sao chép liên kết">${SV.icon('link', 16)}</button><button type="button" class="soc-btn fb" data-act="share" aria-label="Chia sẻ Facebook">${SV.icon('facebook', 16)}</button>
              <i class="sep-v"></i><button type="button" class="pd-like ${SV.likes.has(p.id) ? 'on' : ''}" data-act="like">${SV.icon('heart', 22)} <span>Đã thích (${U.compact(SV.likes.count(p))})</span></button></div>
          </div>

          <div class="pd-info">
            <h1>${ui.shopLabel(shop.type)} ${U.esc(p.name)}</h1>
            <div class="pd-stats">
              ${stats.count ? `<a class="s" data-act="goto-reviews"><span class="num">${stats.avg.toFixed(1)}</span>${ui.stars(stats.avg, 14)}</a><a class="s" data-act="goto-reviews"><span class="num dark">${U.compact(stats.count)}</span><span class="lb">Đánh Giá</span></a>` : '<span class="s lb">Chưa Có Đánh Giá</span>'}
              <span class="s"><span class="num dark">${U.compact(p.sold)}</span><span class="lb">Đã Bán</span></span>
              <a class="report" data-act="report">Tố cáo</a>
            </div>
            ${flash ? `<div class="pd-flash"><span class="fs-logo">${SV.icon('zap', 20)}FLASH SALE</span><span class="pd-flash-r">${SV.icon('clock', 16)} KẾT THÚC TRONG <span class="countdown" data-countdown><span>00</span><i>:</i><span>00</span><i>:</i><span>00</span></span></span></div>` : ''}
            <div class="pd-price" data-price>${priceHtml()}</div>

            ${vouchers.length ? `<div class="pd-row"><div class="k">Mã Giảm Giá Của Shop</div><div class="v vtags">${vouchers.map((v) => `<button type="button" class="vtag" data-act="vouchers">${ui.shopVoucherShort(v)}</button>`).join('')}</div></div>` : ''}
            <div class="pd-row"><div class="k">Vận Chuyển</div><div class="v" data-ship>${shipHtml()}</div></div>
            <div class="pd-row"><div class="k">An Tâm Mua Sắm</div><div class="v safe">${SV.icon('shield', 16)} ${U.esc(p.returnPolicy)} · Bảo hành ${U.esc(p.warranty)}</div></div>
            <div class="pd-variants" data-variants>
              ${(p.variants || []).map((g) => `<div class="pd-row"><div class="k">${U.esc(g.name)}</div><div class="v opt-list">${g.options.map((o) => `<button type="button" class="opt" data-opt="${U.esc(g.name)}" data-val="${U.esc(o)}">${U.esc(o)}</button>`).join('')}</div></div>`).join('')}
              <div class="pd-row"><div class="k">Số Lượng</div><div class="v qty-row">${p.stock > 0 ? ui.qty(1, p.stock, 'data-qty') : ''}<span class="muted">${p.stock > 0 ? p.stock.toLocaleString('vi-VN') + ' sản phẩm có sẵn' : 'Hết hàng'}</span></div></div>
              <div class="pd-err" data-err></div>
            </div>
            <div class="pd-actions">
              ${p.stock > 0
                ? `<button type="button" class="btn btn-outline btn-lg" data-act="add">${SV.icon('cart', 20)} Thêm Vào Giỏ Hàng</button><button type="button" class="btn btn-primary btn-lg" data-act="buy">Mua Ngay</button>`
                : '<button type="button" class="btn btn-lg" disabled>Sản phẩm đã hết hàng</button>'}
            </div>
            <div class="pd-guarantee">${SV.icon('shield', 18)} <b>ShopVui Đảm Bảo</b> <span class="muted">Nhận hàng hoặc được hoàn tiền 100%</span></div>
          </div>
        </section>

        <section class="pd-shop">
          <a class="pd-shop-av" href="#/shop/${shop.id}">${ui.avatar(shop.name, 78)}${ui.shopLabel(shop.type)}</a>
          <div class="info"><div class="name">${U.esc(shop.name)}</div><div class="online">Online ${1 + (U.hash(shop.id) % 50)} phút trước</div>
            <div class="btns"><button type="button" class="btn btn-outline btn-sm" data-act="chat">${SV.icon('chat', 14)} Chat Ngay</button><a class="btn btn-sm" href="#/shop/${shop.id}">${SV.icon('store', 14)} Xem Shop</a></div></div>
          <div class="shop-stats">
            <div><span class="k">Đánh Giá</span><span class="v">${U.compact(shopReviews)}</span></div>
            <div><span class="k">Tỉ Lệ Phản Hồi</span><span class="v">${shop.responseRate}%</span></div>
            <div><span class="k">Tham Gia</span><span class="v">${shop.joinedYearsAgo} năm trước</span></div>
            <div><span class="k">Sản Phẩm</span><span class="v">${shop.productCount}</span></div>
            <div><span class="k">Thời Gian Phản Hồi</span><span class="v">${shop.responseTime}</span></div>
            <div><span class="k">Người Theo Dõi</span><span class="v">${U.compact(shop.followers)}</span></div>
          </div>
        </section>

        <div class="pd-detail">
          <div>
            <section class="box"><h2 class="box-title">Chi Tiết Sản Phẩm</h2>
              <div class="spec">${C.specs(p).map(([k, v]) => `<div class="k">${k}</div><div>${v}</div>`).join('')}</div>
              <h2 class="box-title">Mô Tả Sản Phẩm</h2><div class="desc">${U.esc(C.description(p))}</div>
            </section>
            <section class="box" id="reviews"><h2 class="box-title">Đánh Giá Sản Phẩm</h2><div data-reviews></div></section>
          </div>
          <aside class="box side-best"><h3>Top Sản Phẩm Bán Chạy</h3>${C.bestSellers(shop.id, 5)
            .map((x) => `<a class="mini-card" href="#/product/${x.id}">${ui.img(x.thumbnail, C.emoji(x))}<div class="nm">${U.esc(x.name)}</div><div class="pr">${U.money(C.basePrice(x))}</div></a>`)
            .join('')}</aside>
        </div>

        <section class="more-sec"><div class="more-hd"><h3>Các Sản Phẩm Khác Của Shop</h3><a href="#/shop/${shop.id}" class="more">Xem tất cả ${SV.icon('right', 14)}</a></div>${ui.grid(C.shopProducts(shop.id).filter((x) => x.id !== p.id).slice(0, 6))}</section>
        <section class="more-sec"><div class="more-hd"><h3>Có Thể Bạn Cũng Thích</h3><a href="#/category/${cat.id}" class="more">Xem tất cả ${SV.icon('right', 14)}</a></div>${ui.grid(C.related(p, 12))}</section>
      </div>`;

      /* ---------------- Đánh giá ---------------- */
      function renderReviews() {
        const all = C.allReviews(p);
        const f = rv.filter;
        const list = all.filter((r) => (f === 'all' ? true : f === 'text' ? !!r.comment : f === 'img' ? r.images && r.images.length : r.rating === +f));
        const pages = Math.max(1, Math.ceil(list.length / RV_PER_PAGE));
        rv.page = Math.min(rv.page, pages);
        const show = list.slice((rv.page - 1) * RV_PER_PAGE, rv.page * RV_PER_PAGE);
        const btn = (key, label) => `<button type="button" class="${rv.filter === String(key) ? 'on' : ''}" data-rf="${key}">${label}</button>`;
        el.querySelector('[data-reviews]').innerHTML = stats.count
          ? `<div class="rv-summary"><div class="rv-score"><div class="big"><b>${stats.avg.toFixed(1)}</b> trên 5</div>${ui.stars(stats.avg, 20)}</div>
              <div class="rv-filters">${btn('all', 'Tất Cả')}${[5, 4, 3, 2, 1].map((s) => btn(s, `${s} Sao (${U.compact(stats.by[s])})`)).join('')}${btn('text', `Có Bình Luận (${U.compact(stats.withText)})`)}${btn('img', `Có Hình Ảnh / Video (${U.compact(stats.withImg)})`)}</div></div>
             <div class="rv-list">${show.length ? show.map(reviewHtml).join('') : '<div class="rv-none">Chưa có đánh giá phù hợp</div>'}</div>${ui.pagination(rv.page, pages)}`
          : `<div class="rv-none">${SV.icon('star', 40)}<p>Chưa có đánh giá</p></div>`;
      }
      function reviewHtml(r) {
        return `<div class="rv">${ui.avatar(r.user, 40, r.color)}<div class="rv-main">
          <div class="u">${U.esc(r.user)}</div>${ui.stars(r.rating, 12)}
          <div class="meta">${U.fmtDate(r.createdAt, true)}${r.variant ? ' | Phân loại hàng: ' + U.esc(r.variant) : ''}</div>
          ${r.comment ? `<div class="txt">${U.esc(r.comment)}</div>` : ''}
          ${r.images && r.images.length ? `<div class="imgs">${r.images.map((s) => ui.img(s, emoji)).join('')}</div>` : ''}
          ${r.reply ? `<div class="reply"><b>Phản Hồi Của Người Bán</b><p>${U.esc(r.reply)}</p></div>` : ''}
          <button type="button" class="like" data-rvlike>${SV.icon('thumb', 14)} <span>${r.likes || 'Hữu ích?'}</span></button></div></div>`;
      }
      renderReviews();

      /* ---------------- Tương tác ---------------- */
      const mainImg = el.querySelector('[data-zoom] img');
      el.querySelectorAll('[data-thumb]').forEach((b) =>
        b.addEventListener('mouseenter', () => {
          el.querySelectorAll('[data-thumb]').forEach((x) => x.classList.toggle('on', x === b));
          mainImg.onerror = () => SV.imgErr(mainImg);
          mainImg.src = images[+b.dataset.thumb];
        })
      );
      const zoom = el.querySelector('[data-zoom]');
      zoom.addEventListener('mousemove', (e) => {
        const r = zoom.getBoundingClientRect();
        mainImg.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
      });

      const qtyBox = el.querySelector('[data-qty]');
      const setQty = (n) => {
        qty = Math.max(1, Math.min(p.stock, parseInt(n, 10) || 1));
        if (!qtyBox) return;
        qtyBox.querySelector('input').value = qty;
        qtyBox.querySelector('[data-q="-"]').disabled = qty <= 1;
        qtyBox.querySelector('[data-q="+"]').disabled = qty >= p.stock;
      };
      if (qtyBox) qtyBox.querySelector('input').addEventListener('change', (e) => setQty(e.target.value));

      const errBox = el.querySelector('[data-err]');
      const variantsBox = el.querySelector('[data-variants]');
      function validate() {
        if (variantStr() === null) {
          errBox.textContent = 'Vui lòng chọn Phân loại hàng';
          variantsBox.classList.add('invalid');
          return false;
        }
        errBox.textContent = '';
        variantsBox.classList.remove('invalid');
        return true;
      }
      function addToCart(buyNow) {
        if (!validate()) return;
        if (!shop.oms) { ui.toast('Gian hàng này tạm ngừng nhận đơn mới. Mời bạn chọn sản phẩm tại EZMART Official Store!', 'info', 2500); SV.go('/shop/oms'); return; }
        if (!ui.requireLogin()) return;
        const r = SV.cart.add(p.id, variantStr() || '', qty, { buyNow });
        if (!r.ok) return ui.toast(r.error, 'error');
        if (buyNow) SV.go('/checkout'); // Mua Ngay: chỉ dòng này được chọn (SV.cart.add buyNow), sang thẳng trang thanh toán
        else ui.toast('Sản phẩm đã được thêm vào Giỏ hàng');
      }

      el.addEventListener('click', async (e) => {
        const opt = e.target.closest('[data-opt]');
        if (opt) {
          const g = opt.dataset.opt;
          sel[g] = sel[g] === opt.dataset.val ? undefined : opt.dataset.val;
          el.querySelectorAll(`[data-opt="${CSS.escape(g)}"]`).forEach((b) => b.classList.toggle('on', sel[g] === b.dataset.val));
          el.querySelector('[data-price]').innerHTML = priceHtml();
          if (variantStr() !== null) validate();
          return;
        }
        const q = e.target.closest('[data-q]');
        if (q) return setQty(qty + (q.dataset.q === '+' ? 1 : -1));
        const rf = e.target.closest('[data-rf]');
        if (rf) {
          rv.filter = rf.dataset.rf;
          rv.page = 1;
          return renderReviews();
        }
        const pg = e.target.closest('[data-reviews] [data-page]');
        if (pg && !pg.disabled) {
          rv.page = +pg.dataset.page;
          renderReviews();
          el.querySelector('#reviews').scrollIntoView({ behavior: 'smooth' });
          return;
        }
        const like = e.target.closest('[data-rvlike]');
        if (like) {
          like.classList.toggle('on');
          const s = like.querySelector('span');
          const n = parseInt(s.textContent, 10) || 0;
          s.textContent = like.classList.contains('on') ? n + 1 : n - 1 || 'Hữu ích?';
          return;
        }
        const act = e.target.closest('[data-act]');
        if (!act) return;
        const a = act.dataset.act;
        if (a === 'add') addToCart(false);
        else if (a === 'buy') addToCart(true);
        else if (a === 'chat') SV.openChat(shop.id);
        else if (a === 'goto-reviews') {
          e.preventDefault();
          el.querySelector('#reviews').scrollIntoView({ behavior: 'smooth' });
        } else if (a === 'like') {
          const r = SV.likes.toggle(p.id);
          if (r.error === 'login') return ui.requireLogin();
          act.classList.toggle('on', r.liked);
          act.querySelector('span').textContent = `Đã thích (${U.compact(SV.likes.count(p))})`;
        } else if (a === 'share') {
          try {
            await navigator.clipboard.writeText(location.href);
            ui.toast('Đã sao chép liên kết sản phẩm', 'info');
          } catch (err) {
            ui.toast('Liên kết: ' + location.href, 'info', 3000);
          }
        } else if (a === 'report') ui.toast('Cảm ơn bạn đã báo cáo. ShopVui sẽ xem xét sản phẩm này.', 'info', 2200);
        else if (a === 'ship-to') {
          const r = await ui.modal({
            title: 'Chọn địa chỉ nhận hàng', width: 420, okText: 'Xác nhận',
            body: `<select class="input" name="prov">${SV.const.PROVINCES.map((x) => `<option ${x === shipTo ? 'selected' : ''}>${x}</option>`).join('')}</select><p class="note">Dùng để ước tính phí và thời gian giao hàng.</p>`,
            onOk: (m) => m.querySelector('[name=prov]').value,
          });
          if (r) {
            shipTo = r;
            el.querySelector('[data-ship]').innerHTML = shipHtml();
          }
        } else if (a === 'vouchers') {
          ui.modal({
            title: `Mã Giảm Giá Của ${U.esc(shop.name)}`, width: 560, okText: 'Xong', cancelText: false,
            body: `<div class="voucher-list">${vouchers.map((v) => ui.voucher(v, { shop, action: `<button type="button" class="btn btn-primary btn-sm" data-save="${v.code}" ${SV.vouchers.isSaved(v.code) ? 'disabled' : ''}>${SV.vouchers.isSaved(v.code) ? 'Đã lưu' : 'Lưu'}</button>` })).join('')}</div>`,
            onOpen(m) {
              m.addEventListener('click', (ev) => {
                const b = ev.target.closest('[data-save]');
                if (!b) return;
                const r = SV.vouchers.saveCode(b.dataset.save);
                if (r.error === 'login') {
                  m.closest('.modal-bg').remove();
                  return ui.requireLogin();
                }
                b.disabled = true;
                b.textContent = 'Đã lưu';
              });
            },
          });
        }
      });

      return flash ? SV.startCountdown(el) : null;
    },
  };
})();
