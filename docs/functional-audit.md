# Rà soát đầy đủ chức năng OMS — 25/10/2026

## Cập nhật sau sửa theo yêu cầu người dùng

**F01–F04 đã sửa và regression PASS trên bản production mới.** Nội dung audit gốc phía dưới được giữ để truy vết lỗi trước sửa, không phải trạng thái hiện hành.

- Tính tiền hợp lệ chung tại `src/domain/payments/balances.ts`: net sau bù, chờ thu/chờ hoàn, chuỗi chứng từ gốc/bù, hạn mức RMA và phần phí giao thực thiếu. Gate bàn giao không dùng gross THU nữa. Thu bổ sung sau hoàn bù được phép đúng phần còn thiếu; phần hàng trả đã chốt cũng được trừ khỏi nghĩa vụ hiện tại.
- Thu phí thiếu bị chặn trên cả order command và payments endpoint nếu vượt phí thật; regression race hai endpoint chỉ một khoản phí thành công.
- Đóng RMA xét hoàn ròng theo chuỗi bù; khoản thu bù sau khi đóng mở lại hồ sơ CHO_HOAN_TIEN. Hoàn lại hợp lệ sau đảo bù vẫn thực hiện và đóng được, không khóa kẹt vĩnh viễn.
- Kho dùng mã vùng nguồn HN/DN/HCM nhất quán. Service tiếp nhận cả mã dài cũ và chuẩn hóa về mã ngắn; form không tự chọn Hà Nội cho kho DN. E2E sửa tên và lưu vẫn giữ DN.
- Khách: search mã/tên/SĐT, phân trang20 và link tới đơn theo customerId; test55khách đi đến trang3 còn15dòng. Giao nhận/RMA: search, lọc trạng thái/kho, phân trang20. Tồn/sổ: lọc kho/SKU/tìm chứng từ/ngày Việt Nam và phân trang độc lập, không cắt mất lịch sử ở50dòng.
- Form thu/hoàn chọn hồ sơ/kiện/chứng từ gốc từ cùng đơn, có nguồn chứng từ COD/tiền mặt/chuyển khoản. RMA hiển thị hạn mức còn lại từ cùng hàm kiểm máy chủ; ẩn lệnh hoàn khi không còn hạn mức. Các nút thu/phí thiếu không còn hiện khi không có nghĩa vụ tương ứng.
- Cập nhật scripts motion không phụ thuộc bộ chọn đã bị bỏ; thiết lập chế độ chỉ trong test, không thêm lại control UI. Đã sửa test unroute để đợi callback mạng hoàn tất, tránh lỗi harness “Route already handled”.

Bằng chứng: `artifacts/qa/functional-audit/findings.json` là lỗi trước sửa; `regression.json` là4ca đã chặn đúng, `regression-services.json` là regression dịch vụ. `npm run verify` PASS9unit/5integration/1longE2E. Lần cuối E2E còn kiểm sửa kho,55khách và các bộ lọc. 42surfaces,2roles×6dashboardwidths, report10scopes, navigation/counter/chart, sidebarfit đều PASS. Không suy thành đã chứng minh mọi tổ hợp nghiệp vụ hoặc production thương mại.

## Kết luận audit trước sửa

**Có đủ các nhóm chức năng cốt lõi để trình bày luồng OMS giản lược, nhưng chưa đạt điều kiện “đầy đủ, không còn blocker về tiền/tồn”.** Rà soát bổ sung tái hiện 4 lỗi ưu tiên cao và một số thiếu sót thao tác danh sách. Không mở rộng đồ án sang ERP/WMS hoặc tích hợp thương mại để bù cho lỗi trong phạm vi hiện tại.

Lần rà soát này không sửa source nghiệp vụ hoặc dữ liệu live. Chỉ thêm script tái hiện và tài liệu; các ghi nghiệp vụ trong audit dùng DB `oms_test`. Trên production3001 chỉ đăng nhập, mở/đọc form và danh sách, không submit.

## Đã có

| Nhóm | Chức năng hiện có | Nhận định |
|---|---|---|
| Tài khoản/quyền | Đăng nhập, logout, 2 vai trò, khóa/revoke session, bảo vệ Quản lý cuối, origin guard | Có; chưa tương đương bảo mật vận hành internet |
| Khách/SKU/kho | Tạo/sửa khách, giá/khối lượng/active SKU, kho, snapshot đơn | Có; lỗi vùng kho F04 cần sửa |
| Đơn hàng | Tạo/sửa nháp, list/search/page, chờ hàng, xác nhận version/recompute, hủy | Có |
| Phân bổ/tồn | 1/2 kho, ATP, giữ/xuất/giải phóng, nhập/kiểm kê version, sổ | Có; confirm đang khóa tất cả dòng tồn, chưa tốt khi nhiều người dùng |
| Giao nhận | Pack/handover/deliver, thất bại/giao lại/chuyển hoàn, hủy nguyên kiện chưa xuất | Có; gate tiền bàn giao còn lỗi F01 |
| Trả hàng/QC | Nhiều dòng cùng kho, duyệt/nhận/QC một lần, thiếu/sai, đạt/cách ly | Có; đóng tiền hồ sơ còn lỗi F03 |
| Thu/hoàn | COD/trả trước, pending/unclear/resolve, hạn mức theo nguyên nhân, bù chứng từ | Có nhưng chưa thống nhất số tiền hợp lệ sau bù; F01–F03 |
| Dashboard/reports | 2 vai trò, lọc kỳ/kênh, 8 nhóm, nguồn chứng từ, CSV chống công thức | Có; chưa khẳng định đúng mọi tổ hợp ngoại lệ tiền |
| Local/bền vững | PostgreSQL, migrate, restart, backup/restore DB mới, tài liệu | Đã kiểm kỹ thuật; không phải SLA thương mại |

## Lỗi đã tái hiện — chưa sửa trong lượt audit

### F01 — Bàn giao trả trước vẫn cho xuất khi tiền hợp lệ đã thiếu

- Vị trí: `src/domain/orders/lifecycle.ts`, nhánh handover (so `collected < total`).
- Đơn phải thu130000, thu đủ130000, sau đó hoàn bù thu sai100000 thành công. Còn thực giữ30000.
- **Thực tế:** handover vẫn thành công và ghi xuất tồn, vì dùng tổng THU ban đầu mà bỏ qua khoản hoàn/bù.
- **Cần:** cùng một định nghĩa tiền hợp lệ sau bù cho gate bàn giao, còn phải thu, hạn mức thu và projector; có regression test chứng minh không chỉ tổng THU đủ là được xuất.

### F02 — Lệnh “thu phí còn thiếu” có thể nhận cả tiền hàng

- Vị trí: `src/domain/orders/lifecycle.ts`, nhánh collectFee; logic tương tự có trong `src/domain/payments/service.ts`, THU_PHI_CON_THIEU.
- COD hàng100000+phí30000, bàn giao → giao thất bại → chuyển hoàn, chưa chốt nhận/QC/miễn thu.
- **Thực tế:** lệnh collectFee nhận130000, ghi cả tổng nghĩa vụ thành “thu phí”. Cước thực chỉ30000. Công thức loại kiện chuyển hoàn khỏi COD dự kiến nhưng chưa tách nghĩa vụ tiền hàng khỏi phần phí thiếu.
- **Cần:** hạn mức riêng cho phần phí còn thiếu, không dùng toàn bộ tổng phải thu trừ COD đang hoạt động; kiểm nhất quán cả hai endpoint.

### F03 — Đóng RMA dù tiền hoàn đã bị thu bù ngược lại

- Vị trí: `src/domain/returns/service.ts`, nhánh close.
- RMA được hoàn100000, đã hoàn đủ100000, sau đó có THU_BU_HOAN_SAI100000 gắn đúng giao dịch hoàn gốc.
- **Thực tế:** hồ sơ vẫn đóng được vì cộng HOAN gốc mà không xét giao dịch thu bù đảo lại. Hoàn thực còn0 trong khi nghĩa vụ hồ sơ còn100000.
- **Cần:** tính tiền hoàn hợp lệ theo chuỗi chứng từ gốc/bù của đúng RMA; không chỉ lọc các HOAN có returnId.

### F04 — Sửa kho Đà Nẵng có thể vô tình đổi thành vùng Hà Nội

- Vị trí: `src/app/(workspace)/admin/catalog/page.tsx`, `warehouseFields` và initial region; `src/domain/foundation/service.ts` catalog schema.
- Dữ liệu kho nguồn lưu vùng `HN`/`DN`/`HCM`; select nhận giá trị `HN-NOITHANH`/`DN-NOITHANH`/`HCM-NOITHANH`.
- **Tái hiện trực tiếp:** mở “Sửa KHO-DN”, không thay gì, `select[name=region]` đang là `HN-NOITHANH` thay vì Đà Nẵng. Form chưa được submit trong audit.
- **Rủi ro:** người dùng chỉ đổi tên/địa chỉ rồi Lưu có thể làm đổi tuyến, phí, ETA kho.
- **Cần:** thống nhất mã vùng nguồn kho và vùng đích giao, map UI hai chiều, regression test giữ nguyên vùng khi sửa trường khác.

## Thiếu sót chức năng/thao tác trong phạm vi đồ án

- Khách hàng chỉ take50, không search/phân trang hoặc xem các đơn theo khách. Yêu cầu thiết kế có tìm khách và liên kết đơn; không nên coi bảng50dòng là hoàn tất tra cứu.
- Giao nhận/trả hàng chỉ take50; hỗ trợ status qua URL nhưng chưa có bộ lọc chủ động trên trang và phân trang. Dữ liệu >50 có thể không tới được các hồ sơ cũ qua giao diện danh sách.
- Sổ tồn chỉ50bút toán gần nhất. Chưa tra cứu đầy đủ theo SKU/kho/kỳ/chứng từ; tồn kho có lọc kho qua URL nhưng UI còn thiếu bộ lọc.
- Biểu mẫu thu/hoàn nâng cao cần nhập mã RMA/kiện/giao dịch gốc thủ công; dễ nhầm. Nên chọn chứng từ phù hợp và hiển thị hạn mức/tiền còn phải thu-hoàn trước khi ghi.
- Một số nút hành động vẫn hiện dù server sẽ chặn (thu trả trước khi đã đủ, thu phí thiếu khi chưa có phí); không phải nút thành công giả nhưng trải nghiệm chưa hoàn thiện.
- Kiểm thử motion cũ còn selector cho bộ chọn hiệu ứng đã được người dùng yêu cầu bỏ; chưa dùng chúng để chứng minh bản mới. Cần cập nhật nếu đưa vào suite chính.

## Ngoài phạm vi đã chốt, không tự coi là lỗi thiếu đồ án

Tích hợp sàn/hãng vận chuyển/ngân hàng, in nhãn hãng/hóa đơn thuế, đối soát thanh toán thương mại, mua hàng/nhà cung cấp, khuyến mại, nhiều cấp quyền, tối ưu tuyến, WMS/ERP. Những phần này cần nếu vận hành thực tùy mô hình, nhưng không được tự thêm vào bản14bảng để gọi là “đủ OMS”.

## Kiểm thử và minh chứng

- `npm run verify` chạy lại PASS: typecheck, lint,6unit (có500case oracle),4integration wrappers,1longE2E.
- **PASS trên bộ cũ không phủ định lỗi mới:** script `scripts/audit-functional-completeness.ts` tái hiện F01–F04 đều `reproduced:true`.
- Kết quả audit: `artifacts/qa/functional-audit/findings.json`. Test service dùng `oms_test`, namespace `audit-*`; không ghi live DB.
- Các ca audit hiện lưu actual behavior, chưa phải regression mong đợi PASS sau sửa. Không đổi expected để làm test xanh, không tuyên bố test cũ đã bao phủ những tình huống mới này.

## Thứ tự ưu tiên

1. Sửa F01/F02/F03 và bổ sung ca tiền/bù/thu phí vào suite chính.
2. Sửa F04; kiểm sửa kho không đổi vùng và preview phí/ETA đúng.
3. Hoàn thiện tra cứu/lọc/phân trang và liên kết khách→đơn.
4. Chuẩn hóa form hành động/hạn mức và cập nhật kiểm thử UI hiện hành.
5. Chạy lại toàn bộ cùng regression mới, sau đó mới chốt P7/P8. Không đánh dấu hoàn tất vì đã có đủ menu hoặc vì chỉ happy-path đạt.
