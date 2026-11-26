# Bộ demo lặp lại DOM / RMA — 26/11/2026

## Mở nhanh

- ShopVui EZMART: http://127.0.0.1:8000/#/shop/oms
- EZMART nhân viên: http://127.0.0.1:3001
- **Danh sách link của 17 ca hiện hành:** `backend/storage/demo/LUOT-HIEN-TAI.md`.
- **Tài khoản ShopVui của lượt hiện hành** được ghi trong file trên; mật khẩu demo mặc định công khai `DemoShop2026` (hoặc `DEMO_BUYER_PASSWORD` nếu người vận hành đặt riêng). Không dùng mật khẩu/tài khoản này cho dữ liệu hoặc tiền thật. Actor nội bộ tạo chứng từ mẫu chỉ có vai trò Nhân viên; thay danh mục dùng Quản lý đang hoạt động, không tạo một Quản lý không đăng nhập được để vô tình bỏ qua chặn Quản lý cuối cùng.
- Tài khoản nhân viên và mật khẩu cũ được giữ nguyên; không cấp thông tin đăng nhập Quản lý mới ra tài khoản ShopVui.

Tài khoản demo mới có sổ OPEN 6.000.000đ đúng một lần. Bộ dữ liệu đã đặt sẵn 1 đơn SHOP01 bằng ví (47.500đ với giá hiện tại), nên số dư hiển thị ban đầu của **tài khoản đã chuẩn bị** là 5.952.500đ. Tài khoản khách tự đăng ký mới vẫn nhận đủ 6.000.000đ. Hủy SHOP01 sẽ được hoàn ví theo nghiệp vụ, không tạo lại dòng OPEN.

## Chuẩn bị lượt mới: một lệnh

Chạy tại `D:\project\oms\backend`:

```sh
npm run demo:refresh
```

Lệnh chỉ chạy khi được người vận hành gọi, không tạo watcher, service hoặc autostart. Nó:

1. Tìm Node24 hợp lệ đã cài (có thể đặt `OMS_NODE`); không đổi Node mặc định toàn máy.
2. Sao lưu DB chính, rồi dừng **đúng server thuộc dự án** bằng helper có kiểm PID/đường dẫn.
3. Với lượt demo cũ được đánh dấu trong `NHAT_KY/DEMO_RUN`: hủy những đơn chưa xuất có tiền mô phỏng, khóa phiên của **đúng tài khoản demo đó**. Không suy quyền sở hữu từ tên/điện thoại.
4. Bổ sung/kiểm kê ATP theo ma trận demo, vẫn giữ lượng giữ của các đơn khác và các ngăn QC/cách ly. Không xóa tài khoản, ví hoặc đơn ngoài phạm vi demo.
5. Tạo tài khoản demo mới, 17 ca mới qua các service nghiệp vụ, deadline mới; ghi link hiện hành rồi mở lại app trong `OMS_DEMO_MODE=1`, SePay tiền thật bị khóa.

**Đây là tạo lượt mới có lưu lịch sử, không phải xóa sạch DB mỗi lần.** Các chứng từ đã xuất/giao, hồ sơ trả và tiền của lượt trước được giữ lại. QC/cách ly cũ có thể vẫn tồn tại; khi kiểm chứng nghiệp vụ, đối chiếu **biến động của ca đang làm** trong sổ tồn, không mặc định tổng QC/cách ly toàn kho bằng 0. File hiện hành luôn trỏ tới các ca mới. Không chạy cùng lúc với E2E hoặc thao tác của nhân viên/khách; wrapper từ chối nếu cổng test3002 đang bận.

Nếu chuẩn bị lỗi, app được giữ dừng và backup giữ nguyên; không tự restore/drop/reset. Sửa nguyên nhân rồi chạy lại. Các lượt FAILED không được ghi là READY. Không gọi `db:reset-test`, `db:seed-realistic` hoặc `docker compose down -v` để làm mới lượt này.

## Giá đã giảm đúng 50%

Giá nền được đóng băng trong `backend/prisma/demo-catalog.ts`; chạy lại không tiếp tục chia đôi giá đã giảm. Đơn lịch sử giữ giá chụp lúc đặt.

| SKU | Sản phẩm | Trước | Hiện tại |
|---|---|---:|---:|
| BT-750-XANH | Bình giữ nhiệt 750ml – Xanh | 250.000 | 125.000 |
| HT-1200 | Hộp thực phẩm 1.200ml – Trong suốt | 90.000 | 45.000 |
| CH-500 | Cốc thủy tinh 500ml | 65.000 | 32.500 |
| KT-SET | Khăn tắm cotton – Xám | 120.000 | 60.000 |
| DC-3 | Dao bếp bộ 3 | 185.000 | 92.500 |
| TH-5 | Thùng đựng 5L – Trắng | 75.000 | 37.500 |
| BD-28 | Chảo chống dính 28cm | 320.000 | 160.000 |
| KH-2 | Khay inox chữ nhật | 110.000 | 55.000 |
| TG-1 | Túi giữ nhiệt – Xanh | 145.000 | 72.500 |
| CB-6 | Bộ cốc 6 chiếc | 210.000 | 105.000 |

`KH-2` chỉ đổi mô tả từ khay 2 ngăn sang khay chữ nhật để khớp ảnh có quyền sử dụng; không đổi mã SKU. Các patch giá/tồn/ảnh cũ trong trình duyệt không còn ghi đè danh mục EZMART. Các shop mẫu khác vẫn chỉ để xem, không nhận đơn.

## 17 ca sẵn để thao tác

| Ca | Nội dung | Bắt đầu ở |
|---|---|---|
| DOM01 | Một kho → đóng gói → bàn giao → giao → thu COD | Đơn đã xác nhận, giữ hàng |
| DOM02 | Bình chỉ có ở HN + hộp chỉ có ở ĐN → bắt buộc 2 kho | Hai kiện đã giữ |
| DOM03 | Cùng SKU ở nhiều kho, chọn tổng cước + đóng gói thấp nhất | Kho HN khi giao HN |
| DOM04 | Thiếu KT-SET → không giữ hàng, chờ bổ sung | CHO_HANG |
| DOM05 | Đóng gói rồi, sẵn sàng bàn giao | CHO_BAN_GIAO |
| DOM06 | Đã xuất kho, đang giao COD | DANG_GIAO |
| DOM07 | Giao thất bại, thử giao lại hoặc chuyển hoàn | GIAO_THAT_BAI |
| DOM08 | Hủy trước xuất, xem lượng giữ được giải phóng | DANG_GIU |
| DOM09 | Chặn pack vì quá hạn SLA | Deadline hết hạn có audit DEMO rõ ràng |
| RMA01 | Duyệt/từ chối yêu cầu khách trả | CHO_DUYET |
| RMA02 | Nhận hàng và QC cùng bước | CHO_NHAN |
| RMA03 | Đã nhận 2 món, chỉ còn kiểm định | CHO_QC |
| RMA04 | Hỏng do vận chuyển → cách ly + biên bản | Biên bản CHO_GUI, hoàn mô phỏng đã xong |
| RMA05 | Chuyển hoàn COD, thử thiếu/hỏng/đạt | Chờ nhận 3 món |
| RMA06 | Tra soát khoản hoàn chưa rõ | CHUA_RO / CHO_HOAN_TIEN |
| BC01 | Hai kho, đã giao và thu đủ → đối chiếu báo cáo | Hoàn tất hàng và tiền |
| SHOP01 | Đơn gắn tài khoản ShopVui, ví đã trừ | Có thể hủy để kiểm hoàn ví |

Gợi ý RMA05: thực nhận2, đạt1, lỗi1, nguyên nhân VẬN_CHUYỂN, kết luận thiếu1 → 1 món về tồn bán được, 1 cách ly, hai biên bản hư hỏng/thất lạc. Đơn COD chưa thu tiền hàng không tự sinh hoàn tiền hàng chưa thu. DOM09 cố ý đặt deadline quá hạn bằng command `DEMO_HAN_SLA`, không phải lỗi bộ dữ liệu; chuẩn bị lượt mới sẽ tạo ca mới, các ca còn lại có hạn24h mới.

## Ma trận ATP và giới hạn

- Bình BT-750-XANH và chảo BD-28 chỉ có ATP tại HN.
- Hộp HT-1200 và khay KH-2 chỉ có ATP tại ĐN.
- Dao DC-3 và túi TG-1 chỉ có ATP tại HCM.
- Cốc CH-500, thùng TH-5, bộ cốc CB-6 có ở cả 3 kho.
- KT-SET để ATP0 dành riêng cho bài thiếu hàng.
- Target trước khi tạo ca là120 ở kho độc quyền,80/kho ở SKU nhiều kho. Sau khi dựng17 ca, ATP giảm theo các ca đã giữ/xuất; đây là thay đổi thật qua sổ tồn, không gán giả số lượng.
- Nếu có kho khác ngoài3kho chứa ATP của SKU demo, hoặc giá đã thay đổi khác giá gốc/giá demo, công cụ từ chối thay vì tự đụng dữ liệu ngoài phạm vi.

## Ảnh

10 ảnh chụp được lưu local tại `frontend/assets/images/ezmart/`, tổng khoảng588KB WebP. Đã mở tờ ảnh đối chiếu từng SKU và kiểm trên trang shop ở1366/390 khi chặn tải HTTPS ngoài.

- Nguồn/tác giả/giấy phép/thay đổi: `credits.html` và `credits.json` cùng thư mục; footer ShopVui có link.
- Giấy phép CC0/CC BY/CC BY-SA, giữ attribution và Share-Alike tương ứng cho ảnh đã chỉnh.
- Ảnh cùng loại/màu phục vụ sản phẩm hư cấu, **không xác minh đúng dung tích/kích thước/nhà sản xuất**. Bộ6cốc là ảnh ghép6chiếc từ ảnh cốc được cấp phép. Khay là phần khay tách rời được cắt khỏi ảnh cân, mô tả đã sửa để không gọi nhầm là khay2ngăn.
- Không tuyên bố quyền sử dụng ảnh của toàn bộ shop mẫu khác đã được rà soát. Ảnh/font bên ngoài của phần marketplace minh họa vẫn cần Internet; riêng 10 ảnh EZMART không cần host ảnh ngoài.

## Tiền thật và cổng DB

Với cấu hình local mặc định (`OMS_DEMO_REAL_BANK` không bật), `OMS_DEMO_MODE=1` khóa cả cấu hình SePay, QR, việc ghi giao dịch vào từ poller và API tạo đơn chuyển khoản; không chỉ ẩn nút. Token/tài khoản ngân hàng cũ không bị xóa, nhưng không được sử dụng trong bản demo. Không chuyển tiền thật để thử bộ dữ liệu này.

Windows đã giữ dải55380–55479, chặn cổng DB55432 mà không có tiến trình chiếm cổng. Theo lựa chọn của chủ dự án, chỉ cấu hình OMS được đổi sang **15432** (`OMS_DB_PORT` và cả2URL trong `.env`), giữ nguyên volume `oms-course`; không sửa reserved range Windows và không dừng WarehouseFlow/Lumina. Default mẫu vẫn55432 để máy khác có thể dùng; nếu đổi cổng phải đổi cả `DATABASE_URL`/`TEST_DATABASE_URL`. URL web3001/8000 không đổi.

Profile public hỗn hợp nằm ở [public-deploy.md](public-deploy.md), chỉ cho phép SePay thật bằng opt-in riêng. Không chạy refresh khi bank bật hoặc tài khoản fixture liên quan receipt SePay thật; preparer từ chối thay vì khóa tài khoản có tiền thật.

## Bản thay thế và bằng chứng

Trước thay:82 đơn legacy =80 đơn có auditseed +2 đơn gateway/ngân hàng demo rõ nhãn;0 đơn gắn tài khoản khách và0 chứng từ SePay thật. Chỉ82 đơn đã duyệt cùng18hồ sơ/227biến động mẫu được thay một lần bằng script bảo vệ scope, **không có endpoint reset public**. Các tài khoản nhân viên/cấu hình khách được giữ. Chưa có tài khoản ShopVui thật trong DB chính lúc thay.

Backup trước thay trực tiếp: `backend/storage/backups/oms_20261126_022422_670793.dump` (có cả backup trước đó `oms_20261125_223248_444898.dump`). Lệnh refresh thực tế tiếp theo tự tạo `oms_20261126_024559_342351.dump`. Các file dump chứa dữ liệu riêng của máy, không gửi lên Git/web/ZIP source.

Bằng chứng trong `backend/artifacts/qa/demo-refresh/`:
- `rehearsal.json`:3 lượt trên bản clone; có tạo tài khoản/đơn ngoài demo làm sentinel, chứng minh vẫn nguyên ví/hồ sơ/đơn/giữ hàng sau các lượt.
- `main-legacy-replacement.log`, `main-prepare.log`, `main-repeat-command.log`: đã thay và chạy lệnh lặp trên DB chính.
- `fixture-actor-clone.json`: kiểm thêm một lượt với actor Nhân viên, tài khoản/đơn sentinel nguyên vẹn và chặn khóa Quản lý thật cuối cùng vẫn hoạt động; main chỉ sửa role của actor demo tạo trong lần thay dữ liệu này, không đổi tài khoản nhân viên cũ.
- `docker-repeat-result.json`: chuẩn bị lại17ca trong container, restart không tự seed lần nữa, hướng dẫn lấy lại từ DB.
- `unit-final.log`:38/38; `integration-final.log`:14/14; `e2e-final-confirmed.log`:10/10 (lượt sau mở rộng kiểm cachegiá/ảnh).
- `container-smoke.json`: Docker mới, ảnh local, mobile/desktop,100requestcatalog/10đồng thời đều200; không phải chứng nhận chịu tải Internet.

Đánh giá deploy và những điểm chưa đạt: **[deployment-readiness-20261126.md](deployment-readiness-20261126.md)**.
