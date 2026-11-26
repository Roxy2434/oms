/* =========================================================
   oms-shop.js – Shop "EZMART": cửa hàng của mình bán trên ShopVui.
   Sản phẩm = đúng các SKU của hệ thống OMS. Giá và tồn được làm mới từ OMS khi mở trang;
   đơn đặt ở shop này được gửi sang OMS (xem core/oms.js), kho bên OMS đóng gói và giao.
   ========================================================= */
(function () {
  'use strict';
  // Địa chỉ OMS và khoá tích hợp (bản chạy local). Khoá phải khớp SHOPVUI_KEY bên OMS.
  const local = ['127.0.0.1', 'localhost'].includes(location.hostname);
  window.SV_OMS = window.SV_OMS || { base: (local ? location.protocol + '//' + location.hostname + ':3001' : location.origin) + '/api/integrations/shopvui', key: 'shopvui-local-demo', shopId: 'oms' };
  const D = window.SV_DATA;
  D.shops.push({
    id: 'oms', name: 'EZMART', location: 'Hà Nội', type: 'preferred_plus', rating: 4.9, followers: 12850, joinedYearsAgo: 3,
    responseRate: 98, responseTime: 'trong vài phút', productCount: 10, vouchers: [], oms: true,
  });
  // Giá/tồn ban đầu chỉ để hiển thị khi OMS chưa trả lời; OMS là nguồn đúng.
  const SKUS = [
    ['HT-1200', 'Hộp thực phẩm 1.200ml – Trong suốt', 90000, 'Hộp đựng thực phẩm', 'Hộp bảo quản thực phẩm EZMART dung tích 1.200ml bằng nhựa PP nguyên sinh an toàn thực phẩm, nắp khóa 4 cạnh kèm gioăng silicone kín khí chống tràn. Sử dụng an toàn trong ngăn đông tủ lạnh, máy rửa chén và hâm nóng lò vi sóng.'],
    ['BT-750-XANH', 'Bình giữ nhiệt 750ml – Xanh', 250000, 'Bình nước', 'Bình giữ nhiệt EZMART 750ml cấu tạo 2 lớp inox 304 chân không cách nhiệt, giữ nóng đến 8 giờ và giữ lạnh đến 16 giờ. Lớp sơn tĩnh điện màu xanh nhám chống bám vân tay, nắp vặn kín kèm lưới lọc trà tiện lợi.'],
    ['BD-28', 'Chảo chống dính 28cm', 320000, 'Nồi chảo', 'Chảo chống dính đáy từ EZMART đường kính 28cm phủ 5 lớp chống dính vân đá bền bỉ, hạn chế dầu mỡ và dễ vệ sinh. Đáy 3 lớp dẫn nhiệt đều, tương thích bếp từ, bếp gas và bếp hồng ngoại.'],
    ['CB-6', 'Bộ cốc 6 chiếc', 210000, 'Ly cốc', 'Bộ 6 cốc thủy tinh cao cấp EZMART độ trong suốt cao, thành cốc dày chịu nhiệt tốt, thiết kế vát cạnh sang trọng dễ cầm nắm, phù hợp tiếp khách gia đình và văn phòng.'],
    ['CH-500', 'Cốc thủy tinh 500ml', 65000, 'Ly cốc', 'Cốc thủy tinh chịu nhiệt EZMART dung tích 500ml có tay cầm chắc chắn, vạch chia ml rõ nét, thích hợp pha trà, cà phê, sinh tố hoặc sữa hạt hằng ngày.'],
    ['DC-3', 'Dao bếp bộ 3', 185000, 'Dao kéo', 'Bộ 3 dao làm bếp EZMART lưỡi thép không gỉ sắc bén gồm dao thái bản lớn, dao gọt trái cây và dao đa năng. Cán đúc liền khối cân bằng lực, cầm êm tay và an toàn khi sơ chế.'],
    ['KH-2', 'Khay inox chữ nhật', 110000, 'Đồ bếp', 'Khay chữ nhật inox 304 EZMART bề mặt sáng bóng, viền bo tròn mịn không sắc cạnh, dùng đựng thực phẩm sơ chế, đồ nướng hoặc sắp xếp gọn gàng trong tủ lạnh.'],
    ['KT-SET', 'Khăn tắm cotton – Xám', 120000, 'Gia dụng', 'Bộ khăn tắm EZMART dệt từ 100% sợi bông cotton tự nhiên mềm mịn, thấm hút nước nhanh, nhanh khô và không xù lông sau nhiều lần giặt.'],
    ['TG-1', 'Túi giữ nhiệt – Xanh', 145000, 'Gia dụng', 'Túi giữ nhiệt hộp cơm EZMART vải Oxford trượt nước kết hợp lớp lót bạc dày dặn giúp giữ ấm bữa trưa văn phòng, dã ngoại nhiều giờ liền; khóa kéo đôi bền chắc.'],
    ['TH-5', 'Thùng đựng 5L – Trắng', 75000, 'Lưu trữ', 'Thùng lưu trữ đa năng EZMART dung tích 5L nhựa ABS dày dặn kèm nắp đậy phẳng có thể xếp chồng tiết kiệm diện tích, phù hợp đựng đồ khô, phụ kiện gia đình và bàn làm việc.'],
  ];
  // Reviewed local photographs and derivative-license attribution: assets/images/ezmart/credits.html.
  SKUS.forEach(([sku, name, originalPrice, sub, desc], i) =>
    D.products.push({
      id: 'oms-' + sku, omsSku: sku, name, categoryId: 'nha-bep', subCategory: sub, shopId: 'oms', brand: 'EZMART',
      price: originalPrice / 2, originalPrice, demoOriginalPrice: originalPrice, discount: 50, rating: 4.8, ratingCount: 120 + i * 17, sold: 300 + i * 41, stock: 0,
      location: 'Hà Nội', origin: 'Việt Nam', warranty: '6 tháng', returnPolicy: 'Đổi trả trong 7 ngày',
      labels: [], thumbnail: 'assets/images/ezmart/' + sku.toLowerCase() + '.webp', images: ['assets/images/ezmart/' + sku.toLowerCase() + '.webp'], variants: [], createdAt: '2026-11-01T08:00:00+07:00',
      description: desc,
    })
  );
})();
