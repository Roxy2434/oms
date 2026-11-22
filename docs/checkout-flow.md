# Luồng tạo đơn và xác nhận — 27/10/2026

## Cách sử dụng hiện hành

1. Đơn hàng → Tạo đơn hàng. Chọn khách cũ hoặc nhập khách mới; địa chỉ có tỉnh/thành riêng nằm ngay phần người nhận. Không có ô Vùng giao thứ hai trong thanh toán. Khách đã có tỉnh/thành được điền sẵn; địa chỉ cũ chưa có dữ liệu cấu trúc thì bổ sung, không đoán tùy tiện từ chuỗi địa chỉ.
2. Chọn sản phẩm/lượng. Hệ thống tự tải phương án ngay trong form: kho, hàng từng kiện, ETA, cước và tổng tiền; không tạo đơn để tính báo phí.
3. Phí khách trả = SUM(cước các kiện). KHÔNG cộng đóng gói. Một phương án hai kho có thể tăng phí; phí được hiển thị trước xác nhận. Biểu phí DEMO-V1 local, chỉ nội thành3thànhphố, không phải API hãng thật.
4. Chọn thanh toán/kênh; Tạo đơn và xác nhận là hành động chính. Khách mới + đơn + dòng + kiện + giữ tồn + audit trong cùng transaction SERIALIZABLE. Thành công đi thẳng chi tiết, không hiện thêm khung phân bổ. Chưa ghi thu tiền hoặc xuất kho.
5. Thiếu tồn: hiện sản phẩm/cần/khảdụng/thiếu; trường hợp tổng tồn đủ nhưng không ghép được tối đa2kho, giải thích điều kiện phân tán/tuyến/ETA. Không hiển thị0đ phí như đã báo được, không cho xác nhận thiếu hàng. Có thể sửa hoặc Lưu nháp (không giữ).
6. Lưu nháp là phụ. Nháp mới dùng cùng form báo phí khi sửa/xác nhận lại, giữ nguyên mã đơn, không tạo thêm đơn. Không xác nhận nháp mới qua endpointconfirm cũ vì phí có thể đã đổi.

## Dữ liệu và compatibility

- Giữ14bảng nghiệp vụ, thêm Customer.city (`tinh_thanh`) và Order.shippingPolicy (`chinh_sach_phi_giao`),2migration bổ sung; hiện có4migrations. KHÔNG đổi city thành một suy đoán quốc gia/phường địa lý; phạm vi vẫn3thànhphố nội thành mẫu.
- Migration chỉ điền10khách hư cấu KH001–010 đã kiểm, có điều kiện ID+địa chỉ khớp chính xác. Khách khác null, yêu cầu bổ sung một lần. Sửa hồ sơ khách bằng API cũ không đổi địa chỉ thì giữ city; đổi địa chỉ mà không cung cấp city thì xóa city để không dùng nơi giao cũ sai. Seed mới thêm city khi tạo fixture, không ghi đè khách cũ.
- Mọi đơn lịch sử mặc định MANUAL, GIỮ NGUYÊN phí đã ghi. Luồng sửa/preview/confirm cũ còn phục vụ đơn này; không áp hồi tố SUM_FREIGHT_V1. Luồng mới dùng SUM_FREIGHT_V1, confirm/sửa phải qua checkout mới để kiểm lại phí. Hủy kiện/thu phí/hoàn tiền của đơn đã xác nhận giữ các quy tắc cũ, không tự tính lại phí đã chốt khi hủy.
- Tồn, phí, giá và địa chỉ báo trước được bind bằng HMAC token5phút. Khi tạo, tính lại trong transaction và so đúng digest. Không tin shippingFee client; loại bỏ input giả. Tồn/giá/kho/phí hoặc địa chỉ thay đổi:409 và xem lại, không tự submit lại. Giá hiển thị từng dòng được cập nhật từ quote server.
- Mất response/503: giữ nguyên body/key, khóa chỉnh form, nút Kiểm tra kết quả đặt hàng gửi lại đúng thao tác. Command replay trả đơn cũ trước khi kiểm quote hết hạn; không tạo thêm khách/đơn/giữ đôi. Kết quả lỗi4xx đã biết cho sửa và xem phí mới.

## Kiểm kỹ thuật

- `npm run verify`:9unit,6integration,2E2E PASS; `storage/runtime/checkout-verify.log`.
- `check-checkout-services.ts`: báo phí read-only,2kho47000cước/56000gồmđónggói, tổng237000; thiếu/tamper/expired/staleprice/address từ chối; feeclient0 bị bỏ; replay/same-key khácpayload; tranh tồn cuối một thắng; injectfail ở audit SAU tạo khách/đơn/kiện/holds rollback toàn bộ; hủy cũ giải phóng; nháp mới sửa/confirm giữ cùng ID, không tạo đôi.
- `check-checkout-ui.ts`: DBoms_test/cổng3002, cityautofill,khôngregion/feeinput;quoteinline,stale request khôngghiđè; thaygiásaukhibáo buộc xem lại; mấtresponseSAUcommit một khách/đơn; contextmới khôngpopup; shortage cólýdo/chặnconfirm/draft;axe desktop/mobile.
- E2E lâu: nháp mới→sửa→xác nhận→thu/đónggói/bàngiao/giao→restart→RMA/nhận/QC/hoàn/đóng;lostresponse+DBfailure;DNwarehouse/pagination/filter PASS. Integration cũng chạy lại foundation/split races/returns/compensation/fee audit.
- Live readonly: checkout2roles×4widths1366/768/390/360,42routesurfaces,60orderdetailtabsurfaces,report10scopes/CSVroles,origin/guest,customerdrawer PASS. Đã mở ảnh desktop/mobile sau khi quote render. Không gọi đây là chứng nhận mọi GPU/WCAG hay user đã duyệt cảm nhận luồng mới.
- `check-order-detail.ts` lần đầu timeout do giả định đơn mẫu luôn đủhàng; đơn videobài1 trước đó đãgiữhếtHT. Test sửa chờ kếtquảhoặcchờhàng đúng thực tế, không bơm/reset tồn để làm test xanh.
- `check-foundation.ts` trước đây hardcode2migrations, fail khi đãcó3; đã sửa chấp nhận existingbase và để migrate deploy kiểm migrationsbổsung. Không bỏ kiểm14bảng/constraints/sourcehash.

## Bảo toàn dữ liệu

Backup trước thay đổi: `storage/backups/oms_20261027_143053.dump`. Phục hồi sang DB MỚI `oms_restore_before_checkout_20261027` để đối chiếu; không overwrite/appDATABASE_URL.

Sau kiểm cuối, cả14bảng có số dòng và fingerprint nội dung lịch sử giống bản backup, chỉ loại2cột mới khỏi so sánh. Có30đơn/6money/58stockmovements/158audit;30đơn cũ vẫnMANUAL,10kháchfixture cócity. Không tạo đơn thử ở DB chính; fixtures chỉoms_test. `artifacts/qa/checkout/preservation.json`.

## Source và tài liệu

CheckoutForm + checkout-form.css; DraftForm chọn checkout hoặc legacy-draft-form cho nhápMANUAL. Backend `src/domain/orders/checkout.ts`, `/api/orders/{quote,checkout}`; cityvalidationfoundationservice. Migrationcustomer_city/order_shipping_policy. Không thêm thư viện/thanh toán/vận chuyển thật. Bản quay bài1 tại `/demo/oms-bai-1.mp4` là luồng CŨ trước cập nhật, vẫn giữ như lịch sử; không dùng để hướng dẫn nút mới. Script ghi hình cũ đã archive để tránh chạy lại nhầm và giữ tồn thật.

Đây là thay đổi tập trung Bài1. Không tuyên bố đã hoàn thiện thiết kế lại kho/giao nhận/RMA giai đoạn tiếp theo. Đang chờ user thử giao diện mới.
