# Sửa lỗi audit và làm rõ hai luồng nghiệp vụ — 29/10/2026

Người dùng cho phép sửa sau audit `docs/audit-20261028.md`, sau đó yêu cầu tiếp tục. **Đã triển khai sáu lỗi A01–A06 và phần hướng dẫn hai luồng chính.** Không tuyên bố mọi đề xuất UI trong audit đã hoàn thành hoặc ứng dụng không còn lỗi.

## Phần đã sửa

### Tiền — A01/A02

- `domain/payments/service.ts`: giao dịch gốc chỉ dành cho HOAN_BU_THU_SAI/THU_BU_HOAN_SAI; kiểm parent thành công, đúng chiều và cùng đơn. Chứng từ bù kế thừa nguồn của root, không cho gắn returnId/shipmentId khác nguồn. Khoản thường không được gắn parent hoặc tham chiếu sai mục đích. Không chỉ ẩn fieldUI để coi là đã sửa.
- `domain/payments/balances.ts`: COD hoàn dùng chung nguồn tiền của tất cả RMA cùng đơn. Max-flow nhỏ phân tiền đã thu hợp lệ theo kiện→hồ sơ, trước hết đáp ứng các khoản hoàn thành công/chờ/chưa rõ đã chiếm hạn mức; sau đó tính phần tăng thêm cho hồ sơ đang xét. Không dùng tiền kiện B để hoàn hàng chỉ thuộc kiện A. Hỗ trợ hồ sơ có nhiều kiện nguồn, tránh cách phân tiền tham lam chặn nhầm hồ sơ chỉ có một nguồn.
- Khoản bù thu COD đang chờ/chưa rõ (tiền đi ra) cũng chiếm nguồn trước khi cho hoàn; khoản đảo hoàn chưa thành công không giải phóng hạn mức. Chặn thay đổi chứng từ làm các khoản hoàn hiện hữu mất nguồn backing. Kiểm ngay trong transaction khóa đơn; lỗi rollback, không đổi chứng từ thành công.
- `returnRefundCapacity` bắt buộc truyền toàn bộ hồ sơ để không vô tình bỏ chia sẻ hạn mức.
- `returns/service.ts`: đóng COD RMA dựa phần nghĩa vụ còn lại của cùng pool, không tái dùng số đã hoàn cho hồ sơ khác. `reconcileReturns` đồng bộ mở lại hồ sơ đã đóng nếu chứng từ bù/thu/tra soát tạo nghĩa vụ hoàn mới hoặc khoản chưa rõ. Lifecycle thu thông thường cũng gọi đồng bộ này.
- Không thêm bảng/cột/migration, không sửa chứng từ lịch sử hoặc tự bù tiền thật.

### Retry — A04

`features/shared/use-command-mutation.ts` dùng chung cho OrderAction, CommandForm, CreateReturn. Synchronous guard chặn submit đồng thời. Kết quả mất response/503/không parse được giữ nguyên body+key, khóa trường, đổi nút thành **Kiểm tra kết quả**. Không tạo key mới do sửa input sau kết quả chưa rõ. Lỗi4xx đã biết mới mở lại cho sửa; success replay trả đúng chứng từ cũ. Drawer không đóng khi đang gửi/chưa rõ; cảnh báo unload và chặn link rời trang khi còn thao tác chưa rõ.

Giới hạn: attempt giữ trong bộ nhớ component, không hứa khôi phục lệnh sau crash/trình duyệt bị cưỡng bức đóng. Không lưu PII/payload hay credential thêm vào localStorage để giả lập bảo đảm này. Trước khi chủ động reload/đóng khi chưa rõ phải kiểm tra kết quả/chứng từ.

### Dữ liệu biểu mẫu — A03/A05/A06

- Field `emptyAsNull` cho city: chọn Không áp dụng gửi null. API cũ omit+sameaddress vẫn giữ city; đổi địa chỉ khôngcity vẫn xóa như trước. Snapshot đơn không đổi theo hồ sơ khách.
- Nút thêm/xóa dòng/đổi chế độ khách trong checkout đều đánh dấu dirty, không chỉ inputonChange. Regression mở nháp2dòng→xóadòng2→sidebar phải cảnh báo và ở lại khi từ chối. Đây không phải tuyên bố chặn mọi kiểu browserhistory API.
- Form RMA tính còn được trả từ lượng giao trừ tất cả lượng yêu cầu/duyệt của hồ sơ không bị từ chối. Dòng còn0 bị loại; hiển thị gốc/đãcóyêucầu/cònlại. Server vẫn khóa/recheck chống tranh lượng.

## Luồng sử dụng đã chỉnh

### Bài 1: từ đặt hàng đến hàng và tiền

1. Chọn khách/địa chỉ và hàng, xem phương án trong form. Hiện thêm lý do chọn một/hai kho. Chính sách vẫn ưu tiên một kho, không mở rộng thành tối ưu tuyến xe.
2. Tạo đơn và xác nhận vẫn nguyên tử: chốt phí, tạo kiện và dành hàng. Không bắt tạo nháp trước; nháp vẫn phụ.
3. Chi tiết giải thích một đơn/hai kiện, không phải tách thành hai đơn. Mỗi kiện có cước đã chốt, ETA và số COD được phân bổ/đã thu/còn có thể thu. Tổng tiền có dòng phí giao đã chốt, hủy toàn đơn ghi rõ miễn phí.
4. Nút **Xác nhận đã đóng gói**: nhân viên xác nhận việc thực tế đã xong; chưa xuất kho. Bàn giao mới giảm tồn và lượng dành. Nhãn kho làm rõ Bán được (gồm đã dành)/Đã dành cho đơn/Còn có thể bán, không đổi công thức ATP.
5. ThuCOD có ngay tại tabThu/hoàn, theo kiện; số gợi ý/max và nút thường theo hạn mức riêng từng kiện và tổng đơn. Không bắt người dùng tự đoán phải thu kiện nào khi CTA đưa vào tabtiền.
6. Thất bại→giao lại hoặcchuyểnhoàn. Với chuyểnhoàn, nexttask dẫn sang nhận/trả, không lặp CTAxửlýgiao rồi không biết làm gì.

### Bài 2: hàng trả và hoàn tiền

1. Chọn đúng hàng còn được trả; mỗi hồ sơ cùng kho nguồn/loại trả. Tạo yêu cầu chưa cộng tồn/hoàn tiền.
2. TrangRMA có tiến độ Duyệt→Nhận→Kiểm định→Hoàn tiền→Đóng và mô tả bước hiện tại.
3. Nhận thực tế vàoQC; chốt đạt→bánđược/lỗi→cáchly. Hiện rõ lượng duyệt/thựcnhận/đạt/lỗi/duyệthoàn và kếtluậnthiếu/sai.
4. Hiện tiền theo lượng duyệt, đã hoàn hợp lệ, còn được lập tối đa và số miễn thuCODchuyểnhoàn. Tiền chưa rõ được tra soát **ngay trong hồ sơ**, không bắt quay vòng về đơn rồi quay lại.
5. Chỉ hiện thao tác đóng khi hết dòngchưachốt/tiềnchưarõ/nghĩavụhiệntại. Server vẫn quyết định cuối cùng nếu dữ liệu đổi sau khi mở trang.
6. Formtiền nângcao tách theo mụcđích: hoàn hủy, thu cầntrasoát, bù thu sai/bù hoàn sai. Không còn combođộc lập Loại×Nguyênnhân×Parent×RMA cho người dùng tự ghép. HoànRMA đi từ hồ sơ đúngnguồn.
7. Lịch sử đơn có nhãn actionmới, người làm và link các auditRMAliênquan; hiện rõ tối đa100sựkiện gần nhất (chưa làm phântrangtoànlịch sử).

## Kiểm thử

`storage/runtime/audit-fixes-verify.log`: **14unit,7integration,3E2E đạt**, typecheck/lint đạt khôngwarning ở lượt cuối. Build tại `audit-fixes-build.log`.

- Unit poolCOD có oracle phân bổ số nguyên độc lập120cấuhìnhnhỏ; phủ đa nguồn, nhiều hồsơ, pending/outgoingbù, successfulreversal và dữliệukhôngđủbacking.
- `check-audit-fixes-services.ts`: A01 sai thamchiếu bị từchối, hoànđúngcap; A02 haiRMA không chi lại cùng nguồn, racehai khoảnchưa rõ chỉ1thắng; resolvefailedgiảiphóng; pendingđảothuCODgiữnguồn; không cho bùthu làm khoản hoàn đã ghi mấtbacking; bùhoànmởlạiRMA; nullcity.
- `check-audit-fixes-ui.ts` là E2E thứ3: actualserver3002/oms_test, testcase dưới đây vàcityclear; tạo khách/RMA/thu mấtresponse **SAUcommit** phải freeze/replay cùngkey/khôngduplicate; Escape khôngđóngdrawerchưarõ; dirtybuttononly; pickerremaining; axe/overflow1366/390/360. Ảnh desktop/mobile đã mở xem.
- HaiE2Ecũ vẫn đạt: checkout stalequote/price/address/lostresponse, lifecyclelegacycompat/draftedit/thu/pack/handover/delivery/restart/RMA/QC/refund/close/DBfailure, pagination/search/filters. Integrationcũ lastmanager/roles/receiptreplay/splitraces/returns/QC/compensation cùng đạt.

### Bốn ca xuyên suốt đã chạy (DB test, không phải đơn thật)

| Ca | Kết quả đối chiếu |
|---|---|
| Một khoCOD | Tạo→đónggói→bàngiao→giao→thu đúngCODkiện→hoàntấthàng&tiền. |
| Hai kho trảtrước | Quote2kiện→tạo/giữ→thu tổng237000đ→hai kiệnpack/bàngiao/giao riêng→hoàntất. Thu mấtresponse chỉ1chứngtừ. |
| Trả một phần đơn2kiện | Duyệt/nhận/QCđạt1món→hoànđúnggiámón; khoảnCHUA_ROchặnđóng→trasoáttạiRMA→đóng; hàngđạtvềtồn. Pickerkhôngchotrảlạidòngđãhếtquyền. |
| CODchuyểnhoàn thiếu/hỏng | Xuất2bình→giaothấtbại→chuyểnhoàn→nhận1/thiếu1cókếtluận→QC1lỗicáchly; khônghoàn tiền hàng chưa thu, miễnthu200000đ, thu riêng32000đphí cònthiếu→hoàntất. |

Dữ liệu/mãđơn/stockassertions ở `artifacts/qa/audit-fixes/four-flows.json`; có hai ca trả là hai nhánh của bài2, không phải bốn bài toán độc lập. Test quét UI lược bỏ bodykey/refsecret khỏi report.

Lượt test đầu bị DBunreachable do Docker đangtắt; đã bật Docker Desktop và chỉ serviceomsdb, không reset/seed. Hai lượt viết E2Emới lỗi đồngbộ locator (đếm nút trước refresh và locatorphụthuộctênnútđổikhiuncertain), đã sửa waiter/locator rồi chạy fullverify lại. Không coi các lượt lỗi đó đãđạt.

## Triển khai và bảo toàn

Bản mới production đã build/start bằng script sởhữu, lầnstartcuốiPID26072 (pidfile là nguồn hiện hành), port3001. Sau khi người dùng yêu cầu tiếp tục lượt smoke cuối, DB lại unavailable; khởiđộng Docker/omsdb và xác nhậnapp+DBhealth200, không cần đổi schema. Không tự đổi startup hệ điều hành hoặc khẳng định nguyên nhân Docker tự dừng.

Live readonly sau deploy:42role/viewport/routesurfaces đạt (`audit-fixes-surfaces.log`);60orderdetailtab/drawers đạt (`audit-fixes-detail.log`);checkout2roles×4widths,foundationorigin/roles/guest vàreports10scopes/CSVroles đạt. Các lệnh không mutate live.

`check-fix-preservation.ts` chụp trước/sau14bảng live gồm cả hai cộtcity/policy; **count+SHA256tấtcảnộidunggiữnguyên** (`artifacts/qa/audit-fixes/live-before.json`, `live-after.json`). Không tạo đơn demo chính, không nhập bù/reset tồn, không seed/migration, không quayvideo, không chạy lệnh seed/restart/quản lý các app khác.

## Cập nhật sau demo live: thu tiền tự điền

Sau demo live, các thao tác thu tiền thường đã bỏ ô nhập **mã chứng từ** và **số tiền**. Người dùng chỉ bấm **Ghi nhận thu tiền**; server tự lấy số còn phải thu theo đơn/kiện và tự sinh mã nội bộ để audit/idempotency. Thu COD vẫn tách theo từng kiện; thu phí giao thiếu lấy đúng phí còn thiếu. Các form chứng từ nâng cao/bù sai vẫn giữ trường chứng từ vì đó là thao tác tra soát đặc biệt.

Typecheck/lint và `scripts/check-order-ui.ts` đạt sau thay đổi. Lượt `check-fix-preservation.ts --after` cũ **không còn hợp lệ** vì người dùng đã cho phép demo live và DB chính hiện đã có thêm1đơn/1RMA/2giao dịch/biến động tồn; không coi đó là lỗi deploy. Backup trước demo vẫn ở `storage/backups/oms_20261029_203918.dump`.

## Phần chưa làm/giới hạn còn lại

- Không thay luật ưu tiên1kho/max2kho, biểuphí3thànhphố vàETA6/22giờ. Không phải giải bài toán tốiưu vậnchuyển thựctế hoặcSLAP/PRP của tàiliệuthamkhảokệkho.
- Không tự tạo lại hàng trong DBchính để xuất hiện tìnhhuống2kho. User muốn thử lại2kho bằng dữliệuthật cần chọn tồnđủ hoặc có phiếunhậpđượcduyệt; bốnca ởDBtestđãkiểmchứng.
- Kiểm kêQC/cáchly và thiết kế lại kho top-level task, dashboardallqueues, lịch sử phântrang, crashpersistent retry là côngviệc riêng chưa làm. Không ngầm coi nguyênauditđãgiảiquyếthết.
- Dữ liệu lịch sử vẫn giữ nguyên. Guard mới không có nghĩa được tự sửa/chỉnh tiền trên các bản ghi từng sai ở hệ thống khác.
- Chờ người dùng thử lại giao diện mới; kếtquả kỹthuật không thay cho nghiệmthu tínhdễdùng.
