# EZMART · Quản lý đơn hàng

## Profile VPS công khai

Xem `../docs/public-deploy.md` và `../deploy/compose.yaml`. Profile riêng hỗ trợ COD/ví mô phỏng + SePay thật qua cờ opt-in, TLS, guard secret, Turnstile, quota bền vững, non-root và đối soát `/bank`. Bản local bên dưới vẫn tắt tiền thật. Không mở profile local lên Internet bằng cách đổi bind address.

## Demo lặp lại — 26/11/2026

10 SKU giảm đúng 50%, ảnh chụp local có nguồn/giấy phép, 17 ca DOM/RMA/báo cáo/ShopVui được chuẩn bị lại bằng `npm run demo:refresh` (backup → dừng đúng app → tạo lượt mới → mở lại). Guide và tài khoản demo: `storage/demo/LUOT-HIEN-TAI.md`. Bản đang chạy bật **OMS_DEMO_MODE=1**, khóa SePay tiền thật dù còn credentials. DB local trên máy này dùng **15432** qua OMS_DB_PORT; URL web3001/8000 không đổi. Hướng dẫn: `../docs/demo-repeatable.md`. Đánh giá deploy nhiều hướng và các gate chưa đạt: `../docs/deployment-readiness-20261126.md`. Chưa deploy lên Internet.

## ShopVui — tài khoản và ví trên máy chủ (25/11/2026)

Đăng ký/đăng nhập khách hàng thật; tài khoản mới nhận 6.000.000đ **ví mô phỏng một lần**. Trừ ví, tạo đơn và giữ hàng trong cùng transaction. Chỉ EZMART nhận đơn. Đã bỏ hoàn toàn API/nút tự xác nhận chuyển khoản demo, kể cả khi còn `SHOPVUI_DEMO_PAY=1`. SePay xác nhận tiền vào thật, không tự hoàn ngân hàng hoặc nạp vào ví mô phỏng. 3 bảng mới → 19 bảng nghiệp vụ; thêm nguồn `VI_MO_PHONG` để phân biệt chứng từ ví với chuyển khoản. Cần áp dụng 2 migration ngày25/11 trước khi mở build mới. Hướng dẫn/giới hạn/kiểm thử: `../docs/shopvui-server-accounts.md`. Các mô tả tài khoản demo/thanh toán phía trình duyệt bên dưới là lịch sử.

Ứng dụng đồ án chạy local, hai vai trò, 19 bảng nghiệp vụ; đơn một/hai kho, giao nhận mô phỏng, trả hàng–QC–thu/hoàn và báo cáo CSV. **Không phải hệ thống thương mại production.**

## Phạm vi sửa 13/11/2026 — DOM, hàng hoàn và bàn giao

Chính sách hiện hành **DOM-REGION-V3** theo yêu cầu mới: bỏ tọa độ và khoảng cách; chọn kho theo vùng giao hàng, ATP, bảng phí/thời gian mẫu. Một kho trước hai kho, tối thiểu cước + đóng gói trong nhóm hợp lệ. Giữ kiểm SLA khi pack/handover. Không tra bản đồ hoặc khẳng định kho gần nhất tới địa chỉ khách.

**Không sửa nghiệp vụ thanh toán/thu–hoàn, không tích hợp thật 3PL/Shopee/TikTok/cổng hoàn tiền.** Những giới hạn thanh toán trong audit vẫn còn. Hướng dẫn hiện hành, scope, migration mới, bảo mật token và cách tạo gói sạch: **[docs/HANDOVER.md](docs/HANDOVER.md)**. Các mục có ngày cũ bên dưới là lịch sử, không phải kết quả nghiệm thu bản mới.

## Chuyển khoản thật MB Bank qua SePay — 12/11/2026

Đơn trả trước của ShopVui (chọn "Chuyển khoản") hiện mã VietQR của tài khoản MB Bank, nội dung là mã đơn không dấu gạch (`DH261112A1B2C3`). EZMART hỏi SePay mỗi 5 giây (`src/instrumentation.ts` → `src/domain/payments/sepay.ts`), không cần mở cổng ra Internet. Tiền về đúng/thiếu so với số còn phải thu → khoản thu **thành công**; thừa, đơn COD hoặc đơn đã hủy → **chưa rõ**, vào nhóm "Giao dịch cần tra soát". Giao dịch không có mã đơn bị bỏ qua (xem trên SePay). Bật bằng `.env`, rồi khởi động lại server:

```
SEPAY_API_TOKEN=   # my.sepay.vn > Cấu hình Công ty > API Access
SEPAY_ACCOUNT=     # số tài khoản MB Bank nhận tiền
SEPAY_BANK=970422  # tùy chọn, mặc định MB Bank
```

**Hạn thanh toán:** đơn chuyển khoản ShopVui chưa có tiền sau **10 phút** thì EZMART tự hủy và trả hàng giữ về kho (kiểm tra mỗi phút, `expireUnpaidTransfers`); trang thanh toán đếm ngược. Đơn đã có tiền về (kể cả "chưa rõ") không bao giờ bị tự hủy — điều kiện kiểm lại trong khóa đơn.

**Khóa ShopVui:** khóa trong JS công khai chỉ định danh cửa hàng. Mọi thao tác trên đơn đã có (thanh toán, hủy, trả hàng, đọc trạng thái) cần thêm **token riêng của đơn** (HMAC từ `SESSION_SECRET`) mà EZMART chỉ trả cho trình duyệt đã đặt đơn. Đơn đặt trước khi có token được ShopVui tự lấy lại token bằng đúng thông tin đơn (`replayOnly`, không bao giờ tạo đơn mới).

Khi bật, nút "Tôi đã thanh toán" mô phỏng của ShopVui bị khóa với đơn shop EZMART (API `/pay` trả 403). **Hoàn tiền thật vẫn chuyển tay**: đơn hủy còn giữ tiền khách nằm ở nhóm việc mới "Đơn hủy còn tiền phải hoàn"; ghi khoản hoàn ở tab tiền của đơn sau khi chuyển. Đơn trả bằng Ví ShopVuiPay (mô phỏng) bị khách hủy được hoàn ví tự động. Test: `scripts/check-sepay.ts` (SePay giả, chỉ ghi `oms_test`); các script test luôn tắt SePay.

## Sửa thu tiền tự động và E2E — 02/11/2026

Đã sửa API thu COD tự tính theo đúng kiện, chặn thu tự động0đ bằng lỗi nghiệp vụ409 và sinh mã thu từ toàn bộ khóa thao tác để tránh trùng do cắt tiền tố. Cập nhật E2E theo form thu tiền không còn ô số tiền/mã chứng từ; thêm sửa xuống dòng tiêu đề hồ sơ trả dài trên mobile. Build và fullverify cuối đạt **16unit/8integration/3E2E**, hồi quy qua HTTP thật đạt;14bảng DBchính giữ nguyên count+SHA256. **Chưa sửa chính sách phí Shopee hoặc tích hợp sàn.** Chi tiết, bằng chứng và các lượt lỗi trước sửa: `docs/auto-collection-fixes-20261102.md`.

## Sửa audit và luồng nghiệp vụ29/10/2026

Đã sửa6lỗi A01–A06: hạn mức hoàn COD dùng chung đúng kiện nguồn, ràng buộc parent chứng từ bù, đóng/mở lại RMA đồng bộ, retry kết quả chưa rõ khóa đúngbody/key, citynull, cảnh báo xóa dòng nháp và lượng còn được trả. Luồng rõ hơn: **Xác nhận đã đóng gói**, cước/ETA/COD từng kiện, phí đã chốt, thuCOD tại tabtiền, RMA có bước tiếp theo và tra soát ngay hồ sơ. Kiểm14unit/7integration/3E2E gồm4ca một kho/hai kho/trả một phần/chuyển hoàn thiếu-hỏng; không thay dữ liệu thật. Báo cáo/phạmvi/giớihạn: `docs/audit-fixes-20261029.md`. Đang chờ người dùng thử UI mới, không cam kết hết mọi lỗi.

## Tạo đơn mới — luồng cập nhật27/10/2026

`/orders/new`: chọn khách/địa chỉ → sản phẩm → hệ thống hiện kho, cước từng kiện và tổng ngay trong form → **Tạo đơn và xác nhận**. Phí khách = tổng cước các kiện, không cộng đóng gói. Khách có tỉnh/thành được điền sẵn; không có ô Vùng giao riêng hoặc phí nhập tay. Xác nhận mới tạo đơn/khách mới/kiện/giữ hàng trong một transaction; chưa thu tiền/xuất kho. Nháp là lựa chọn phụ, mở lại qua cùng form. Tồn/giá/phí thay đổi buộc xem lại; retry mất response không tạo trùng. Đơn lịch sử giữ phí cũ và luồng MANUAL. Phạm vi phí local3thànhphố, không API hãng thật. Chi tiết/kiểm hồi quy: `docs/checkout-flow.md`. Luồng mới đang chờ người dùng thử; không suy từ nghiệm thu bản trước.

## Login theo mẫu người dùng

Cập nhật model27/10: chỉ thay mô hình bằng `12345tyu.html` (class `OmsPrecisionDiorama`), giữ form/CSS/header hiện tại **EZMART · Quản lý đơn hàng**. Model-only generator: `node scripts/import-login-precision.mjs`; nguồn archive `storage/ui-snapshots/login-precision-source.html`. Không chạy generator Untitled-1 cũ để ghi đè model hiện hành. Bảng tên chính trong model đổi về EZMART · Quản lý đơn hàng, không lấy marketing Enterprise/fullscreen của HTML nguồn. Kiểm motion/fallback/real login và ảnh: `artifacts/qa/login-precision/`. Chi tiết: `docs/login-precision-model.md`.


Trang `/login` dùng mô hình/bố cục từ `Untitled-1.html`, không còn model tự dựng trước đó. Header đã bỏ các mô tả/nhãn/phân khu và chỉ giữ đúng logo **EZMART · Quản lý đơn hàng** theo phản hồi. 3D chỉ minh họa, không phải tích hợp IoT/ASRS/AGV thực hay mở rộng nghiệp vụ. Three/Inter tự phục vụ, không cần CDN; desktop có kéo/zoom/xoay/reset/pause, mobile/tablet ưu tiên form. Không WebGL vẫn đăng nhập được. Form dùng tài khoản thật; không có checkbox nhớ/link quên mật khẩu giả. Nguồn và cách nhập ở `scripts/import-login-template.mjs`, archive `storage/ui-snapshots/login-user-template.html`. Người dùng đã duyệt giao diện bản chạy ngày26/10/2026; kết quả P7/P8 tại `docs/final-acceptance.md`.

## Bản chạy hiện tại

- URL: **http://127.0.0.1:3001/dashboard**
- Tài khoản: `quanly`, `nhanvien.an`, `nhanvien.binh`.
- Mật khẩu khởi tạo: giá trị `BOOTSTRAP_PASSWORD` trong `.env` tại máy này; không commit hoặc ghi mật khẩu vào tài liệu.
- PostgreSQL: Compose project `oms-course`, cổng mặc định **55432** (máy hiện tại **15432**, cấu hình `OMS_DB_PORT` và hai URL), DB `oms`; test DB `oms_test`. Không dùng DB/cổng/volume của WarehouseFlow hoặc Lumina.
- Phiên bản đã kiểm: Node 24.15.0, npm 11.12.1, Next 16.4.3, React 19.3.1, TypeScript 6.0.3, Prisma 7.10.1, PostgreSQL 17.11. Dependency exact trong `package-lock.json`; image 17-alpine đã khóa digest OCI trong `compose.yaml`.

## Dữ liệu mẫu có cách trình bày như vận hành thực

Tên khách, số liên hệ và địa chỉ là **hư cấu**, không dùng để liên hệ hoặc giao thật. Không gắn “demo” vào từng tên hoặc chứng từ trên giao diện. Mã đơn hiện hành `DH-000101`–`DH-000124`; đơn tạo mới dùng mã `DH-<ngày>-<mã ngẫu nhiên>`.

Các mã cũ `DEMO-001`–`020` vẫn redirect tới đơn mới. Mẫu hai kho chưa xác nhận: **`DH-000121`**; đơn hai kho đã xác nhận: **`DH-000122`**; đơn chờ hàng: **`DH-000123`**. Chứng từ tiền/sổ tồn/nhật ký cũ giữ nguyên bằng chứng gốc; nhãn hiển thị thân thiện được suy ra, không ghi đè số tiền hay lịch sử. Có audit riêng cho lần chuẩn hóa dữ liệu hư cấu.

Seed mới dùng thông tin tự nhiên; seed lại trên DB đã chuẩn hóa không tạo lại mã cũ hoặc lặp luồng tiền/tồn. Backup trước thay đổi: `storage/backups/oms_20261025_211437.dump`; kiểm chứng `artifacts/qa/presentation-normalization.json` và `artifacts/qa/realistic-data/`.

## Xem animation trên bản hiện hành

- Tải lại một lần bằng **Ctrl+F5** sau khi cập nhật bản build.
- Bộ chọn hiệu ứng đã được bỏ theo yêu cầu; animation vẫn hoạt động và mặc định tôn trọng chế độ giảm chuyển động của hệ thống.
- Đổi trang ở sidebar: nội dung cũ được giữ tới khi trang mới sẵn sàng, không thay bằng một vùng trắng; đường nhỏ dưới mục đang bấm báo đang tải.
- Dashboard: các KPI, số công việc và ATP đếm đến giá trị thật; đổi kỳ 30/7 ngày chuyển từ số cũ sang số mới. Số trung gian chỉ là trình bày, trình đọc màn hình nhận số cuối chính xác.
- Biểu đồ **Nhịp đơn hàng** vẽ đường từ trái sang phải khi vào trang/đổi dữ liệu; resize không khởi động lại mask hoặc làm mất đường. Mở/đóng **Đọc số liệu**; ở `DH-000121` đổi tab, tìm kho và bấm **Xem lại chuyển động**.
- Clip của vòng trước (chuyển trang/panel/tab/phân bổ): **http://127.0.0.1:3001/demo/oms-motion.webm**. Không có mật khẩu hoặc màn đăng nhập trong clip. Các thay đổi mới về giữ trang cũ, đếm số và vẽ đường xem trực tiếp trên web; lượt sửa này không quay thêm video.
- Provider vẫn hỗ trợ lựa chọn đã lưu ở trình duyệt (`oms.motion`) từ bản cũ, nhưng không còn control hiển thị. Chế độ tự động tôn trọng `prefers-reduced-motion`, giảm chuyển động hiển thị ngay số cuối và biểu đồ hoàn chỉnh; không thay dữ liệu nghiệp vụ.

## Cài từ đầu

Cần Docker Desktop, Node 24, Python 3, Edge (Playwright dùng channel `msedge`). Chạy lệnh trong thư mục dự án:

```sh
npm ci
# Sao chép .env.example thành .env; đặt secret riêng, mật khẩu DB trong DATABASE_URL phải khớp DB_PASSWORD.
docker compose up -d db
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:seed-realistic
npm run build
npm run local:start
```

Chỉ seed lần đầu hoặc khi chủ động cần bộ demo; **restart không chạy seed**. Seed dùng command keys bền vững, không vá trạng thái giả. `APP_ORIGIN` phải đúng `http://127.0.0.1:3001`; không thay thành localhost nếu chưa đổi cấu hình cookie/origin tương ứng.

Nếu cần phát triển: dừng production rồi `npm run dev`. Không chạy dev và start cùng cổng hoặc build trong lúc test production đang dùng `.next`.

## Chạy/dừng an toàn

```sh
npm run local:stop
npm run local:start
```

Start từ chối nếu cổng bận; kiểm Node, DB sẵn sàng, migration status sạch và chờ app+DB health trước khi báo thành công; không tự migrate/seed. Stop kiểm PID, đường dẫn Next thuộc dự án và cổng 3001 trước khi dừng; không dừng PostgreSQL hoặc project khác. PID/log tại `storage/runtime/production.pid`, `production.log`. Health: `/api/health`. Không chạy `docker compose down -v` nếu muốn giữ dữ liệu.

## Kiểm thử

```sh
npx tsx scripts/check-foundation.ts  # tạo oms_test nếu chưa có, migrate; không reset
npm run build
npm run verify                     # typecheck, lint, unit, integration, E2E
npx tsx scripts/check-surfaces.ts   # cần production 3001 đang chạy
npx tsx scripts/check-dashboard.ts
npx tsx scripts/check-reports.ts
npx tsx scripts/check-persistent-layout.ts # không video trừ khi OMS_RECORD_VIDEO=1
npx tsx scripts/check-final-acceptance.ts # trace20tương tác, offline/retry/deep-link
npx tsx scripts/check-checkout-surfaces.ts # readonlylive/quote/roles/mobile/axe
npx tsx scripts/check-checkout-ui.ts # oms_test, tự chạyserver3002, không chạy cùngE2Ekhác
npx tsx scripts/check-login-stage.ts
npx tsx scripts/check-login-redesign.ts
npx tsx scripts/check-visible-motion.ts # kiểm frame + quay clip khi chủ động chạy
npx tsx scripts/check-navigation-counters-chart.ts # giữ trang cũ/đếm số/vẽ đường, không quay video
python scripts/check-backup-restore.py # oms_test -> DB mới, so đủ14bảng/nội dung/constraints
python scripts/check-backup-restore.py --database oms # bản sao DB chính, không overwrite
```

Integration/E2E dùng **oms_test**, tạo fixtures có namespace riêng. E2E tự chạy một server riêng cổng **3002**, dừng đúng process nó tạo; từ chối nếu cổng bận. Không chạy hai bộ integration cùng lúc (ca last-manager dùng test DB chung). Test DB giữ lại fixtures để điều tra; không tự drop/reset.

Bằng chứng: `artifacts/qa/`, Playwright HTML `artifacts/playwright-report/`. Chốt bàn giao: `docs/final-acceptance.md`; lịch sử kết quả và giới hạn: `docs/test-report.md`. Không suy từ số test nhỏ thành đã kiểm mọi tổ hợp trạng thái.

## Sao lưu và khôi phục

```sh
npm run local:backup
python scripts/backup-local.py --database oms_test
python scripts/backup-local.py --restore-file storage/backups/<ten-file>.dump --new-database oms_restore_demo_01
```

Restore chỉ tạo **DB mới** tên `oms_restore_*`; không ghi đè `oms` hoặc `oms_test`. Muốn chuyển app sang bản restore phải chủ động đổi DATABASE_URL và restart sau khi kiểm tra. `check-backup-restore.py` đã thử round-trip cả test DB lẫn bản sao DB chính, so đủ14bảng/số dòng/nội dung/FK/constraints; không reset DB chính. Backup bàn giao `storage/backups/oms_20261026_143808.dump`; artifact restore tại `artifacts/qa/backup/{result,handover-result}.json`. Bản dump chứa dữ liệu/tài khoản, giữ riêng như dữ liệu nhạy cảm.

## Sửa audit và tra cứu bổ sung

Bản hiện hành đã sửa F01–F04 của `docs/functional-audit.md`: chặn bàn giao thiếu tiền sau bù, giới hạn phí giao đúng nguyên nhân, đóng/mở lại RMA theo hoàn ròng và giữ vùng kho khi sửa thông tin.

Khách hàng có tìm kiếm/phân trang và mở đơn theo khách. Giao nhận/trả hàng có tìm kiếm/trạng thái/kho/phân trang; tồn/sổ có kho/SKU/chứng từ/ngày và phân trang độc lập. Form thu/hoàn chọn chứng từ liên quan từ cùng đơn; hồ sơ trả hiển thị tiền còn được hoàn sau cả khoản chờ/chưa rõ và bù.

Regression: `npx tsx scripts/audit-functional-completeness.ts --regression` (services dùng oms_test, UI chỉ đọc bản3001). Suite chính đã thêm regression dịch vụ; kết quả9unit/5integration/1longE2E, không phải bảo đảm mọi tổ hợp đều được kiểm.

## Các luồng có thể thao tác

- Khách hàng: thêm/sửa; giá và người nhận trên đơn đã chụp không chạy theo hồ sơ mới.
- Quản lý: danh mục SKU/kho, tạo/sửa/khóa tài khoản, bảo vệ Quản lý cuối cùng.
- Kho: nhập tăng, kiểm kê version, sổ biến động; không sửa trực tiếp nhóm tồn đang giữ/QC.
- Đơn mới: báo kho/phí ngay trong form, tạo và xác nhận giữ toàn đơn nguyên tử; nháp mới sửa/xác nhận qua cùng form. Đơn lịch sử giữ preview/confirm ATP/version cũ. Sau xác nhận: đóng gói/bàn giao/giao; COD chỉ thu theo chứng từ, không tự thu khi giao.
- Ngoại lệ: hủy toàn đơn trước xuất hoặc nguyên kiện chưa xuất; giao thất bại/giao lại/chuyển hoàn; thu phí thiếu riêng không sửa COD đã bàn giao.
- Trả hàng: chọn nhiều dòng cùng kho, duyệt, nhận/QC mỗi dòng một lần; thiếu/sai có kết luận; hàng lỗi vào cách ly. Hoàn theo nguyên nhân và tiền thu; chờ/chưa rõ giữ hạn mức; bù gắn giao dịch gốc.
- Báo cáo: 8 nhóm chỉ tiêu, nguồn chứng từ, kỳ/kênh/kho đúng phạm vi và CSV chống công thức. Tiền không được chia kho giả.

## Giới hạn minh bạch

- Vận chuyển/API sàn và hoàn tiền còn mô phỏng; có adapter đọc giao dịch ngân hàng SePay như mô tả ở đầu tài liệu. Không suy từ adapter này rằng toàn bộ thu/hoàn hoặc ví đã an toàn vận hành tiền thật.
- Đơn lịch sử giữ DEMO-V1; đơn mới dùng DOM-REGION-V3 theo vùng/bảng thời gian mẫu, không dùng vị trí địa lý, SLA 24h và cửa sổ trả 7 ngày vẫn là chính sách mẫu; không tối ưu tuyến xe hoặc kế toán lợi nhuận.
- Không nhiều đợt nhận/QC cùng dòng trả, không xuất/giao một phần trong cùng kiện, không tự hết hạn giữ, không chuyển kho.
- UI tạo một hồ sơ trả cho các dòng cùng kho nguồn; muốn trả từ hai kho tạo hai hồ sơ.
- Rate limit đăng nhập nằm trong process, reset khi restart; chưa dùng limiter phân tán. Chỉ dùng local, không mở internet.
- Chưa có cam kết 60fps trên mọi máy. Có kiểm production, reduced-motion và lấy mẫu rAF; giao diện hiện hành đã được người dùng duyệt, nhưng phép đo chỉ đại diện máy và kịch bản đã kiểm.
- Backup/restore đã thử trên DB kiểm thử; không tuyên bố SLA vận hành hoặc kiểm thử tải thương mại.

Xem thêm: `docs/requirements.md`, `docs/financial-cases.md`, `docs/demo.md`, `DESIGN.md`, `docs/progress.md`.
