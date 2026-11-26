# Sổ Tay Thuyết Trình & Cứu Hộ Nhanh Trên Lớp (Không Cần Biết Sửa Code)

Tài liệu này tóm tắt cách vận hành an toàn nhất khi cho **cả lớp 30–60 sinh viên cùng truy cập trên mạng Wi-Fi trường yếu** mà không lo sập bài thuyết trình.

---

## 1. Chiến thuật "2 Sân Khấu" (Đảm bảo 100% không bao giờ bể bài báo cáo)

1. **Sân khấu 1 — Link Web trên Server (`https://TEN-MIEN`):**
   - Chiếu mã QR lên slide để cả lớp và giảng viên dùng điện thoại đặt đơn trên **ShopVui** (`https://TEN-MIEN/#/shop/oms`).
   - Mở trang **EZMART** (`https://TEN-MIEN/dashboard` hoặc `/orders`) trên máy chiếu để cả lớp thấy đơn của các bạn tự động chảy vào OMS và chia kho theo thời gian thực.
2. **Sân khấu 2 — Bản Local dự phòng sẵn trên Laptop của anh (`http://127.0.0.1:3001` & `8000`):**
   - Trước giờ vào lớp, mở sẵn Docker local trên máy cá nhân. Bản này chạy **100% offline không cần Wi-Fi trường**, giữ nguyên vẹn **17 ca mẫu chuẩn (`DOM01..DOM09`, `RMA01..RMA06`, `BC01`, `SHOP01`)**.
   - Nếu Wi-Fi trường mất mạng hoàn toàn hoặc cả lớp thao tác làm xáo trộn số liệu báo cáo, anh chuyển ngay sang tab `http://127.0.0.1:3001` để trình bày trọn vẹn 2 bài toán cho hội đồng.

---

## 2. Chuẩn bị 2 phút trước khi phát link cho cả lớp

SSH vào server (trong thư mục dự án) và chạy sẵn 2 phím chuẩn bị:

```sh
# Bơm sẵn tồn kho dồi dào (400-500 món/kho, vẫn giữ KT-SET hết hàng để minh họa)
sh deploy/rescue.sh 1

# Tạo sẵn 40 tài khoản dự phòng lop01..lop40 (mật khẩu: LopHoc2026, sẵn 6.000.000đ ví)
sh deploy/rescue.sh 3
```

> **Mẹo khi mạng trường quá yếu:** Nếu sinh viên ngại gõ form đăng ký hoặc mạng trường chặn CAPTCHA quốc tế, anh đọc luôn: *"Bạn nào số thứ tự mấy trong danh sách lớp có thể đăng nhập luôn `lop01` đến `lop40`, mật khẩu `LopHoc2026`, có sẵn 6 triệu trong ví!"*

---

## 3. Xử lý sự cố trong 5 giây bằng 1 lệnh duy nhất (`sh deploy/rescue.sh`)

Khi đang đứng lớp, nếu có bất kỳ trục trặc nào, **không mở code** — chỉ cần gõ:

```sh
sh deploy/rescue.sh
```

Màn hình sẽ hiện Menu tiếng Việt 4 phím:

| Phím | Tình huống gặp trên lớp | Hệ thống tự làm gì (trong 2–5 giây) |
|---|---|---|
| **`1`** | Cả lớp đặt hăng quá làm **hết sạch tồn kho** | Tự động nhập bổ sung về mức 400–500 món đúng theo ma trận kho HN/ĐN/HCM, giữ nguyên toàn bộ đơn các bạn vừa đặt |
| **`2`** | Mạng trường nghẽn quốc tế làm **nút ĐĂNG KÝ quay mãi / không hiện CAPTCHA** | Tắt ngay yêu cầu CAPTCHA Cloudflare (bấm lần nữa sẽ bật lại), học viên đăng ký trực tiếp ngay lập tức |
| **`3`** | Học viên lười đăng ký hoặc quên mật khẩu | Cấp sẵn bộ 40 tài khoản `lop01` .. `lop40` (mật khẩu `LopHoc2026`, mỗi ví 6.000.000đ) |
| **`4`** | Web phản hồi chậm hoặc muốn kiểm tra tổng số đơn đã vào | Khởi động lại sạch tiến trình Web (giữ nguyên Database) và in tổng số đơn + số học viên + tổng tồn khả dụng |
