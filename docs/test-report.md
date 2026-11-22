# Kiểm thử bản local — lịch sử và chốt26/10/2026

> **Chốt P7/P8 ngày26/10:** người dùng đã chọn “Duyệt giao diện hiện tại, tiếp tục bàn giao”. Freshverify9unit/5integration/1E2E18.2sPASS;42surfaces/axe,2roles×6dashboardwidths,login7widths+3Dfallback/authPASS. Production trace20tương tác p95nextpaintproxy17.5ms,0longtask boundedwindow; không đồng nhất với INP. Offline/retry/deep-link/backforward/reflow200%-equivalentPASS(nativezoomchrome chưa tự động riêng). App+DBrestartkhôngseed,14bảngSHA256+counts nguyênvẹn; backup+restorecảoms_test/oms sang DB mới đủ14bảng/nội dung/constraints. Không ảnh hưởng5containerkhác. **Báo cáo trạng thái cuối: docs/final-acceptance.md.** Các đoạn pending nghiệm thu bên dưới là lịch sử trước xác nhận, không phủ định lần duyệt này.

> **Login từ Untitled-1.html và header theo ảnh feedback26/10:** Model gốc nhập local, form nối auth thật. Vòng đầu axe báo label-content-name-mismatch4controls, đã sửa label và rerunPASS. Header quảng bá/nút phân khu/phóng to bị xóa khỏi DOM, brand sửa Boxes+OMS./Quản lý đơn hàng. Build/typecheck/lintPASS,7viewportaxe/auth2rolePASS,3Dprofile32render/1100ms576drawcalls (headless máy này), drag/keyboard/reset/pause/offscreen/reduced/lostcontext/noWebGL+realstafflogin/mobilekhôngchunkPASS;9unit5integration1longE2E23.2srerunPASS. Không nghiệm thu thị giác, không video, không reset DB chính. Source/evidence tại docs/progress.md và artifacts/qa/login-redesign/.

> **Login3D vòng trước, đã thay (chưa nghiệm thu thị giác):** Three0.186.1 geometry/lighting/shadows thật, không ảnh giả3D. Build/typecheck/lintPASS; 9unit/5integration/1longE2ErerunPASS;7viewportaxe/authnetworkretry/2rolesPASS. check-login-stage kiểm actualWebGL/drag/keyboard/reset/pause/offscreen/reduced/contextloss/no-WebGL+realstafflogin/mobilekhông3DchunkPASS. Sample headlessMsEdge32render/1100ms,320drawcalls; không suy ra GPU người dùng. Chưa kiểm GPU thiết bị khác; chưa được user duyệt. Không video. Evidence artifacts/qa/login-redesign/.

> **Kết quả sửa audit mới nhất:** F01–F04 đã sửa; regression4ca trong `artifacts/qa/functional-audit/regression.json` đều không còn tái hiện. Có thử bổ sung đúng tiền rồi bàn giao, race thu phí qua2endpoint, hoàn lại sau đảo bù và mở lại RMA khi phát sinh bù sau đóng. Verify mới nhất PASS **9unit/5integration/1longE2E**, E2E thêm sửa kho giữ DN,55khách/3trang và tra cứu/liên kết/bộ lọc.42surfaces/2role6widths/report10scopes/navigation/counters/chart/sidebarfitPASS. Các cảnh báo phía dưới mô tả thời điểm trước sửa, không xóa lịch sử lỗi.

> **Audit trước sửa:** Bộ kiểm thử dưới đây vẫn chạy PASS, nhưng rà soát bổ sung đã tái hiện4lỗi chưa được phủ: gate tiền bàn giao sau hoàn bù, hạn mức thu phí, đóng RMA sau đảo khoản hoàn, vùng kho trên form sửa. Xem `docs/functional-audit.md` và `artifacts/qa/functional-audit/findings.json`. Không dùng các PASS lịch sử để tuyên bố không còn blocker về tiền. Những kết quả dưới đây chỉ đúng trong các ca/đầu vào đã nêu, không phải nghiệm thu hoàn toàn.


## Chuẩn hóa dữ liệu mẫu để trình bày tự nhiên

Backup trước khi thay đổi: `storage/backups/oms_20261025_211437.dump`. `normalize-presentation.ts` transaction đổi thông tin hư cấu và mã24đơn, có audit trước/sau, FK cascade. Assertions PASS tồn nguyên vẹn, tiền/loại/kết quả/thời điểm không đổi, giá chụp/lượng/trạng thái không đổi, số kiện/RMA/sổ không đổi. Không viết lại chứng từ tiền/sổ tồn/nhật ký gốc: UI dùng alias cho mã lịch sử và ghi chú khởi tạo.

`check-realistic-data.ts` PASS8màn+CSV không có DEMO hiển thị; tên/địa chỉ hợp vùng, URL cũ redirect mã mới. Chạy lại db:seed, seed-business, normalization không tái tạo dữ liệu cũ/không lặp tiền-tồn. Build/verify và42surfaces/report10scopes/navigationcounterchart PASS. Thông tin vẫn là hư cấu và đối tác giữ nhãn mô phỏng, không tuyên bố dữ liệu khách hàng thật.

## Kiểm lại navigation / counter / SVG theo phản hồi tiếp theo

Người dùng thấy entrance ổn nhưng chỉ ra khoảng trắng trước trang mới và chưa có đếm số/vẽ đường. Đã bỏ fallback loading thay trang bằng vùng gần trống; giữ native client transition và trang cũ trong lúc chờ, thêm pending hint tại link. Không tự thêm delay vào app.

`check-navigation-counters-chart.ts` PASS trên production: inject latency1400ms **chỉ trong test**; lấy nhiều mẫu DOM trong thời gian chờ đều còn heading/dashboard4KPI. Counter đi qua số trung gian và chốt đúng dữ liệu API sau đổi kỳ; SVG stroke-dashoffset thay đổi thật rồi trở về đường liền (dasharray none), resize768/390/1440 vẫn có path đầy đủ. Reduced-motion chốt số cuối ngay và không để line mask đang chạy. Số cuối cho screen reader tách khỏi chữ số trang trí đang đếm. Không quay thêm video ở vòng sửa này.

Build/typecheck/lint và verify6unit/4integration/1E2E PASS; dashboard/42surfaces/5widths/axe/focus/reduced-motion kiểm lại PASS. Các capture sau đó chờ counter/draw chốt xong, tránh lấy số tiền trung gian làm ảnh đối chiếu DB. Artifact mới `artifacts/qa/navigation-counters-chart/check.json` và screenshot.

## Vòng hoàn thiện motion và bàn giao cuối

Sau phản hồi “animation không thấy”, đã bỏ entrance ở wrapper chờ dữ liệu và áp dụng vào khối nội dung thực; tăng rõ chuyển trang, nhóm dashboard, KPI, chart đổi kỳ, tab, drawer và phân bổ. Thêm lựa chọn Chuyển động ở topbar: auto theo hệ thống, full do người dùng chủ động chọn, reduced lưu qua reload.

`check-visible-motion.ts` PASS **thay đổi transform/opacity qua các frame thực** ở route, nhóm dashboard, chart đổi kỳ, drawer mở/đóng, tab và kiện thứ hai; không chỉ kiểm CSS có khai báo animation. PASS mặc định tôn trọng OS reduce, bật full khi OS reduce vẫn có chuyển động, manual reduce tồn tại sau reload. Clip thao tác thật không có màn login/mật khẩu: `/demo/oms-motion.webm` (HTTP206 video/webm đã kiểm). JSON sample tại `artifacts/qa/visible-motion/check.json`.

Chạy lại build/typecheck/lint/unit/integration/E2E và 42 surfaces PASS. Axe đo tương phản khi nội dung/dialog đã kết thúc entrance; các frame chuyển tiếp được kiểm riêng, không gọi opacity fade giữa chừng là màu chữ thiết kế cuối. Một lần axe từng báo contrast ở bảng nền khi vừa mở form lúc entrance nền chưa xong; đã tách hai thời điểm kiểm, không đổi màu chữ để né ca kiểm.

Production stop/start lần cuối không seed lại: DB demo trước/sau đều 24 đơn, 6 giao dịch tiền, 51 biến động, 102 audit; backup demo mới `storage/backups/oms_20261025_203315.dump`, restore sang DB mới `oms_restore_handover_20261025_2033` cho cùng số dòng. `artifacts/qa/handover.json` lưu kết quả. Test DB round-trip mới nhất 11.718s, đủ 14 bảng/counts/constraints.

Nghiệm thu cảm nhận hình thức vẫn cần xác nhận từ người dùng; không tự biến kiểm frame hay lệnh yêu cầu sửa thành lời khen độ mượt.

## Phạm vi và kết quả thực tế

Bản production chạy 127.0.0.1:3001; integration/E2E chỉ ghi `oms_test`. Không gọi thanh toán hoặc vận chuyển thật. Đây là kết quả các ca đã chạy, không phải bảo đảm bao phủ mọi tổ hợp hoặc production thương mại.

- Production build, TypeScript và ESLint: PASS (lint không warning trong lần cuối).
- Vitest: **6 unit tests**, trong đó oracle phân bổ vét cạn độc lập kiểm **500 đầu vào nhỏ**; **4 integration tests** gọi các kịch bản có nhiều assertions.
- Playwright: **1 E2E dài** qua UI: tạo/sửa/giữ/thu/xuất/giao, restart server, trả/duyệt/nhận/QC/hoàn/đóng, mất phản hồi sau commit + retry, DB lỗi và phục hồi bằng nút Thử lại.
- **42 tổ hợp vai trò × route × viewport** (1366×768, 390×844): không tràn ngang trang, axe không serious/critical, không pageerror. Dashboard kiểm thêm 1440/768/360 ở script responsive.
- Báo cáo/dashboard đối chiếu **10 phạm vi kỳ/kênh**, lọc kho không phân bổ tiền giả; CSV Quản lý 200, Nhân viên 403; unit kiểm vô hiệu hóa công thức/ký tự điều khiển.
- Motion: production kiểm giữ DOM sidebar/trạng thái thu gọn qua đổi trang, 20 chu kỳ drawer, keyboard/focus và reduced-motion. Lấy mẫu rAF P95 khoảng 14ms trong một lần headless; **không suy thành cam kết FPS hay xác nhận cảm nhận người dùng**.
- Backup/restore DB test mới nhất: **11.718 giây**, đủ 14 bảng, số dòng khớp, toàn bộ constraints được validate. Đã backup DB demo và restore sang `oms_restore_handover_20261025_2033`, có 24 đơn; DB đang chạy không bị thay thế.

## Bản đồ T01–T20

| Ca | Kết quả kiểm kỹ thuật / minh chứng |
|---|---|
| T01 | PASS: staff gọi catalog/accounts mutation 403, CSV 403; guest 401. Báo cáo/admin page kiểm role server, dashboard staff không có payload KPI tổng hợp. `check-foundation-http.ts`, `check-dashboard.ts`, `check-reports.ts`. |
| T02 | PASS service: chặn Quản lý cuối; hai Quản lý đồng thời hạ quyền chỉ một thành công; khóa tăng sessionVersion, chặn command. Session đọc lại active/version mỗi request. Không kiểm mô hình SSO/phân tán. |
| T03 | PASS: thiếu địa chỉ/lượng 0 bị Zod chặn, không tạo chứng từ. UI tạo/sửa nháp chạy thật. |
| T04 | PASS: oracle lựa chọn ưu tiên số kho trước chi phí, 500 case nhỏ; không tuyên bố tối ưu mọi cấu hình lớn. |
| T05 | PASS: hai SKU buộc tách hai kho, tổng dòng/tiền COD đúng; preview render 56000đ từ nguồn. |
| T06 | PASS: thiếu tồn, tuyến không hỗ trợ, hạn dưới ETA cho null; ca tranh tồn để đơn còn lại chờ hàng, không giữ dở dang. |
| T07 | PASS: hai đơn tranh bộ tồn cuối chỉ một đơn xác nhận; đơn kia chờ hàng, tồn không âm. |
| T08 | PASS: xác nhận/nhập/thu/bàn giao cùng key đồng thời không ghi đôi; bàn giao key mới khi đã xuất bị chặn; E2E làm mất response sau commit rồi retry, chỉ một giao dịch. |
| T09 | PASS: trả trước thiếu tiền không bàn giao; đủ mới xuất, giảm bán được và giữ đúng một lần. |
| T10 | PASS: hủy toàn trước xuất giải phóng giữ; hủy kiện mang phí sau khi kiện kia xuất giữ nguyên COD đã xuất và thu phí thiếu riêng; race hủy/bàn giao chỉ một thắng. |
| T11 | PASS: fail/retry/chuyển hoàn không tăng tồn; ca chuyển hoàn COD nhận/QC đưa đúng nhóm QC/cách ly và miễn thu hàng có kết luận. |
| T12 | PASS: hai yêu cầu trả cạnh tranh vượt nguồn chỉ một được tạo; hỗ trợ hồ sơ nhiều dòng, không đóng khi dòng khác chưa xong. |
| T13 | PASS: nhận/QC một lần, retry không nhập đôi; hàng đạt về bán được, lỗi về cách ly; thiếu/sai phải có kết luận, không ghi SKU sai vào dòng gốc. |
| T14 | PASS: hoàn cùng nguyên nhân đồng thời chỉ một giữ hạn mức; CHUA_RO giữ hạn mức; vượt thu/bù vượt gốc bị chặn; COD chưa thu không hoàn tiền hàng. |
| T15 | PASS: cập nhật hồ sơ khách và giá không đổi snapshot; giá trên đơn đã xác nhận vẫn giữ. Không thử mọi cấu hình catalog thương mại. |
| T16 | PASS: kiểm kê version cũ yêu cầu đếm lại; đếm thấp hơn giữ bị chặn, không tự xóa giữ. |
| T17 | PASS: dòng chưa QC hoặc tiền chưa rõ không đóng hồ sơ; tra soát thành công rồi mới đóng. Projector hàng/hồ sơ/tiền mở lại khi thêm RMA hoặc pending money. |
| T18 | PASS: AV namespace trong DB test thu370000, hoàn90000, ròng280000, hộp8; report sử dụng cùng query định nghĩa với dashboard. Không dùng tồn demo hiện tại để giả số dư AV ban đầu. |
| T19 | PASS kỹ thuật: CSV đúng bộ lọc/quyền, unit chống formula injection; keyboard/focus, reduced-motion, màn nhỏ đạt phạm vi đã nêu. Cảm nhận độ mượt cuối cùng không được suy từ axe/rAF. |
| T20 | PASS: pg_dump/pg_restore sang DB mới, 14 bảng/counts/FK constraints khớp, thời gian ghi trong artifact. Không overwrite DB live. |

Các dòng PASS là kết quả của ca tương ứng và assertions nêu trên; không đồng nghĩa có 20 test runner độc lập hoặc toàn bộ ma trận trạng thái đã được chứng minh.

## Lỗi từng phát hiện và đã sửa

1. Raw SQL SERIALIZABLE trả PostgreSQL 40001 dưới Prisma P2010, ban đầu không retry; đã mở retry có giới hạn cho 40001/40P01 và chạy lại race đạt.
2. Shell bị tạo lại ở từng page: chuyển vào layout workspace dùng chung, test DOM instance/state còn nguyên.
3. Test responsive đòi dialog biến mất tức thì: đã đợi exit animation, không bỏ animation để làm test xanh.
4. Retry sau DB lỗi chỉ reset boundary, chưa refresh server: test E2E từng FAIL, đã sửa router.refresh + reset và chạy lại PASS.
5. Test E2E từng đọc DB trước khi response delivery xong: sửa chờ response commit, không thay nghiệp vụ để né lỗi.

Lịch sử fail không bị xóa để tuyên bố chưa từng lỗi.

## Giới hạn / nghiệm thu hình thức

- Người dùng chấp nhận bố cục đầu tiên ở mức cho tiếp tục và yêu cầu làm đến khi hoàn thành. Phản hồi animation chưa mượt được giữ nguyên, không biến thành lời xác nhận motion đã đạt.
- Đây là nghiệm thu kỹ thuật local. Duyệt thị giác cuối cùng trên bản chạy thực vẫn là đánh giá của người dùng, không tự suy từ test.
- Driver pg 8 hiện có DeprecationWarning về query đang chạy trong một số race/transaction; kết quả kiểm dữ liệu đạt, chưa có bảo đảm tương thích pg9. Đã pin pg8.23.1.
- Không load test lớn, không limiter phân tán, không tích hợp đối tác thật, không kiểm chứng FPS trên mọi GPU/máy.

## Bằng chứng

`artifacts/qa/{foundation.json,foundation-services.json,order-lifecycle.json,returns-payments.json}`; `artifacts/qa/final/`; `artifacts/qa/motion/`; `artifacts/qa/backup/result.json`; `artifacts/playwright-report/`. Clip `artifacts/qa/dashboard-motion-desktop.webm` và `artifacts/qa/motion/persistent-layout-production.webm`.
