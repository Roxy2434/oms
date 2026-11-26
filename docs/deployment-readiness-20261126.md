# Đánh giá khả năng deploy EZMART / ShopVui — 26/11/2026

**Trạng thái lịch sử, trước lượt hardening public.** Chuỗi dependency đã vá, profile VPS/non-root/chống abuse/đối soát/backup đã bổ sung sau báo cáo này. Xem trạng thái và cách triển khai hiện hành tại [public-deploy.md](public-deploy.md). Không dùng các mục “chưa sửa” bên dưới thay cho kết quả mới.

## Kết luận ngắn

**Về kỹ thuật đóng gói/chạy trên server: có thể.** Đã build image từ Dockerfile, khởi động3dịch vụ với DB rỗng, tạo17ca demo, mở bằng trình duyệt, chuẩn bị lượt mới và restart không seed trùng.

**Về việc đưa lên Internet ngay: chưa phê duyệt.** Khuyến nghị triển khai **web demo có mật khẩu/VPN, một máy Linux, chỉ dữ liệu mô phỏng**, sau khi hoàn thành các gate bên dưới. Không coi bản này là website thương mại công khai hoặc hệ thống nhận tiền/giao hàng thật.

Không có domain/VPS đích được cung cấp, không mở port/router, không upload lên Internet và không phát sinh mua dịch vụ hay chuyển tiền thật trong lượt này.

| Kiểu sử dụng | Đánh giá |
|---|---|
| Demo local/lớp học trên bản đang chạy | **Đạt trong phạm vi đã kiểm** |
| Web demo giới hạn người xem | **Khả thi, còn gate triển khai/bảo mật phải hoàn thành** |
| Public tự do đăng ký, nhiều người dùng không tin cậy | **Chưa đạt** |
| Bán hàng, giao hàng, nhận/hoàn tiền thật | **Chưa đạt** |

## 1. Góc chức năng và khả năng demo lặp lại

**Điểm tốt có bằng chứng:**
- 38unit,14integration và10E2E đạt trên lượt chốt (đã kiểm thêm cachegiá/ảnh cũ không ghi đè danh mục EZMART).
- 3lượt chuẩn bị trên DBclone: một/hai kho, ưu tiênchi phí, thiếu hàng, quáSLA, nhận/QC, cách ly/biên bản và thiếu+hỏng khi chuyển hoàn.
- Tạo tài khoản/đơn ngoài phạm vi demo làm sentinel trên clone; qua các lượt, ví/hồ sơ/đơn/chứng từ/giữ hàng của sentinel giữ nguyên.
- Trên DBchính: backup→thay82fixture đã duyệt→chuẩn bị17ca→chạy `npm run demo:refresh` thật và mở lại app.
- Đăng ký máy chủ/ví, retry mấtresponse, giao nhận/RMA/hoàn mô phỏng vẫn được E2E kiểm; không chỉ đọc source.

**Giới hạn:**
- 17ca là các bài mẫu hữu hạn, không phải mọi tổ hợp trạng thái/hoàn/bù tiền.
- Làm mới giữ lịch sử của lượt cũ; không xóa mọi hồ sơ đang QC/cách ly. Người demo dùng link của lượt mới và đối chiếu delta sổ tồn.
- Marketplace ngoài EZMART vẫn có giỏ/voucher/chat/review/kênh người bán minh họa phía trình duyệt, không phải sàn nhiều người bán production.

**Kết luận:** đủ nội dung để thuyết trình DOM/RMA nhiều lần. Không suy thành đã đầy đủ nghiệp vụ thương mại.

## 2. Góc build, kiến trúc và portability

**Đã kiểm:**
- Next16.4.6/Node24.15.0/Prisma7.10.1/PostgreSQL17; typecheck, ESLint0warning, production build đạt.
- Docker image build thành công từ `backend/Dockerfile`; boot DB rỗng áp12migration và tạo dữ liệu demo qua service.
- Backend/DB/nginx frontend ở project QA riêng, ports13001/18000; không sử dụng DBchính để test khởi tạo rỗng.
- Container chuẩn bị thêm lượt17ca rồi restart; IDlượt không đổi sau restart, file hướng dẫn được dựng lại từ `NHAT_KY/DEMO_RUN`.
- Mặc định frontend ngoài localhost gọi API cùng origin, phù hợp reverseproxy; localhost/127 dùng cùng hostname để cookie không bị cross-site.

**Còn thiếu:**
- Chưa có cấu hình reverseproxy HTTPS/domain đích đã kiểm end-to-end. Compose hiện bind web vào127.0.0.1; chưa phải public deployment.
- Image còn chứa tooling/devdependencies, khoảng717MB ở lần đo đầu; Dockerfile chưa chuyển sang non-root/multistage tối giản. Frontend nginx đang dùng tag1.27-alpine, chưa có container/OS vulnerability scan hoặc pin digest riêng.
- Cloud serverless như Vercel/Netlify không phải lựa chọn thả-nguyên-project: PostgreSQL/volume, poller/setInterval, migration/seed và backup cần thiết kế lại. Không khuyến nghị chọn serverless cho bản này chỉ vì dùng Next.js.

**Khuyến nghị:** một VPS Linux + Docker Compose + reverseproxy TLS,1replica backend cho demo, DBprivate cóvolume. Build image ở CI/local rồi đẩy image giúp giảm yêu cầu RAM khi build trên VPS.

## 3. Góc bảo mật ứng dụng và tài khoản

**Đã có:** Argon2, cookie khách HttpOnly/SameSiteLax/Secure theo APP_ORIGIN, JWTissuer/audience riêng, sessionVersion, Originallowlist, hạn body, phân quyền nhân viên/Quản lý, capability đơn, chốngtrùng và sổ ví phía server. E2E đã kiểm guest/foreignOrigin/role/passwordrevocation và không lộ hash.

**P1 trước public:**
- Đổi toàn bộ secret/mật khẩu mẫu. Rootcompose vẫn có fallbackdemo công khai; nếu quên cấu hình, không được đưa ra Internet. Cần guard cấu hình khi deploypublic.
- Chưa email/SMSverification, resetpassword thật, MFA hoặc CAPTCHA/chống đăng ký hàng loạt. Mỗi tài khoản6triệu mô phỏng có thể bị tạo hàng loạt để chiếm giữ tồn/tăng DB.
- Rate limiter hiện ở RAM trong1process, có các quota dùng chung toàn shop/auth; người khác có thể làm đầy quota và ảnh hưởng khách hợp lệ. Restart/replica không có trạng thái giới hạn chung.
- CSP hiện có ở backend mới hạn framing/object/base, chưa là scriptnonce CSP toàn diện; static frontend và security header tại reverseproxy còn cần cấu hình. Chưa pentest độc lập hoặc auditXSS toàn bộ marketplace lớn.
- StatusAPI dùng capability token trong query `refs`; reverseproxy/accesslog phải tránh ghi token đầy đủ. Cân nhắc đưa mọi thao tác hiện hữu về authbuyer thay vì lan truyền capability qua URL.

Actor fixture nội bộ đã được giới hạn ở Nhân viên; catalog được chuẩn bị bằng Quản lý thật. Kiểm thêm trên clone xác nhận không thể vô hiệu Quản lý đăng nhập được cuối cùng chỉ vì có một system actor.

**Kết luận:** kiểm soát cơ bản hợp lý cho demo, chưa đủ bằng chứng/chống abuse cho người dùng Internet không tin cậy. Giai đoạn đầu cần BasicAuth/VPN cho **toàn bộ demo** và vẫn giữ auth/role của app.

## 4. Góc phụ thuộc và supply chain

`npm audit --omit=dev --json` thực tế trả **3 mục high,0critical**:

- `effect@3.20.0` qua `@prisma/config@7.10.1` và `prisma`.
- Đây là **một chuỗi phụ thuộc của cùng advisory**, không phải3lỗ hổng độc lập đã khai thác được trên website.
- Advisory [GHSA-7589-6fvf-x4pw](https://github.com/advisories/GHSA-7589-6fvf-x4pw) mô tả ReDoS khi `Schema.TemplateLiteral` có nhiều Stringspan giải mã input không tin cậy; upstream ghi đã vá ở `effect@3.22.1`.
- Source ứng dụng dùngZod; chưa chứng minh input từ route khách đi tới schema Effect bị ảnh hưởng. Vì vậy **không khẳng định đã tìm thấy exploit từ xa**, nhưng cũng không coi audit là sạch.

**Gate:** cập nhật chuỗi transitive sang bản vá tương thích, kiểm dependencytree, build/migrate/seed/E2E lại và audit lại trước khi public. Không chạy mù `npm audit fix --force`: gợi ý tự động đang dẫn tới hạPrisma6.12, dễ phá adapter/schema7. Lượt này không tự thay dependency để tránh mở rộng thay đổi nghiệp vụ.

Không có SAST/container/OS scan hay SBOM đầy đủ trong phạm vi đã chạy; các hạng mục đó còn chưa được chứng minh.

## 5. Góc tiền thật, SePay và kinh tế ví

**Bản demo đang bật `OMS_DEMO_MODE=1`:** không quảng bá bank/QR, cấu hình SePay trảnull dù có credential, `recordTransfer` bị chặn, POST đơn bank bị từ chối trước ghi DB; ví/COD vẫn hoạt động. Điều này có kiểm thử, không chỉ ẩn nút.

**P0 nếu định bán hàng thật:**
- Ví6triệu là tiền tặng **mô phỏng**, không thể dùng để giao hàng thật/cam kết tài chính thật. Phải tách hẳn môi trường và chính sách trước khi dùng hàng thật.
- SePay có adapter ghi nhận tiền vào nhưng chưa có thử chuyển tiền thật trong các E2E này, chưa có paging/catch-up để bảo đảm không sót giao dịch khi downtime/lưu lượng lớn (hiện50giao dịch gần nhất mỗi poll).
- Hoàn ngân hàng thật là quy trình riêng; SePay không tự chuyển hoàn. RMA ngân hàng không được giả lập hoàn thành công; cần chứng từ/đối soát thực tế.
- KPI cũ có thể gộp nguồn `VI_MO_PHONG`, CODmô phỏng và chuyển khoản; **không gọi KPI gộp là số dư/tiền ngân hàng thật**.
- Hãng vận chuyển/Shopee/TikTok vẫn giả lập; chưa có thanh toán–đối soát–fulfillment thương mại hoàn chỉnh.

**Kết luận:** có thể demo thanh toán ví/COD. Không mở nhận tiền hoặc bán/giao thật chỉ bằng việc đổi `OMS_DEMO_MODE=0`.

## 6. Góc dữ liệu, backup và thao tác nguy hiểm

**Điểm tốt:**
- DBchính được backup trước thay dữ liệu; backup đã restore sang DBclone độc lập và chạy3lượt, không phải chỉ tạo filedump.
- 80đơn có auditseed +2đơn gatewaydemo được xác minh trước thay;0đơn linkedbuyer/0SePay thật trong bộ cũ. Không xóa account/đơn dựa vào tên/điện thoại.
- Refreshkhông có APIpublic, scope theo runrecord/actor/ID; giữ lịch sử và dữ liệu ngoài demo.
- DBport local chuyển55432→15432 theo chấp thuận của chủ dự án, cùng volume; không thay reservedportWindows/dự án khác. Cả testguard và config theo `OMS_DB_PORT`, tênDBtest vẫn được bảo vệ.

**Trước web:** cần backup tự động off-host, retention, kiểm restore định kỳ, quyềnDBtối thiểu, theo dõi dung lượng/ảnhRMA, tài liệu rollback và người được phép chạy maintenance. `storage/demo` là hướng dẫn/cache; runrecord phải còn trong DB. Không dùng `down -v` hoặc seed lịch sử để nâng cấp.

## 7. Góc hiệu năng và tài nguyên

Đo hẹp trong Docker trên máy hiện tại:

| Thử | Kết quả |
|---|---|
|100GETcatalog, đồng thời10, trảbody đầy đủ |100/100HTTP200 |
|p50 / p95 / lớn nhất |41ms /110ms /117ms |
|Backend sau startup/restart ở lần stats |khoảng185MiB RAM |
|DBQA / nginxQA cùng lần stats |khoảng26MiB /14MiB RAM |
|Ảnh10SKUlocal |khoảng588KB WebP |

Đây **không phải** số liệu Internet, TPSgiới hạn, stress dài hạn hay chứng minh VPS nhỏ đáp ứng mọi tải. Chưa đo login/Argon2 concurrency, truy vấn report lớn, nhiều người upload ảnh, hay độ ổn định qua nhiều ngày. Data/history/sessions chưa có đầy đủ pagination/retention để hứa hẹn scale.

Đề xuất dự trù ban đầu cho demo ít người:2GBRAM (ưu tiên2vCPU nếu build tại máy),20–40GBSSD và1instance; cần đo lại trên VPSthật. Nếu buildimage tạiCI/local có thể giảm áp lực trên VPS. Không cần GPU server cho Three.js ở login vì render phía trình duyệt.

## 8. Góc UX, ảnh và nội dung công khai

- 10SKU EZMART giảm đúng50%; ảnhđúng loại được lưu local, không còn dùng cốc đen cho bình xanh hoặc giá treo cốc cho bộ6cốc. Giấy phép/attribution và các ảnhghép/crop được ghi rõ.
- KH-2 đổi mô tả nhẹ thành khay chữ nhật, không đổiSKU; thông số/dung tích vẫn là dữ liệu hư cấu, không xác nhận hàng thật.
- Đã kiểm shop1366/390 và ảnh khi chặn HTTPS ngoài, không overflow/pageerror trong ca đó. Demo mode có lời nhắc không chuyển tiền thật.
- Còn nhiều nhãn/chức năng minh họa của marketplace, ảnh/fontCDN khác và quyền ảnh ngoài10SKU chưa được rà hết. Trước public nên ẩn phần không thực sự hỗ trợ hoặc công khai ranh giới rõ; chưa có auditWCAG đầy đủ.

## 9. Góc vận hành và ổn định

- Đã kiểm freshcontainerboot, chuẩn bị lại, restart không seedtrùng và tái dựng guide từ DB.
- Đã gặp Windows giữ dảiport55380–55479 sau một lần Docker không chạy, cản bind55432; đã đổi riêngcổngOMS theo chấp thuận, không khẳng định đã chữa nguyên nhân reservationWindows.
- Một lượt E2E mới bị **ECONNRESET tại POSTregister**; đúng lượt đó chưa có logserver để kết luận nguyên nhân. Sau khi bổ sung thu log, standalone và lượtfull10case kế tiếp đều đạt, **không gọi đó là đã sửa tận gốc**. Giữ `e2e-final-cacheguard.log` thất bại, `demo-mode-cacheguard-probe.log` và `e2e-final-confirmed.log` sau đó. Đây là hạng mục cần theo dõi/soak trên môi trường đích.
- Warning pg overlapping-query còn ở một số luồng cũ. Không cam kết tương thíchpg9.
- Chưa có healthalert, logrotation, job/DBmonitoring, maintenancewindow hoặc kiểm chaos/soak dài hạn. Nếu bật SePay tương lai phải có worker/job bền vững; không dựa vào function serverless ngủ đông.

## 10. Góc chi phí và cách triển khai đề xuất

Ước lượng ngân sách để lập kế hoạch, **không phải báo giá đã xác nhận hoặc dịch vụ đã mua**:

- VPSLinux2GB: khoảng150.000–400.000đ/tháng tùy nhà cung cấp/vùng/tỷ giá; buildtrongCI/local để không cần thuê RAMlớn chỉ cho build.
- Domain: khoảng250.000–500.000đ/năm tùy đuôi/nhà cung cấp; có thể dùng subdomain của hạ tầng đã có.
- TLSLet'sEncrypt: có thể miễn phí; vẫn cần cấu hình/gia hạn đúng.
- Backup/off-host và giám sát: dự trù thêm20.000–100.000đ/tháng hoặc theo dịch vụ sẵn có.

Tham khảo bảng giá nhà cung cấp trực tiếp khi chốt (ví dụ https://www.digitalocean.com/pricing/droplets). Chưa kiểm billing/account của bất kỳ nhà cung cấp nào. Không khuyến nghị thuêmanagedDB/Kubernetes ngay cho một đồ án ít người vì tăng chi phí/vận hành chưa cần thiết.

Kiến trúc một origin khả thi: staticShopVui `/`, API `/api/*` và assetNext `/_next/*` qua backend; các đườngstaff như `/login`, `/dashboard`, `/orders`, `/inventory`, `/fulfillment`, `/returns`, `/reports`, `/admin` proxy về Next. ShopVui dùng hashroute nên `/#/login` không trùng `/login` nhân viên. Cấu hình này **chưa được triển khai/testTLS trên domain đích**, cần smoke lại với HTTPS/cookie/originthật.

## Các gate phải đóng trước khi đưa bản demo lên web

1. **Vá/kiểm chuỗi effect–Prisma** và audit/build/regression lại; không tự downgradePrisma.
2. **Secret riêng + gate truy cập**: bỏ fallback khipublic, thay mật khẩu mẫu, BasicAuth/VPN toàn bộdemo, DBprivate.
3. **HTTPS/reverseproxy/origin/cookie**: một domainthật, chỉ ingress80/443, không mở DB hoặc API admin không cần thiết; thử login2vai trò + buyer trên HTTPS.
4. **Demo mode bắt buộc**: `OMS_DEMO_MODE=1`, không tokenQRtiền thật; không dùng ví mô phỏng cho hàng/giao thật.
5. **Vận hành tối thiểu**: backup off-host + restorethử, cảnh báohealth/disk, logredaction/token, xử lý lỗi startup/maintenance.
6. **Smoke trên đích**: đăng ký→ví→đặtmột/hai kho→xuất→RMA→hoàn, restartkhôngseed, mobile/ảnhlocal; soak và theo dõi ECONNRESET/nativeexit nếu còn.

Đóng6gate trên → có cơ sở phát hành **demo giới hạn truy cập**. Publictựdo/tiềnthật cần thêm chính sáchabuse/verification, durableworker/reconciliation, quy trình thu–hoàn, báo cáo tiền thật riêng và kiểm bảo mật/tải sâu; không phải một thao tác deploy.

## Bằng chứng và phạm vi xác nhận

`backend/artifacts/qa/demo-refresh/` chứa:

- `build-final.log`, `unit-final.log`, `integration-final.log`, `e2e-final-confirmed.log`.
- `rehearsal.json`, `main-legacy-replacement.log`, `main-prepare.log`, `main-repeat-command.log`.
- `docker-build-final.log`, `docker-boot.log`, `docker-recovery-boot.log`, `docker-repeat-result.json`, `container-smoke.json`, `docker-stats-final.jsonl`.
- `npm-audit-production.json` và stderr; advisory được đọc từ URLupstream, không suy0lỗ hổng từ testPASS.
- `main-final.json`: 3 hàng tài khoản nhân viên gốc (gồm hash mật khẩu/role/session) khớp bản clone từ backup, 10 giá đúng một nửa, 17 ca hiện hành, health200, bank bị khóa; `fixture-actor-clone.json`/`docker-final-actor.json` xác nhận actor Nhân viên và guard Quản lý cuối cùng.
- `source-package-final.log`: ZIP source được kiểm manifest/hash và đối chiếu5giá trị riêng hiện cấu hình, không chứa các giá trị đó.
- Ảnh review/screenshot và metadata nguồn ảnh. Các lỗi probe sai selector/encoding cũng được giữ, không được tính là kiểm thử đã đạt lúc đó.

Đã tạo ZIP source và chạy scanner so với các giá trị riêng đang cấu hình, loại `.env`, dump, runtime, log và dependencies/generated; đây chỉ là kiểm phạm vi gói, không thay pentest hoặc chứng minh mọi secret lịch sử đều đã được tìm thấy.

Các đánh giá trên là rà soát nhiều khía cạnh với bằng chứng runtime/source, không phải pentest/chứng nhận độc lập hay lời bảo đảm không còn lỗi.
