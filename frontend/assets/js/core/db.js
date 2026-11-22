/* =========================================================
   db.js – "Cơ sở dữ liệu" giả lập bằng LocalStorage của trình duyệt.
   Mỗi thuộc tính của đối tượng db tương ứng một BẢNG trong CSDL thật:
     users, addresses, cart, orders, reviews, likes, follows,
     notifications, savedVouchers, chats, sellerProducts, productPatches…
   Dữ liệu danh mục/sản phẩm/shop gốc nằm ở data.js (chỉ đọc).
   ========================================================= */
(function () {
  'use strict';
  const KEY = 'shopvui_db_v1';
  let db = null;
  let fresh = false;
  let memoryOnly = false;

  function empty() {
    return {
      version: 1,
      seq: 1000,
      session: null, // id người dùng đang đăng nhập
      users: [],
      addresses: [],
      cart: [],
      orders: [],
      reviews: [],
      likes: [],
      follows: [],
      notifications: [],
      savedVouchers: [],
      chats: [],
      searchHistory: [],
      walletTx: [], // sổ Ví ShopVuiPay: nạp (+), thanh toán (−), hoàn tiền (+); số dư = tổng các dòng của người dùng
      sellerProducts: [], // sản phẩm do người bán thêm mới
      productPatches: {}, // thay đổi trên sản phẩm gốc: tồn kho, giá, ẩn/xoá…
      soldDelta: {}, // số lượng bán thêm phát sinh từ đơn hoàn thành
      flashSold: {}, // số suất Flash Sale đã bán thêm
      views: {}, // lượt xem sản phẩm (cho thống kê kênh người bán)
      sellerShopId: 's1', // shop đang quản lý ở Kênh Người Bán (chế độ demo)
    };
  }

  SV.db = {
    load() {
      try {
        db = JSON.parse(localStorage.getItem(KEY) || 'null');
      } catch (e) {
        db = null;
        memoryOnly = true;
      }
      if (!db || db.version !== 1) {
        db = empty();
        fresh = true;
      }
      return db;
    },
    data: () => db,
    isFresh: () => fresh,
    isMemoryOnly: () => memoryOnly,
    save() {
      try {
        localStorage.setItem(KEY, JSON.stringify(db));
      } catch (e) {
        memoryOnly = true;
        console.warn('Không ghi được LocalStorage – dữ liệu chỉ lưu tạm trong phiên này.', e);
      }
    },
    nextId(prefix) {
      db.seq = (db.seq || 1000) + 1;
      return prefix + db.seq;
    },
    /** Xoá toàn bộ dữ liệu demo và nạp lại dữ liệu mẫu */
    reset() {
      try {
        localStorage.removeItem(KEY);
      } catch (e) {}
      location.hash = '#/';
      location.reload();
    },
  };

  /* Đồng bộ giữa nhiều tab (ví dụ: tab Người mua và tab Kênh Người Bán) */
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY || !e.newValue) return;
    try {
      db = JSON.parse(e.newValue);
      SV.emit('sync');
    } catch (err) {}
  });
})();
