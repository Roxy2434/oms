/* =========================================================
   oms-shop.js – Shop "EZMART": cửa hàng của mình bán trên ShopVui.
   Sản phẩm = đúng các SKU của hệ thống OMS. Giá và tồn được làm mới từ OMS khi mở trang;
   đơn đặt ở shop này được gửi sang OMS (xem core/oms.js), kho bên OMS đóng gói và giao.
   ========================================================= */
(function () {
  'use strict';
  // Địa chỉ OMS và khoá tích hợp (bản chạy local). Khoá phải khớp SHOPVUI_KEY bên OMS.
  window.SV_OMS = window.SV_OMS || { base: 'http://127.0.0.1:3001/api/integrations/shopvui', key: 'shopvui-local-demo', shopId: 'oms' };
  const D = window.SV_DATA;
  D.shops.push({
    id: 'oms', name: 'EZMART', location: 'Hà Nội', type: 'preferred_plus', rating: 4.9, followers: 12850, joinedYearsAgo: 3,
    responseRate: 98, responseTime: 'trong vài phút', productCount: 10, vouchers: [], oms: true,
  });
  // Giá/tồn ban đầu chỉ để hiển thị khi OMS chưa trả lời; OMS là nguồn đúng.
  const SKUS = [
    ['HT-1200', 'Hộp thực phẩm 1.200ml – Trong suốt', 90000, 'Hộp đựng thực phẩm'],
    ['BT-750-XANH', 'Bình giữ nhiệt 750ml – Xanh', 250000, 'Bình nước'],
    ['BD-28', 'Chảo chống dính 28cm', 320000, 'Nồi chảo'],
    ['CB-6', 'Bộ cốc 6 chiếc', 210000, 'Ly cốc'],
    ['CH-500', 'Cốc thủy tinh 500ml', 65000, 'Ly cốc'],
    ['DC-3', 'Dao bếp bộ 3', 185000, 'Dao kéo'],
    ['KH-2', 'Khay inox 2 ngăn', 110000, 'Hộp đựng thực phẩm'],
    ['KT-SET', 'Khăn tắm cotton – Xám', 120000, 'Gia dụng'],
    ['TG-1', 'Túi giữ nhiệt – Xanh', 145000, 'Gia dụng'],
    ['TH-5', 'Thùng đựng 5L – Trắng', 75000, 'Lưu trữ'],
  ];
  // Ảnh: dùng lại ảnh DummyJSON cùng loại như các shop khác; 3 món DummyJSON không có thì lấy ảnh miễn phí bản quyền (Unsplash/Pexels License).
  const IMAGES = {
    'HT-1200': ["https://cdn.dummyjson.com/product-images/kitchen-accessories/lunch-box/1.webp"],
    'BT-750-XANH': ["https://cdn.dummyjson.com/product-images/kitchen-accessories/black-aluminium-cup/1.webp", "https://cdn.dummyjson.com/product-images/kitchen-accessories/black-aluminium-cup/2.webp"],
    'BD-28': ["https://cdn.dummyjson.com/product-images/kitchen-accessories/pan/1.webp"],
    'CB-6': ["https://cdn.dummyjson.com/product-images/kitchen-accessories/mug-tree-stand/1.webp", "https://cdn.dummyjson.com/product-images/kitchen-accessories/mug-tree-stand/2.webp"],
    'CH-500': ["https://cdn.dummyjson.com/product-images/kitchen-accessories/glass/1.webp"],
    'DC-3': ["https://cdn.dummyjson.com/product-images/kitchen-accessories/knife/1.webp"],
    'KH-2': ["https://cdn.dummyjson.com/product-images/kitchen-accessories/tray/1.webp"],
    'KT-SET': ['https://images.unsplash.com/photo-1638232928539-6e91c47ddec5?w=600&h=600&fit=crop&q=75&auto=format'], // Unsplash · MADEINEGYPT.CA
    'TG-1': ['https://images.pexels.com/photos/8988500/pexels-photo-8988500.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop'], // Pexels
    'TH-5': ['https://images.pexels.com/photos/13968287/pexels-photo-13968287.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop'], // Pexels
  };
  SKUS.forEach(([sku, name, price, sub], i) =>
    D.products.push({
      id: 'oms-' + sku, omsSku: sku, name, categoryId: 'nha-bep', subCategory: sub, shopId: 'oms', brand: 'EZMART',
      price, originalPrice: price, discount: 0, rating: 4.8, ratingCount: 120 + i * 17, sold: 300 + i * 41, stock: 0,
      location: 'Hà Nội', origin: 'Việt Nam', warranty: '6 tháng', returnPolicy: 'Đổi trả trong 7 ngày',
      labels: [], thumbnail: IMAGES[sku][0].replace(/\/1\.webp$/, '/thumbnail.webp'), images: IMAGES[sku], variants: [], createdAt: '2026-11-01T08:00:00+07:00',
    })
  );
})();
