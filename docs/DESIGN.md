---
version: alpha
name: EZMART Coursework
description: Light Vietnamese order-management workspace with blue accents.
colors:
  background: "#f5f7fb"
  surface: "#ffffff"
  ink: "#172b4d"
  muted: "#52627a"
  border: "#dce3ed"
  primary: "#2563eb"
  sidebar: "#eff4ff"
omitted:
  - typography
  - rounded
  - spacing
  - components
---

## Overview

EZMART là giao diện đồ án quản lý đơn hàng tiếng Việt, nền sáng và điểm nhấn xanh lam. Giữ hướng giao diện đã được người dùng duyệt, không thiết kế lại khi bổ sung nghiệp vụ.

## Colors

Dùng primary cho hành động chính, điều hướng đang chọn và liên kết chứng từ. Dùng muted cho nội dung phụ, không làm mờ số liệu nghiệp vụ. Trạng thái phải có chữ hoặc biểu tượng, không dựa riêng vào màu.

## Typography

Workspace dùng Be Vietnam Pro; login theo mẫu người dùng dùng Inter. Font được tự phục vụ, không phụ thuộc Google Fonts lúc chạy. Tiền và số lượng dùng chữ số tabular, căn phải trong bảng; giữ định dạng Việt Nam xuyên suốt.

## Layout

Dashboard Quản lý đặt bốn KPI bằng nhau ở đầu, không ưu tiên riêng một chỉ tiêu bằng kích thước hoặc nền. Đơn gần đây bên trái và việc cần xử lý bên phải phải xuất hiện trong viewport desktop đầu tiên. Biểu đồ chiếm nguyên hàng tiếp theo, không để khoảng trống bên phải; tình hình kho và hiệu quả nằm sau. Dashboard Nhân viên tập trung công việc, không nhận KPI tài chính tổng hợp.

Giữ sidebar và trạng thái thu gọn trong layout chung qua đổi trang. Sidebar phải vừa màn laptop thông thường; chỉ cuộn khi màn thực sự thấp. Điện thoại dùng drawer; bảng rộng chỉ cuộn trong vùng được đặt tên, không kéo rộng cả trang.

Login giữ mô hình kho cutaway của mẫu người dùng ở trái và form trắng ở phải. Header chỉ giữ biểu tượng Boxes và tên EZMART · Quản lý đơn hàng; không khôi phục khẩu hiệu, mô tả kỹ thuật, nhãn Digital Twin, nút phóng to hoặc nút phân khu đã bị yêu cầu bỏ. Giữ thanh xoay/reset/Autoplay ở dưới mô hình. Mobile/tablet ưu tiên form và không tải engine trang trí. Không WebGL vẫn phải nhìn thấy và dùng được form.

## Elevation & Depth

Phân tách nội dung bằng surface và đường viền nhẹ. Bóng đổ của lớp nổi không được che thông tin phía dưới. Mô hình login có chiều sâu và ánh sáng riêng, không áp hiệu ứng kính hoặc nền ba chiều sang màn nghiệp vụ.

## Components

Tạo đơn là một màn làm việc: người nhận có địa chỉ tỉnh/thành được điền sẵn từ khách, sản phẩm và phần kho/phí/tổng cập nhật trong ngữ cảnh. Không đưa lại ô Vùng giao riêng cạnh thanh toán hoặc phí nhập tay ở luồng mới. Hành động chính là Tạo đơn và xác nhận; Lưu nháp là phụ. Không bắt người dùng tạo nháp rồi mở thêm khung phân bổ. Báo phí đổi phải được xem lại, không tự chốt số mới; lỗi chưa rõ kết quả cho kiểm tra lại cùng thao tác thay vì tạo thêm đơn. Đơn lịch sử giữ phí đã chốt, không định giá lại chỉ vì thay giao diện.

Dùng chung button, panel, nhãn trạng thái và form giữa các màn nghiệp vụ. Dialog phải có tiêu đề, nút đóng, hỗ trợ Escape, giữ focus khi mở và trả focus về nơi kích hoạt khi đóng.

Giữ nội dung trang cũ tới khi điều hướng sẵn sàng, không chèn khoảng trắng/loading thay thế. Entrance áp lên nội dung thật, không hoàn tất trên khung chờ dữ liệu. Các bộ đếm chốt đúng dữ liệu máy chủ, trình đọc màn hình nhận số cuối; đường biểu đồ vẽ xong phải còn đầy đủ sau resize.

Mặc định tôn trọng reduced-motion trong cả CSS và JavaScript. Không đưa lại bộ chọn chuyển động hiển thị đã bị yêu cầu bỏ. Reduced-motion hiển thị số cuối và sơ đồ phân bổ tĩnh nhưng vẫn đọc đủ SKU, lượng, kho và phí. Không phát hiệu ứng thành công trước phản hồi lưu thành công.

Login dùng mô hình làm minh họa, không tuyên bố có thiết bị hoặc tích hợp tự động thật. Tạm dừng phải dừng cả các vật thể động; tab ẩn/offscreen không tiếp tục render trang trí. Xoay/reset chủ động vẫn dùng được khi giảm chuyển động. Rời trang phải giải phóng tài nguyên đồ họa; lỗi mô hình không được chặn xác thực.

## Do's and Don'ts

- Giữ cùng ngôn ngữ thiết kế giữa đơn, kho, giao nhận, trả hàng và báo cáo.
- Không thêm số giả, tỷ lệ tăng trưởng chưa định nghĩa, đối tác thật hoặc nút báo thành công khi chưa lưu.
- Không thay dashboard bằng trang báo cáo, chuyển sang dark mode hoặc phong cách landing page.
- Không tự thay mô hình login người dùng cung cấp bằng các bản ảnh/SVG/mô hình cũ đã bị từ chối.
