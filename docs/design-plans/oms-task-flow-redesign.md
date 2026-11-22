# Thiết kế lại OMS theo công việc — tạo đơn là luồng mẫu

Written against: working tree chưa có commit nền; source và rendered review ngày26/10/2026. Đây là thiết kế đề xuất theo yêu cầu người dùng, không phải mô tả đã triển khai/nghiệm thu.

## Evidence chain

- Scope: D:/project/oms, app local3001,2roles/14business tables. Người dùng xác nhận muốn thiết kế lại toàn bộ luồng, bắt đầu tạo đơn làm mẫu.
- Current owners: src/features/orders/draft-form.tsx; allocation-preview.tsx; order-tabs.tsx; order-actions.tsx; order-payments.tsx; src/app/(workspace)/orders/**, inventory/page.tsx, shipments/page.tsx, returns/**; foundation/command-form.tsx; shared/list-controls.tsx; layout/app-shell.tsx.
- Rendered evidence: artifacts/qa/reference-current-oms-create.png, reference-old-oms-create.png, reference-old-{orders,inventory,shipping,returns}.png; order-detail/*.png. Bản khác D:/hệ thống thông tin quản lí/oms-app chỉ tham khảo bố cục, không lấy nghiệp vụ React-state/mocked API/KPI của nó.
- Findings: tạo đơn tự chọn khách/SKU; địa chỉ Đà Nẵng nhưng vùng mặc định Hà Nội; không bảng tổng tiền; thêm khách phải rời việc; lưu nháp→chi tiết→mở phân bổ→tìm kho lại. Kho mở details lặp2nút/dòng; user đã bác. Giao nhận bung form trong bảng đã bị bác và bỏ ở vòng sau. Người dùng thấy nhiều vòng sửa cục bộ vẫn khó thao tác.
- Governing design: sáng/xanh, font/token hiện có, không thay login/dashboard được chốt; bảng tìm dữ liệu, trang xem hồ sơ, drawer thực hiện việc. Không áp dụng quy tắc3click tuyệt đối cho quy trình nhiều nghiệp vụ hoặc bỏ xác nhận an toàn.
- Uncertainty: giao diện mới cần người dùng thử luồng mẫu trước nhân rộng; không lấy test kỹ thuật làm duyệt thị giác.

## Design decision

Giữ sáu điểm vào nghiệp vụ quen thuộc: Tổng quan, Đơn hàng, Kho hàng, Giao nhận, Trả hàng, Khách hàng; Báo cáo/Quản trị vẫn manager-only. Không thêm sidebar theo từng trạng thái. Mỗi màn có mục đích rõ và một hành động ưu tiên theo ngữ cảnh; server vẫn quyết định hợp lệ. Không gộp các transaction khác nghĩa chỉ để giảm click.

Hành trình chung: tìm hồ sơ → hiểu tình trạng → thực hiện bước tiếp theo → nhận kết quả. Danh sách không bung form/chi tiết dài trong ô. Chi tiết đơn là hồ sơ chung, không là nơi bắt buộc quay về để làm mọi thao tác.

## Luồng mẫu: tạo đơn

Một trang làm việc, không wizard ép nhiều màn. Desktop trái các nhóm nhập, phải bản tóm tắt tiền + nút hành động; mobile xếp dọc với nút tiếp tục dễ tìm, không che lỗi/focus.

1. Người nhận: chọn rõ Khách đã có / Khách mới. Khách cũ tìm theo tên/số điện thoại, không tự chọn dòng đầu. Khách mới nhập và lưu tại chỗ, dùng service khách hiện có, chống ghi trùng khi retry; không tự gom createCustomer/createOrder thành atomic transaction nếu chưa có API đáp ứng. Khách tạo thành công nhưng đơn chưa lưu phải được thông báo trung thực. Có thể đổi người nhận trên đơn mà không ghi đè hồ sơ khách. Vùng giao bắt buộc chọn/xác nhận; không đoán địa chỉ tự do bằng substring và không mặc định Hà Nội khi chưa biết.
2. Sản phẩm: chọn rõ từng mặt hàng, không tự thêm SKU đầu; tìm theo mã/tên, lượng1–5, tối đa5SKU khác nhau. Hiện đơn giá/thành tiền và tổng; server xác minh lại giá. Không gọi tồn tổng là tồn đủ để giao, việc đủ kho chỉ xác định bởi allocation query.
3. Giao hàng/thanh toán: Trả trước hoặc Thu khi nhận; kênh bán mặc định Nhập tay có giải thích. Ghi rõ Phí giao thu của khách khác Chi phí xuất/giao dự kiến. Không tự tuyên bố đã thu tiền khi chọn Trả trước.
4. Nút phụ Lưu nháp; nút chính Tiếp tục chọn kho. Nút chính lưu nháp bằng API hiện có rồi mở phần phương án với auto-load đúng1request; nếu tải thất bại, báo đơn đã lưu và có nút tải lại. Không tạo thêm đơn khi retry lỗi bước sau. Không yêu cầu bấm Tìm kho lần2.
5. Xem phương án ngay trong cùng hành trình: từng kho, sản phẩm/lượng, phí/ETA và tổng; giải thích rõ chưa giữ hàng. Có đường Sửa đơn. Nếu sửa làm đổi version, hủy preview cũ và tải lại. Khi đủ hàng, Xác nhận giữ hàng là hành động riêng kiểm version/ATP server. Thiếu hàng: báo rõ chưa giữ gì, cho Lưu chờ hàng hoặc sửa; không ép người dùng nhập kho chỉ để demo.
6. Thành công dẫn về chi tiết đơn, xác nhận số kiện/đã giữ và bước tiếp. Không tự thu/đóng gói/bàn giao.

Mục tiêu từ lúc nhập đủ và hợp lệ: Tiếp tục chọn kho → xem phương án → Xác nhận giữ hàng; không tính việc nhập, xác thực lỗi hoặc nghiệp vụ tiếp theo vào cam kết3click.

## Các luồng còn lại

### Đơn hàng

Danh sách có nhóm trạng thái nhanh và bộ lọc sâu hơn; chỉ tiêu đếm đúng phạm vi, không dùng count trang hiện tại. Mã đơn mở chi tiết, giữ đường quay lại bộ lọc. Chi tiết hiện đồng thời người nhận, sản phẩm, kiện, tiền; không tái thiết kế vô cớ phần đã được triển khai. Next-step phản ánh thiếu tiền, giao dịch chưa rõ, kiện ngoại lệ và RMA; không gọi đơn hoàn tất chỉ vì một kiện đã giao. Nút sửa/hủy chỉ hiện khi được phép; hủy có lý do/xác nhận.

### Kho hàng

Hai không gian Tồn hiện tại / Sổ biến động; bộ lọc ngày chỉ ở sổ. Tồn ưu tiên sản phẩm/kho, khả dụng, đang giữ; QC/cách ly/an toàn phải còn tra được, không đổi công thức ATP. Hai hành động đầu trang Nhập hàng / Kiểm kê mở drawer chọn kho+SKU, sau đó nhập lượng/lý do. Có thể mở từ một dòng với kho/SKU điền sẵn bằng cùng drawer, không thêm hai bộ form khác nhau. Kiểm kê lấy version lúc tải ngữ cảnh; stale không tự ghi đè, phải đếm/đọc lại. Bảng không giãn dòng khi thao tác.

### Giao nhận

Lọc nhanh Chờ đóng gói / Chờ bàn giao / Đang giao / Giao thất bại. Mở kiện trong drawer chuyên biệt từ dòng, không bung form trong bảng; đường Xem đơn gốc luôn có. Drawer chứa kho/người nhận/hàng/vận đơn/trạng thái và hành động phù hợp. Đóng gói/bàn giao/giao thành công dùng commands hiện có. Ngoại lệ fail/retry/chuyển hoàn có lý do. Thiếu tiền trả trước giải thích và mở thu tiền đúng đơn; không lách gate. COD là chứng từ thu riêng, giao thành công không tự thu. Drawer riêng là giai đoạn sau, không nhầm link đi chi tiết đơn hiện tại là đã triển khai nó.

### Trả hàng

Tạo từ đơn/kiện đủ điều kiện, điền sẵn ngữ cảnh. Hồ sơ có tiến trình Yêu cầu→Duyệt→Nhận→QC→Tiền→Đóng. Mỗi dòng thấy yêu cầu/duyệt/thực nhận/kết luận đạt-lỗi và số được hoàn; không một nút kết luận tất cả nếu chưa nhận/QC. Tách hàng đạt/bán được và lỗi/cách ly; nêu rõ chưa cộng tồn bán được lúc nhận. Ghi hoàn/tra soát ở ngữ cảnh hồ sơ, dùng cùng payment endpoints, không bắt tìm chứng từ bằng mã kỹ thuật. Tiền chờ/chưa rõ vẫn giữ hạn mức; server giữ gate đóng.

### Khách hàng, Báo cáo, Tổng quan

Khách là nơi quản lý hồ sơ/tra lịch sử đơn, không là bước bắt buộc trước tạo đơn. Báo cáo chỉ đọc/xuất và dẫn tới chứng từ nguồn; không làm trung tâm thao tác. Tổng quan nêu việc đang chờ và đi thẳng đúng bộ lọc/hồ sơ, không thêm menu hoặc KPI giả. Giữ role filtering server.

## Reuse và thay đổi dự kiến

- Giữ tokens.css/globals.css, RadixDialog focus/overlay, service validation, serverauth, serializable commands/idempotency keys và balances. Không thêm dependency.
- DraftForm cần cấu trúc nhóm+summary/state có chủ đích; thêm customer picker không giới hạn âm thầm và chế độ khách mới. Không copy form mặc định demo cũ.
- AllocationPreview nhận khả năng auto-load hợp đồng rõ, bỏ việc gọi trùng từ nút mở và nút tìm. Hủy request cũ khi đổi draft/version, không auto-confirm.
- Drawer kho/kiện cần owner riêng vì CommandForm hiện chỉ biểu diễn trường tĩnh, chưa thể chọn khoSKU và tải version/điều kiện cùng lúc. Dùng chung dialog shell, không biến CommandForm thành component hàng chục boolean.
- Trạng thái/thuật ngữ hiển thị tiếng Việt; mã chứng từ vẫn tra được nhưng không là nhãn hành động chính.

## Hướng thay thế đã chốt và triển khai27/10

Sau khi StageA vẫn khó dùng, người dùng chốt form1màn theo research: phố/thành nằm trong địa chỉ, kho/cước/tổng tính ngay khi nhập, phíkhách=SUMfreightkhôngpacking, Tạo đơn và xác nhận nguyên tử. Đã triển khai backendquote+checkout/HMAC/serializable,Customer.city vàOrder.shippingPolicyadditive,oldordersMANUAL giữnguyên. NhápSUM_FREIGHT_V1 dùng cùngformkhibổsung vàxácnhận. Kếtquả9unit6integration2E2E+regression tại docs/checkout-flow.md. Các bước StageA lưu nháp→drawer bên dưới chỉ là lịch sửđềxuất cũ, không áp dụng cho tạo mới nữa. Vẫn tập trungBài1/chờuserthử, không tự claimhoànthiệnwarehouse/RMA redesign.

## Trạng thái triển khai26/10 (lịch sử)

Giai đoạn A đã triển khai và kiểm kỹ thuật, chờ người dùng thử: DraftForm3nhóm+summary, khách cũ/mới tại chỗ, không arbitrarydefaults, totals, nútcontinue→autoallocation vớiconfirmriêng. Verify9unit5integration1longE2EPASS; new check-draft-task-flow.ts xác minh cả lostresponse sau commit khách/đơn và previewfailure/retry trong oms_test. Chưa triển khai đầy đủ các drawer kho/kiện và luồngRMA giai đoạnC/D; không đánh dấu toàn bộ thiết kế hoàn tất.

## Thứ tự triển khai

A. Tạo đơn hoàn chỉnh và đường quay lại chi tiết. B. Cho người dùng tự tạo một đơn mới +hai-kho/chờ-hàng, nhận phản hồi. C. Chuẩn hóa kho và giao nhận theo mẫu đã duyệt. D. Hoàn thiện trả/QC/tiền và đường nối dashboard/khách/báo cáo. Không đồng thời sửa mọi màn rồi yêu cầu user xem lại một lần.

## Validation

- Product: người lần đầu tạo được đơn cho khách mới/cũ, biết tổng tiền, biết chưa giữ hay đã giữ. Không phải rời luồng tạo khách, không tự chọn nhầm người/SKU/region.
- Tests: newCustomer failure, customercreated/orderfailure, draftsave/previewfailure, retry/doubleclick/lostresponse, price/version/ATPchange, no-stock, split2warehouses, pendingmoney. Fixtures ghi ONLYoms_test, không reset live.
- UI:1366×768/390×844/360px, mở drawer thật/focus/Escape/error/loading/retry; xác minh nút cuối và tổng không bị che. Ghi step/action counts nhưng không dùng số click thay khả năng hiểu.
- Commands: npm run typecheck; npm run lint; npm run test:unit; npm run test:integration; npm run test:e2e; npx tsx scripts/check-surfaces.ts; bổ sung test task-flow cho từng stage. Không ghi video nếu chưa được yêu cầu.
- Stop nếu giải pháp đòi backend scope mới, tự reset live, lách constraints hoặc thêm integrations ngoài idea. Xác nhận lại trước mở rộng.

## Design documentation

Sau khi luồng mẫu được user chấp nhận và test đạt, cập nhật DESIGN.md/README/docs/demo.md để phản ánh flow thật; không ghi đề xuất này như đã triển khai. Nghiệm thu17/17 trước đây thuộc bản bàn giao trước thay đổi UX, không tự coi là đã duyệt thiết kế mới.
