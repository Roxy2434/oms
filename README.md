# EZMART — Hệ thống quản lý đơn hàng (OMS) đa kênh

Đồ án hệ thống thông tin quản lý, giải hai bài toán:

- **Phân bổ đơn hàng đa kho (DOM):** tự chọn kho xuất hàng để tổng *cước vận chuyển + phí đóng gói* thấp nhất, đạt SLA 24 giờ, chỉ tách tối đa 2 kho khi không kho nào đủ hàng.
- **Hàng hoàn và trả hàng (RMA):** giao thất bại, chuyển hoàn, nhận hàng, kiểm định (QC), nhập lại tồn hoặc cách ly, lập biên bản bồi thường.

Kèm **ShopVui**, sàn bán hàng mô phỏng. Đơn khách đặt ở shop *EZMART* tự vào EZMART với kênh ShopVui.

## Cấu trúc thư mục

```
.
├── backend/             OMS của EZMART: API, cơ sở dữ liệu (Prisma, PostgreSQL) và trang quản trị cho nhân viên (Next.js)
├── frontend/            ShopVui: giao diện bán hàng cho khách, gọi API của EZMART
├── docs/                Tài liệu: yêu cầu, mô hình dữ liệu, quy trình BPMN, kiểm thử
├── .env.example         Tuỳ chọn đổi mật khẩu mặc định
├── docker-compose.yml   Khai báo 3 dịch vụ: db, backend, frontend
└── README.md
```

## Yêu cầu

Chỉ cần **Docker Desktop** (Windows hoặc macOS, chip Intel hay Apple Silicon đều được). Mở Docker Desktop và đợi trạng thái *Running*.

## Chạy

Mở terminal (Windows: PowerShell · macOS: Terminal) trong thư mục này và chạy:

```bash
docker compose up --build
```

Lần đầu mất vài phút để tải và build. Hệ thống tự tạo bảng và nạp dữ liệu mẫu. Khi thấy dòng **`[EZMART] ===== SẴN SÀNG =====`**, mở trình duyệt:

| Ứng dụng | Địa chỉ | Tài khoản mẫu |
|---|---|---|
| EZMART (nhân viên) | http://127.0.0.1:3001 | `quanly` / `OmsDemo@2026` (quản lý) · `nhanvien.an`, `nhanvien.binh` (nhân viên, cùng mật khẩu) |
| ShopVui (khách) | http://127.0.0.1:8000 | `demo` / `Demo1234` |

Giữ cửa sổ terminal mở trong lúc dùng. Bấm `Ctrl + C` để dừng; dữ liệu vẫn được giữ cho lần chạy sau.

## Đã có bản cũ trên máy? Làm theo thứ tự này

1. **Tắt bản cũ.** Nếu bản cũ đang chạy trong terminal thì bấm `Ctrl + C`. Nếu bản cũ chạy bằng Docker, mở terminal trong thư mục bản cũ rồi chạy:
   ```bash
   docker compose down -v
   ```
   Lệnh này xoá dữ liệu của bản cũ để bản mới nạp lại dữ liệu mẫu từ đầu.
2. **Giải nén bản mới ra một thư mục mới.** Không chép đè lên thư mục bản cũ, vì file thừa của bản cũ có thể làm build lỗi.
3. Trong thư mục bản mới, chạy `docker compose up --build` như mục **Chạy** ở trên. Phải có `--build` để Docker dựng lại bằng code mới.
4. Mở trình duyệt và bấm **Ctrl + F5** ở cả hai trang (3001 và 8000) để trình duyệt không dùng file cũ đã lưu.
5. Bản mới đổi tên hiển thị thành **EZMART**, gồm cả shop trên ShopVui. Đơn ShopVui đặt từ trước vẫn ghi tên cũ. Muốn sạch hẳn thì bấm **Khôi phục dữ liệu mẫu** ở cuối trang ShopVui.

Tài khoản, mật khẩu và địa chỉ truy cập giữ nguyên như bảng ở trên.

## Dừng và xoá sạch

```bash
docker compose down -v
```

Lệnh này xoá container **và toàn bộ dữ liệu**. Lần `docker compose up --build` tiếp theo sẽ tạo lại dữ liệu mẫu từ đầu.

## Tuỳ chỉnh

Muốn đổi mật khẩu mặc định: sao chép `.env.example` thành `.env`, bỏ dấu `#` ở dòng cần đổi rồi điền giá trị. Đổi `DB_PASSWORD` sau lần chạy đầu thì phải `docker compose down -v` trước.

## Lỗi thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| `Cannot connect to the Docker daemon` / `docker: command not found` | Docker Desktop chưa cài hoặc chưa mở |
| `port is already allocated` (3001 hoặc 8000) | Có ứng dụng khác đang dùng cổng đó; tắt ứng dụng đó rồi chạy lại |
| Đăng nhập báo "Nguồn yêu cầu không hợp lệ" | Mở bằng `http://127.0.0.1:3001`, không dùng `localhost` |
| ShopVui không hiện sản phẩm EZMART | Chờ dòng `SẴN SÀNG` của EZMART rồi tải lại trang ShopVui |
| Vẫn thấy tên cũ hoặc giao diện cũ | Chưa chạy với `--build`, hoặc trình duyệt dùng file cũ: chạy lại `docker compose up --build` rồi bấm Ctrl + F5 |

## Giới hạn

- Chọn kho theo **vùng** (Hà Nội, Đà Nẵng, TP.HCM) với bảng cước và thời gian mẫu; không tính khoảng cách địa lý thật.
- Hãng vận chuyển, Shopee/TikTok và hoàn tiền là **mô phỏng**; thanh toán SePay tắt trong bản này.
- Chỉ chạy nội bộ trên máy (127.0.0.1). Mật khẩu mặc định chỉ dùng cho demo.

## Tài liệu

- `docs/requirements.md`: yêu cầu nghiệp vụ
- `docs/data-model.md`: mô hình dữ liệu
- `docs/dom-rma.bpmn`: quy trình DOM và RMA (BPMN)
- `docs/demo.md`: kịch bản demo
