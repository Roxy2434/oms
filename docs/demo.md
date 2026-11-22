# Demo 10–15 phút

> Bản29/10 đã sửa audit và có4ca kiểm thử xuyên suốt trongDBtest (không chạy lại bằng tồnchính mộtcáchmùquáng). Nút hiện hành **Xác nhận đã đóng gói**; từngkiệnhiệncước/ETA/COD. RMAtra soát tiền tại hồ sơ; chỉđóngkhiđủđiềukiện. Xem `docs/audit-fixes-20261029.md`.

> Cập nhật27/10: tạo đơn mới đã đổi sang **báo kho/phí ngay form → Tạo đơn và xác nhận**. Không làm theo bước lưu nháp/mở khung phân bổ của video cũ. Xem `docs/checkout-flow.md`. `/demo/oms-bai-1.mp4` là bản quay trước thay đổi này; các mã đơn mẫu hai kho có thể hết ATP sau khi demo, không nhập lại tồn chỉ để khớp kịch bản.

Không chạy seed lại trước mỗi buổi. Kiểm `/api/health`, đăng nhập `quanly`, mật khẩu trong `.env`. Tải bản mới bằng Ctrl+F5; bộ chọn hiệu ứng đã được bỏ, animation vẫn hoạt động và tôn trọng giảm chuyển động hệ thống. Clip `/demo/oms-motion.webm` là bằng chứng của vòng giao diện trước, không đại diện đầy đủ bố cục hiện hành.

Mục tạo/thu/trả dưới đây ghi dữ liệu thật trong DB local. Muốn trình bày chỉ đọc thì dùng các chứng từ có sẵn và bằng chứng E2E trong DB riêng; không reset/seed để khôi phục số liệu mẫu.

1. **0–2 phút — Login và tổng quan:** xem mô hình login của mẫu người dùng, kéo/zoom/tạm dừng nếu cần, đăng nhập; xem dashboard compact đã duyệt, đổi kỳ/kênh; bấm KPI/chart/hàng đợi để mở chứng từ. Giải thích công việc và tồn là hiện tại, không mất khi đổi kỳ. Mở Đọc số liệu bằng bàn phím, Escape trả focus.
2. **2–4 phút — Đơn và kho:** mở `DH-000103` để xem một đơn đã giao có chứng từ thu/xuất. Mở Kho hàng, chỉ ra bán được/giữ/QC/cách ly/ATP và sổ; không nhập kho nếu không có chứng từ demo cần trình bày.
3. **4–7 phút — Tạo đơn thật:** chọn khách có địa chỉ đã lưu, thêm SKU còn ATP, xem phương án kho/cước/ETA và tổng tiền ngay trong form. Chọn Trả trước, bấm Tạo đơn và xác nhận. Đóng gói; thử bàn giao khi chưa thu để thấy chặn. Ghi thu đúng tổng đã chốt với mã tham chiếu riêng, bàn giao và giao mô phỏng. Reload để chứng minh DB bền vững. Phí tự tính từ tổng cước kiện, không nhập30000tùyý.
4. **7–9 phút — Hai kho và ngoại lệ:** mở `DH-000121` để xem phương án HN/DN nếu ATP còn đủ; preview là dữ liệu thật, không cam kết luôn đủ sau nhiều lần demo. Có thể chọn SKU khác hoặc nhập tăng có chứng từ trước khi tính lại. Mở `DH-000104` xem giao thất bại; các thao tác giao lại/chuyển hoàn có lý do và không tự cộng tồn.
5. **9–12 phút — Trả/QC/tiền:** từ đơn vừa giao, tạo trả một dòng, duyệt, nhận vào QC; kiểm tồn chưa tăng bán được. QC đạt, duyệt hoàn đúng giá hàng (không hoàn phí). Tạo khoản hoàn CHUA_RO; thử đóng hồ sơ để thấy bị chặn. Mở đơn gốc tra soát thành công rồi đóng hồ sơ. Chỉ thực hiện nếu có đủ thời gian thao tác cẩn thận.
6. **12–14 phút — Báo cáo:** xem 8 nhóm, so thu/hoàn cùng kỳ/kênh với dashboard, chọn kho và nhấn mạnh tiền không đổi theo kho. Xuất CSV, chỉ ra mốc thời gian và nguồn chứng từ. Không gọi tiền thu là lợi nhuận.
7. **14–15 phút — Quyền/bền vững:** đăng xuất, đăng nhập `nhanvien.an`, không có báo cáo tổng hợp nhưng vẫn thao tác nghiệp vụ. Nêu test restart app+DB không seed, mất phản hồi sau commit và backup/restore14bảng/nội dung trong `docs/final-acceptance.md`. Không gọi đây là production thương mại.

## AV-001 tái lập riêng

Chạy `npx tsx scripts/check-returns-payments.ts` trên DB test được script khóa tên `oms_test`. Ca namespace AV tạo qua services, cho thu 370000, hoàn 90000, ròng 280000, hộp trở lại 8; kết quả tại `artifacts/qa/returns-payments.json`. Không dùng tồn demo đã thay đổi để tuyên bố AV-001 vẫn có cùng số dư mở đầu.
