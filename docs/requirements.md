# Bản đồ yêu cầu nguồn
HTML là nguồn ban đầu; Word tham khảo bố cục báo cáo. Chính sách DOM mới nhất ngày13/11/2026: bỏ tọa độ/khoảng cách, dùng vùng/phí/thời gian mẫu; một kho trước hai kho. Phạm vi loại trừ thanh toán và tích hợp hãng/sàn thật xem HANDOVER.md.
## Quy tắc R01–24
| Mã | Yêu cầu gốc | Nơi triển khai/kiểm chứng |
|---|---|---|
| R01 | Tiền tính bằng đồng Việt Nam; số lượng là số nguyên dương. Không bán theo kg hoặc số lẻ trong bản đầu. | orders/allocation; P3–P4 |
| R02 | Một đơn có ít nhất một dòng SKU; một SKU chỉ xuất hiện một dòng trong cùng đơn. Không có giảm giá/mã khuyến mại ở bản đầu. | orders/allocation; P3–P4 |
| R03 | Giá và thông tin người nhận được chụp vào đơn. Sửa giá sản phẩm hoặc địa chỉ hồ sơ khách không tự thay đổi đơn đã xác nhận. | orders/allocation; P3–P4 |
| R04 | ATP = max(0, tồn bán được − đang giữ − tồn an toàn). Tồn bán được bao gồm hàng đang giữ; không bao gồm chờ QC và cách ly. | orders/allocation; P3–P4 |
| R05 | Chọn phương án một kho nếu có phương án hợp lệ. Chỉ khi không có mới xét hai kho. Trong tập hợp lệ theo ATP/vùng/SLA mẫu, chọn tổng cước + đóng gói nhỏ nhất; hòa thì ETA sớm hơn, cuối cùng theo mã kho. Không tính khoảng cách hoặc tuyên bố kho gần nhất. | orders/allocation; P3–P4 |
| R06 | Mọi kiện trong phương án phải đủ tồn, có tuyến phí và ETA offline gồm xử lý/chờ/vận chuyển đạt hạn giao; pack/handover phải kiểm thời gian vận chuyển còn lại, không tự gia hạn deadline của nháp mới. Không có phương án thì giữ đơn ở CHO_HANG, ghi lý do; không tự hứa giao được. | orders/allocation; P3–P4 |
| R07 | Giữ đủ toàn bộ lượng của đơn trong một giao dịch hoặc không giữ gì. Hai đơn tranh cùng hàng không được làm ATP âm. | orders/allocation; P3–P4 |
| R08 | Bản đầu mỗi kho tạo một kiện cho một đơn, tối đa hai kiện. Có thể chia lượng của cùng SKU giữa hai kho. Không tự đổi kho sau xác nhận; cần hủy cả đơn chưa xuất và lập đơn mới nếu chọn lại. | orders/allocation; P3–P4 |
| R09 | Giữ hàng không làm giảm tồn bán được. Bàn giao mới giảm tồn bán được và giảm lượng giữ, ghi sổ biến động đúng một lần. | orders/allocation; P3–P4 |
| R10 | Chỉ sửa dòng hàng, địa chỉ, phương thức trả và phí giao khi đơn còn nháp/chờ hàng, chưa có giao dịch thu thành công. Không sửa trực tiếp đơn đã xác nhận. | orders/allocation; P3–P4 |
| R11 | Được hủy toàn đơn khi tất cả kiện chưa xuất. Sau khi có kiện xuất, chỉ hủy nguyên kiện chưa xuất; không sửa số lượng trong kiện. Phần đã xuất phải giao tiếp hoặc chuyển hoàn. | orders/allocation; P3–P4 |
| R12 | Hủy kiện chưa xuất phải giải phóng giữ. Không tự cộng tồn cho kiện đã xuất, dù giao thất bại; chỉ nhận hoàn và QC mới cập nhật lại tồn. | orders/allocation; P3–P4 |
| R13 | Trả hàng phải gắn dòng kiện gốc. Tổng lượng đã duyệt trả ở các hồ sơ chưa bị từ chối không vượt lượng đã xuất; lượng khách chủ động trả chỉ thuộc kiện đã giao. | returns/payments; P5 |
| R14 | Mỗi dòng trả nhận/QC một lần. Lượng nhận không vượt lượng được duyệt; lượng đạt + lượng lỗi = lượng nhận khi chốt QC. Thiếu hoặc sai SKU phải xử lý và ghi kết luận trước khi đóng. | returns/payments; P5 |
| R15 | Hàng hoàn nhận vào chờ QC. QC đạt chuyển sang bán được, QC lỗi chuyển sang cách ly; không tăng tồn hai lần. | returns/payments; P5 |
| R16 | Hoàn tiền hàng bằng giá chụp × lượng được duyệt hoàn. Không hoàn phí giao trong chính sách demo. Lượng được duyệt hoàn không vượt lượng nhận và cần ghi lý do nếu khác lượng QC đạt. | returns/payments; P5 |
| R17 | Tiền hoàn thành công + khoản hoàn đang chờ/chưa rõ, kể cả yêu cầu mới, không vượt tiền thu thành công. COD chưa thu không phát sinh hoàn tiền hàng. | returns/payments; P5 |
| R18 | Đơn trả trước chỉ bàn giao sau khi thu đủ số phải thu hiện tại. COD chỉ ghi thu khi thực sự có chứng từ xác nhận, không tự ghi thu chỉ vì bấm Đã giao. | returns/payments; P5 |
| R19 | Khi hủy một phần, trừ tiền hàng của kiện bị hủy; giữ nguyên phí giao nếu còn kiện tiếp tục. Hủy toàn đơn thì số phải thu về 0. Khoản trả trước dư được hoàn, không cần hồ sơ hàng trả. | returns/payments; P5 |
| R20 | Ghi nhận thu/hoàn mô phỏng có chứng từ tham chiếu. Tiền khách đã trả không có nghĩa là hãng giao hàng đã chuyển tiền cho cửa hàng; bản đầu không quản lý vế chuyển tiền này. | returns/payments; P5 |
| R21 | Mỗi lần nhập, giữ, giải phóng, xuất, nhận hoàn, QC, điều chỉnh và thu/hoàn có khóa chống trùng. Gửi lại cùng thao tác không ghi tiền hoặc tồn lần hai. | commands/inventory/catalog; P2–P5 |
| R22 | Không xóa chứng từ đã xác nhận. Sửa sai bằng nghiệp vụ bù có lý do và nhật ký; không sửa âm thầm giao dịch tiền đã thành công. | commands/inventory/catalog; P2–P5 |
| R23 | Thay đổi tồn không được làm các nhóm tồn âm, hoặc làm tồn bán được nhỏ hơn đang giữ. Kiểm kê có xung đột biến động phải đếm lại trước khi chốt. | commands/inventory/catalog; P2–P5 |
| R24 | SKU/kho đã được dùng chỉ được ngừng sử dụng. Không ngừng kho còn hàng hoặc kiện đang xử lý; không ngừng SKU còn tồn hoặc nghĩa vụ đang mở. | commands/inventory/catalog; P2–P5 |
## Ca nghiệm thu T01–20
Mọi ca dưới đây là yêu cầu, **chưa phải kết quả PASS**.
| Mã | Tình huống / kỳ vọng gốc | Mốc |
|---|---|---|
| T01 | Nhân viên gọi API báo cáo/quản trị trực tiếp — Bị từ chối; Quản lý thực hiện được. Nhân viên vẫn làm được nghiệp vụ và duyệt. | P2–P8; kết quả ghi test-report |
| T02 | Khóa Quản lý hoạt động cuối cùng; khóa tài khoản đang đăng nhập — Không cho mất Quản lý cuối cùng; tài khoản bị khóa không dùng tiếp phiên cũ. | P2–P8; kết quả ghi test-report |
| T03 | Tạo đơn thiếu địa chỉ, lượng 0 hoặc quá giới hạn demo — Báo đúng trường, không tạo chứng từ/tồn không hợp lệ. | P2–P8; kết quả ghi test-report |
| T04 | Một kho đủ hàng; hai kho có phương án rẻ hơn — Vẫn chọn nhóm một kho theo chính sách, không tuyên bố tối ưu tuyệt đối. | P2–P8; kết quả ghi test-report |
| T05 | Không kho nào đủ riêng nhưng một cặp kho đủ — Tạo đúng hai kiện; tổng lượng phân đúng lượng đặt, chi phí và ETA giải thích được. | P2–P8; kết quả ghi test-report |
| T06 | Thiếu tồn/không có tuyến/không đạt hạn — Đơn CHO_HANG có lý do; không giữ dở dang hoặc xác nhận giả. | P2–P8; kết quả ghi test-report |
| T07 | Hai phiên đồng thời xác nhận mua lượng cuối cùng — Chỉ phiên đủ tồn thành công; không âm ATP và không mất giữ hàng. | P2–P8; kết quả ghi test-report |
| T08 | Bấm xác nhận/bàn giao/thu tiền hai lần — Chỉ ghi một lần; sổ tồn/tiền không nhân đôi. | P2–P8; kết quả ghi test-report |
| T09 | Trả trước chưa thu đủ; thử bàn giao — Bị chặn. Đủ thu mới bàn giao; bán được và giữ giảm đúng lượng. | P2–P8; kết quả ghi test-report |
| T10 | Hủy trước xuất; hủy kiện chưa xuất trong đơn đã xuất một phần — Giải phóng đúng giữ; không cộng hàng đã xuất; tính nghĩa vụ và phí theo chính sách. | P2–P8; kết quả ghi test-report |
| T11 | Giao thất bại rồi chuyển hoàn — Chưa tăng tồn cho đến nhận; nhận vào chờ QC, QC mới chuyển bán được/cách ly. | P2–P8; kết quả ghi test-report |
| T12 | Trả một phần; hai yêu cầu trả đồng thời vượt lượng — Chỉ nhận lượng hợp lệ; tổng duyệt trả không vượt hàng nguồn. Các món không trả giữ nguyên. | P2–P8; kết quả ghi test-report |
| T13 | QC đạt/lỗi; gửi lại nhận hoặc QC — Tổng lượng đúng; không nhập hoàn hai lần; lỗi không vào tồn bán được. | P2–P8; kết quả ghi test-report |
| T14 | Hoàn vượt thu hoặc tạo hai lệnh hoàn cùng lúc — Bị chặn, tính cả khoản chờ/chưa rõ; COD chưa thu không hoàn tiền hàng. | P2–P8; kết quả ghi test-report |
| T15 | Đổi địa chỉ khách/giá SKU sau xác nhận — Thông tin và giá chụp trên đơn cũ giữ nguyên. | P2–P8; kết quả ghi test-report |
| T16 | Kiểm kê trong lúc có biến động; đếm thấp hơn lượng giữ — Chặn phiên bản cũ/yêu cầu đếm lại; không tự xóa giữ hoặc làm tồn âm. | P2–P8; kết quả ghi test-report |
| T17 | Cố đóng hồ sơ còn hàng chưa kết luận/hoàn tiền chưa rõ — Bị chặn, hiển thị việc còn phải xử lý. | P2–P8; kết quả ghi test-report |
| T18 | Đối chiếu ví dụ AV-001 và báo cáo — Tồn hộp về 8, thu 370000đ, hoàn 90000đ, ròng 280000đ; số báo cáo truy được về dữ liệu nguồn. | P2–P8; kết quả ghi test-report |
| T19 | Xuất CSV; truy cập bằng bàn phím và màn nhỏ — CSV đúng bộ lọc/không thực thi công thức người dùng nhập; focus rõ, bảng cuộn và không mất nút thao tác. | P2–P8; kết quả ghi test-report |
| T20 | Sao lưu rồi khôi phục dữ liệu demo — Khôi phục được và kiểm tra lại liên kết đơn–kiện–tiền–tồn; ghi thời gian thực tế. | P2–P8; kết quả ghi test-report |
