# Sửa thu tiền tự động và E2E — 02/11/2026

## Phạm vi được duyệt

Người dùng chọn sửa ba lỗi API thu tiền và test E2E lệch giao diện, không sửa chính sách phí Shopee, không tạo commit Git. Trong quá trình kiểm tra, người dùng duyệt bổ sung sửa tiêu đề hồ sơ trả dài bị tràn màn hình nhỏ. Không thêm nghiệp vụ hoặc màn hình mới.

## Thay đổi

- `src/domain/orders/lifecycle.ts`: thu COD không truyền amount lấy min(khoản còn phải thu của đơn, COD còn được thu của kiện đã chọn). Trừ cả khoản thu chờ/chưa rõ, tiếp tục chặn amount nhập tường minh vượt hạn mức. Giữ điều kiện kiện đã giao và khóa giao dịch hiện có.
- Thu tự động bằng 0 (trả trước, COD, phí thiếu) bị chặn bằng DomainError409 trước khi ghi DB, không còn đụng CHECK rồi trả503. Thu phí tự động cũng bị giới hạn bởi nghĩa vụ chung của đơn.
- `src/domain/payments/references.ts`: mã thu thường/thu phí được sinh ổn định từ SHA256 toàn bộ khóa thao tác, thay vì lấy24ký tự đầu. Mã do người dùng truyền vẫn giữ nguyên. Không đổi mã chứng từ lịch sử, không migration; replay cùng key/body vẫn trả kết quả command cũ.
- `scripts/check-audit-fixes-ui.ts`: chọn form bằng nút nghiệp vụ, không tìm input amount/reference đã bỏ. Ca mất response SAUcommit kiểm trạng thái uncertain, disabled property của fieldset, đúng hai request với cùng body/key, và chỉ một chứng từ. Không khôi phục các ô cũ để làm test đạt.
- `src/features/orders/order-detail.css`: tiêu đề trong page-heading của hồ sơ cho phép overflow-wrap:anywhere và phần tử flex co lại. Không ẩn/cắt mã, không giảm cỡ chữ hoặc bỏ phép kiểm tràn.

## Hồi quy

- `scripts/check-auto-collection.ts`, được thêm vào integration suite: COD hai kiện, thu thành công/chờ, explicit over-cap, replay, kiện sai, đơn trả trước đã đủ/chờ đủ, hai key cùng tiền tố, thu phí còn lại/zero và cạnh tranh hai khoản thu toàn bộ.
- Chạy `node node_modules/tsx/dist/cli.mjs scripts/check-auto-collection.ts --http` để kiểm actual Next POST route trên server riêng3002/oms_test: bỏ amount COD200, replay200, đã đủ409 không503, hai key cùng tiền tố đều200.
- `tests/unit/collection-reference.test.ts`: ổn định qua retry, phân biệt phần đuôi key và namespace thu/thu phí, độ dài mã.

## Kết quả thực tế

- Trước sửa, hồi quy mới tái hiện lỗi trên oms_test; lưu `artifacts/qa/auto-collection/before-fix.json`.
- Build production đạt; `npm run verify` lượt cuối đạt typecheck/lint, **16unit,8integration,3E2E**. Log `artifacts/qa/auto-collection/verify.log`.
- Hồi quy services+HTTP lượt cuối **6/6 nhóm đạt**: `http-final.log`, `http.json` cùng thư mục artifacts.
- Ca E2E bốn luồng vẫn kiểm một/hai kho, mất response sau commit, trả một phần/tra soát/hoàn, chuyển hoàn thiếu/hỏng, tồn/tiền và axe/overflow1366/390/360.
- Có các lượt lỗi được giữ nguyên: E2E đầu dùng matcher toBeDisabled trên fieldset (DOM đã disabled nhưng matcher không áp dụng như input); sửa sang kiểm native property và uncertain. Lượt fullverify tiếp theo phát hiện lỗi tiêu đề thật: hai hồ sơ tại360px có scrollWidth376/364. Sau sửa CSS, cả bốn hồ sơ kiểm lại đều scrollWidth360, không phần tử tràn; đã mở xem ảnh. `overflow-before-fix.json`, `overflow.json` và ảnh lưu trong artifacts. Không sửa kỳ vọng để bỏ qua lỗi.

## Triển khai và dữ liệu

Đã build và khởi động lại đúng OMS production bằng scripts sở hữu process. Health app+DBok tại http://127.0.0.1:3001. Không chạy build khi server đang dùng.next. Không restart app khác.

Toàn bộ ghi fixtures/kiểm thử chỉ trên oms_test. Fingerprint chỉ đọc của14bảng DBchính trước/sau toàn bộ sửa và kiểm thử: số dòng+SHA256 toàn nội dung khớp, `live-before.json`/`live-after.json`. Không seed/reset/migrate, không lập đơn/thu/hoàn/nhập hàng trên DBchính. Đây là fingerprint, không phải backup dữ liệu.

## Chưa làm

Chưa sửa phí Shopee, nhập/chống trùng mã đơn sàn, gom kho/chuyển kho hoặc tích hợp vận đơn/thanh toán sàn. Giữ nguyên giới hạn local/mô phỏng. Test đạt chỉ chứng minh các ca đã chạy, không bảo đảm mọi tổ hợp nghiệp vụ hoặc tải thương mại. Driver pg vẫn có deprecation warning đã có trước, không phải lỗi mới đã giải quyết trong gói này.
