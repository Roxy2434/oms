# Các góc tài chính đã khóa trước mutation

Đây là ví dụ đặc tả P0, không phải minh chứng services đã chạy.

| Trường hợp | Số cụ thể | Kết quả bắt buộc |
|---|---|---|
| Thu chưa rõ | Nghĩa vụ 370000; thu thành công 200000, chờ 100000, chưa rõ 70000 | Khả dụng thu mới = 0; chặn sửa. Hủy được nhưng chỉ hoàn từ tiền thành công. Khoản chưa rõ sau đó thành công tạo tiền dư cần hoàn. |
| Hủy kiện COD | Hàng A 250000, B 90000; phí 30000 phân vào A; A chưa xuất, B đã xuất COD 90000 | Hủy A: nghĩa vụ 120000; không sửa COD B đã xuất; thu phí thiếu 30000 bằng chứng từ riêng. |
| Chuyển hoàn chưa thu | Hàng 90000, phí 30000; chưa thu; hàng nhận/QC có kết luận | Miễn thu hàng 90000 có audit, không tạo hoàn 90000; còn thu phí 30000. |
| Thiếu/sai SKU | Duyệt 2 hộp, thực nhận đúng 1 hộp, 1 món khác | Chỉ 1 hộp vào QC; không tăng tồn hộp cho món sai. Hồ sơ mở tới khi chốt thiếu/sai và hạn mức tiền. |
| Hạn mức RMA | Thu 370000; RMA được hoàn 90000; đang chờ hoàn 90000 | Không tạo thêm hoàn dù tổng thu còn 280000; kiểm cả nguyên nhân lẫn đơn. |
| Bù thu sai | Thu sai 50000 đã thành công; bù hoàn 20000 | Còn bù tối đa 30000 gắn giao dịch gốc, không trừ hạn mức RMA; không đổi tồn. |
| Bù hoàn sai | Hoàn sai 40000; đã thu bù 15000 | Còn thu bù tối đa 25000 gắn giao dịch gốc, không thay dòng hàng. |
| AV-001 | Hàng 340000 + phí 30000; thu 370000; trả hộp 90000 | Hoàn 90000; tiền ròng 280000; hộp tồn về 8 sau QC đạt. |

Các ví dụ phải được đưa vào integration/race tests khi P3–P5 xây mutation. Không chỉ dùng tổng thu để kiểm hạn mức; khoản chờ/chưa rõ giữ hạn mức, thất bại giải phóng hạn mức.
