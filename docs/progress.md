# Tiến độ OMS — bản local đã triển khai

## Gói sửa sau audit29/10/2026

Userđãcho sửa và yêu cầu tiếp tục. A01/A02/A04(3lỗi tiền/retry) và A03/A05/A06(3lỗi form) đã sửa, deployproduction, giữ14bảngkhôngmigration. TiềnCODdùngpooltheokiệnchungmọiRMA/maxflow, pending+bùđúngnguồn và đóng/mởlạiđồngbộ; khôngparentởkhoảnthường. Sharedmutationfreeze/replaybody/keykhiunknown choOrderAction/CommandForm/CreateReturn. Citynull,dirtybuttononly,remainingreturnqtyđạtregression. Luồng1/2đãlàmrõcước/ETA/COD/phí/đónggói/nexttask/chuyểnhoàn/RMAstep+inline moneyresolve,formsfixedpurpose/historyRMA. Verify14unit7integration3E2Eđạt,4catestxuyênsuốtstock+money,live42surfaces60detailtabscheckout2roles4widths/rolesorigin/reportsđạt. 14bảnglivecounts+SHA256before/afterunchanged. Khôngseed/reset/migration/quayvideo hoặcchỉnhđơnthật. Báocáo docs/audit-fixes-20261029.md; auditcũlàchẩnđoánlịchsử. KhoQCcount/top-level inventoryredesign/allqueues/crashpersistretryKHÔNGnằmtronggóiđãlàm. Uservisualacceptancevẫnpending.

## Bài1 — checkout1màn, tạo và xác nhận nguyên tử27/10

User chốt sau tham khảo Sapo/Shopify/Odoo: khách+địa chỉ cấu trúc→hàng→kho/kiện/cước/tổng ngayform→Tạo đơn và xác nhận; phíkhách=SUMfreight EXCLUDEpacking. Đã triển khai, không còn bắt lưu nháp→drawerphânbổ cho đơn mới. Backend quote read-only+HMAC5phút, xác nhận serializable atomic khách/đơn/kiện/giữ/audit; thaygiá/tồn/phươngán buộc xem lại, không chấp nhận phí đổi âm thầm. Kháchfixture10đãđốichiếu đượccitymigrationcóguardID+địachỉ, địa chỉkhácnullphảibổsung. 2cột bổsung không thêmbusiness tables. Đơn lịch sửMANUAL không đổi phí; nháp mớiSUM_FREIGHT_V1 sửa/confirmqua cùngform tránh đườnglegacybỏquabáophí. Chi tiết `docs/checkout-flow.md`.

Verify9unit/6integration/2E2Eđạt; kiểm quoteđủ/thiếu/tamper/expired/stalegiá/địachỉ/feeclientgiả,concurrencylaststock và failởauditSAUholdsrollbacktoàn bộ; retrylostresponseonecustomer/order; draftresumeIDgiữnguyên. OldlongE2E thu/pack/handover/deliver/restart/RMA/QC/refund/close/lostresponse/DBfailPASS. Livecheckout2roles4widthsaxe/42surfaces/60detailtabs/report10scopes/roles-origin/customerdrawerPASS. Backup trước storage/backups/oms_20261027_143053.dump,restoresangoms_restore_before_checkout_20261027đốichiếu14bảngoldcolumns/countsidentical(30orders,6money,58movements,158audits),chỉ10fixturecities+defaultshippingpolicyadditive. Không tạo đơn test chính/reset/seed/video mới. PIDfileauthoritative,lượtcuối28492. UI mới chưađượcusernghiệmthu; không suy17/17trướcđó là chấp thuận UX này. Các mô tả StageA bên dưới là lịch sử, không còn luồng tạo đơn hiện hành.

## Thiết kế lại luồng toàn OMS — giai đoạn A tạo đơn, chờ người dùng thử

Thiết kế: design-plans/oms-task-flow-redesign.md. User chọn toàn OMS lấy tạo đơn làm mẫu, rồi yêu cầu thay đổi. Đã triển khai giai đoạn A, chưa tuyên bố xong kho/giao nhận/trả hàng của thiết kế mới.

DraftForm viết lại thành3nhóm Người nhận / Sản phẩm / Giao hàng-thanh toán +summary desktopsticky/mobileflow. Bỏ tự chọn khách/SKU/vùng/payment; chọn vùng rõ ràng thay mặc địnhHN. Khách cũ tìm tên/phone/ID và chọn, khách mới nhập tại chỗ dùng APIcustomers hiện có; nêu rõ khách có thể đã lưu nếu bước tạo đơn lỗi. Thêm thành tiền từng dòng/tổng; phân biệt phíkháchtrả và chiphíkho, Trảtrước không tựthu. Nút Lưu nháp phụ, Tiếp tục chọn kho chính lưu rồi mở flow=allocate; allocationautoLoad không bắtTìmkholần2. Xác nhận giữ hàng vẫn là command riêng với version/ATPserver.

Retry records lưu body+key từng bước khách/đơn, lỗi chưa rõ không đổi key/không chấp nhận payload mới; successcustomer chuyển lại kháchđãcó vớiIDtrảvề. posthelper không tự gộp hai transaction. Auto-preview effect có cancel/abort tránh kếtquảcũ. Auth/services/schema không đổi. Ghi fixtures CHỈoms_test, không reset dữ liệu chính.

Test mới check-draft-task-flow.ts PASS: no arbitrary defaults, khách mới, live total230000, mấtresponsecustomer+orderSAUcommit/replaykeynhưcũ vàmỗi1record, preview503giữđơn/tảilạivàchưagiữstock, explicitconfirmreserved2. verify9unit5integration1E2E25.2sPASS (task-flow-verify.log),42surfacesaxePASS;3width1366/390/360 formkháchmớikhôngoverflow/axePASS ở trạng thái ổn định. Một lượt axe ngay sau đổi mode báo contrastframechuyểntiếp; đợi transitionkếtthúc vàrerun3cỡPASS, không sửa màu nétest. E2EfirstgetByLabeltimeoutfixedexplicitselectarianames/name-selector; testnewflowfirststrictalertNextannouncerfixedscopetargetdraft-summary. Build/typecheck/lintPASS. Ảnhdraft-flow1366+390 đã mở. Không video/subagents/mainmutations. Bản mẫu đang chờ user thử; nghiệm thu17/17 cũ không được dùng để suy chấp thuận UX mới.

## Điều chỉnh UX sau bàn giao — màn chi tiết đơn mới26/10

Theo phản hồi user về thao tác khó, vòng đầu dùng details trong bảng kho/giao nhận bị từ chối (phình dòng). User chốt thay trang chi tiết hiện tại, mở từ mã đơn/đường dẫn ở Đơn hàng và Giao nhận, không làm thêm màn trùng.

Bản hiện hành `/orders/[id]` đã viết lại thành order-record: header mã/kênh/trạng thái, tiến độ4bước có lưu ý kiện có thể khác bước, next-task theo trạng thái/tiền/hồ sơ; Tổng quan hiển thị đồng thời sản phẩm, người nhận, từng kiện và tiền. Tab Kiện & giao hàng gồm thẻ riêng mỗi kiện với kho/sản phẩm/vận đơn/trạng thái và actions hiện có; không cột thao tác dài. Thu/hoàn/Trả hàng/Lịch sử riêng. Phân bổ và tạo trả mở drawer theo yêu cầu, Escape/focus-return; chỉnh drawer680px/responsive. Chi tiết Giao nhận bỏ hoàn toàn details/form trong bảng, thay link `?tab=shipments` mở thẳng tab kiện. Không sửa backend balances/commands/quyền/tồn/tiền, không seed/reset live.

Source page.tsx/order-tabs.tsx/order-detail.css; OrderActions thêm parcel mode không lặp tiêu đề/khung; archive storage/ui-snapshots/pre-order-detail-v2. TestE2E cập nhật thao tác mở phân bổ/tạo trả thật trong drawer, PASS25.3s;9unit5integrationPASS; typecheck/lint/buildPASS. New check-order-detail.ts PASS60tổ hợp2role×2width×3đơn×5tab, axe, khung phân bổ và trả mở thực, Escape/focus, Giao nhận deeplink; không ghi live. Mở thực ảnh1366overview/parcels và390parcels. check-surfaces từng bị server3001 connectionrefused giữa run; khởi động lại owned app qua preflight (không reset DB), rerun42surfacesPASS. PID29528 lúc kiểm cuối; đọc PIDfile khi vận hành. Bản UX mới CHƯA được user duyệt, không suy từ nghiệm thu17/17 của bản cũ. Kho vẫn chỉ tách tab/collapse từng dòng ở vòng đầu, chưa triển khai form nhập/kiểm kê chọn khoSKU ở đầu trang.

## Chốt P7/P8 — 26/10/2026

P7 đã được kiểm lại đầy đủ:9unit/5integration/1E2E dài,42surfacesaxe,2role×6dashboardwidths,login7widths+WebGLfallback,role/origin/CSV,sidebarfit/navigation/counterchart/persistent20cycles đều PASS. Profileproduction20tương tác p95nextpaintproxy17.5ms,zerolongtasks trong cửa sổ đo; có CDPtrace, deep-link/backforward/offline/retry và reflow200%-equivalent. Nativebrowserchromezoom không tự động riêng, không tuyên bố WCAG toàn bộ/GPU mọi máy. Live14bảng SHA256+counts giữ nguyên.

Người dùng đã chọn rõ **“Duyệt giao diện hiện tại, tiếp tục bàn giao”** qua câu hỏi nghiệm thu; step16 đã đánh dấu ngay. Các ghi chú “pending16/17” ở các vòng bên dưới là lịch sử, không còn là trạng thái hiện tại.

P8 đã build/restartapp+OMSPostgreSQL không seed, appDBhealthok,14bảnghashgiữ nguyên; bảo toàn ID/state/StartedAt5containerWarehouseFlow/Lumina. Startscript bổ sungNode/DB/migrationstatus/healthwaitread-only; kiểm occupiedport/foreignPID/restorelive-targettừchốiPASS. Backup storage/backups/oms_20261026_143808.dump; roundtripoms_test12.666s vàoms9.048s sang2DBmới,14bảng/nội dung/constraints khớp. Tài liệu README/DESIGN/demo/test-report cập nhật; báo cáo bàn giao docs/final-acceptance.md. Bản chạy URL3001, PIDfileauthoritative (lượtchốt28964). Không đổi thiết kế sau khi duyệt, không dữ liệu reset, không video mới, không tuyên bố thương mại.

## Login hiện hành — dùng Untitled-1.html của người dùng, đã dọn header

Đã nhập mô hình cutaway chi tiết và bố cục56/44 từ ~/Downloads/Untitled-1.html; bản gốc không sửa, archive storage/ui-snapshots/login-user-template.html, SHA256d4dd9ef3ec7c9758a0b5d859e08c78d768b6233280344a307d47289187e0abdd. Source hiện hành: page.tsx / warehouse-model.tsx / digital-twin.js / batch-template-geometry.js / template.css / login.css; generator scripts/import-login-template.mjs. Inter5.3.0 tự phục vụ, Three dùng bản exact đang cài, không importmap/CDN/Google runtime. Auth thật giữ nguyên; bỏ tài khoản/mật khẩu giả, checkbox nhớ và link quên mật khẩu không có backend.

Theo ảnh phản hồi tiếp theo, đã XÓA khỏi DOM khẩu hiệu, mô tả, nhãn DigitalTwin12phânkhu, nút phóng to và toàn bộ nút phân khu phía trên; không chỉ CSSẩn. Sửa logo thành Boxes giống sidebar, tên OMS. / Quản lý đơn hàng; bỏ OMS Enterprise. Biển mô hình đổi cùng tên, không giả doanh nghiệp. Giữ model gốc và điều khiển xoay/reset/Autoplay bên dưới, không tự thêm thiết kế khác. Căn lại camera để mẫu cao không bị cắt sau khi bỏ header. Mobile/tablet≤1024 ưu tiên form, không tải modelchunk.

Các hàm dựng hình gốc được nhập; chỉ sửa vòng đời/cleanup/budget/branding/framing và batch các mesh tĩnh opaque cùng material. Không batch cây animated hoặc transmission/transparent. Profile trước batch2692drawcalls; sau576drawcalls và32render/1100ms trên headlessMsEdge tại máy này, không suy ra GPU khác. Pause dừng TẤT CẢ animation, không chỉ camera như file gốc; hidden/offscreen/reduced dừng RAF, contextlost/failure fallback không chặn real login. DPR≤1.5, shadow1024.

Vòng nhập đầu: build/stagePASS nhưng axe1920FAIL label-content-name-mismatch trên4nút footer; đã sửa accessible name chứa nguyên visible text và chạy lại7viewportPASS. Finaltypecheck/lint/build, stage realWebGL/drag/keyboard/reset/pause/offscreen/reduced/contextloss/noWebGL+REALstafflogin/mobileNoThree/headerRemoved/correctBrandPASS; login7viewportsaxe/auth401/network429/reduced/realmanagerstaffPASS;9unit5integration1longE2ErerunPASS. Đã mở ảnh1366và390 thực. Không quay video/subagents/DBreset. User chưa duyệt bản chạy;16/17pending. PIDfile authoritative.

## Vòng trước, đã thay — mô hình3D tự dựng, form bên phải

Người dùng bác bỏ ảnh kho và yêu cầu thử mô hình3D. Bản mới bỏ ảnh/SVG giả phối cảnh, dựng mô hình bằng Three.js0.186.1: mái kho3D, cửa xuất hàng, kính, pallet/kiện, băng chuyền, xe tải và đèn/bóng đổ thật. Code warehouse-model.tsx / warehouse-scene.ts; snapshot photo ở storage/ui-snapshots/login-photo-v5/. Không thay auth/API/business data.

- Kéo xoay camera thật, có nút xoay trái/phải/reset dùng được bằng keyboard; orbit chậm và kiện di chuyển có pause/resume. DPR≤1.5, khoảng30render/s; pause/offscreen/OSreduced dừng loop, dispose toàn bộ GPU/listeners khi unmount/contextlost. Tablet giữ pan-y cho cuộn dọc.
- Lazy3Dchunk589590bytes, gzip147507bytes trong build đo trước chỉnh touch-action. Mobile390 không tải chunk này/không canvas; fallback không WebGL và mất context không che form. Toàn bộ hình học sinh local, không model/texture từ CDN; Three MIT. Unsplash không còn được import.
- Build/typecheck/lintPASS; check-login-stage PASS actualWebGL/profile32frames/1100ms/320drawcalls (headlessMsEdge trên máy này, không cam kết GPU khác), drag+keyboard/reset/pause/offscreen/reduced/contextlost/no-WebGL REALstafflogin/mobileNoThree. check-login-redesign7widths/axe/401/network/429/reduced/2roleactualauthPASS.9unit/5integration/1longE2EPASS. Ảnh1440 và1366 mở xem thực. Không video/subagents/Impeccable.
- Đây vẫn là bản thử chưa có người dùng duyệt;16/17 chưa hoàn tất. PIDfile authoritative; URL3001/login.

## Login vòng trước, đã bị từ chối — ảnh kho thực, form bên phải

Người dùng xác nhận thích form ở một bên nhưng không thích bản kiện hàng hoạt hình; “lỗi” được làm rõ là hiển thị/thiết kế không hợp gu, không phải bằng chứng auth hay DB hỏng. Đã kiểm /login200 và /api/health200 trước khi đổi, không gán nguyên nhân lỗi nghiệp vụ.

- Bản hiện hành bỏ hoàn toàn stage/SVG/các kiện hàng chạy quanh; dùng ảnh kho minh họa tự phục vụ, xử lý màu và typography tối giản bên trái, form trắng bên phải. Ảnh chỉ là minh họa, không tuyên bố kho thuộc ứng dụng. Nguồn/điều khoản tại docs/login-image-source.md; WebP313KB và NextImage responsive/static import/preload/blur, không cần mạng ngoài khi chạy.
- Chuyển động ảnh push-in một lần3.6s, form420ms; không loop hoặc control tạm dừng dư thừa. OS reduced-motion tắt; mobile ẩn ảnh và ưu tiên form.
- Source page.tsx/login.css/warehouse-editorial.webp. Snapshot stage bị bỏ ở storage/ui-snapshots/login-dispatch-v4/. Auth/API/cookie/business data không đổi.
- Build/typecheck/lintPASS; login7viewport/axe/keyboard/showhide/401/network/429/reduced/real2roleloginPASS. check-login-stage.ts đã đổi sang kiểm ảnh local tải thành công/actual transform/onecycle/reduced/no rejected cartoon; PASS. E2E dài chạy lại PASS (lượt trước bị người dùng ngắt giữa run, không được coi là PASS lúc đó). Không quay video. Ảnh1440 đã mở để tự kiểm.
- Production PID22160; health/PIDfile authoritative. Chưa có nghiệm thu thị giác; không tự đánh dấu16/17.

## Login vòng trước — bố cục trung tâm, không chia đôi

Người dùng tiếp tục chưa thấy bản cobalt đủ ấn tượng. Đã hỏi ảnh tham khảo, người dùng không có và cho phép tự tham khảo/tự thiết kế. Có xem trang login Linear trực tiếp để tham khảo nguyên tắc tập trung form, không sao chép Google/SSO/đăng ký không có trong OMS. Tự dựng `login-backdrop.tsx`: nền tuyến kết nối và kiện hàng xanh dạng khối, typography OMS outline làm lớp nền; form trắng ở chính giữa. Bỏ toàn bộ hai cột khẩu hiệu/minh họa kho. Mobile giản lược nền, giữ form và input chính. Không ảnh/dependency ngoài, không video.

Auth/form logic giữ nguyên. Source page.tsx/login.css/login-backdrop.tsx; scene cũ đã lưu storage/ui-snapshots/login-cobalt-v2/ cùng page/CSS cũ. Build/typecheck/lint0warn và `check-login-redesign.ts`7viewport/axe/keyboard/show-hide/401/network/429/reduced/real2roleloginPASS. Đã xem ảnh1440 và390 thực. Active productionPID12092, healthapp/DBok. Đây là bản chờ người dùng xem, không tự đánh dấu nghiệm thu16/17.

## Login vòng trước — cobalt và minh họa phối cảnh

Người dùng chưa thấy bản inset đủ ấn tượng và yêu cầu làm mạnh hơn. Đã bỏ khung chia đôi inset: desktop là mảng cobalt phủ chiều cao bên trái, minh họa phối cảnh kho/kiện hàng SVG tự dựng kích thước lớn; form trắng riêng bên phải. Header OMS trắng trên cobalt, form/input/toggle/password/error giữ nguyên chức năng. Mobile header cobalt + form trắng, không bắt cuộn qua illustration. Màu carton làm điểm nhấn trong minh họa, không có số liệu vận hành giả hoặc ảnh ngoài mạng.

Files: page.tsx/login.css và fulfillment-scene.tsx. Backup bản trước storage/ui-snapshots/login-inset-v1/. Chuyển động chỉ route SVG/dispatch-card một lần, reduced-motion tắt; không thêm thư viện hoặc engine Impeccable. Production build/typecheck/lint và script login7widths/axe/keyboard/401/network/429/reduced/real2roleloginPASS; ảnh1440/mobile390 đã mở xem, không quay video. Active PID28364 (PIDfile authoritative), URL /login. Đây vẫn là bản để người dùng đánh giá, không tự coi đã đạt nghiệm thu16/17.

## Login vòng trước — bản inset

- Dùng frontend-design + fixing-accessibility; không dùng Impeccable hoặc subagents. Bỏ login chia nửa toàn màn hình với khẩu hiệu lớn; khung đăng nhập inset trên nền sáng, minh họa đơn→ba kho bên trái, form phải; mobile chỉ giữ form. Giữ Be Vietnam Pro/tông xanh ứng dụng, không thêm thư viện/tài nguyên mạng.
- Sửa riêng `src/app/login/page.tsx` và `login.css`: thêm hiện/ẩn mật khẩu, CapsLock hint, inFlight guard, phản hồi pending/error, aria-invalid cho401 và liên kết lỗi. Không đổi endpoint, cookie, quyền hoặc business data.
- `check-login-redesign.ts` PASS7viewport1920/1440/1366/1280x600/768/390/360: không overflow, nút submit trong viewport, axe không serious/critical. Keyboard toggle/giữ giá trị,401thật, network failure+retry,429hiển thị (mock không khóa user), reduced-motion và đăng nhập thật quản lý/nhân viên PASS. Không quay video, ảnh trước khi nhập mật khẩu. Desktop1440/mobile390 đã mở ảnh để kiểm.
- Lần đầu axe phát hiện footer chữ nhạt; đã tăng tương phản và chạy lại đạt. Script từng đợi nhầm alert rỗng của Next route-announcer; đổi sang #signin-error, kiểm lỗi ứng dụng chính xác rồi đạt. Không đổi source để né assertion.
- Production build/verify typecheck/lint0warn/9unit/5integration/1longE2E PASS; healthapp/DBok, PID26272 (PIDfile authoritative). Ảnh/JSON tại artifacts/qa/login-redesign/. Snapshot cũ storage/ui-snapshots/login-before-redesign/.
- Đây là bản login mới để người dùng xem; không tự coi đã có nghiệm thu thị giác hoặc đánh dấu steps16/17.


## Sửa audit F01–F04 — trạng thái mới nhất

Đã sửa4lỗi và bổ sung regression (net tiền/bù, hạn mức phí giao, RMA sau đảo khoản hoàn, region kho). Thêm tra cứu/lọc/phân trang khách/kiện/RMA/tồn/sổ, khách→đơn, chọn chứng từ tiền và hạn mức RMA. Chi tiết bản sửa đầu `docs/functional-audit.md`; phát hiện trước sửa vẫn được giữ nguyên ở artifacts/qa/functional-audit/findings.json, kết quả sau sửa tại regression.json/regression-services.json.

Build/typecheck/lint0warn,9unit/5integration/1longE2E PASS. E2E đã thử sửa kho giữ DN,55khách qua3trang, search/customer→order, bộ lọc giao nhận/RMA/tồn. Re-check42surfaces/2roles6widths/report10scopes/navigationcounterchart/sidebarfitPASS. MainDB không reset hoặc seed lại; backup trước deploy `storage/backups/oms_20261025_223243.dump`. Production PID32496 (PIDfile authoritative). Không thay bố cục đã chỉnh theo người dùng; không tự đánh dấu userđã nghiệm thu16/17.

## Kết luận audit trước sửa — lịch sử

Theo yêu cầu kiểm tra đầy đủ OMS, rà thêm tình huống ngoài bộ cũ và tái hiện F01–F04: bàn giao trả trước bỏ qua tiền đã hoàn bù, collectFee có thể thu cả tiền hàng, đóng RMA bỏ qua thu bù đảo khoản hoàn, select sửa KHO-DN mặc định sang Hà Nội. Chi tiết `docs/functional-audit.md`, actuals `artifacts/qa/functional-audit/findings.json`. Các ghi audit chỉ ở oms_test; live chỉ đọc form, không lưu.

**Không còn được diễn giải các dòng “đã kiểm” phía dưới là không còn blocker.** Bộ cũ verify vẫn PASS nhưng thiếu các ca mới. Cần sửa lỗi tiền/vùng kho và thêm regression trước khi đóng P7/P8. Còn thiếu search/filter/pagination ở khách/kiện/RMA/sổ. Audit lượt này không sửa nghiệp vụ hoặc DB live.


## Bản thử bố cục vận hành — chờ người dùng xem

- Sau ảnh người dùng chê first viewport sắp xếp kém, đã được yêu cầu “làm thử”. Candidate mới active: `operating-dashboard.css` import từ dashboard-view; không dùng lại overview/work-priority redesign cũ.
- Bỏ banner kỹ thuật đầu dashboard, chuyển disclosure ngắn xuống cuối; tiêu đề/filter gọn. Giá trị đơn hiệu lực là KPI chủ đạo nền xanh nhạt, ba KPI phụ yên hơn. Recent6đơn ở trái/việc hiện tại phải ngay sau metrics; chart phía dưới recent, kho/tỷ lệ cuối. Không thêm số giả.
- Sidebar216px, topbar58px, menu spacing gọn trong shell dùng chung. Snapshot trước đổi dashboard tại storage/ui-snapshots/pre-operating-dashboard/*.tsx.txt. Bộ đếm/draw/chart/navigation giữ nguyên; script navigation chọn KPI đếm đơn ở vị trí2 thay vì1.
- Build/typecheck/lint PASS. `check-operating-dashboard.ts` cả2vai trò×6widths1440/1366/1920/768/390/360 không overflow/seriouscriticalaxe/pageerror; assert đơn gần đây và việc nhìn thấy ngay firstdesktopviewport. DBdashboardrole và navigationcounterchart PASS. Desktop1366/mobile390 đã mở ảnh để tự xem.
- Ảnh artifacts/qa/operating-dashboard/. Production PID13404; đây là bản thử, không coi testPASS là userchấp nhận. Chưa đổi DESIGN.md thành quyết định canonical; steps16/17 vẫn pending nghiệm thu thị giác.

## Dữ liệu mẫu tự nhiên theo yêu cầu mới

- Đã sao lưu trước thay đổi (`oms_20261025_211437.dump`), dừng đúng app, chuẩn hóa 24 đơn/10 khách/3 địa chỉ kho và tên người dùng; không reset DB. Khách không còn (demo), địa chỉ cụ thể theo vùng, mã đơn DH-000101–124. Mã mới sinh DH-ngày-ngẫu nhiên. Tên/liên hệ/địa chỉ đều hư cấu, nhãn đối tác mô phỏng vẫn giữ.
- FK cập nhật cascade theo ID đơn; ghi audit riêng trước/sau chỉnh thông tin bộ dữ liệu khởi tạo. Giữ nguyên các audit/sổ tồn/chứng từ tiền cũ, chỉ hiển thị alias thân thiện cho nhãn lịch sử. Giá chụp/lượng/trạng thái/tồn/tiền không đổi, có assertion trong transaction. URL cũ redirect đơn mới.
- Seed và seed-business đã sửa để không tái tạo dữ liệu DEMO hoặc phát sinh tiền/tồn khi chạy lại trên DB này; đã thử lại đạt. `check-realistic-data.ts` kiểm8màn+CSV không còn demo hiển thị, screenshot thực đã xem. Verify6unit/4integration/1E2E, DBdashboard/report10scopes,42surfaces và navigation/counter/chart đều PASS. Không quay thêm video.
- Bản chạy mới PID27108 (PIDfile luôn authoritative), URL giữ nguyên. Chưa tự đánh dấu nghiệm thu thị giác cuối.

## Sửa theo phản hồi: khoảng trắng / đếm số / vẽ biểu đồ

- Người dùng thấy animation xuất hiện có vẻ ổn nhưng không thích vùng trắng trước trang mới, thiếu đếm số và vẽ đường Nhịp đơn hàng. Giữ thiết kế/entrance đã có, không suy thành nghiệm thu mọi motion.
- Bỏ loading.tsx của workspace/dashboard (lưu bản cũ trong storage/archived-loading). Next client transition giữ nguyên trang cũ cho tới khi trang mới render xong; sidebar có pending hint cố định không làm xô layout. Không chặn hoặc tự delay navigation trong app.
- AnimatedNumber dùng Motion interpolate số cũ → số mới (~950ms), ghi vào node nhỏ, không render lại toàn dashboard mỗi frame; cleanup khi đổi đích/unmount. KPI, công việc, ATP dùng số DB; số cuối tĩnh cho screen reader, giữ chỗ theo giá trị cuối để hạn chế rung. Reduced-motion hiển thị số cuối ngay.
- Chart chuẩn hóa SVG pathLength1 rồi vẽ stroke-dashoffset trong950ms, fill650ms; gỡ dash mask sau khi vẽ. Không bật lại Recharts interpolation từng gây mất đường khi resize. Observer chỉ đợi path xuất hiện rồi disconnect, không đo hình học mỗi frame.
- `check-navigation-counters-chart.ts` PASS: giả lập RSC chậm1400ms mà trang cũ vẫn đọc được; counter có số trung gian và chốt đúng API khi đổi kỳ; stroke thực sự tiến, resize vẫn đủ đường; reduced-motion không count/draw. Không quay thêm video ở lượt này.
- Build/typecheck/lint + verify6unit/4integration/1E2E, dashboard hai vai trò,42surfaces/5widths, axe/focus/reduced-motion đều PASS. Bằng chứng mới tại artifacts/qa/navigation-counters-chart/. Clip public cũ giữ nguyên và được ghi là vòng trước, không quảng cáo là có counter mới.

## Bản motion mới theo phản hồi cuối

- Animation giờ áp dụng lên nội dung thật, không phải wrapper chạy hết trước khi dữ liệu tới. Chuyển trang/nhóm dashboard đi từ opacity0 + dịch22px; drawer420/260ms, tab340ms, chart550ms, phân bổ600ms có stagger. Không thay bố cục/nghiệp vụ.
- Topbar có Chuyển động: Theo hệ thống / Hiệu ứng đầy đủ / Giảm chuyển động; mặc định tôn trọng OS, full là lựa chọn chủ động, lưu localStorage. Cần Ctrl+F5 để tải bundle mới nếu đang mở tab cũ.
- `check-visible-motion.ts` PASS thay đổi frame thực cho route/dashboard/chart/drawer/tab/parcel, kiểm auto/full/reduced và persistence. Clip thật truy cập được tại http://127.0.0.1:3001/demo/oms-motion.webm, JSON/filmstrip tại artifacts/qa/visible-motion/.
- Re-run verify, 42 surfaces, 5 dashboard widths, axe/focus/reduced-motion, 20 drawer cycles, reports10scopes PASS. Backup/restore test mới11.718s. Demo restart không seed:24 đơn/6 money/51 movement/102 audit giữ nguyên; restore DB mới cùng counts. Artifacts/qa/handover.json.
- Phần thực thi P7 và bàn giao P8 đã làm; đang chờ xác nhận thị giác cuối để đánh dấu đúng điều kiện nghiệm thu, không tự ghi user đã duyệt animation.

## Đã triển khai và kiểm kỹ thuật

- Dashboard đầu tiên được giữ nguyên: KPI trên, biểu đồ trái/việc phải, kho/tỷ lệ dưới, bảng đơn cuối; Nhân viên không nhận KPI tổng hợp. Shell persistent, menu cuộn/thu gọn/mobile, motion drawer/tab/phân bổ và reduced-motion.
- 14 bảng PostgreSQL, constraints/migrations; hai nguồn giữ hash gốc. Repo, dependency exact, Node24; `oms-course` cổng55432 riêng. `oms_test` migrate từ rỗng. `docs/requirements.md` map đủ R01–24/T01–20; ví dụ tài chính tại `docs/financial-cases.md`.
- Auth/session version, CSRF origin, 2 vai trò; khách/SKU/kho/tài khoản, Quản lý cuối cùng, khóa phiên. Nhập/kiểm kê/sổ tồn; command idempotency và audit snapshots không chứa passwordHash.
- Đơn tạo/sửa nháp, preview/confirm khóa và recompute, 1/2 kho, giữ/xuất, thu trả trước/COD, pack/handover/deliver, hủy toàn/phần chưa xuất, phí thiếu, giao thất bại/giao lại/chuyển hoàn.
- RMA nhiều dòng cùng kho: duyệt/nhận/QC một lần, thiếu/sai có kết luận, đạt/cách ly; thu/hoàn chờ/chưa rõ/thành công/thất bại, hạn mức theo nguyên nhân và tổng thu; bù gắn gốc; miễn thu hàng chuyển hoàn COD, completion projector.
- UI E2E qua tạo/sửa/giữ/thu/xuất/giao/restart/RMA/QC/hoàn/đóng đạt trên DB test. Mất response sau commit retry không ghi đôi; DB unavailable → Thử lại sau phục hồi đạt.
- Seed demo qua services: 24 đơn, có nháp/chờ/giữ/tách hai kho/chờ bàn giao/đang giao/giao thất bại/đã giao/hủy/RMA-QC/hoàn chưa rõ. Chạy seed-business lại không nhân chứng từ. Số dư mở đầu và bổ sung demo có biến động NHAP.
- Reports đủ 8 nhóm, chart và chứng từ nguồn, tổng hợp kênh/kho, kỳ/kênh/kho đúng phạm vi, CSV có metadata và chống công thức.
- Build/typecheck/lint PASS; 6 unit (500 đầu vào oracle), 4 integration scenarios, 1 E2E dài; 42 surfaces desktop/mobile axe không serious/critical, không overflow/pageerrors. Đối chiếu report/dashboard10scopes. Không coi đây là chứng minh mọi tổ hợp hoặc WCAG toàn diện.
- AV-001 test: thu370000, hoàn90000, ròng280000, hộp8. Backup/restore test11.783s, 14 bảng/FK/count khớp; backup demo và restore DB mới có23đơn, không đổi live DB.
- Có `README.md`, `DESIGN.md` (lint/export DTCG đạt), `docs/demo.md`, `docs/test-report.md`; start/stop kiểm ownership/cổng, backup/restore không overwrite database.

## Trạng thái nghiệm thu

Checklist 1–15 đã được đánh dấu sau các mốc tương ứng. P7 kỹ thuật và phần bàn giao P8 đã thực hiện; việc đóng nghiệm thu thị giác cuối cùng không được tự suy từ test. Người dùng đã yêu cầu tiếp tục không dừng xin duyệt từng mốc, chấp nhận giữ bố cục đầu tiên nhưng chưa xác nhận riêng motion đã mượt như mong muốn. Giữ phản hồi đó trong hạn chế bàn giao; không ghi người dùng đã duyệt mức FPS hay nghiệm thu thương mại.

## Runtime và tài nguyên

- Production http://127.0.0.1:3001, health `/api/health`; PID hiện hành luôn đọc `storage/runtime/production.pid` (không dựa PID lịch sử trong hội thoại).
- PostgreSQL Compose `oms-course`, DB `oms`/`oms_test`. Restore thử tạo DB mới `oms_restore_test_*`, `oms_restore_handover_20261025`, không thay database app.
- Tài khoản quanly/nhanvien.an/nhanvien.binh; password chỉ trong `.env`, không commit hoặc lưu vào tài liệu/memory.
- Không thay đổi WarehouseFlow/Lumina. Không dùng subagents.

## Giới hạn còn được bảo lưu

Chỉ chạy local; vận chuyển/thanh toán mô phỏng. Không SLA/thanh toán thật/ERP/tối ưu tuyến xe. Rate limit login trong process. Driver pg8 có warning đã ghi test-report. Không cam kết60fps mọi máy. RMA UI chọn nhiều dòng cùng kho, dòng nhận/QC một lần. Không restore đè live DB. Không tuyên bố sẵn sàng production thương mại.

Các bản `overview.css`, `work-queue.css`/WorkQueue redesign cũ vẫn nằm trong repo nhưng không được dashboard hiện hành import; ảnh redesign/priority là lịch sử, không dùng làm minh chứng thiết kế hiện hành. Ảnh cuối tại `artifacts/qa/final/`, dashboard-role screenshots và clip hiện hành tại `artifacts/qa/`.
