/* =========================================================
   catalog.js – Truy vấn danh mục, shop, sản phẩm, tìm kiếm/lọc/sắp xếp,
   Flash Sale, đánh giá và mô tả sản phẩm.
   ========================================================= */
(function () {
  'use strict';
  const U = SV.U;
  const D = window.SV_DATA;
  const catMap = new Map(D.categories.map((c) => [c.id, c]));
  const shopMap = new Map(D.shops.map((s) => [s.id, s]));
  const flashMap = new Map(D.flashSale.map((f) => [f.productId, f]));
  let cache = null;

  const C = {};

  /* ----------------------------- Danh mục & Shop ----------------------------- */
  C.categories = () => D.categories;
  C.category = (id) => catMap.get(id);
  C.emoji = (p) => (catMap.get(p.categoryId) || {}).emoji || '🛍️';

  C.shops = () => D.shops.map((s) => C.shop(s.id));
  C.shopRaw = (id) => shopMap.get(id);
  C.shop = (id) => {
    const s = shopMap.get(id);
    if (!s) return null;
    const db = SV.db.data();
    const followed = db.session && db.follows.some((f) => f.userId === db.session && f.shopId === id);
    return Object.assign({}, s, {
      followers: s.followers + (followed ? 1 : 0),
      productCount: C.all().filter((p) => p.shopId === id).length,
      isMall: s.type === 'mall',
    });
  };
  C.shopLabel = (s) =>
    s.type === 'mall'
      ? '<span class="lbl-mall">Mall</span>'
      : s.type === 'preferred_plus'
      ? '<span class="lbl-fav">Yêu thích+</span>'
      : s.type === 'preferred'
      ? '<span class="lbl-fav">Yêu thích</span>'
      : '';

  /* ----------------------------- Sản phẩm ----------------------------- */
  function build() {
    const db = SV.db.data();
    const patches = db.productPatches || {};
    const out = [];
    D.products.concat(db.sellerProducts || []).forEach((base) => {
      const p = Object.assign({}, base, patches[base.id] || {});
      if (p.deleted) return;
      p.sold = (base.sold || 0) + ((db.soldDelta || {})[p.id] || 0);
      const cat = catMap.get(p.categoryId) || {};
      // chuỗi tìm kiếm: các từ đã bỏ dấu, ngăn cách bằng dấu cách (khớp theo ĐẦU TỪ)
      p._search = ' ' + U.words([p.name, p.brand, cat.name, p.subCategory].join(' ')).join(' ');
      out.push(p);
    });
    return out;
  }
  /** Danh sách sản phẩm đang bán (đã áp dụng thay đổi từ người bán) */
  C.all = (includeHidden) => {
    if (!cache) cache = build();
    return includeHidden ? cache : cache.filter((p) => !p.hidden);
  };
  C.invalidate = () => {
    cache = null;
  };
  C.get = (id) => C.all(true).find((p) => p.id === id);
  C.isMall = (p) => (shopMap.get(p.shopId) || {}).type === 'mall';

  /* ----------------------------- Giá & phân loại ----------------------------- */
  C.parseVariant = (str) => (str ? String(str).split(', ') : []);
  C.variantAdd = (p, variant) =>
    C.parseVariant(variant).reduce((s, opt) => s + ((p.variantPrices || {})[opt] || 0), 0);
  C.basePrice = (p) => {
    const f = flashMap.get(p.id);
    return f ? f.flashPrice : p.price;
  };
  C.unitPrice = (p, variant) => C.basePrice(p) + C.variantAdd(p, variant);
  C.unitOriginal = (p, variant) => (p.originalPrice || p.price) + C.variantAdd(p, variant);
  C.discountOf = (p) => {
    const o = p.originalPrice || p.price;
    const d = Math.round((1 - C.basePrice(p) / o) * 100);
    return d > 0 ? d : 0;
  };
  /** [giá thấp nhất, cao nhất] khi các phân loại có giá khác nhau */
  C.priceRange = (p) => {
    const base = C.basePrice(p);
    const vp = p.variantPrices || {};
    let max = base;
    (p.variants || []).forEach((g) => {
      max += Math.max(0, ...g.options.map((o) => vp[o] || 0));
    });
    return [base, max];
  };
  C.defaultVariant = (p) => (p.variants || []).map((g) => g.options[0]).join(', ');

  /* ----------------------------- Flash Sale ----------------------------- */
  C.flash = (p) => {
    const f = flashMap.get(p.id);
    if (!f) return null;
    const extra = (SV.db.data().flashSold || {})[p.id] || 0;
    return Object.assign({}, f, { sold: Math.min(f.quota, f.soldInit + extra) });
  };
  C.flashItems = () =>
    D.flashSale
      .map((f) => C.get(f.productId))
      .filter((p) => p && !p.hidden)
      .map((p) => ({ product: p, flash: C.flash(p) }));
  /** Khung giờ Flash Sale hiện tại: 0h, 9h, 12h, 15h, 18h, 21h */
  C.flashSlot = () => {
    const now = new Date();
    const marks = [0, 9, 12, 15, 18, 21, 24];
    const h = now.getHours();
    let i = 0;
    while (!(h >= marks[i] && h < marks[i + 1])) i++;
    const start = new Date(now);
    start.setHours(marks[i], 0, 0, 0);
    const end = new Date(now);
    end.setHours(0, 0, 0, 0);
    end.setTime(end.getTime() + marks[i + 1] * 3600000);
    const next = marks.slice(i + 1, i + 4).map((m) => (m === 24 ? '00:00' : String(m).padStart(2, '0') + ':00'));
    return { start, end, label: String(marks[i]).padStart(2, '0') + ':00', next };
  };

  /* ----------------------------- Tìm kiếm & lọc ----------------------------- */
  /**
   * opts: { keyword, categoryId, subs[], locations[], minPrice, maxPrice, rating,
   *         mall, preferred, onSale, inStock, freeship, shopId, sort, order }
   * sort: relevancy | ctime | sales | price
   */
  C.search = (opts) => {
    opts = opts || {};
    let list = C.all();
    let tokens = [];
    const score = new Map();
    if (opts.keyword) {
      tokens = U.words(opts.keyword);
      const has = (p, t) => p._search.includes(' ' + t);
      let strict = list.filter((p) => tokens.every((t) => has(p, t)));
      if (!strict.length && tokens.length > 1) {
        // Nới lỏng: khớp ít nhất một nửa số từ khoá
        strict = list.filter((p) => tokens.filter((t) => has(p, t)).length >= Math.ceil(tokens.length / 2));
      }
      list = strict;
      list.forEach((p) => {
        const name = ' ' + U.words(p.name).join(' ');
        let s = tokens.reduce((a, t) => a + (name.includes(' ' + t) ? 10 : has(p, t) ? 3 : 0), 0);
        if (name.startsWith(' ' + tokens[0])) s += 5;
        s += Math.log10(p.sold + 1);
        score.set(p.id, s);
      });
    }
    // Danh mục (facet) trước khi lọc theo danh mục – để hiển thị ở thanh bên
    const catCount = {};
    list.forEach((p) => (catCount[p.categoryId] = (catCount[p.categoryId] || 0) + 1));

    if (opts.categoryId) list = list.filter((p) => p.categoryId === opts.categoryId);
    if (opts.shopId) list = list.filter((p) => p.shopId === opts.shopId);
    const subCount = {};
    list.forEach((p) => (subCount[p.subCategory] = (subCount[p.subCategory] || 0) + 1));
    if (opts.subs && opts.subs.length) list = list.filter((p) => opts.subs.includes(p.subCategory));
    if (opts.locations && opts.locations.length) list = list.filter((p) => opts.locations.includes(p.location));
    if (opts.minPrice) list = list.filter((p) => C.basePrice(p) >= opts.minPrice);
    if (opts.maxPrice) list = list.filter((p) => C.basePrice(p) <= opts.maxPrice);
    if (opts.rating) list = list.filter((p) => p.rating >= opts.rating);
    if (opts.mall || opts.preferred) {
      list = list.filter((p) => {
        const t = (shopMap.get(p.shopId) || {}).type;
        return (opts.mall && t === 'mall') || (opts.preferred && (t === 'preferred' || t === 'preferred_plus'));
      });
    }
    if (opts.onSale) list = list.filter((p) => C.discountOf(p) > 0);
    if (opts.inStock) list = list.filter((p) => p.stock > 0);
    if (opts.freeship) list = list.filter((p) => (p.labels || []).includes('freeship'));

    const sort = opts.sort || 'relevancy';
    const sorted = list.slice();
    if (sort === 'ctime') sorted.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
    else if (sort === 'sales') sorted.sort((a, b) => b.sold - a.sold);
    else if (sort === 'price') sorted.sort((a, b) => (C.basePrice(a) - C.basePrice(b)) * (opts.order === 'desc' ? -1 : 1));
    else if (tokens.length) sorted.sort((a, b) => score.get(b.id) - score.get(a.id));
    else sorted.sort((a, b) => b.sold * (b.rating - 3) - a.sold * (a.rating - 3));

    return { items: sorted, catCount, subCount };
  };

  /** Gợi ý từ khoá khi gõ vào ô tìm kiếm */
  C.suggest = (q) => {
    const n = U.words(q).join(' ');
    if (!n) return [];
    const seen = new Set();
    const out = [];
    C.all().forEach((p) => {
      if (out.length >= 8 || !p._search.includes(' ' + n)) return;
      const words = p.name.split(' ').slice(0, 5).join(' ');
      const key = U.normalize(words);
      if (!seen.has(key)) {
        seen.add(key);
        out.push(words);
      }
    });
    return out;
  };

  C.related = (p, n) =>
    C.all()
      .filter((x) => x.id !== p.id && (x.subCategory === p.subCategory || x.categoryId === p.categoryId))
      .sort((a, b) => (b.subCategory === p.subCategory) - (a.subCategory === p.subCategory) || b.sold - a.sold)
      .slice(0, n || 12);
  C.shopProducts = (shopId) => C.all().filter((p) => p.shopId === shopId);
  C.bestSellers = (shopId, n) =>
    C.shopProducts(shopId)
      .sort((a, b) => b.sold - a.sold)
      .slice(0, n || 5);
  /** "Gợi ý hôm nay": trộn ngẫu nhiên theo ngày */
  C.daily = () => {
    const d = new Date();
    return U.shuffle(U.rng(d.getFullYear() * 1000 + d.getMonth() * 40 + d.getDate()), C.all());
  };

  /* ----------------------------- Mô tả & thông số ----------------------------- */
  const DESC = {
    'thoi-trang-nam': ['Chất liệu cotton pha cao cấp, mềm mịn, thấm hút mồ hôi tốt', 'Form dáng chuẩn, đường may chắc chắn, không bai nhão sau khi giặt', 'Dễ phối đồ: đi làm, đi học, dạo phố đều phù hợp', 'Bảng size: M (50–58kg) · L (58–66kg) · XL (66–74kg) · XXL (74–82kg)'],
    'thoi-trang-nu': ['Chất vải mềm mại, thoáng mát, lên form chuẩn', 'Thiết kế trẻ trung, tôn dáng, phù hợp đi chơi, dự tiệc', 'Bảng size: S (40–46kg) · M (46–52kg) · L (52–58kg) · XL (58–64kg)', 'Giặt tay hoặc giặt máy chế độ nhẹ, không dùng chất tẩy mạnh'],
    'dien-thoai-phu-kien': ['Hàng mới, đầy đủ phụ kiện theo máy', 'Hỗ trợ kiểm tra hàng trước khi thanh toán (COD)', 'Đổi mới trong 7 ngày nếu lỗi do nhà sản xuất', 'Tặng kèm ốp lưng và dán màn hình cho đơn điện thoại'],
    'may-tinh-laptop': ['Cấu hình mạnh mẽ, đáp ứng tốt học tập – văn phòng – đồ hoạ', 'Màn hình sắc nét, bàn phím êm, thời lượng pin dài', 'Cài sẵn hệ điều hành, hỗ trợ cài đặt phần mềm miễn phí', 'Bảo hành tại các trung tâm trên toàn quốc'],
    'dong-ho': ['Bộ máy vận hành chính xác, mặt kính chống trầy', 'Chống nước theo tiêu chuẩn nhà sản xuất', 'Fullbox: hộp, sổ bảo hành, thẻ hướng dẫn', 'Hỗ trợ cắt dây/chỉnh size miễn phí'],
    'giay-dep-nam': ['Đế cao su đúc nguyên khối, chống trơn trượt', 'Lót giày êm ái, ôm chân, đi cả ngày không mỏi', 'Form chuẩn size, nên chọn đúng size thường mang', 'Hỗ trợ đổi size trong 7 ngày nếu không vừa'],
    'giay-dep-nu': ['Chất liệu mềm, ôm chân, không đau gót', 'Đế chống trơn trượt, chắc chắn', 'Thiết kế thời trang, dễ phối với váy và quần', 'Hỗ trợ đổi size trong 7 ngày'],
    'nha-cua-doi-song': ['Chất liệu bền đẹp, hoàn thiện tỉ mỉ', 'Thiết kế hiện đại, hợp nhiều phong cách nội thất', 'Đóng gói nhiều lớp chống va đập khi vận chuyển', 'Có hướng dẫn lắp đặt chi tiết'],
    'the-thao-du-lich': ['Chất liệu đạt tiêu chuẩn thi đấu, độ bền cao', 'Phù hợp tập luyện cá nhân, đội nhóm và trường học', 'Thiết kế chắc chắn, cầm nắm thoải mái', 'Bảo hành lỗi sản xuất'],
    'o-to-xe-may': ['Xe mới 100%, đầy đủ giấy tờ hợp lệ', 'Động cơ mạnh mẽ, vận hành êm ái', 'Hỗ trợ đăng ký biển số, giao xe tận nơi', 'Bảo hành động cơ theo chính sách hãng'],
    'sac-dep': ['Thành phần lành tính, phù hợp nhiều loại da', 'Kết cấu mỏng nhẹ, dễ tán, không bết dính', 'Có tem chống giả và hạn sử dụng rõ ràng', 'Bảo quản nơi khô ráo, tránh ánh nắng trực tiếp'],
    'nuoc-hoa': ['Hương thơm sang trọng, lưu hương 6–8 tiếng', 'Thiết kế chai tinh tế, phù hợp làm quà tặng', 'Cam kết hàng thật, hoàn tiền gấp đôi nếu phát hiện hàng giả', 'Tặng kèm túi giấy và thiệp cho đơn quà tặng'],
    'tui-vi-nu': ['Chất liệu da cao cấp, đường may tỉ mỉ', 'Ngăn chứa rộng, đựng vừa điện thoại, ví, mỹ phẩm', 'Phù hợp đi làm, đi chơi, dự tiệc', 'Tặng kèm túi chống bụi'],
    'phu-kien-trang-suc': ['Chất liệu hợp kim cao cấp, không gỉ, không đen', 'Thiết kế tinh tế, dễ phối đồ', 'Không gây kích ứng da', 'Đóng hộp xinh xắn, phù hợp làm quà'],
    'bach-hoa-online': ['Nguồn gốc rõ ràng, đạt tiêu chuẩn an toàn thực phẩm', 'Đóng gói giữ lạnh khi vận chuyển', 'Giao Hỏa Tốc 2H nội thành', 'Hạn sử dụng in trên bao bì'],
    'nha-bep': ['Chất liệu an toàn cho sức khỏe, không chứa BPA', 'Dễ vệ sinh, dùng được với máy rửa bát', 'Thiết kế tiện dụng, tiết kiệm không gian bếp', 'Bảo hành theo chính sách của shop'],
  };
  C.description = (p) => {
    if (p.description) return p.description;
    const cat = catMap.get(p.categoryId) || {};
    const tag = (s) => '#' + U.normalize(s).replace(/[^a-z0-9]+/g, '');
    return [
      p.name.toUpperCase(),
      '',
      '📌 THÔNG TIN SẢN PHẨM',
      '• Thương hiệu: ' + p.brand,
      '• Xuất xứ: ' + p.origin,
      ...(DESC[p.categoryId] || []).map((x) => '• ' + x),
      '',
      '📦 CAM KẾT CỦA SHOP',
      '✔ Sản phẩm giống mô tả và hình ảnh 100%',
      '✔ Đóng gói cẩn thận, giao hàng nhanh toàn quốc',
      '✔ ' + p.returnPolicy,
      '✔ Bảo hành: ' + p.warranty,
      '',
      [tag(cat.name || ''), tag(p.subCategory), tag(p.brand), '#shopvui'].join(' '),
    ].join('\n');
  };
  C.specs = (p) => {
    const cat = catMap.get(p.categoryId) || {};
    return [
      ['Danh Mục', `<a href="#/">ShopVui</a> › <a href="#/category/${cat.id}">${U.esc(cat.name)}</a> › <a href="#/category/${cat.id}?sub=${encodeURIComponent(p.subCategory)}">${U.esc(p.subCategory)}</a>`],
      ['Thương hiệu', U.esc(p.brand)],
      ['Xuất xứ', U.esc(p.origin)],
      ['Bảo hành', U.esc(p.warranty)],
      ['Kho', p.stock.toLocaleString('vi-VN')],
      ['Gửi từ', U.esc(p.location)],
    ];
  };

  /* ----------------------------- Đánh giá ----------------------------- */
  const RV = {
    5: ['Hàng đẹp lắm ạ, đóng gói cẩn thận, giao hàng nhanh. Sẽ ủng hộ shop dài dài ❤️', 'Sản phẩm đúng như mô tả, chất lượng tốt so với giá tiền. Shop tư vấn nhiệt tình.', 'Đã nhận được hàng, rất hài lòng. Đóng gói chắc chắn, ship siêu nhanh luôn!', 'Lần thứ 2 mua của shop rồi, chất lượng vẫn ổn định như lần đầu. 10 điểm!', 'Giao hàng nhanh hơn dự kiến, sản phẩm chất lượng, đáng tiền nha mọi người.', 'Mua đợt sale nên giá quá hời, hàng y hình, cho shop 5 sao.', 'Shop đóng gói kỹ, có cả thiệp cảm ơn dễ thương. Sản phẩm dùng rất ok.', 'Hàng có tem đầy đủ. Shipper thân thiện. Rất đáng mua!', 'Chất lượng vượt mong đợi, sẽ giới thiệu cho bạn bè.', 'Đẹp, xịn, mịn. Không có gì để chê 👍'],
    4: ['Sản phẩm ổn, giao hàng hơi lâu một chút nhưng chấp nhận được.', 'Hàng tốt, đóng gói ổn. Trừ 1 sao vì hộp hơi móp.', 'Chất lượng ổn so với giá, sẽ cân nhắc mua thêm.', 'Dùng thử thấy khá ok, vài hôm nữa dùng tiếp rồi đánh giá thêm.', 'Màu ngoài thực tế hơi khác ảnh một chút nhưng vẫn đẹp.'],
    3: ['Sản phẩm bình thường, không quá xuất sắc.', 'Giao hàng chậm, sản phẩm tạm được.', 'Tạm ổn trong tầm giá, đóng gói hơi sơ sài.'],
    2: ['Hàng không giống mô tả lắm, hơi thất vọng.', 'Giao thiếu phụ kiện, đã nhắn shop đang chờ phản hồi.'],
    1: ['Chất lượng chưa tốt, dùng được vài ngày đã có vấn đề.', 'Đóng gói cẩu thả, sản phẩm bị trầy xước.'],
  };
  const RV_CAT = {
    'thoi-trang-nam': ['Vải mềm, mặc mát, form chuẩn.', 'Mình cao 1m70 nặng 65kg mặc size L vừa đẹp.'],
    'thoi-trang-nu': ['Vải mềm, mặc lên tôn dáng lắm.', 'Mình cao 1m58 nặng 48kg mặc size M vừa xinh.'],
    'giay-dep-nam': ['Giày êm chân, đi cả ngày không đau.', 'Size chuẩn, nên mua đúng size thường đi.'],
    'giay-dep-nu': ['Giày êm, không bị đau gót.', 'Form chuẩn, mang rất xinh.'],
    'dien-thoai-phu-kien': ['Máy chạy mượt, pin trâu.', 'Kết nối nhanh, âm thanh to rõ.'],
    'may-tinh-laptop': ['Máy chạy mượt, màn hình đẹp.', 'Pin dùng được cả ngày học.'],
    'sac-dep': ['Lên màu chuẩn, không gây kích ứng.', 'Dùng xong da mềm mịn hẳn.'],
    'nuoc-hoa': ['Mùi thơm dễ chịu, lưu hương lâu.', 'Xịt một lần thơm cả ngày.'],
    'bach-hoa-online': ['Đồ tươi ngon, date mới.', 'Giao trong ngày, còn lạnh nguyên.'],
    'nha-bep': ['Chất liệu chắc chắn, dùng thích.', 'Thiết kế đẹp, dễ vệ sinh.'],
    'nha-cua-doi-song': ['Đặt trong nhà nhìn sang hẳn.', 'Lắp ráp dễ, chắc chắn.'],
    'the-thao-du-lich': ['Cầm chắc tay, chất lượng tốt.', 'Dùng tập hằng ngày rất ổn.'],
    'dong-ho': ['Đeo lên tay rất sang.', 'Mặt kính sáng, dây đeo chắc chắn.'],
    'phu-kien-trang-suc': ['Đeo lên rất xinh, không bị ngứa.', 'Đóng hộp đẹp, tặng bạn rất hợp.'],
    'tui-vi-nu': ['Túi đựng được nhiều đồ, da mềm.', 'Màu đẹp, khoá kéo chắc chắn.'],
  };
  const NAMES = ['minhanh', 'thuhuong', 'tuanpham', 'ngoclinh', 'quanghuy', 'baotram', 'hoangnam', 'phuongvy', 'khanhduy', 'thanhtruc', 'ducthinh', 'mytien', 'giabao', 'hongnhung', 'vietanh', 'haiyen', 'lamtung', 'thaovy', 'kimngan', 'trungkien'];
  const AV_COLORS = ['#f4511e', '#00bfa5', '#2673dd', '#8e44ad', '#e67e22', '#16a085', '#c0392b', '#546e7a'];
  const rvCache = new Map();

  C.reviews = (p) => {
    if (rvCache.has(p.id)) return rvCache.get(p.id);
    const r = U.rng(U.hash(p.id + ':reviews'));
    const n = p.ratingCount || 0;
    const x = Math.max(0, Math.min(1, ((p.rating || 4.5) - 3.25) / 1.75));
    const created = new Date(p.createdAt || Date.now()).getTime();
    const span = Math.max(86400000, Date.now() - created);
    const list = [];
    for (let i = 0; i < n; i++) {
      const u = r();
      const stars = u < x ? 5 : u < x + (1 - x) * 0.55 ? 4 : u < x + (1 - x) * 0.8 ? 3 : u < x + (1 - x) * 0.9 ? 2 : 1;
      const hasText = r() < 0.72;
      let text = '';
      if (hasText) {
        text = U.pick(r, RV[stars]);
        const extra = RV_CAT[p.categoryId];
        if (extra && stars >= 4 && r() < 0.5) text += ' ' + U.pick(r, extra);
        if (r() < 0.4) text = `Chất lượng sản phẩm: ${stars >= 4 ? U.pick(r, ['tốt', 'tuyệt vời', 'rất tốt']) : 'tạm được'}\nĐúng với mô tả: ${stars >= 3 ? 'đúng' : 'chưa đúng'}\n` + text;
      }
      const vr = (p.variants || []).length ? (p.variants || []).map((g) => U.pick(r, g.options)).join(', ') : '';
      const name = U.pick(r, NAMES) + Math.floor(r() * 99);
      list.push({
        id: p.id + '-r' + i,
        user: U.maskName(name),
        color: U.pick(r, AV_COLORS),
        rating: stars,
        comment: text,
        variant: vr,
        images: hasText && r() < 0.3 ? (p.images || [p.thumbnail]).slice(0, 1 + Math.floor(r() * 2)) : [],
        likes: Math.floor(r() * r() * 40),
        createdAt: new Date(created + r() * span).toISOString(),
        reply: stars <= 3 && r() < 0.6 ? 'Dạ shop xin lỗi bạn vì trải nghiệm chưa tốt. Shop đã nhắn tin hỗ trợ đổi trả cho bạn, mong bạn thông cảm ạ!' : stars === 5 && r() < 0.08 ? 'Cảm ơn bạn đã tin tưởng ủng hộ shop ❤️' : '',
      });
    }
    list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    rvCache.set(p.id, list);
    return list;
  };

  /** Đánh giá thật của người dùng (từ đơn đã hoàn thành) + đánh giá mẫu */
  C.allReviews = (p) => {
    const db = SV.db.data();
    const mine = db.reviews
      .filter((x) => x.productId === p.id)
      .map((x) => ({ ...x, user: x.username, color: '#f4511e', images: [], likes: 0, reply: '' }))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return mine.concat(C.reviews(p));
  };
  C.reviewStats = (p) => {
    const list = C.allReviews(p);
    const by = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0, withText = 0, withImg = 0;
    list.forEach((x) => {
      by[x.rating]++;
      sum += x.rating;
      if (x.comment) withText++;
      if (x.images && x.images.length) withImg++;
    });
    return { count: list.length, avg: list.length ? sum / list.length : 0, by, withText, withImg };
  };

  SV.catalog = C;
})();
