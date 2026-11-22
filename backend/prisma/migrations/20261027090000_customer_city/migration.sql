-- Add structured destination without guessing arbitrary customer free-text addresses.
ALTER TABLE "KHACH_HANG" ADD COLUMN "tinh_thanh" TEXT;
ALTER TABLE "KHACH_HANG" ADD CONSTRAINT "KHACH_HANG_city_supported" CHECK ("tinh_thanh" IS NULL OR "tinh_thanh" IN ('HN','DN','HCM'));
-- Only the ten verified fictional presentation fixtures, with exact address guards.
UPDATE "KHACH_HANG" AS c SET "tinh_thanh"=v.city FROM (VALUES
 ('KH-001','24 Nguyễn Văn Cừ, Long Biên, Hà Nội','HN'),
 ('KH-002','41 Điện Biên Phủ, Thanh Khê, Đà Nẵng','DN'),
 ('KH-003','58 Lê Văn Sỹ, Quận 3, TP. Hồ Chí Minh','HCM'),
 ('KH-004','75 Lê Văn Lương, Thanh Xuân, Hà Nội','HN'),
 ('KH-005','92 Nguyễn Văn Linh, Hải Châu, Đà Nẵng','DN'),
 ('KH-006','109 Nguyễn Thị Thập, Quận 7, TP. Hồ Chí Minh','HCM'),
 ('KH-007','126 Trần Phú, Hà Đông, Hà Nội','HN'),
 ('KH-008','143 Lê Văn Hiến, Ngũ Hành Sơn, Đà Nẵng','DN'),
 ('KH-009','160 Phan Văn Trị, Gò Vấp, TP. Hồ Chí Minh','HCM'),
 ('KH-010','177 Hoàng Quốc Việt, Cầu Giấy, Hà Nội','HN')
) AS v(id,address,city) WHERE c.id=v.id AND c.dia_chi_mac_dinh=v.address;
