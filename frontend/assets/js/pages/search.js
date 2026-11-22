/* =========================================================
   Trang Tìm kiếm & Danh mục: bộ lọc, sắp xếp, phân trang
   Route: #/search?keyword=…  |  #/category/:id?sub=…
   ========================================================= */
(function () {
  'use strict';
  const U = SV.U;
  const C = SV.catalog;
  const ui = SV.ui;
  const PER_PAGE = 30;
  const list = (v) => (v ? String(v).split(',').filter(Boolean) : []);

  SV.pages.search = {
    render(el, ctx) {
      const q = ctx.query;
      const catId = ctx.params.id || q.get('cat') || '';
      const cat = catId ? C.category(catId) : null;
      const base = cat && ctx.params.id ? '/category/' + catId : '/search';
      const state = {
        keyword: q.get('keyword') || '',
        cat: ctx.params.id ? '' : catId,
        sub: list(q.get('sub')),
        loc: list(q.get('loc')),
        min: parseInt(q.get('min'), 10) || '',
        max: parseInt(q.get('max'), 10) || '',
        rating: parseInt(q.get('rating'), 10) || '',
        mall: q.get('mall') === '1',
        fav: q.get('fav') === '1',
        sale: q.get('sale') === '1',
        stock: q.get('stock') === '1',
        freeship: q.get('freeship') === '1',
        sort: q.get('sort') || 'relevancy',
        order: q.get('order') || 'asc',
        page: Math.max(1, parseInt(q.get('page'), 10) || 1),
      };
      const href = (changes) => {
        const s = Object.assign({}, state, { page: '' }, changes);
        return '#' + base + U.qs({
          keyword: s.keyword, cat: s.cat, sub: s.sub.join(','), loc: s.loc.join(','), min: s.min, max: s.max, rating: s.rating,
          mall: s.mall ? 1 : '', fav: s.fav ? 1 : '', sale: s.sale ? 1 : '', stock: s.stock ? 1 : '', freeship: s.freeship ? 1 : '',
          sort: s.sort === 'relevancy' ? '' : s.sort, order: s.sort === 'price' ? s.order : '', page: s.page > 1 ? s.page : '',
        });
      };
      const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : arr.concat(v));

      const res = C.search({
        keyword: state.keyword, categoryId: catId, subs: state.sub, locations: state.loc, minPrice: state.min, maxPrice: state.max,
        rating: state.rating, mall: state.mall, preferred: state.fav, onSale: state.sale, inStock: state.stock, freeship: state.freeship,
        sort: state.sort, order: state.order,
      });
      const total = res.items.length;
      const pages = Math.max(1, Math.ceil(total / PER_PAGE));
      const page = Math.min(state.page, pages);
      const items = res.items.slice((page - 1) * PER_PAGE, page * PER_PAGE);
      document.title = (state.keyword ? state.keyword : cat ? cat.name : 'Tìm kiếm') + ' | ShopVui';

      /* ---- Thanh lọc bên trái ---- */
      let catBlock;
      if (cat) {
        const subs = Object.keys(res.subCount);
        catBlock = `<div class="filter-group"><h5>${SV.icon('list', 14)} ${ctx.params.id ? 'Tất Cả Danh Mục' : 'Theo Danh Mục'}</h5>
          ${ctx.params.id ? `<a class="cat-link on" href="#/category/${cat.id}">${cat.name}</a>` : `<label class="check"><input type="checkbox" checked data-href="${href({ cat: '', sub: [] })}"> ${cat.name}</label>`}
          ${subs.map((s) => `<label class="check sub"><input type="checkbox" ${state.sub.includes(s) ? 'checked' : ''} data-href="${href({ sub: toggle(state.sub, s) })}"> ${U.esc(s)} <span class="cnt">(${res.subCount[s]})</span></label>`).join('')}</div>`;
      } else {
        const cats = Object.keys(res.catCount).sort((a, b) => res.catCount[b] - res.catCount[a]);
        catBlock = `<div class="filter-group"><h5>${SV.icon('list', 14)} Theo Danh Mục</h5>${cats.length ? cats
          .map((id) => `<label class="check"><input type="checkbox" data-href="${href({ cat: id })}"> ${C.category(id).name} <span class="cnt">(${res.catCount[id]})</span></label>`)
          .join('') : '<p class="muted">Không có danh mục phù hợp</p>'}</div>`;
      }
      const locs = {};
      C.all().forEach((p) => (locs[p.location] = (locs[p.location] || 0) + 1));
      const locList = Object.keys(locs).sort((a, b) => locs[b] - locs[a]);
      const ratingRows = [5, 4, 3, 2, 1]
        .map((r) => `<a class="rating-row ${state.rating === r ? 'on' : ''}" href="${href({ rating: state.rating === r ? '' : r })}">${ui.stars(r, 14, 'stars-yellow')}${r < 5 ? '<span>trở lên</span>' : ''}</a>`)
        .join('');
      const chk = (key, label) => `<label class="check"><input type="checkbox" ${state[key] ? 'checked' : ''} data-href="${href({ [key]: !state[key] })}"> ${label}</label>`;

      const aside = `<aside class="filter">
        <div class="filter-title">${SV.icon('filter', 14)} Bộ Lọc Tìm Kiếm</div>
        ${catBlock}
        <div class="filter-group"><h5>Nơi Bán</h5>${locList.map((l) => `<label class="check"><input type="checkbox" ${state.loc.includes(l) ? 'checked' : ''} data-href="${href({ loc: toggle(state.loc, l) })}"> ${U.esc(l)}</label>`).join('')}</div>
        <div class="filter-group"><h5>Khoảng Giá</h5><form data-price><div class="price-range"><input name="min" inputmode="numeric" placeholder="₫ TỪ" value="${state.min}"><span>—</span><input name="max" inputmode="numeric" placeholder="₫ ĐẾN" value="${state.max}"></div><div class="price-err"></div><button class="btn btn-primary btn-block btn-sm" type="submit">Áp dụng</button></form></div>
        <div class="filter-group"><h5>Loại Shop</h5>${chk('mall', 'ShopVui Mall')}${chk('fav', 'Shop Yêu thích')}</div>
        <div class="filter-group"><h5>Đánh Giá</h5>${ratingRows}</div>
        <div class="filter-group"><h5>Dịch Vụ &amp; Khuyến Mãi</h5>${chk('sale', 'Đang giảm giá')}${chk('freeship', 'Miễn phí vận chuyển')}${chk('stock', 'Hàng có sẵn')}</div>
        <a class="btn btn-primary btn-block" href="#${base}${U.qs({ keyword: state.keyword })}">Xóa Tất Cả</a>
      </aside>`;

      /* ---- Phần kết quả ---- */
      const shop = state.keyword && C.shops().find((s) => U.wordMatch(s.name, state.keyword));
      const head = cat && ctx.params.id
        ? `<div class="cat-head">${ui.img(cat.image, cat.emoji)}<div><h1>${cat.name}</h1><p>${total} sản phẩm · ${cat.subCategories.join(' · ')}</p></div></div>`
        : (shop ? `<div class="sr-shop-hd">Shop liên quan đến "<b>${U.esc(state.keyword)}</b>"</div>
            <a class="sr-shop" href="#/shop/${shop.id}">${ui.avatar(shop.name, 70)}<div class="info"><div class="nm">${U.esc(shop.name)} ${ui.shopLabel(shop.type)}</div><div class="muted">${U.compact(shop.followers)} Người theo dõi · ${shop.productCount} Sản phẩm · ${shop.rating} ★</div></div><span class="btn btn-outline">Xem Shop</span></a>` : '') +
          (state.keyword ? `<div class="search-hint">${SV.icon('help', 16)} Kết quả tìm kiếm cho từ khoá '<b>${U.esc(state.keyword)}</b>'</div>` : '');
      const sortBtn = (key, label) => `<a class="sort-btn ${state.sort === key ? 'on' : ''}" href="${href({ sort: key })}">${label}</a>`;
      const sortBar = `<div class="sort-bar"><span class="lbl">Sắp xếp theo</span>
        ${sortBtn('relevancy', cat && !state.keyword ? 'Phổ Biến' : 'Liên Quan')}${sortBtn('ctime', 'Mới Nhất')}${sortBtn('sales', 'Bán Chạy')}
        <select class="sort-select ${state.sort === 'price' ? 'on' : ''}" data-price-sort aria-label="Sắp xếp theo giá">
          <option value="" ${state.sort !== 'price' ? 'selected' : ''} disabled>Giá</option>
          <option value="asc" ${state.sort === 'price' && state.order === 'asc' ? 'selected' : ''}>Giá: Thấp đến Cao</option>
          <option value="desc" ${state.sort === 'price' && state.order === 'desc' ? 'selected' : ''}>Giá: Cao đến Thấp</option>
        </select>
        <div class="mini-page"><span><b>${page}</b>/${pages}</span><div class="pg"><a class="${page <= 1 ? 'off' : ''}" href="${href({ page: page - 1 })}" aria-label="Trang trước">${SV.icon('left', 14)}</a><a class="${page >= pages ? 'off' : ''}" href="${href({ page: page + 1 })}" aria-label="Trang sau">${SV.icon('right', 14)}</a></div></div>
      </div>`;

      el.innerHTML = `<div class="container"><div class="search-layout">${aside}
        <section class="search-main">${head}${sortBar}
          ${items.length ? ui.grid(items, 'grid-5') + ui.pagination(page, pages) : ui.empty('🔍', 'Không tìm thấy kết quả nào<br><span class="muted">Hãy thử sử dụng các từ khóa chung chung hơn hoặc bỏ bớt bộ lọc</span>', `<a class="btn btn-primary" href="#${base}${U.qs({ keyword: state.keyword })}">Xóa bộ lọc</a>`)}
        </section></div></div>`;

      el.addEventListener('change', (e) => {
        if (e.target.dataset.href) location.hash = e.target.dataset.href.slice(1);
        if (e.target.matches('[data-price-sort]')) location.hash = href({ sort: 'price', order: e.target.value }).slice(1);
      });
      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-page]');
        if (b && !b.disabled) location.hash = href({ page: +b.dataset.page }).slice(1);
      });
      el.querySelector('[data-price]').addEventListener('submit', (e) => {
        e.preventDefault();
        const f = e.target;
        const min = parseInt(f.min.value.replace(/\D/g, ''), 10) || '';
        const max = parseInt(f.max.value.replace(/\D/g, ''), 10) || '';
        if (min && max && min > max) {
          f.querySelector('.price-err').textContent = 'Vui lòng điền khoảng giá phù hợp';
          return;
        }
        location.hash = href({ min, max }).slice(1);
      });
    },
  };
})();
