# ShopVui: tài khoản máy chủ, ví 6 triệu mô phỏng và SePay

**Cập nhật hiện hành 26/11/2026:** đã chuẩn bị bộ demo lặp lại, giá giảm 50%, DB local của máy này chuyển sang15432. `OMS_DEMO_MODE=1` khóa SePay tiền thật dù credentials còn nguyên; do đó không dùng mô tả poller đang bật của lần bàn giao25/11 bên dưới làm trạng thái hiện tại. Hướng dẫn mới: [demo-repeatable.md](demo-repeatable.md); đánh giá deploy: [deployment-readiness-20261126.md](deployment-readiness-20261126.md).

Cập nhật 25/11/2026 theo lựa chọn của chủ dự án:

- Tài khoản/ví/đơn lưu trên máy chủ, đăng nhập nhiều máy được.
- Mỗi tài khoản đăng ký thành công nhận **6.000.000đ mô phỏng đúng một lần**. Không nạp/rút/chuyển tiền ví; không đổi thành tiền thật.
- Chỉ **EZMART** có thể đặt và thanh toán. Các shop/sản phẩm mẫu khác vẫn xem được nhưng thêm vào giỏ/đặt hàng bị chặn.
- Chuyển khoản dùng **SePay tiền thật**, hoàn toàn tách khỏi ví mô phỏng. Không còn nút/API tự báo đã chuyển khoản, kể cả khi máy vẫn có `SHOPVUI_DEMO_PAY=1`.

## Dùng bản đang chạy

1. Mở http://127.0.0.1:8000/#/register, Ctrl+F5 nếu đã mở bản cũ.
2. Đăng ký tên đăng nhập 4–20 ký tự, email hoặc số điện thoại và mật khẩu 8–16 ký tự có hoa/thường/số. Tên đăng nhập được chuẩn hóa chữ thường; không dùng số điện thoại làm username.
3. Xem **Tài khoản → Ví ShopVuiPay**: 6 triệu tiền mô phỏng; chỉ cấp khi tạo tài khoản trên server, đăng nhập lại không cấp thêm.
4. Thêm địa chỉ tại Hà Nội, Đà Nẵng hoặc TP.HCM; chọn sản phẩm EZMART, Mua ngay/giỏ hàng.
5. Chọn COD, Ví ShopVuiPay (mô phỏng), hoặc **SePay · Chuyển khoản thật**. Máy chủ tính lại giá và phí, không tin số tiền/số dư từ trình duyệt.
6. SePay: quét QR/chuyển đúng số tiền và nội dung; trang hỏi trạng thái tự động. **Kiểm tra thanh toán** chỉ hỏi lại, không ghi khoản thu.

Tài khoản `demo` cũ chỉ tồn tại ở LocalStorage và **không còn được dùng để đăng nhập**. Không tự nhập mật khẩu, số dư hoặc đơn cũ từ LocalStorage vào server. Bootstrap thay cache tài khoản/đơn/địa chỉ bằng dữ liệu thuộc phiên server; dữ liệu máy chủ không bị xóa khi chọn khôi phục bộ nhớ trình duyệt. Đơn cũ vẫn còn trong OMS nhưng không tự gán cho người đăng ký bằng số điện thoại trùng, tránh chiếm đơn người khác.

## Kiến trúc và bảo vệ cơ bản

- 3 bảng mới: `SHOP_TAI_KHOAN`, `SHOP_SO_VI`, `SHOP_DON_MUA`. Schema hiện hành có 19 bảng nghiệp vụ.
- Khách và nhân viên dùng bảng/cookie riêng; mật khẩu Argon2; JWT khách có issuer/audience riêng, cookie HttpOnly, SameSite=Lax, Secure khi APP_ORIGIN dùng HTTPS. Đổi mật khẩu tăng sessionVersion để vô hiệu phiên cũ ở máy khác.
- API khách `/api/storefront/{register,login,logout,session,profile,password,addresses}`. Dữ liệu theo ID trong cookie đã xác minh, không theo userId khách gửi.
- Đăng ký + sổ OPEN trong một transaction; UNIQUE theo username/email/phone và unique partial index chặn hai dòng OPEN cho cùng tài khoản.
- Trừ ví + tạo liên kết mua hàng + đơn/kiện/giữ tồn/chứng từ ví trong cùng transaction Serializable hiện hành. Khóa hàng tài khoản, chặn âm ví, idempotency/replay không trừ hai lần. Nếu không đủ ví, toàn transaction rollback.
- Mã đơn EZMART là ID đơn phía server và frontend. Capability của đơn chỉ được trả trong trạng thái của chủ tài khoản hoặc phản hồi đặt đơn đã xác thực.
- LocalStorage chỉ cache UI. Sửa số dư/ledger local hoặc xóa LocalStorage không tạo lại tiền ví trên máy chủ.
- Origin allowlist, credentials CORS, no-store ở API tài khoản, quota trong process và giới hạn body. Cookie auth cho thao tác tạo đơn; public storefront key không thay thế đăng nhập. Với đơn khách chọn ngân hàng, cả nút ghi thu mô phỏng ở OMS và API collect/record thu trả trước đều bị chặn; SePay là nguồn tạo khoản thu.
- Nguồn chứng từ `VI_MO_PHONG` tách ví khỏi `CHUYEN_KHOAN`. Khi tính các báo cáo tài chính, cần phân biệt nguồn; KPI nghiệp vụ cũ vẫn có thể tổng hợp các nguồn, không diễn giải KPI gộp là số tiền ngân hàng thật.

## Hoàn tiền

- Đơn trả bằng ví mô phỏng: hủy/RMA được OMS xác nhận hoàn thì sổ ví server cộng phần hoàn một lần; không tự cấp lại 6 triệu.
- Đơn trả ngân hàng: **không cộng số tiền hoàn vào ví mô phỏng**. SePay chỉ xác nhận tiền vào, không thực hiện chuyển tiền hoàn.
- QC của đơn ngân hàng thật không tự tạo chứng từ hoàn thành công qua gateway mô phỏng; hồ sơ còn nghĩa vụ hoàn giữ ở `CHO_HOAN_TIEN`. Nhân viên phải chuyển tiền thật qua kênh được duyệt rồi ghi nhận chứng từ đúng thực tế.
- Không coi khoản hoàn ghi tay là bằng chứng đã chuyển tiền tại ngân hàng. Không có API rút tiền ví mô phỏng.

## Cấu hình SePay

Bản local đọc `backend/.env`; bản Docker root nhận các biến từ `.env` ở root qua `docker-compose.yml`:

```
SEPAY_API_TOKEN=<token riêng từ SePay>
SEPAY_ACCOUNT=<tài khoản nhận tiền>
SEPAY_BANK=970422
SEPAY_HOLDER=<tên chủ tài khoản>
SEPAY_POLL=on
```

Không ghi token/ngân hàng thật vào source, tài liệu hoặc ZIP. `SEPAY_POLL=off` chỉ tắt poller, dùng cho kiểm thử QR bằng token/tài khoản giả. Nếu thiếu token hoặc tài khoản, đặt đơn chuyển khoản mới bị từ chối; ví/COD vẫn hoạt động. `SHOPVUI_DEMO_PAY` không còn tác dụng.

Bản local triển khai trong phiên này dùng cấu hình SePay đã có, không sửa `.env`: kiểm truy vấn danh sách giao dịch có xác thực nhận HTTP200, đã quan sát poller khởi động trong đoạn log lần boot mới nhất. **Chưa thử một giao dịch chuyển tiền thật và không chủ động chuyển tiền**; E2E settlement dùng giao dịch ngân hàng giả trên `oms_test`.

## Nâng cấp DB

Đã backup DB chính trước build/deploy tại:
`backend/storage/backups/oms_20261125_211229_052555.dump`.

Áp dụng thêm:
- `20261125210000_shop_accounts_wallet`: 3 bảng khách/ví/đơn.
- `20261125213000_simulated_wallet_source`: thêm nguồn chứng từ mô phỏng.

Không sửa migration cũ, không reset/seed DB chính. Trên máy nhận bản nâng cấp:

```
cd backend
npm run local:backup
npm run local:stop
npm run db:generate
npm run db:migrate
npm run build
npm run local:start
```

Nếu chạy Docker root: `docker compose up --build`. Không dùng `down -v` để cập nhật DB đang có dữ liệu.

## Kiểm thử và kết quả

Lượt chốt mã hiện hành:
- typecheck, ESLint (0 warning), build: PASS.
- 34/34 unit, 14/14 integration, 9/9 E2E: PASS.
- `check-shop-accounts.ts`: cấp 6 triệu một lần; Argon2/no hash exposure; đăng nhập/đăng ký trùng chuẩn hóa; địa chỉ/đổi mật khẩu; hai tài khoản cô lập; chi đồng thời không âm; rollback đơn/tồn; replay/hoàn một lần; chặn ngân hàng demo; SePay incoming idempotency; hoàn ngân hàng không đúc tiền mô phỏng; RMA ngân hàng không giả lập hoàn thành công.
- `check-shop-accounts-ui.ts`: đăng ký/auto-login bằng UI; cookie HttpOnly; thêm địa chỉ; trình duyệt khác khôi phục ví/đơn; mất phản hồi sau commit bấm lại không trừ hai lần; xóa LocalStorage; chặn guest/Origin ngoài; đổi mật khẩu thu hồi phiên cũ.
- Wallet E2E: trả ví → hủy → hoàn; trả ví → giao → RMA/QC → hoàn hàng; tamper ledger trình duyệt không làm đổi ví.
- QR E2E: không có nút demo dù env cũ bật; /pay trả403; trạng thái chờ/nhận tiền/thông báo/expiry, trên giao dịch SePay giả và DB test.
- Đối chiếu deploy: 16 bảng nghiệp vụ có trước giữ nguyên count + SHA256; thêm 3 bảng mới. Không tạo tài khoản test ở DB chính. Guest UI/session đọc được với cả 127.0.0.1 và localhost, không pageerror/overflow390.

Bằng chứng chốt: `backend/artifacts/qa/shop-accounts/` (`integration-final-guard.log`:14/14; `e2e-final-confirmed.log`:9/9; `accounts-ui-final-extra.log`:bổ sung kiểm staff UI/API chặn ghi thu ngân hàng; `summary.json`, `deployment.json`); `backend/artifacts/playwright-report/index.html`. Các lượt lỗi trước sửa vẫn được giữ, không gọi là PASS: fixture SePay đổi sang chưa trả nên cần đóng trước ca expiry; periodic refresh từng redraw receipt đã sửa bằng fingerprint ngữ nghĩa; snapshot history thiếu CONFIRMED đã bổ sung; helper station cũ chỉ tìm trong 500 hàng đầu đã sửa dùng chính scanner/lookup của UI (không bỏ assertion hoặc reset DB test). Một lượt sau có child wallet exit Windows `3221226505` (0xC0000409), stdout/stderr trống, chưa xác định nguyên nhân native exit; giữ nguyên log thất bại `e2e-final-guard.log`. Lượt full suite kế tiếp đạt9/9, không thay mã sản phẩm để né lỗi; không coi lần native exit trước là PASS hoặc khẳng định đã sửa tận gốc.

## Giới hạn trước khi public

- Chưa xác minh email/SMS, chưa có forgot-password thật, chống bot/distributed limiter hoặc kiểm thử tải/pentest toàn diện. Mỗi tài khoản được 6 triệu mô phỏng nên phải có chính sách chống tạo hàng loạt nếu public; không dùng ưu đãi này cho giao hàng/tiền thật.
- Phiên đăng nhập/ví/đơn/địa chỉ/hồ sơ ở server; giỏ, yêu thích/voucher/chat/review và kênh người bán mẫu còn mang tính local/demo, không phải hệ thống marketplace production.
- SePay hiện poll 50 giao dịch gần nhất mỗi lượt; chưa bảo đảm khôi phục toàn bộ giao dịch bị bỏ lỡ khi downtime/lưu lượng lớn. Cần paging/reconciliation và quy trình vận hành tiền thật riêng trước sử dụng thương mại.
- Website public cần HTTPS, origin allowlist chính xác, secret mới, backup và bảo vệ DB. Ưu tiên cùng origin bằng reverse proxy: static ShopVui tại `/`, API backend tại `/api`. Default frontend ngoài localhost dùng API cùng origin; nếu tách API, đặt `window.SV_OMS` trước oms-shop.js và dùng các hostname cùng site. Không hỗ trợ hứa hẹn cookie bên thứ ba giữa hai domain không liên quan.
- Không cam kết mọi nhánh hoàn/bù chứng từ và mọi tổ hợp trạng thái đã được kiểm. Warning pg overlapping-query còn ở một số luồng cũ; không phải bảo đảm tương thích pg9.
