# Chạy EZMART không qua Docker (dành cho phát triển)

> Người dùng thông thường chỉ cần `docker compose up --build` theo `README.md` ở thư mục gốc. Tài liệu này dành cho người sửa code: chạy app trực tiếp bằng Node để build và kiểm thử nhanh. **Mọi lệnh dưới đây chạy trong thư mục `oms-app/`**; Docker chỉ dùng để chạy PostgreSQL (`oms-app/compose.yaml`).

## 1. Cài sẵn

- **Docker Desktop**: mở lên, đợi báo *Running*.
- **Node.js 24** (đã kiểm 24.15.0). Kiểm tra bằng `node -v`.
- **Python 3**. Kiểm tra bằng `python --version` (Windows) hoặc `python3 --version` (macOS).

> **Dùng MacBook?** Các lệnh giống hệt Windows. Chỉ khác vài chỗ, xem mục **7. Chạy trên macOS** ở cuối.

## 2. Chạy lần đầu

Mở terminal (Windows: PowerShell hoặc CMD; macOS: Terminal) **trong thư mục `backend/`** (từ thư mục gốc gõ `cd backend`). Mọi lệnh `npm run ...` trong tài liệu này đều chạy trong `backend/`.

**Bước 1: cài thư viện**

```bash
npm ci
```

**Bước 2: tạo file cấu hình.** Sao chép `backend/.env.example` thành `backend/.env`, mở ra và điền:

- `DB_PASSWORD`: mật khẩu DB tự đặt. Mật khẩu nằm trong `DATABASE_URL` phải **giống hệt** giá trị này.
- `SESSION_SECRET`: một chuỗi ngẫu nhiên dài.
- `BOOTSTRAP_PASSWORD`: mật khẩu đăng nhập cho các tài khoản mẫu, **tối thiểu 12 ký tự**.
- `APP_ORIGIN=http://127.0.0.1:3001`. Giữ nguyên, **không** đổi thành `localhost`.
- Các biến `SEPAY_...` để trống.

**Bước 3: tạo DB, nạp dữ liệu mẫu, build**

```bash
docker compose up -d db
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:seed-realistic
npm run build
```

**Bước 4: chạy**

```bash
npm run local:start
```

Thấy dòng `OMS production PID ... http://127.0.0.1:3001` là chạy được. Mở trình duyệt vào:

**http://127.0.0.1:3001**

## 3. Đăng nhập

| Tài khoản | Vai trò |
|---|---|
| `quanly` | Quản lý (đầy đủ quyền) |
| `nhanvien.an` | Nhân viên |
| `nhanvien.binh` | Nhân viên |

Mật khẩu: giá trị `BOOTSTRAP_PASSWORD` đã điền trong `.env`.

## 4. Chạy ShopVui (trang bán hàng cho khách)

ShopVui là sàn bán hàng mô phỏng. Đơn khách đặt ở shop **EZMART** sẽ tự vào EZMART với kênh **ShopVui**. Không cần thêm gì trong `.env`.

EZMART phải đang chạy (mục 2, bước 4). Mở **cửa sổ PowerShell thứ hai** trong cùng thư mục và chạy:

```bash
npm run shopvui
```

Thấy `ShopVui http://127.0.0.1:8000` là được. **Để nguyên cửa sổ này**; tắt bằng `Ctrl + C`.

Thử đặt hàng:

1. Mở **http://127.0.0.1:8000**, đăng nhập tài khoản khách mẫu `demo` / `Demo1234` (tài khoản giả của ShopVui, không phải tài khoản EZMART).
2. Vào một sản phẩm của shop **EZMART** → **Mua Ngay** → **Đặt hàng** (thanh toán khi nhận hàng).
3. Bên EZMART, mở **Đơn hàng**: đơn mới hiện ngay với kênh ShopVui, đã chọn kho và giữ hàng.

## 5. Những lần sau

Mở Docker Desktop, rồi trong thư mục project chạy:

```bash
docker compose up -d db
npm run local:start
```

Cần ShopVui thì mở thêm cửa sổ thứ hai và chạy `npm run shopvui`.

Dừng app:

```bash
npm run local:stop
```

**Không** chạy lại `db:seed` khi đã có dữ liệu. Trong `backend/`, `docker compose down -v` xoá sạch DB phát triển.

## 6. Lỗi thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| `docker compose` báo lỗi kết nối | Docker Desktop chưa mở hoặc chưa *Running* |
| Đăng nhập báo "Nguồn yêu cầu không hợp lệ" | Phải mở bằng `127.0.0.1:3001`, không mở bằng `localhost`; kiểm `APP_ORIGIN` |
| `local:start` báo cổng bận | Đã có app khác chạy cổng 3001: chạy `npm run local:stop` hoặc tắt app đó |
| `local:start` báo migration chưa sạch | Chạy `npm run db:migrate` rồi start lại |
| Lỗi mật khẩu DB khi migrate | Mật khẩu trong `DATABASE_URL` khác `DB_PASSWORD` |
| `db:seed` báo mật khẩu ngắn | `BOOTSTRAP_PASSWORD` phải từ 12 ký tự |
| ShopVui không hiện sản phẩm EZMART / báo lỗi khi đặt | EZMART chưa chạy ở 3001, hoặc mở ShopVui bằng địa chỉ khác `127.0.0.1:8000` / `localhost:8000` |
| `npm run shopvui` báo cổng bận | Đã có cửa sổ ShopVui khác đang chạy, hoặc app khác dùng cổng 8000 |
| Sai mật khẩu nhiều lần bị khóa | Đợi 15 phút, hoặc `npm run local:stop` rồi `npm run local:start` |

Log khi chạy: `storage/runtime/production.log`. Kiểm app còn sống: mở `http://127.0.0.1:3001/api/health`.

## 7. Chạy trên macOS (MacBook)

Các lệnh `npm run ...` giống hệt Windows; script tự gọi `python3` trên Mac.

**Cài sẵn:**

- **Docker Desktop for Mac**: tải đúng bản *Apple Silicon* (chip M1/M2/M3/M4) hoặc *Intel*, mở lên đợi *Running*.
- **Node.js 24**: tải bản LTS 24 ở nodejs.org, hoặc `brew install node@24`.
- **Python 3**: gõ `python3 --version`. Nếu máy hỏi cài *Command Line Tools* thì bấm **Cài đặt** (bộ này có sẵn Python 3).
- MacBook **chip Intel** cần thêm *Command Line Tools* (`xcode-select --install`) để `npm ci` biên dịch được thư viện mã hóa mật khẩu.

**Mở Terminal đúng thư mục:** mở **Terminal**, gõ `cd ` (có dấu cách) rồi kéo thư mục `backend` thả vào cửa sổ Terminal, bấm Enter.

**Tạo file `.env`:**

```bash
cp .env.example .env
open -e .env
```

File mở trong TextEdit; điền như mục 2, bước 2, rồi lưu (`Cmd + S`). Lưu ý: file bắt đầu bằng dấu chấm nên Finder ẩn đi, cứ mở bằng lệnh trên.

**Các bước còn lại** giống hệt mục 2–5: `docker compose up -d db`, `npm run db:generate`, `npm run db:migrate`, `npm run db:seed`, `npm run db:seed-realistic`, `npm run build`, `npm run local:start`. ShopVui: mở thêm một tab Terminal (`Cmd + T`), chạy `npm run shopvui`.

**Lỗi riêng trên Mac:**

| Hiện tượng | Cách xử lý |
|---|---|
| `Không chạy được python3` | Chạy `xcode-select --install` hoặc `brew install python` |
| `npm ci` báo lỗi `gyp` / `argon2` (máy Intel) | Cài Command Line Tools: `xcode-select --install`, rồi chạy lại `npm ci` |
| `This local build requires Node >=24.15.0` | Cài đúng Node 24 (không dùng 22 hoặc 25) |
| `docker: command not found` | Docker Desktop chưa cài hoặc chưa mở |

Chi tiết kỹ thuật: `docs/HANDOVER.md`.
