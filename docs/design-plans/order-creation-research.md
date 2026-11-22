# Tham khảo luồng tạo đơn — tài liệu chính thức

Đọc27/10/2026. Nghiên cứu tài liệu, không đăng nhập thử tài khoản thương mại; không sửa ứng dụng/dữ liệu. Không có một quy trình duy nhất cho mọi OMS/POS/ERP. SearchDuckDuckGo trả noscript, chuyển sang đọc trực tiếp trang chính thức; không lấy kết quả tìm kiếm lỗi làm bằng chứng.

## 1. Sapo OmniAI

https://help.sapo.vn/tao-va-duyet-don-hang-online-1-1

Đơn hàng→Danh sách→Tạo đơn. Chọn hàng với lượng/đơn giá/thành tiền và kiểm tồn; thêm khách cũ bằng tìm kiếm hoặc tạo mới tại chỗ. Phí giao: bổ sung địa chỉ/khu vực/khối lượng nếu thiếu, chọn phí đã cấu hình hoặc gợi ý đối tác; có thể nhập phí khác. Giao hàng lấy thông tin khách nếu có. Các kết thúc phân biệt Lưu nháp / Tạo đơn / Tạo đơn và xác nhận / Tạo đơn và giao hàng, tùy quyền/hình thức. Điều này trực tiếp bác bỏ khẳng định mọi tạo đơn đều buộc người dùng lưu nháp, đồng thời cũng bác bỏ khẳng định tất cả hệ thống đều bỏ nháp. Sapo có option bán âm; KHÔNG nhập option này vào OMS đồ án vốn cấm âm.

## 2. Shopify draft orders

https://help.shopify.com/en/manual/fulfillment/managing-orders/create-orders/create-draft

Orders→Drafts→Createorder. Không prefill arbitrarydetails. Thêm sản phẩm, khách mới/cũ/địa chỉ; thêm vận chuyển bằng rate cửa hàng đủđiềukiện/custom/localdelivery/pickup. Locationbasedrate cần customer+shippingaddress. Có save draft/send invoice/acceptpayment/paymentterms. Reserveinventory là lựa chọn riêng, không mặc định mọi draft đã giữ hàng. Có chính sách oversell của họ nhưng KHÔNG dùng trong đồ án.

https://help.shopify.com/en/manual/fulfillment/setup/order-routing

Routing tự gán location theo rule có thứ tự, default minimize split/stay destinationmarket/closestlocation. Không thể suy tất cả shop dùng cùng thuật toán hoặc cước; project vẫn ítkho→chi phí theo scope gốc.

## 3. Odoo19 Sales

https://www.odoo.com/documentation/19.0/applications/sales/sales/send_quotations/create_quotations.html

Quotation: customer→invoice/deliveryaddress từ savedcontact→products/quantity→shipping/paymentterms; Confirm đổi quotation→SalesOrder. Là ví dụ quy trình báo giá/xác nhận hợp lệ, không đại diện checkout nhanh của mọi shop. Không cần đưa moduleinvoice/tax/commission/ERP vào đồ án.

## 4. KiotViet Retail (nguồn tổng quan, không phải hướng dẫn từng click)

https://www.kiotviet.vn/huong-dan-su-dung-kiotviet/retail-he-thong-giai-phap-kiotviet/

Phân biệt Bán hàng/lập hóa đơn, Đặt hàng trước/theo dõi cọc/chuyển hóa đơn, và Giao vận/xem bảng giá/tạo đơn giao nhiều kiện. Chỉ dùng để đối chiếu ranh giới chức năng, không gán chi tiết UI/thuật toán không được tài liệu này chứng minh.

## Kết luận cho project (đề xuất, chưa triển khai)

- Địa chỉ phải có dữ liệu địa lý cấu trúc lưu cùng khách/địa chỉ nhận; chọn khách tự điền, thiếu mới hỏi. Một chuỗi địa chỉ tự do không chứng minh hệ thống biết tỉnh/thành; không hứa tự phân tích100% khi chưa có parser/danh mục/validation.
- Phíkhách và cướcđốitác là hai chính sách. Autoquote có thể theo ratecấuhình local, không cần claim APIđốitácthật. Giá quote phải có quy tắc minh bạch/nguồn và tính lại khi thay địa chỉ/hàng. Không mặc định lấy chi phí kho (có đónggói) làm phí khách.
- Không tìm thấy bằng chứng rằng một nút3clicktốiđa hay tạo+giữatomic là chuẩn bắt buộc. Project có thể chọn Tạo và xác nhận làm primary cho operator, Nháp là phụ, showquote ngayform và revalidate tồn lúcsubmit. Đây là quyết định product/backend cần userchốt, không chỉ đổi nhãn.
- UI nên cho người dùng chọnhàng/chọnkhách→xem giao+phí+tổng→Tạo và xác nhận; trường hợp chưađủtồn nêu rõ SKU/lượng hoặc tuyến/ETA, không chungchung hay báo thành cônggiả. Bài toán2chưasửa trongresearchnày.

## Sửa lại diễn giải trước

Nói 'lưu nháp là sai' hoặc 'có địa chỉ là tự biết vùng' là quá tuyệt đối. Nháp có giá trị trong các hệ thống thật; lỗi project là ép người dùng vào bước nháp rồi mởdrawer kỹthuật khóhiểu. Chọn thànhphố bên trong địa chỉ không phải nhập trùng nếu dữliệu trước chỉ là chữ tựdo; thông tin đầyđủđãlưu thì không yêu cầu chọn lại.

Haravan chỉ tải được trang chủ help, chưa lấy được hướng dẫn tạo đơn cụ thể, không dùng làm bằng chứng. Không tuyên bố đã nghiên cứu luồng chi tiết Haravan.
