# Bàn giao EZMART — phạm vi sửa 13/11/2026

## Phạm vi đã được chốt

- Sửa DOM, luồng hàng hóa/hồ sơ RMA, bảo mật ngoài thanh toán, độ ổn định và gói source.
- **Giữ nguyên nghiệp vụ thanh toán/thu–hoàn, SePay, ví mô phỏng; không nối API Shopee, TikTok, 3PL hoặc cổng hoàn tiền.** Kiểm thử tiền hiện có chỉ là regression, không phải nâng cấp hoặc chứng nhận an toàn thanh toán.
- Không đổi nhận diện/bố cục giao diện. Đã bỏ phần nhập vị trí kỹ thuật theo yêu cầu mới; giữ trường địa chỉ/vùng và thời gian xử lý.
- Tài liệu audit trước sửa trong artifacts là lịch sử. Các số 14/15 bảng và kết quả test trong tài liệu cũ không phải trạng thái schema hiện tại.

## Chính sách hiện hành: DOM-REGION-V3 — đã bỏ vị trí địa lý

Theo yêu cầu mới của chủ dự án, không còn nhập tọa độ, tra bản đồ, dùng tâm thành phố hay tính/xếp kho theo khoảng cách.

1. Chỉ xét kho đang hoạt động, đủ ATP và đạt hạn còn lại (tối đa24h) theo bảng thời gian mẫu của vùng giao hàng.
2. Nếu có một kho đủ toàn đơn: chọn tổng cước + đóng gói thấp nhất; hòa thì ETA sớm hơn và mã kho ổn định.
3. Nếu không có phương án một kho hợp lệ: duyệt các cặp kho và cách chia nguyên lượng, tối đa2kiện, chọn tổng chi phí nhỏ nhất.
4. Phí khách trả vẫn là tổng cước, không cộng đóng gói. Không sửa thu/hoàn hoặc ví.
5. Đây là chọn kho phù hợp theo vùng/phí, **không khẳng định kho gần nhất đúng địa chỉ khách**.

### Thời gian và tương thích

- Chọn khách cũ dùng địa chỉ/tỉnh thành đã lưu; khách mới nhập địa chỉ bình thường, không có ô nhập vị trí kỹ thuật.
- Bảng vận chuyển mẫu giữ các giá trị mặc định trước đó để hạn chế thay đổi: cùng vùng4h; HN–ĐN/ĐN–HCM13,75h; HN–HCM20h, hai chiều như nhau (cộng 2h xử lý = 22h, bằng ETA khác vùng của bản cũ). Đây là timetable offline, không phải dữ liệu hãng hoặc tính từ địa chỉ cụ thể.
- ETA = xử lý kho (mặc định2h) + hàng chờ (mặc định0h) + vận chuyển theo bảng. Không cắt ETA xuống24h; tuyến HN–HCM mặc định 22h đạt SLA24h, nhưng nếu kho đặt giờ xử lý + giờ chờ quá 4h thì tuyến này bị loại.
- Giữ nguyên biểu cước/trọng lượng, phí đóng gói cấu hình, giữ tồn nguyên tử, tách2kho, idempotency và kiểm SLA khi pack/handover.
- Nháp checkout mới không được tự gia hạn deadline khi xác nhận lại. Ghi giao thực tế trễ vẫn được phép để báo cáo trung thực.
- Không viết lại phương án/ETA/tiền của kiện đã xác nhận. Kiện DOM-OFFLINE-V2 cũ vẫn kiểm SLA bằng căn cứ đã chốt; DEMO-V1 giữ tương thích cũ.
- Cột vị trí đã tạo ở migration cũ được giữ nhưng không dùng nữa, không xuất ra form và không tác động chọn kho. Không drop cột, không sửa migration đã áp hoặc xóa dữ liệu lịch sử.

## RMA và biên bản nội bộ

- Mỗi hồ sơ liên kết đơn/kiện/dòng nguồn; nhận về kho nguồn. Chặn vượt lượng được trả.
- Nhận vào QC; QC đạt về sellable/ATP, lỗi vào cách ly. Gửi lại cùng thao tác không nhập/kiểm định hai lần.
- Chuyển hoàn thiếu hàng/hỏng do vận chuyển có biên bản nội bộ. Ghi `DA_GUI` là nhân viên xác nhận đã gửi qua kênh ngoài, không phải hệ thống gọi API hãng.
- Biên bản: CHO_GUI → DA_GUI → DUOC_BOI_THUONG hoặc TU_CHOI; CHO_GUI có thể → KHONG_YEU_CAU. Kết luận cuối không quay lùi; cùng trạng thái có thể bổ sung ghi chú. Kết quả bồi thường không tự tạo chứng từ tiền.
- Mã RMA/BB dùng sequence DB để tránh tái dùng số do xóa/rollback; số có thể có khoảng trống. Backup/restore kiểm cả sequence.
- Sơ đồ thiết kế BPMN 2.0: `docs/dom-rma.bpmn` (mở bằng trình xem BPMN). Đây là sơ đồ, không phải workflow engine chạy nền. Nhánh thanh toán là khối hiện có, không thuộc sửa lần này.

## Bảo mật và giới hạn

- Khóa ShopVui trong JS là công khai, không đại diện đăng nhập người mua.
- Đơn mới lưu SHA-256 của recovery secret ngẫu nhiên; trình duyệt lưu secret trước request đầu tiên để khôi phục khi mất response. Replay cần token hoặc secret đó, không chỉ mã đơn/điện thoại/giỏ hàng.
- Đơn cũ mất cả token lẫn secret không được tự lấy lại bằng thông tin đơn; liên hệ người quản trị. Không tự xóa đơn cũ vì lỗi 403. Mất dữ liệu trình duyệt có thể mất quyền truy cập đơn demo.
- Capability token/recovery secret trong trình duyệt vẫn cần bảo vệ khỏi XSS, chia sẻ máy và export localStorage. Đây không phải tài khoản khách hàng server-side đầy đủ.
- Staff mutation có Origin/auth/validation và giới hạn body. ShopVui từ chối Origin không nằm allowlist, có quota tạo đơn/body-size cap; ảnh kiểm bytes/loại, khóa RMA khi gắn ảnh chống nhân đôi lúc retry.
- Limiter có giới hạn số bucket nhưng **chỉ trong một process**, reset khi restart; không tuyên bố chống DDoS hoặc limiter phân tán. Không tin X-Forwarded-For tùy ý từ Internet.
- Có frame-ancestors/X-Frame-Options, nosniff, Referrer-Policy và policy hạn chế camera/mic. CSP chỉ hạn chế framing/object/base URI, chưa là CSP script nonce toàn diện. HSTS chỉ bật với APP_ORIGIN https.
- Giới hạn thanh toán trong audit còn nguyên vì người dùng loại khỏi phạm vi: không dùng gói này để vận hành tiền thật/public khi chưa xử lý riêng các rủi ro đó.

## Cài từ đầu trên Windows

Yêu cầu: Node **24.15.0** (npm **11.12.1**), Python 3, Docker Desktop chạy Linux containers; Microsoft Edge cho E2E. Không dùng Node26 rồi bỏ qua preflight. Dùng nvm hoặc bổ sung thư mục Node24 vào PATH của terminal hiện tại; không cần thay runtime ứng dụng khác. Helper `local:start` cũng chấp nhận biến môi trường `OMS_NODE` trỏ tới node.exe phiên bản24, chỉ áp dụng cho process được khởi động, không sửa Node mặc định toàn máy. Launcher Windows tách console/job của terminal và không giữ stdin của lệnh gọi; chỉ chạy khi được gọi, không đăng ký service, scheduled task hoặc tự khởi động cùng Windows.

```sh
node --version
npm --version
npm ci
# copy .env.example thành .env, thay toàn bộ placeholder bằng secret/mật khẩu mới
# DATABASE_URL/TEST_DATABASE_URL phải dùng mật khẩu khớp DB_PASSWORD
# không chép .env/token/ngân hàng từ máy tác giả
docker compose up -d db
npm run db:generate
npm run db:migrate
npm run db:seed
npm run build
npm run local:start
# terminal khác, nếu cần ShopVui:
npm run shopvui
```

Seed cơ bản tạo đủ tài khoản/kho/SKU/tồn/nháp để thử từ đầu. `npm run db:seed-realistic` là **tùy chọn trên DB mới**, tạo bộ demo lịch sử, không phải lệnh restart hoặc áp vào dữ liệu đang dùng. Một số mẫu lịch sử có thể quá SLA; không sửa hạn chỉ để thao tác được. Không chạy reset/seed trên DB người nhận đã có dữ liệu.

Mặc định app `http://127.0.0.1:3001`, ShopVui `http://127.0.0.1:8000`, PostgreSQL `127.0.0.1:55432`. Giữ APP_ORIGIN đúng origin trình duyệt. Compose chỉ chạy DB, chưa đóng gói app thành container. Không chạy hai bộ compose trùng project/cổng/volume.

Lần đầu Quản lý dùng username `quanly`, mật khẩu lấy từ **BOOTSTRAP_PASSWORD do người nhận tự đặt**. Không có mật khẩu thật trong ZIP. Phiên bản kiểm nghiệm và kết quả cụ thể phải đọc báo cáo sửa lần này, không tự suy từ hướng dẫn là đã PASS trên mọi máy.

### Nâng cấp một DB cũ

Sao lưu trước. Migration `20261113190000_dom_routing` chỉ thêm cột tọa độ/profile, hash khôi phục, index và sequence; không đổi số lượng/giá/tiền/trạng thái chứng từ cũ. Cần migrate trước khi khởi động mã mới. Không vừa chạy app cũ vừa build ghi đè `.next`.

```sh
npm run local:backup
npm run local:stop
npm run db:generate
npm run db:migrate
npm run build
npm run local:start
```

Không tự rollback bằng drop cột/sequence hoặc reset DB. Nếu triển khai thất bại, giữ backup và dùng bản source/build cũ tương thích; xác định nguyên nhân trước khi tiếp tục. Việc chuyển bản chạy chính cần được chủ dự án đồng ý.

## Kiểm thử và backup

```sh
npx tsx scripts/check-foundation.ts  # chỉ tạo/migrate oms_test, không đụng schema oms
npm run build
npm run verify
python scripts/check-backup-restore.py  # oms_test → DB restore MỚI, không overwrite
```

Không chạy nhiều bộ integration/E2E cùng lúc vì dùng chung oms_test và cổng3002. Foundation test có ca tác động role ở DB test, không dùng tài khoản test làm tài khoản thật. HTTP live chỉ kiểm khi thêm `--check-live`; không còn yêu cầu file trong Downloads máy tác giả.

Gói source không chứa `.env`, `.git`, node_modules, .next, generated Prisma, dump, runtime/log, artifacts/trace hay video demo lịch sử; script quay demo/record của tác giả cũng bị loại vì không cần để chạy và có thể chứa cấu hình cá nhân. Sản phẩm không cần các video đó để chạy; link video lịch sử trong README cũ không phải tài nguyên bắt buộc của gói mới. Các generator login nhập từ storage snapshot là công cụ tác giả tùy chọn, không phải bước build.

```sh
python scripts/package-source.py
python scripts/package-source.py --verify artifacts/release/oms-source.zip
```

Gói lấy từ **working tree**, gồm source/migration/ShopVui chưa tracked. MANIFEST.json ghi SHA-256 từng file. Scanner đối chiếu giá trị secret đang cấu hình ở máy đóng gói và chặn nếu thấy chúng trong payload; không thay thế review ảnh/binary hoặc công cụ secret scanning đầy đủ. Không gửi backup/dump của tác giả kèm theo.
