/* =========================================================
   app.js – Khởi động ứng dụng
   ========================================================= */
(function () {
  'use strict';
  SV.db.load();
  if (SV.db.isFresh()) SV.seedDemo(); // lần đầu mở: nạp dữ liệu mẫu (tài khoản demo, đơn hàng…)
  SV.layout.init();
  window.addEventListener('hashchange', () => SV.router.render());
  // Dữ liệu thay đổi ở tab khác (ví dụ Kênh Người Bán) -> vẽ lại trang hiện tại
  SV.on('sync', () => {
    SV.catalog.invalidate();
    SV.router.render({ keepScroll: true });
  });
  SV.router.render();
})();
