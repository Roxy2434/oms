# Triển khai web demo công khai: COD giả, ví giả, SePay thật

## 1. Phạm vi bản này

Web cho khách tự đăng ký. Mỗi tài khoản được cấp 6.000.000đ **mô phỏng đúng một lần**.

| Phương thức | Thực tế |
|---|---|
| COD | Mô phỏng, không thu tiền mặt, không giao hàng thật |
| Ví ShopVuiPay | Mô phỏng, không rút/chuyển/đổi thành tiền thật |
| SePay | Chuyển tiền ngân hàng **thật**, chỉ bật sau khi người vận hành cấu hình rõ ràng |

Khách chọn SePay phải tích xác nhận đã đọc cảnh báo **không giao hàng thật** và thông tin liên hệ hoàn tiền. Server kiểm tra và lưu thời điểm xác nhận, không chỉ kiểm trên giao diện. Tiền ngân hàng không cộng vào ví giả. Phần mềm **không tự chuyển tiền ra ngân hàng**.

**Chưa có VPS/domain đích nên chưa mở website trên Internet.** Các kiểm thử HTTPS dùng domain `.test`, CA nội bộ và provider ngân hàng/chống bot giả trên môi trường QA cách ly. Không có chuyển tiền thật trong kiểm thử.

Bản local của máy hiện tại vẫn ở http://127.0.0.1:3001 và http://127.0.0.1:8000, DB15432, SePay tắt. Không lấy `.env` local hoặc volume local đưa thẳng lên web.

## 2. Những lỗi/chỗ thiếu đã xử lý

| Vấn đề cũ | Thay đổi |
|---|---|
| Chuỗi Effect–Prisma có high advisory | Override Effect3.22.1 tương thích, giữ Prisma7.10.1. Cập nhật transitive ESLint/minimatch bằng audit fix không `--force`; audit cả cây và production về0 ở thời điểm chốt |
| Compose demo có secret mặc định | Profile public riêng, sinh mật khẩu ngẫu nhiên, startup từ chối secret mẫu/ngắn, HTTP origin, sai origin và cấu hình ngân hàng thiếu |
| Container backend root, mang dev dependencies | Multi-stage, runtime `node` UID1000, prune dev dependencies, filesystem read-only với thư mục ghi được chỉ định |
| DB app dùng quyền cao | Role `oms_app` không superuser/createdb/createrole; DB/backend không publish port ra host trong profile public |
| HTTPS và phân cách staff/public | Caddy tự cấp/gia hạn TLS; shop/API khách public, đường staff có Basic Auth riêng rồi mới tới tài khoản/role của app |
| Limiter chung trong RAM | Quota đăng ký/login/API public dùng PostgreSQL, atomic và giữ qua restart; IP được HMAC trước lưu, edge thay header IP thay vì tin header khách |
| Bot nhận ví và giữ hết tồn | Turnstile kiểm phía server; quota IP, tối đa500 đăng ký/ngày toàn demo; mỗi tài khoản20 đơn/24h và3 đơn đang chờ xuất; rollback cả giữ tồn/tiền nếu vượt quota |
| Argon2 có thể ăn hết RAM khi dồn login | Tối đa2 tác vụ mật khẩu đồng thời mỗi process, trả429 khi bận, không tích hàng đợi vô hạn |
| SePay chỉ đọc50 giao dịch, không có checkpoint | Public profile dùng `since_id`, inbox và checkpoint DB, xử lý theo ID tăng dần, khóa một poller bằng DB advisory lock; retry không nhân đôi |
| Chuyển khoản không khớp/bị lỗi có thể khó phát hiện | Inbox NEW/UNMATCHED/REVIEW, trang Quản lý `/bank`, health báo degraded; khóa tạo đơn bank mới khi đồng bộ lỗi/cũ |
| Có thể nhầm hoàn ví giả với hoàn ngân hàng | Bank không tự hoàn ví. Ghi/tra soát tiền bank public chỉ cho Quản lý, nguồn ngân hàng thật; đánh dấu thành công cần xác nhận đã đối chiếu chứng từ thật |
| Thiếu backup/restore/health tối thiểu | Backup6h/lần, giữ7ngày, health kiểm backup; script restore vào DB tạm, monitor và webhook cảnh báo tùy cấu hình; log Docker có giới hạn dung lượng |
| Autofocus chậm có thể kéo focus khỏi ô mật khẩu | Focus đồng bộ, không dùng timer để giành lại focus khi người dùng đang nhập |
| Một dạng lỗi PostgreSQL commit không vào retry | Nhận diện cả lỗi Prisma bọc và DriverAdapterError40001/40P01 trực tiếp, giữ retry/idempotency có giới hạn |

Không gọi đây là pentest hay bảo đảm không còn lỗ hổng. OS/container vulnerability scan, đánh giá DDoS và soak dài ngày trên VPS đích chưa thực hiện.

## 3. Chuẩn bị VPS

- Linux x86_64/amd64, Docker Engine và Docker Compose **v2.24.4 trở lên** (cần `!reset`/`!override`).
- Gợi ý demo ít người:2vCPU,2–4GBRAM,20–40GBSSD. Ưu tiên4GB nếu build trực tiếp; đây là dự trù, phải theo dõi trên VPS thật.
- Domain trỏ A/AAAA về VPS. Chỉ giữ AAAA nếu IPv6 thật sự truy cập được.
- Mở80/443, giới hạn SSH theo quản trị viên. Không mở5432/3001. Không sửa firewall/SSH theo hướng có thể tự khóa mình.
- Nếu dùng Cloudflare, để **DNS only** lúc đầu. Chưa cấu hình trust chain của CDN/proxy khác; không tự đưa thêm proxy rồi dùng IP header tùy ý.
- Đăng ký Cloudflare Turnstile miễn phí, tạo widget cho đúng hostname. Không cần bật CDN Cloudflare cho website.

## 4. Cấu hình riêng một lần

Giải nén source ZIP vào thư mục trên VPS, chạy tại root của source:

```sh
python3 deploy/init-env.py --domain demo.ten-mien-cua-anh.vn --email email-cua-anh@example.com
```

Thay domain/email ví dụ bằng của anh. Lệnh không ghi đè file đã tồn tại và không in mật khẩu. Nó tạo `deploy/.env` với quyền0600. Mở file bằng editor riêng của máy, không gửi lên chat/Git.

Điền `TURNSTILE_SITEKEY` và `TURNSTILE_SECRET_KEY` thật. Startup public từ chối test key trên domain Internet. Hai lớp đăng nhập staff:

1. Cổng staff: `STAFF_EDGE_USER` / `STAFF_EDGE_PASSWORD` trong file riêng.
2. App: tài khoản `quanly` / `BOOTSTRAP_PASSWORD` trong file riêng.

Trên DB public khởi tạo mới, hai tài khoản nhân viên mẫu bị khóa và có mật khẩu ngẫu nhiên, **không dùng chung mật khẩu Quản lý**. Quản lý tạo/cấp mật khẩu riêng cho từng nhân viên trước khi bật tài khoản; không đưa BOOTSTRAP_PASSWORD cho nhân viên. Seed không reset tài khoản của volume đã có, nên khi nâng cấp một volume cũ phải tự rà soát/đổi credential nhân viên.

**Không đổi mật khẩu DB chỉ bằng sửa `.env` sau khi volume đã tạo.** Phải đổi password trong PostgreSQL theo maintenance rồi cập nhật dịch vụ. Không xóa volume để xử lý sai mật khẩu.

### Bật đúng phương thức SePay thật

Giữ `OMS_DEMO_MODE=1` do profile public đặt sẵn, rồi điền trong `deploy/.env`:

```dotenv
OMS_DEMO_REAL_BANK=1
SEPAY_API_TOKEN=<token riêng của SePay>
SEPAY_ACCOUNT=<tài khoản nhận tiền của anh>
SEPAY_BANK=970422
SEPAY_HOLDER=<tên chủ tài khoản>
SEPAY_REFUND_CONTACT=<email/URL/đầu mối thật để khách yêu cầu hoàn>
SEPAY_START_ID=<ID giao dịch cuối đã đối chiếu trước lần mở đầu>
```

Không dùng các chuỗi `<...>` như giá trị thật. Mốc `SEPAY_START_ID` là **ID cuối đã kiểm**, không phải số trang. Tốt nhất chốt mốc khi chưa mở cho khách chuyển tiền. Checkpoint sau đó nằm trong DB; sửa biến môi trường không làm reset checkpoint.

Nếu chưa điền ngân hàng, giữ `OMS_DEMO_REAL_BANK=0`: web chỉ có COD/ví giả, không hiển thị QR giả vờ nhận tiền thật. Khi bật1 mà thiếu token/account/contact/startID, app từ chối khởi động.

## 5. Hai cách chạy

### A. Dùng image đã build (khuyến nghị với VPS nhỏ)

Gói image là **Linux/amd64**, không dùng cho ARM mà chưa build lại.

```sh
gzip -dc oms-public-images-20261126-linux-amd64.tar.gz | docker load
docker compose --env-file deploy/.env -f deploy/compose.yaml -f deploy/prebuilt.yaml up -d --no-build --wait --wait-timeout 240
```

PostgreSQL dùng image có digest cố định; VPS vẫn cần Internet để lấy manifest/layer DB nếu thiếu, cấp TLS và kết nối Turnstile/SePay. Không cần Node/npm trên host.

### B. Build từ source trên VPS

```sh
docker compose --env-file deploy/.env -f deploy/compose.yaml up -d --build --wait --wait-timeout 240
```

Chỉ lần đầu DB rỗng mới seed tài khoản/kho/sản phẩm/17ca; restart không reseed. Bootstrap tạo ca khi SePay tạm tắt trong **process chuẩn bị dữ liệu**; server sau đó chạy theo cấu hình thật đã duyệt. Không lấy volume test hoặc DB local có secret/dữ liệu riêng làm DB public.

Truy cập:
- Shop: `https://DOMAIN/#/shop/oms`
- Nhân viên: `https://DOMAIN/login`
- Đối soát riêng (Quản lý): `https://DOMAIN/bank`
- Health: `https://DOMAIN/healthz`

Caddy cần domain và80/443 truy cập được để lấy certificate. Nếu lỗi TLS, kiểm DNS/AAAA/firewall/log trước, không tắt Secure cookie hoặc đổi sang HTTP để lách.

## 6. Vận hành tiền thật

- Khách dùng COD/ví: chỉ mô phỏng. Không giao hàng thật cho tiền giả.
- Khách dùng bank: chỉ SePay ghi tiền vào. Không có nút “tôi đã chuyển” để tự báo thành công.
- Thanh toán thiếu có thể tiếp tục QR số còn lại. Chuyển thừa/sai nội dung/sau hạn/hủy phải kiểm SePay/ngân hàng, xem `/bank` và hàng đợi tiền cần tra soát.
- Khoản không khớp được lưu inbox, không tự ghép cho đơn ngẫu nhiên hay cộng vào ví.
- Khi hủy đơn đã chuyển bank, giao diện báo cần hoàn ngân hàng; **không tự chuyển hoàn**. Quản lý chuyển hoàn thật qua ngân hàng trước, sau đó ghi mã chứng từ và xác nhận đã đối chiếu trong app.
- Checkbox của Quản lý là xác nhận chứng từ của người có quyền, **không phải bằng chứng phần mềm đã tự thực hiện chuyển tiền ra**. Luôn đối chiếu sao kê thực tế.
- KPI gộp của dashboard còn có số mô phỏng; dùng trang `/bank` cho inbox ngân hàng, cũng không gọi số tổng đó là số dư ngân hàng.
- Không chạy `demo:refresh` trên public khi bật SePay thật. Preparer từ chối khi cờ bank bật hoặc tài khoản fixture đã có SePay receipt; không tự khóa tài khoản đang liên quan tiền thật.

API SePay có giới hạn5000 kết quả. Nếu một khoảng chưa đối soát có >=5000 dòng, sync **dừng, không tăng checkpoint**, khóa đơn bank mới và báo lỗi. Cần đối soát đầy đủ theo ngày với hỗ trợ kỹ thuật; không nhảy checkpoint để làm đèn xanh. Đây không phải hệ thống thanh toán thương mại lưu lượng lớn.

Nguồn hợp đồng API: https://docs.sepay.vn/api-giao-dich.html (`since_id` bao gồm ID đã chỉ định, `limit` tối đa5000).

## 7. Backup và cảnh báo

Backup tự động6h/lần, giữ7ngày trong volume `backups`; file mode0600. Kiểm:

```sh
docker compose --env-file deploy/.env -f deploy/compose.yaml ps
docker compose --env-file deploy/.env -f deploy/compose.yaml logs --tail=100 backup monitor
sh deploy/restore-check.sh
```

Script restore tạo DB `oms_restore_*`, nạp backup mới nhất rồi xóa **DB tạm đó**, không restore đè `oms`.

**Backup cùng VPS chưa đủ chống mất VPS.** Trước public phải thiết lập sao chép dump ra máy/bucket khác có bảo vệ/encryption và giữ bản cấu hình/secret phục hồi ở chỗ riêng. Dùng `docker compose cp` lấy dump từ service backup rồi chuyển qua SSH/SFTP hoặc công cụ backup của hạ tầng; không đặt dump trong thư mục web. Chưa có dịch vụ off-host nào được mua/cấu hình trong lượt build này.

`OPS_ALERT_URL` là endpoint riêng nhận HTTP POST form `event=...`; để trống thì chỉ ghi cảnh báo vào Docker log. Cần cấu hình kênh báo thực tế hoặc monitoring bên ngoài và kiểm thử nhận cảnh báo. Không tuyên bố đã có cảnh báo tới điện thoại nếu chưa cấu hình.

Không bật access log chứa Cookie/Authorization/query `refs` và không chia sẻ log/dump tùy tiện. Các volume, file `.env` và backup không nằm trong gói source.

## 8. Trước khi chia sẻ link rộng rãi

1. Điền config thật, đổi mọi secret/mật khẩu mẫu; xác minh hai lớp staff và role.
2. Xác minh DNS/HTTPS/cookie Secure trên domain thật; chỉ ingress cần thiết.
3. Thử Turnstile thật: thiếu/giả token không đăng ký được, tài khoản hợp lệ nhận ví đúng một lần. Test key chỉ dùng QA.
4. Thử đủ COD/ví giả; xác nhận không hứa giao hàng thật.
5. Chủ tài khoản tự thử một đơn SePay giá thấp, chuyển **đúng số tiền/nội dung QR**, kiểm receipt, inbox và không tăng ví giả. Không gửi OTP/token vào chat.
6. Thực hiện hủy/hoàn một khoản thật bằng quy trình thủ công, đối chiếu sao kê rồi mới ghi thành công.
7. Chạy restore thử; hoàn tất backup off-host và kênh cảnh báo thật.
8. Theo dõi tài nguyên, quota, disk và bank sync trong giai đoạn ít người đầu tiên.

## 9. Những giới hạn không che giấu

- Chưa có email/SMS verification, forgot-password tự động, OAuth hoặc MFA. Email/điện thoại tự nhập **không chứng minh chủ sở hữu**, không dùng chúng một mình để duyệt hoàn tiền. Hỗ trợ tài khoản/hoàn phải có chứng từ phù hợp.
- Turnstile + quota là giảm abuse, không phải chống DDoS hoàn chỉnh. Có giới hạn đăng ký chung để bảo vệ demo; tăng hạn mức cần đo tài nguyên và chính sách phù hợp.
- Các shop khác, chat/review/voucher/kênh người bán vẫn có phần minh họa; chỉ EZMART nhận đơn vào OMS.
- Chưa có soak dài hạn, pentest độc lập, chứng nhận thương mại/tài chính hoặc kiểm pháp lý cho việc thu tiền demo công khai. Người vận hành chịu trách nhiệm công khai rõ, hỗ trợ và hoàn tiền thật.

## 10. Bằng chứng kiểm thử

Trong `backend/artifacts/qa/public-deploy/` (không ship dữ liệu QA trong ZIP):
- `unit-confirmed.log`:60/60; `integration-final-confirmed.log`:15/15; `e2e-release-confirmed.log`:10/10.
- `browser-result.json` / `browser-prebuilt-final.log`: HTTPS, CAPTCHA kiểm phía server, cookie Secure/HttpOnly, cả3 phương thức, tiền bank không cộng ví giả, hủy bank chờ hoàn thật, form xác nhận chứng từ, NV không xem inbox, mobile.
- `cold-bootstrap-final.json`: khởi động DB public mới hoàn toàn,13migration/17ca, chỉ Quản lý dùng bootstrap password; hai NV mẫu khóa/mật khẩu riêng ngẫu nhiên.
- `runtime-proof.json`: non-root/read-only/cap-drop, role app DB không superuser và cấu hình Caddy public hợp lệ.
- `backup-once-confirmed.log`, `restore-check-confirmed.log`: dump và restore DB tạm qua role vận hành.
- `npm-audit-all-confirmed.json`, `npm-audit-production-confirmed.json`:0 mục được npm audit báo ở thời điểm chốt; không thay cho OS/container scan.
- Các lượt thất bại được giữ: Docker tắt khi resume, cấu hình Caddy/mktemp/CRLF đã sửa, test focus/copy/selector, và một lượt integration/E2E chồng DB không dùng làm chứng cứ chốt. Không coi rerun đạt là bằng chứng chữa mọi lỗi Windows native chưa rõ nguyên nhân trước đây.

Báo cáo readiness26/11 cũ là trạng thái **trước** lượt hardening này; các mục dependency/root/public profile đã được thay bằng thay đổi và bằng chứng nêu trên.
