# Chốt nghiệm thu và bàn giao local — 26/10/2026

## Kết luận

- **P7 đạt:** kiểm kỹ thuật bên dưới PASS; người dùng đã chọn rõ **“Duyệt giao diện hiện tại, tiếp tục bàn giao”**. Step16 được đánh dấu ngay sau xác nhận. Không suy nghiệm thu từ việc test xanh.
- **P8 đạt:** production build/start, restart app và PostgreSQL riêng OMS không seed, backup/restore mới, tài liệu/demo và thông tin truy cập đã kiểm. Dữ liệu chính không đổi trong vòng kiểm cuối.
- Không phát hiện blocker về quyền/tồn/tiền trong các ca đã chạy. Không tuyên bố đã chứng minh mọi tổ hợp, toàn bộ WCAG hoặc production thương mại.

## Bản chạy bàn giao

- Thư mục: `D:/project/oms`.
- Đăng nhập: **http://127.0.0.1:3001/login**; trang làm việc `/dashboard`.
- Quản lý: `quanly`; Nhân viên: `nhanvien.an`, `nhanvien.binh`.
- Mật khẩu đã bàn giao riêng trong hội thoại, nằm tại `BOOTSTRAP_PASSWORD` của `.env` trên máy; không chép vào tài liệu/repo.
- Health lần chốt: HTTP200, `app=ok`, `database=ok`, `mode=local-coursework`.
- PID sau restart trong lần kiểm:28964; khi vận hành phải đọc `storage/runtime/production.pid`, không dùng PID lịch sử để kill.
- DB `oms`, test `oms_test`, Compose `oms-course`, PostgreSQL loopback55432. Cổng test3002 không còn listener sau E2E.

## P7 — kết quả chạy lại

| Nhóm | Kết quả và bằng chứng |
|---|---|
| TypeScript/ESLint | PASS, không warning lint. `storage/runtime/final-p7-verify.log`. |
| Unit |9tests PASS; gồm oracle phân bổ500đầu vào nhỏ và giới hạn tiền/CSV/projector. |
| Integration |5scenarios PASS; foundation/concurrency, lifecycle, split races, returns/payments và regression F01–F03. Fixtures chỉ `oms_test`. |
| E2E |1luồng dài PASS18.2s: draft/edit/confirm/hold/thu/pack/handover/delivery/reload/serverrestart/RMA/QC/refund/close; lost-response retry và DB failure recovery; sửa kho DN và55khách/phân trang/bộ lọc. Test server riêng3002. |
| Quyền/origin | Quản lý/Nhân viên/guest, mutation sai Origin/không Origin bị403, guest401, catalog/accounts trái quyền403. Dashboard Nhân viên không nhận manager aggregates. |
| Reports/CSV |10phạm vi kỳ/kênh đối chiếu; lọc kho không chia tiền giả; CSV Quản lý200/Nhân viên403; chống formula trong unit. |
| Routes/axe |42tổ hợp route×role×viewport1366×768/390×844 và dialog khách: không serious/critical, không tràn ngang, không pageerror. `artifacts/qa/final/surfaces.json`. |
| Dashboard |2roles×6widths; KPI bằng width/font/background; đơn gần đây/công việc ở viewport desktop đầu, chart nguyên hàng. `artifacts/qa/operating-dashboard/check.json`. |
| Sidebar/navigation |4cỡ laptop vừa sidebar, màn thấp vẫn cuộn; sidebar DOM/collapse giữ qua route;20chu kỳ dialog, focus/Escape/reduced PASS. Không quay video mới. |
| Số/biểu đồ | Counter đi qua giá trị trung gian tới số API; SVG draw thực, bỏ mask khi xong; resize không mất đường; request bị chậm1400ms vẫn giữ nội dung cũ. `artifacts/qa/navigation-counters-chart/check.json`. |
| Login |7widths1920/1440/1366/1280×600/768/390/360: axe/form/keyboard/showhide/401/network/429/reduced và đăng nhập thật2roles PASS. |
| 3D | Model từ file người dùng, header đã bỏ đúng yêu cầu/brand đúng. Drag/keyboard/reset/pause/offscreen/reduced/contextloss/fallback+real stafflogin/mobile không tải Three PASS. Profile riêng khoảng30render/s,576drawcalls; không phải mục tiêu60fps của dashboard. `artifacts/qa/login-redesign/motion-check.json`. |
| Deep-link/offline | Mở chi tiết trực tiếp, Back/Forward; offline thật giữ nội dung form, báo lỗi rồi retry online; PASS. |
| Reflow |683×384 tương đương viewport1366×768 ở200%: không tràn ngang, mobile drawer keyboard dùng được. Không tự động riêng browser-chrome zoom, không gọi đây là chứng nhận WCAG. |

### Profile production có trace

`artifacts/qa/final-acceptance/{acceptance.json,performance-trace.json}`. AMD Ryzen7 7840H,16logical CPUs, Windows, headless Edge156.0.4314.42.

20tương tác mở/đóng Đọc số liệu sau warm-up, luân phiên pointer/keyboard; focus trả đúng. Click→hai requestAnimationFrame là proxy next-paint: **p95=17.5ms**, không có long task trong cửa sổ đo. Đây không phải field INP, không bao gồm mọi thời điểm khởi tạo3D và không bảo đảm mọi GPU. rAF sample ở bài persistent-layout có p95khoảng7.1ms trên máy này; không biến thành cam kết FPS.

## T01–T20 — kết quả theo phạm vi thực

Đây là bản đồ ca nguồn sang assertions/service/UI, không phải20runner độc lập. Kết quả chi tiết/lịch sử tại `docs/test-report.md`.

| Ca | Kết quả | Lớp/bằng chứng chính |
|---|---|---|
| T01 |PASS| HTTP guest/origin/role; dashboard payload role; reports CSV; surfaces. |
| T02 |PASS| Foundation services: last-manager, concurrent demotion, active/sessionVersion và command gate. |
| T03 |PASS| Zod/service invalid draft và E2E tạo/sửa nháp thật. |
| T04 |PASS| Unit allocation oracle500case nhỏ, tie-break kho/chi phí. |
| T05 |PASS| Split scenarios: hai kho, phân bổ lượng/phí/COD, preview. |
| T06 |PASS| No-stock/unsupported/deadline; không giữ nửa đơn. |
| T07 |PASS| Race hai đơn tranh ATP cuối; chỉ một xác nhận, không tồn âm. |
| T08 |PASS| Đồng thời/replay command keys và E2E mất response sau commit. |
| T09 |PASS| Prepaid handover bounds, stock xuất một lần; regression sau refund/compensation. |
| T10 |PASS| Hủy trước xuất/hủy kiện/fee redistribution và race handover/cancel. |
| T11 |PASS| Delivery fail/retry/return-to-sender, miễn thu và nhóm tồn đúng. |
| T12 |PASS| Return quantity concurrency và hồ sơ nhiều dòng cùng kho. |
| T13 |PASS| Receive/QC một lần, hàng đạt/cách ly; thiếu/sai cần kết luận. |
| T14 |PASS| Pending/unclear giữ hạn mức, race refund/fee/compensation và COD chưa thu. |
| T15 |PASS| Snapshot người nhận/giá không chạy theo hồ sơ/catalog. |
| T16 |PASS| Versioned count và bound thấp hơn lượng giữ bị chặn. |
| T17 |PASS| Không đóng RMA còn dòng/tiền chưa rõ, tra soát/bù mở lại đúng; E2E close. |
| T18 |PASS| AV-001 trong oms_test: thu370000,hoàn90000,ròng280000,hộp8; reports query. |
| T19 |PASS trong phạm vi đã nêu| CSV/quyền/keyboard/axe/reflow/motion trace; người dùng duyệt hình thức. |
| T20 |PASS rerun P8| Cả oms_test và bản sao oms phục hồi sang DB mới, đủ14bảng/counts/nội dung/constraints. |

## P8 — vận hành và bảo toàn

`artifacts/qa/final-acceptance/handover-runtime.json`:

- Build production PASS; dừng đúng owned app, restart **chỉ** DB OMS rồi start lại, không chạy seed/migrate tự động.
- Start đã bổ sung preflight Node>=24.15<25, DB readiness, read-only migration status và chờ app+DB health. Nếu startup không healthy thì dừng đúng child do lần gọi đó tạo.
- Thử cổng bận: từ chối, không kill listener; thử PID có commandline khác trong sandbox: từ chối, process test còn sống; restore target`oms`: từ chối trước mọi restore.
- WarehouseFlow worker/app/db và Lumina db/phpMyAdmin giữ nguyên container ID/status/StartedAt.
- Đối chiếu **counts+SHA256 của toàn bộ14bảng live** trước P7 và sau P8: giống hệt. Có24đơn,6giao dịch tiền,51biến động,137audit. Không dùng số audit lịch sử của vòng trước để đối chiếu lần này.

### Backup/restore

Backup lưu riêng: **`storage/backups/oms_20261026_143808.dump`**.

| Nguồn | DB phục hồi mới | Thời gian | Kết quả |
|---|---|---|---|
| oms_test |oms_restore_test_20261026_143808|12.666s|14bảng, số dòng và fingerprint toàn bộ nội dung khớp; constraints validated. |
| oms |oms_restore_handover_20261026_143821|9.048s|14bảng, số dòng và fingerprint toàn bộ nội dung khớp; constraints validated. |

Artifacts `artifacts/qa/backup/{result,handover-result}.json`. Dùng pg_dump/pg_restore và DB mới, không overwrite nguồn hoặc đổi DATABASE_URL của app. Fingerprint SQL MD5 trong bài round-trip chỉ dùng so nội dung; bài bảo toàn live dùng SHA256. Dumps có tài khoản/dữ liệu, không đưa lên public hoặc commit.

### Tài liệu bàn giao

- `README.md`: URL/tài khoản, install, safe start/stop, test/backup/restore, giới hạn.
- `DESIGN.md`: login mẫu người dùng và dashboard compact hiện hành; bỏ mô tả bố cục/topbar motion selector cũ. Lint0errors/0warnings, DTCG xuất đủ7colors, token diff không regression. Lệnh npx tra package bị timeout; đã dừng đúng cây npx do lần kiểm tạo, chạy CLI0.4.0 có sẵn trong cache trực tiếp và PASS; không giữ export files.
- `docs/demo.md`: kịch bản10–15phút, mãDHhiện hành, lưu ý thao tác demo ghi dữ liệu thật.
- `docs/{requirements,data-model,financial-cases,functional-audit,test-report,progress}.md`: yêu cầu, mô hình, định nghĩa và lịch sử kiểm.

## Giới hạn còn lại, không che giấu

Local coursework,2roles/14business tables. Vận chuyển/thanh toán mô phỏng; model3D không phải kết nối IoT/WMS/AGV thật. Không public hosting/HTTPS internet, load-test thương mại, limiter phân tán hoặc cam kết khôi phục SLA. Rate limit process-local reset sau restart. pg8 có DeprecationWarning trong một số race, đã pin version; chưa bảo đảm pg9. Không đảm bảo60fps mọi máy hay toàn bộ WCAG. Clip cũ được giữ như lịch sử, không đại diện mọi chỉnh sửa hiện tại; vòng chốt không quay thêm video.
