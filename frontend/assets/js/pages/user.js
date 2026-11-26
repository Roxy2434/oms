/* =========================================================
   Khu vực Tài khoản người mua – Route: #/user/...
   account/profile | account/address | account/password | purchase
   order/:id | notifications | vouchers | likes
   ========================================================= */
(function () {
  'use strict';
  const U = SV.U;
  const C = SV.catalog;
  const ui = SV.ui;
  const O = () => SV.orders;

  const CANCEL_REASONS = ['Tôi muốn cập nhật địa chỉ/sđt nhận hàng', 'Tôi muốn thêm/thay đổi Mã giảm giá', 'Tôi muốn thay đổi sản phẩm (kích thước, màu sắc, số lượng…)', 'Thủ tục thanh toán rắc rối', 'Tôi tìm thấy chỗ mua khác tốt hơn (rẻ hơn, uy tín hơn, giao nhanh hơn…)', 'Tôi không có nhu cầu mua nữa'];
  const RETURN_REASONS = ['Hàng bị lỗi, hư hỏng', 'Giao sai hàng (sai size, sai màu, sai sản phẩm)', 'Hàng khác với mô tả', 'Thiếu hàng, thiếu phụ kiện', 'Hàng giả, hàng nhái'];
  /** Thu ảnh về tối đa 1280px, JPEG ~80% (vài trăm KB) trước khi gửi OMS; OMS nhận tối đa 1,5 MB/ảnh. */
  function shrinkPhoto(file) {
    return new Promise((resolve, reject) => {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return reject(new Error('Chỉ nhận ảnh JPG, PNG hoặc WebP'));
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * s);
        c.height = Math.round(img.naturalHeight * s);
        const g = c.getContext('2d');
        g.fillStyle = '#fff'; // PNG trong suốt -> JPEG nền trắng thay vì đen
        g.fillRect(0, 0, c.width, c.height);
        g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Không đọc được ảnh ' + file.name));
      };
      img.src = url;
    });
  }
  const STAR_LABEL = ['', 'Tệ', 'Không hài lòng', 'Bình thường', 'Hài lòng', 'Tuyệt vời'];

  function sidebar(u, section, sub) {
    const a = (href, on, ic, text) => `<a class="${on ? 'on' : ''}" href="${href}"><span class="ic">${SV.icon(ic, 18)}</span>${text}</a>`;
    return `<aside class="u-side">
      <div class="me">${ui.avatar(u.username, 48)}<div><b>${U.esc(u.username)}</b><a href="#/user/account/profile">${SV.icon('edit', 13)} Sửa Hồ Sơ</a></div></div>
      <nav class="u-nav">
        ${a('#/user/notifications', section === 'notifications', 'bell', 'Thông Báo' + (SV.notify.unread() ? ` <span class="cnt-badge">${SV.notify.unread()}</span>` : ''))}
        ${a('#/user/account/profile', section === 'account', 'user', 'Tài Khoản Của Tôi')}
        ${section === 'account' ? `<div class="sub"><a class="${sub === 'profile' ? 'on' : ''}" href="#/user/account/profile">Hồ Sơ</a><a class="${sub === 'address' ? 'on' : ''}" href="#/user/account/address">Địa Chỉ</a><a class="${sub === 'password' ? 'on' : ''}" href="#/user/account/password">Đổi Mật Khẩu</a></div>` : ''}
        ${a('#/user/purchase', section === 'purchase' || section === 'order', 'orders', 'Đơn Mua')}
        ${a('#/user/wallet', section === 'wallet', 'wallet', 'Ví ShopVuiPay')}
        ${a('#/user/vouchers', section === 'vouchers', 'ticket', 'Kho Voucher')}
        ${a('#/user/likes', section === 'likes', 'heart', 'Đã Thích')}
        ${a('#/seller', false, 'store', 'Kênh Người Bán')}
      </nav></aside>`;
  }

  /* ---------------- Đơn hàng: nút thao tác theo trạng thái ---------------- */
  function orderActions(o, detail) {
    const sellerLink = () => (o.oms ? ' · Kho EZMART đang xử lý, trạng thái tự cập nhật' : '');
    const b = (act, text, primary) => `<button type="button" class="btn ${primary ? 'btn-primary' : ''}" data-oact="${act}" data-id="${o.id}">${text}</button>`;
    const contact = b('chat', 'Liên Hệ Người Bán');
    switch (o.status) {
      case 'UNPAID':
        return { note: o.oms && o.oms.qr && o.oms.qr.payBy ? 'Vui lòng thanh toán trước ' + U.fmtDate(o.oms.qr.payBy, true) + ', quá hạn đơn sẽ tự hủy' : 'Vui lòng thanh toán để người bán chuẩn bị hàng', btns: b('pay', 'Thanh Toán Ngay', true) + b('cancel', 'Hủy Đơn Hàng') };
      case 'TO_SHIP':
        return {
          note: o.confirmed ? 'Người bán đang chuẩn bị hàng' + sellerLink('pickup', 'bấm "Giao cho ĐVVC"') : 'Đang chờ người bán xác nhận' + sellerLink('confirm', 'duyệt đơn'),
          btns: contact + (o.confirmed ? '' : b('cancel', 'Hủy Đơn Hàng')),
        };
      case 'SHIPPING':
        if (o.oms) return { note: 'Đơn vị vận chuyển đang giao' + (o.tracking ? ' · Mã vận đơn ' + o.tracking : '') + sellerLink(), btns: contact };
        return { note: 'Chỉ nhấn "Đã Nhận Hàng" khi đã nhận được hàng và sản phẩm không có vấn đề gì' + sellerLink('shipping', 'hoặc bấm "Đã giao"'), btns: b('received', 'Đã Nhận Hàng', true) + contact };
      case 'COMPLETED':
        return o.reviewed
          ? { note: '', btns: b('rebuy', 'Mua Lại', true) + contact + b('return', 'Trả Hàng/Hoàn Tiền') }
          : { note: 'Đánh giá sản phẩm để giúp người mua khác lựa chọn tốt hơn', btns: b('review', 'Đánh Giá', true) + b('rebuy', 'Mua Lại') + b('return', 'Trả Hàng/Hoàn Tiền') };
      case 'CANCELLED':
        return { note: (o.history.find((h) => h.code === 'CANCELLED') || {}).text || '', btns: b('rebuy', 'Mua Lại', true) + (detail ? '' : `<a class="btn" href="#/user/order/${o.id}">Xem Chi Tiết Hủy Đơn</a>`) };
      case 'RETURN':
        if (o.oms) {
          const rma = o.oms.rma || {};
          const cases = (rma.cases || []).map((x) => x.code + ' · gửi hàng theo vận đơn hoàn ' + x.trackingCode).join('; ');
          const stage = { requested: 'Đang chờ shop duyệt yêu cầu trả hàng', approved: 'Shop đã duyệt', inspecting: 'Kho EZMART đã nhận hàng, đang kiểm định', closed: 'Đã hoàn tất trả hàng/hoàn tiền', rejected: 'Shop từ chối yêu cầu trả hàng' }[rma.stage] || 'Đã gửi yêu cầu trả hàng';
          return { note: stage + (cases ? ' · ' + cases : ''), btns: contact };
        }
        return { note: o.refunded ? 'Yêu cầu hoàn tiền đã được chấp nhận' : 'Đang chờ người bán xử lý yêu cầu trả hàng/hoàn tiền' + sellerLink('return', 'chấp nhận hoàn tiền'), btns: contact };
      default:
        return { note: '', btns: '' };
    }
  }
  function itemActiveQty(o, i) {
    if (!o.oms || !o.oms.activeItems) return i.qty;
    const sku = (C.get(i.productId) || {}).omsSku;
    return sku && sku in o.oms.activeItems ? o.oms.activeItems[sku] : i.qty;
  }
  function itemDeliveredQty(o, i) {
    if (!o.oms || !o.oms.deliveredItems) return itemActiveQty(o, i);
    const sku = (C.get(i.productId) || {}).omsSku;
    return sku && sku in o.oms.deliveredItems ? o.oms.deliveredItems[sku] : itemActiveQty(o, i);
  }
  function itemsHtml(o) {
    return o.items
      .map((i) => {
        const actQty = itemActiveQty(o, i);
        const cancelledPart = o.status !== 'CANCELLED' && actQty < i.qty ? ` <span class="tag tag-gray">${actQty === 0 ? 'Đã hủy kiện' : `Đã hủy ${i.qty - actQty}/${i.qty}`}</span>` : '';
        return `<div class="order-item">${ui.img(i.image, i.emoji)}<div class="info"><div class="nm">${U.esc(i.name)}${cancelledPart}</div>${i.variant ? `<div class="vr">Phân loại hàng: ${U.esc(i.variant)}</div>` : ''}<div>x${i.qty}</div></div><div class="pr">${i.originalPrice > i.price ? `<s>${U.money(i.originalPrice)}</s>` : ''}<span>${U.money(i.price)}</span></div></div>`;
      })
      .join('');
  }
  function shopHd(o) {
    const s = C.shopRaw(o.shopId) || {};
    return `<div class="shop">${ui.shopLabel(s.type)}<b>${U.esc(o.shopName)}</b><button type="button" class="btn btn-primary btn-xs" data-oact="chat" data-id="${o.id}">${SV.icon('chat', 13)} Chat</button><a class="btn btn-xs" href="#/shop/${o.shopId}">${SV.icon('store', 13)} Xem Shop</a></div>`;
  }
  function orderCard(o) {
    const last = O().lastEvent(o);
    const acts = orderActions(o);
    return `<div class="order">
      <div class="order-hd">${shopHd(o)}<div class="st">${['SHIPPING', 'COMPLETED'].includes(o.status) ? `<a class="teal" href="#/user/order/${o.id}">${SV.icon('truck', 16)} ${U.esc(last.text)}</a>` : ''}<b>${O().statusText(o).toUpperCase()}</b></div></div>
      <a class="order-items" href="#/user/order/${o.id}">${itemsHtml(o)}</a>
      <div class="order-ft"><div class="tot">${SV.icon('shield', 16)} Thành tiền: <b>${U.money(o.oms && o.oms.refunded > 0 && o.status !== 'CANCELLED' ? Math.max(0, o.amounts.total - o.oms.refunded) : o.amounts.total)}</b>${o.oms && o.oms.refunded > 0 && o.status !== 'CANCELLED' ? ` <span class="muted small">(đã hoàn ${U.money(o.oms.refunded)})</span>` : ''}</div>
        <div class="acts"><span class="note">${acts.note}</span>${acts.btns}</div></div>
    </div>`;
  }

  async function handleOrderAction(act, id, rerender) {
    const o = O().get(id);
    if (!o) return;
    if (act === 'chat') return SV.openChat(o.shopId);
    if (act === 'pay') {
      if (SV.oms.hasQr(o)) return SV.go('/payment/' + o.id);
      const ok = await ui.modal({ title: 'Xác nhận thanh toán chuyển khoản', width: 460, okText: 'Tôi đã thanh toán', cancelText: 'Để sau', body: `<div class="pay-sim"><div class="pay-amt">${U.money(o.amounts.total)}</div><p>Đơn hàng <b>${o.code}</b></p><p class="note">Vui lòng kiểm tra đúng số tiền trước khi xác nhận đã chuyển khoản.</p></div>` });
      if (ok) {
        const pr = await O().pay(id);
        if (pr && pr.error) return ui.toast(pr.error, 'error');
        ui.toast('Thanh toán thành công');
      }
    } else if (act === 'cancel') {
      const reason = await ui.modal({
        title: 'Chọn Lý Do Hủy', width: 520, okText: 'Hủy Đơn Hàng', cancelText: 'Không Phải Bây Giờ',
        body: `<p class="notice">Vui lòng chọn lý do hủy. Với lý do này, bạn sẽ hủy tất cả sản phẩm trong đơn hàng và không thể thay đổi sau đó.</p>${CANCEL_REASONS.map((r) => `<label class="radio-row"><input type="radio" name="reason" value="${U.esc(r)}"> ${U.esc(r)}</label>`).join('')}<div class="msg"></div>`,
        onOk(m) {
          const c = m.querySelector('[name=reason]:checked');
          if (!c) {
            m.querySelector('.msg').textContent = 'Vui lòng chọn lý do hủy';
            return false;
          }
          return c.value;
        },
      });
      if (reason) {
        const r = await O().cancel(id, reason, 'buyer');
        ui.toast(r.ok ? 'Đã hủy đơn hàng' : r.error, r.ok ? 'success' : 'error');
      }
    } else if (act === 'received') {
      if (await ui.confirm('Xác nhận bạn đã nhận được hàng và sản phẩm không có vấn đề gì? Sau khi xác nhận, ShopVui sẽ thanh toán cho người bán.', { okText: 'Đã nhận hàng' })) {
        O().confirmReceived(id);
        ui.toast('Cảm ơn bạn! Hãy đánh giá sản phẩm nhé');
      }
    } else if (act === 'rebuy') {
      const r = O().rebuy(id);
      if (!r.ok) return ui.toast('Sản phẩm đã hết hàng hoặc ngừng bán', 'error');
      return SV.go('/cart');
    } else if (act === 'review') {
      const entries = await ui.modal({
        title: 'Đánh Giá Sản Phẩm', width: 620, okText: 'Hoàn Thành', cancelText: 'Trở Lại',
        body: o.items
          .map((it, i) => `<div class="rv-form" data-i="${i}"><div class="rv-prod">${ui.img(it.image, it.emoji)}<div><div class="nm">${U.esc(it.name)}</div>${it.variant ? `<div class="muted">Phân loại hàng: ${U.esc(it.variant)}</div>` : ''}</div></div>
            <div class="star-row"><span>Chất lượng sản phẩm</span><div class="star-pick" data-val="5">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-star="${n}" class="on" aria-label="${n} sao">${SV.icon('star', 28)}</button>`).join('')}</div><span class="star-lbl">${STAR_LABEL[5]}</span></div>
            <textarea class="input" rows="3" name="c${i}" maxlength="500" placeholder="Hãy chia sẻ những điều bạn thích về sản phẩm này với những người mua khác nhé."></textarea></div>`)
          .join(''),
        onOpen(m) {
          m.addEventListener('click', (e) => {
            const s = e.target.closest('[data-star]');
            if (!s) return;
            const pick = s.parentElement;
            const n = +s.dataset.star;
            pick.dataset.val = n;
            pick.querySelectorAll('[data-star]').forEach((b) => b.classList.toggle('on', +b.dataset.star <= n));
            pick.nextElementSibling.textContent = STAR_LABEL[n];
          });
        },
        onOk: (m) => o.items.map((it, i) => ({ productId: it.productId, variant: it.variant, rating: +m.querySelector(`[data-i="${i}"] .star-pick`).dataset.val, comment: m.querySelector(`[name=c${i}]`).value })),
      });
      if (entries) {
        const r = SV.reviews.add(id, entries);
        ui.toast(r.ok ? 'Cảm ơn bạn đã đánh giá!' : r.error, r.ok ? 'success' : 'error');
      }
    } else if (act === 'return') {
      // Chọn món + số lượng cần trả, lý do, mô tả và tối đa 3 ảnh (không bắt buộc) làm bằng chứng cho kho.
      const photos = [];
      let pending = 0;
      const returnable = o.items.map((it, i) => ({ it, i, max: itemDeliveredQty(o, it) }));
      const onlyIdx = returnable.filter((x) => x.max > 0).length === 1 ? returnable.find((x) => x.max > 0).i : -1;
      const req = await ui.modal({
        title: 'Yêu Cầu Trả Hàng/Hoàn Tiền', width: 600, okText: 'Gửi Yêu Cầu',
        body: `<p class="notice">Áp dụng trong vòng ${O().returnDays(o)} ngày kể từ khi nhận hàng.</p>
          <h4 class="rt-h">Sản phẩm muốn trả</h4>
          ${returnable.map(({ it, i, max }) => `<label class="rt-item">
            <input type="checkbox" name="pick" value="${i}"${onlyIdx === i ? ' checked' : ''}${max <= 0 ? ' disabled' : ''}>
            ${ui.img(it.image, it.emoji)}
            <span class="rt-name">${U.esc(it.name)}${max <= 0 ? ' <span class="muted">(Đã hủy kiện — đã hoàn tiền)</span>' : ''}${it.variant ? `<span class="muted">Phân loại: ${U.esc(it.variant)}</span>` : ''}</span>
            <span class="rt-qty">${max > 0 ? `SL <input class="input" type="number" name="q${i}" min="1" max="${max}" value="${max}"${onlyIdx === i ? '' : ' disabled'} aria-label="Số lượng trả ${U.esc(it.name)}"> / ${max}` : '—'}</span>
          </label>`).join('')}
          <h4 class="rt-h">Lý do</h4>
          ${RETURN_REASONS.map((r) => `<label class="radio-row"><input type="radio" name="reason" value="${U.esc(r)}"> ${U.esc(r)}</label>`).join('')}
          <h4 class="rt-h">Mô tả thêm <span class="muted">(không bắt buộc)</span></h4>
          <textarea class="input" name="note" rows="3" maxlength="500" placeholder="Ví dụ: Hộp bị móp góc trái, sản phẩm trầy mặt trước…"></textarea>
          <h4 class="rt-h">Hình ảnh <span class="muted">(không bắt buộc, tối đa 3 ảnh)</span></h4>
          <div class="rt-photos"><label class="rt-add">${SV.icon('image', 22)}<span>Thêm ảnh</span><input type="file" name="photo" accept="image/jpeg,image/png,image/webp" multiple hidden></label></div>
          <div class="msg"></div>`,
        onOpen(m) {
          const msg = m.querySelector('.msg');
          const box = m.querySelector('.rt-photos');
          const add = box.querySelector('.rt-add');
          const draw = () => {
            box.querySelectorAll('.rt-thumb').forEach((x) => x.remove());
            photos.forEach((src, i) => add.insertAdjacentHTML('beforebegin', `<span class="rt-thumb"><img src="${src}" alt="Ảnh ${i + 1}"><button type="button" data-rm="${i}" aria-label="Xóa ảnh ${i + 1}">×</button></span>`));
            add.hidden = photos.length >= 3;
          };
          m.addEventListener('change', async (e) => {
            if (e.target.name === 'pick') m.querySelector(`[name=q${e.target.value}]`).disabled = !e.target.checked;
            if (e.target.name !== 'photo') return;
            const files = [...e.target.files].slice(0, 3 - photos.length);
            e.target.value = '';
            pending++;
            try {
              for (const f of files) photos.push(await shrinkPhoto(f));
              msg.textContent = '';
            } catch (err) {
              msg.textContent = err.message;
            } finally {
              pending--;
              draw();
            }
          });
          m.addEventListener('click', (e) => {
            const rm = e.target.closest('[data-rm]');
            if (!rm) return;
            photos.splice(+rm.dataset.rm, 1);
            draw();
          });
        },
        onOk(m) {
          const msg = m.querySelector('.msg');
          const items = [...m.querySelectorAll('[name=pick]:checked')].map((c) => {
            const max = itemDeliveredQty(o, o.items[+c.value]);
            return { index: +c.value, qty: Math.max(1, Math.min(max, Math.floor(+m.querySelector(`[name=q${c.value}]`).value) || 0)) };
          });
          const c = m.querySelector('[name=reason]:checked');
          if (!items.length) msg.textContent = 'Vui lòng chọn sản phẩm muốn trả';
          else if (!c) msg.textContent = 'Vui lòng chọn lý do';
          else if (pending) msg.textContent = 'Đang xử lý ảnh, vui lòng đợi giây lát';
          else return { reason: c.value, items, note: m.querySelector('[name=note]').value.trim(), photos: photos.slice() };
          return false;
        },
      });
      if (req) {
        const r = await O().requestReturn(id, req.reason, req);
        ui.toast(r.ok ? 'Đã gửi yêu cầu trả hàng/hoàn tiền' : r.error || 'Không thể gửi yêu cầu', r.ok ? 'success' : 'error');
      }
    }
    rerender();
  }

  /* ---------------- Các mục nội dung ---------------- */
  const SECTIONS = {
    profile(main, u) {
      const g = u.gender;
      main.innerHTML = `<div class="hd"><h2>Hồ Sơ Của Tôi</h2><p>Quản lý thông tin hồ sơ để bảo mật tài khoản</p></div>
        <div class="profile"><form class="profile-form" data-profile novalidate>
          <div class="form-row"><label>Tên đăng nhập</label><div>${U.esc(u.username)}</div></div>
          <div class="form-row"><label>Tên</label><div class="fld"><input class="input" name="name" value="${U.esc(u.name)}"><div class="msg"></div></div></div>
          <div class="form-row"><label>Email</label><div class="fld"><input class="input" name="email" value="${U.esc(u.email)}"><div class="msg"></div></div></div>
          <div class="form-row"><label>Số điện thoại</label><div class="fld"><input class="input" name="phone" value="${U.esc(u.phone)}"><div class="msg"></div></div></div>
          <div class="form-row"><label>Giới tính</label><div><label class="radio"><input type="radio" name="gender" value="male" ${g === 'male' ? 'checked' : ''}> Nam</label><label class="radio"><input type="radio" name="gender" value="female" ${g === 'female' ? 'checked' : ''}> Nữ</label><label class="radio"><input type="radio" name="gender" value="other" ${g === 'other' ? 'checked' : ''}> Khác</label></div></div>
          <div class="form-row"><label>Ngày sinh</label><input class="input w-auto" type="date" name="birthday" value="${U.esc(u.birthday)}"></div>
          <div class="form-row"><label></label><button class="btn btn-primary" type="submit">Lưu</button></div>
        </form><div class="profile-av">${ui.avatar(u.username, 100)}<p class="muted">Ảnh đại diện được tạo tự động<br>từ tên đăng nhập</p></div></div>`;
      main.querySelector('[data-profile]').addEventListener('submit', async (e) => {
        e.preventDefault();
        const r = await SV.auth.updateProfile(ui.formData(e.target));
        ui.toast(r.ok ? 'Cập nhật hồ sơ thành công' : r.error, r.ok ? 'success' : 'error');
      });
    },
    address(main, u, redraw) {
      const list = SV.address.list();
      main.innerHTML = `<div class="hd flex"><h2>Địa chỉ của tôi</h2><button type="button" class="btn btn-primary" data-add>${SV.icon('plus', 14)} Thêm địa chỉ mới</button></div>
        ${list.length ? list.map((a) => `<div class="addr-item"><div><div><b>${U.esc(a.name)}</b> <span class="muted">| (+84) ${U.esc(a.phone.replace(/^0/, ''))}</span></div><div class="muted">${U.esc(a.detail)}</div><div class="muted">${U.esc(a.ward)}, ${U.esc(a.province)}</div><div class="tags">${a.isDefault ? '<span class="def">Mặc định</span>' : ''}<span class="tag tag-gray">${a.type === 'office' ? 'Văn phòng' : 'Nhà riêng'}</span></div></div>
          <div class="acts"><div><button type="button" class="link" data-edit="${a.id}">Cập nhật</button>${a.isDefault ? '' : `<button type="button" class="link" data-del="${a.id}">Xóa</button>`}</div><button type="button" class="btn btn-sm" data-default="${a.id}" ${a.isDefault ? 'disabled' : ''}>Thiết lập mặc định</button></div></div>`).join('') : ui.empty('📍', 'Bạn chưa có địa chỉ nào')}`;
      main.addEventListener('click', async (e) => {
        if (e.target.closest('[data-add]')) (await ui.addressModal()) && redraw();
        const ed = e.target.closest('[data-edit]');
        if (ed) (await ui.addressModal(SV.address.get(ed.dataset.edit))) && redraw();
        const del = e.target.closest('[data-del]');
        if (del && (await ui.confirm('Bạn có chắc muốn xóa địa chỉ này?', { okText: 'Xóa' }))) {
          const r = await SV.address.remove(del.dataset.del);
          if (!r.ok) ui.toast(r.error, 'error');
          redraw();
        }
        const df = e.target.closest('[data-default]');
        if (df) {
          const r = await SV.address.setDefault(df.dataset.default);
          if (!r.ok) ui.toast(r.error, 'error');
          redraw();
        }
      });
    },
    password(main) {
      main.innerHTML = `<div class="hd"><h2>Đổi Mật Khẩu</h2><p>Để bảo mật tài khoản, vui lòng không chia sẻ mật khẩu cho người khác</p></div>
        <form class="profile-form narrow" data-pw novalidate>
          <div class="form-row"><label>Mật khẩu hiện tại</label><div class="fld"><input class="input" type="password" name="old" autocomplete="current-password"><div class="msg"></div></div></div>
          <div class="form-row"><label>Mật khẩu mới</label><div class="fld"><input class="input" type="password" name="new" autocomplete="new-password"><div class="msg"></div></div></div>
          <div class="form-row"><label>Xác nhận mật khẩu</label><div class="fld"><input class="input" type="password" name="confirm" autocomplete="new-password"><div class="msg"></div></div></div>
          <div class="form-row"><label></label><button class="btn btn-primary" type="submit">Xác nhận</button></div>
        </form>`;
      const f = main.querySelector('[data-pw]');
      f.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (f.new.value !== f.confirm.value) return ui.fieldError(f, 'confirm', 'Mật khẩu xác nhận không khớp');
        const r = await SV.auth.changePassword(f.old.value, f.new.value);
        if (!r.ok) return ui.fieldError(f, r.field, r.error);
        f.reset();
        ui.fieldError(f, null, '');
        ui.toast('Đổi mật khẩu thành công');
      });
    },
    purchase(main, u, redraw, ctx) {
      const type = ctx.query.get('type') || 'all';
      const q = ctx.query.get('q') || '';
      const counts = O().countByTab(u.id);
      const list = O().list({ userId: u.id, tab: type, q });
      main.classList.add('bare');
      main.innerHTML = `<div class="o-tabs">${O()
        .TABS.map(([k, l]) => `<a class="${k === type ? 'on' : ''}" href="#/user/purchase?type=${k}">${l}${counts[k] && ['unpaid', 'toship', 'shipping'].includes(k) ? ` <span class="cnt">(${counts[k]})</span>` : ''}</a>`)
        .join('')}</div>
        <form class="o-search" data-osearch>${SV.icon('search', 18)}<input name="q" placeholder="Bạn có thể tìm kiếm theo tên Shop, ID đơn hàng hoặc Tên Sản phẩm" value="${U.esc(q)}"></form>
        ${list.length ? list.map(orderCard).join('') : `<div class="o-empty">${ui.empty('📋', 'Chưa có đơn hàng')}</div>`}`;
      main.querySelector('[data-osearch]').addEventListener('submit', (e) => {
        e.preventDefault();
        SV.go('/user/purchase' + U.qs({ type: type === 'all' ? '' : type, q: e.target.q.value.trim() }));
      });
      main.addEventListener('click', (e) => {
        const b = e.target.closest('[data-oact]');
        if (b) handleOrderAction(b.dataset.oact, b.dataset.id, redraw);
      });
    },
    order(main, u, redraw, ctx) {
      const o = O().get(ctx.params.sub);
      if (!o || o.userId !== u.id) {
        main.innerHTML = ui.empty('📋', 'Không tìm thấy đơn hàng', '<a class="btn btn-primary" href="#/user/purchase">Quay lại Đơn mua</a>');
        return;
      }
      const has = (code) => o.history.find((h) => h.code === code);
      const steps = [
        ['PLACED', 'Đơn Hàng Đã Đặt', 'orders'],
        ['CONFIRMED', 'Người Bán Đã Xác Nhận', 'check'],
        ['SHIPPED', 'Đã Giao Cho ĐVVC', 'truck'],
        ['DELIVERED', 'Đã Nhận Được Hàng', 'box'],
        ['REVIEWED', 'Đánh Giá', 'star'],
      ];
      const acts = orderActions(o, true);
      const cancel = has('CANCELLED');
      main.classList.add('bare');
      main.innerHTML = `<div class="od">
        <div class="od-top"><a href="#/user/purchase" class="back">${SV.icon('left', 16)} TRỞ LẠI</a><div>MÃ ĐƠN HÀNG. ${o.code} <i class="sep-v"></i> <b class="primary">${O().statusText(o).toUpperCase()}</b></div></div>
        ${cancel
          ? `<div class="od-cancel"><h3>Đã hủy đơn hàng</h3><p>vào ${U.fmtDate(cancel.at, true)}</p><p>${U.esc(cancel.text)}</p></div>`
          : `<div class="stepper">${steps
              .map(([code, t, ic], i) => {
                // A later milestone implies the earlier ones (an order delivered between two syncs may lack the middle events).
                const reached = (j) => steps.slice(j, 4).some(([c]) => has(c)) || (j === 4 && has('REVIEWED'));
                const h = has(code);
                const nextDone = steps[i + 1] && reached(i + 1);
                return `<div class="step ${reached(i) ? 'done' : ''} ${nextDone ? 'line-done' : ''}"><div class="dot">${SV.icon(ic, 26)}</div><div class="t">${t}</div><div class="d">${h ? U.fmtDate(h.at, true) : ''}</div></div>`;
              })
              .join('')}</div>`}
        <div class="od-actions"><span class="note">${acts.note}</span>${acts.btns}</div>
        <div class="od-stripe"></div>
        <div class="od-addr"><div><h4>Địa Chỉ Nhận Hàng</h4><b>${U.esc(o.address.name)}</b><p class="muted">(+84) ${U.esc(o.address.phone.replace(/^0/, ''))}</p><p class="muted">${U.esc(SV.address.text(o.address))}</p>
            <h4 class="mt">Vận chuyển</h4><p class="muted">${o.shipping.name}${o.tracking ? ' · SVExpress · ' + o.tracking : ''}</p>${o.note ? `<h4 class="mt">Lời nhắn</h4><p class="muted">${U.esc(o.note)}</p>` : ''}</div>
          <div class="timeline">${o.history.slice().reverse().map((h) => `<div class="ev"><time>${U.fmtDate(h.at, true)}</time><span>${U.esc(h.text)}</span></div>`).join('')}</div></div>
        <div class="order od-items"><div class="order-hd">${shopHd(o)}</div><div class="order-items">${itemsHtml(o)}</div></div>
        <div class="od-sum">
          <div class="k">Tổng tiền hàng</div><div>${U.money(o.amounts.subtotal)}</div>
          <div class="k">Phí vận chuyển</div><div>${U.money(o.amounts.shipping)}</div>
          ${o.amounts.shipDiscount ? `<div class="k">Giảm giá phí vận chuyển</div><div>-${U.money(o.amounts.shipDiscount)}</div>` : ''}
          ${o.amounts.shopDiscount ? `<div class="k">Voucher từ Shop</div><div>-${U.money(o.amounts.shopDiscount)}</div>` : ''}
          ${o.amounts.platformDiscount ? `<div class="k">Voucher từ ShopVui</div><div>-${U.money(o.amounts.platformDiscount)}</div>` : ''}
          <div class="k">Thành tiền</div><div class="big">${U.money(o.oms && o.oms.refunded > 0 && o.status !== 'CANCELLED' ? Math.max(0, o.amounts.total - o.oms.refunded) : o.amounts.total)}</div>
          ${o.oms && o.oms.refunded > 0 ? `<div class="k">Đã hoàn tiền</div><div class="teal">-${U.money(o.oms.refunded)}</div>` : ''}
          <div class="k">Phương thức Thanh toán</div><div>${o.payment.label}${o.payment.paid ? ' · <span class="teal">Đã thanh toán</span>' : ''}</div>
        </div></div>`;
      main.addEventListener('click', (e) => {
        const b = e.target.closest('[data-oact]');
        if (b) handleOrderAction(b.dataset.oact, b.dataset.id, redraw);
      });
    },
    notifications(main, u, redraw) {
      const list = SV.notify.list();
      main.innerHTML = `<div class="hd flex"><h2>Thông Báo</h2>${list.some((n) => !n.read) ? '<button type="button" class="link" data-readall>Đánh dấu Đã đọc tất cả</button>' : ''}</div>
        ${list.length ? list.map((n) => `<a class="notif ${n.read ? '' : 'unread'}" href="${n.link || '#/user/notifications'}" data-notif="${n.id}">${n.image ? ui.img(n.image, n.emoji) : `<span class="pn-emoji">${n.emoji || '🔔'}</span>`}<div class="ct"><b>${U.esc(n.title)}</b><p>${U.esc(n.body)}</p><time>${U.fmtDate(n.createdAt, true)}</time></div><span class="btn btn-sm">Xem Chi Tiết</span></a>`).join('') : ui.empty('🔔', 'Chưa có thông báo')}`;
      main.addEventListener('click', (e) => {
        if (e.target.closest('[data-readall]')) {
          SV.notify.readAll();
          redraw();
        }
      });
    },
    vouchers(main) {
      const shopV = SV.vouchers.savedShopVouchers();
      main.innerHTML = `<div class="hd"><h2>Kho Voucher</h2><p>Voucher của ShopVui được tự động áp dụng tại bước Thanh toán khi đơn hàng đủ điều kiện</p></div>
        <h3 class="sub-h">Voucher ShopVui</h3><div class="voucher-grid">${SV.vouchers.platform().map((v) => ui.voucher(v, { action: '<a class="btn btn-outline btn-sm" href="#/">Dùng ngay</a>' })).join('')}</div>
        <h3 class="sub-h">Voucher Của Shop Đã Lưu</h3>${shopV.length ? `<div class="voucher-grid">${shopV.map((v) => ui.voucher(v, { shop: v.shop, action: `<a class="btn btn-outline btn-sm" href="#/shop/${v.shop.id}">Dùng ngay</a>` })).join('')}</div>` : '<p class="muted">Bạn chưa lưu voucher nào của shop. Bấm "Lưu" tại trang sản phẩm hoặc trang shop.</p>'}`;
    },
    wallet(main) {
      const list = SV.wallet.list();
      const kind = { OPEN: 'Số dư ban đầu', TOPUP: 'Nạp tiền', PAY: 'Thanh toán', REFUND: 'Hoàn tiền' };
      main.innerHTML = `<div class="hd"><h2>Ví ShopVuiPay</h2><p>Thanh toán đơn hàng tức thì và nhận tiền hoàn tự động khi hủy đơn hoặc trả hàng hợp lệ.</p></div>
        <div class="wallet-card"><span>Số dư hiện tại</span><b data-balance>${U.money(SV.wallet.balance())}</b></div>
        <h3 class="sub-h">Lịch sử giao dịch</h3>
        ${list.length ? `<ul class="wallet-tx">${list.map((t) => `<li><div><b>${kind[t.type]}</b><span>${U.esc(t.note)}</span><small>${U.fmtDate(t.at, true)}</small></div><strong class="${t.amount > 0 ? 'in' : 'out'}">${t.amount > 0 ? '+' : '−'}${U.money(Math.abs(t.amount))}</strong>${t.orderId ? `<a class="link" href="#/user/order/${t.orderId}">Xem đơn</a>` : '<span aria-hidden="true"></span>'}</li>`).join('')}</ul>` : ui.empty('👛', 'Chưa có giao dịch nào', '')}`;
    },
    likes(main) {
      const list = SV.likes.list();
      main.innerHTML = `<div class="hd"><h2>Sản Phẩm Đã Thích</h2><p>${list.length} sản phẩm</p></div>${list.length ? ui.grid(list, 'grid-4') : ui.empty('💗', 'Bạn chưa thích sản phẩm nào', '<a class="btn btn-primary" href="#/">Khám phá ngay</a>')}`;
    },
  };

  SV.pages.user = {
    render(el, ctx) {
      const u = SV.auth.current();
      const section = ctx.params.section;
      const sub = ctx.params.sub || 'profile';
      const key = section === 'account' ? sub : section;
      if (!SECTIONS[key]) return SV.go('/user/account/profile');
      const titles = { profile: 'Hồ Sơ', address: 'Địa Chỉ', password: 'Đổi Mật Khẩu', purchase: 'Đơn Mua', order: 'Chi Tiết Đơn Hàng', notifications: 'Thông Báo', vouchers: 'Kho Voucher', wallet: 'Ví ShopVuiPay', likes: 'Đã Thích' };
      document.title = titles[key] + ' | ShopVui';
      const draw = () => {
        el.innerHTML = `<div class="container u-layout">${sidebar(u, section, sub)}<div class="u-main"></div></div>`;
        SECTIONS[key](el.querySelector('.u-main'), u, draw, ctx);
      };
      draw();
    },
  };
})();
