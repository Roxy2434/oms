-- Additive only. Historical allocationEvidence, amounts and stock are not rewritten.
ALTER TABLE "KHO" ADD COLUMN "vi_do" DOUBLE PRECISION,
 ADD COLUMN "kinh_do" DOUBLE PRECISION,
 ADD COLUMN "phi_dong_goi" INTEGER,
 ADD COLUMN "gio_xu_ly" DOUBLE PRECISION NOT NULL DEFAULT 2,
 ADD COLUMN "gio_cho" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "DON_HANG" ADD COLUMN "vi_do" DOUBLE PRECISION, ADD COLUMN "kinh_do" DOUBLE PRECISION,
 ADD COLUMN "bam_khoa_khoi_phuc" TEXT;
ALTER TABLE "KHO" ADD CONSTRAINT warehouse_coordinates CHECK (
 ("vi_do" IS NULL AND "kinh_do" IS NULL) OR ("vi_do" IS NOT NULL AND "kinh_do" IS NOT NULL AND "vi_do" BETWEEN -90 AND 90 AND "kinh_do" BETWEEN -180 AND 180));
ALTER TABLE "DON_HANG" ADD CONSTRAINT order_coordinates CHECK (
 ("vi_do" IS NULL AND "kinh_do" IS NULL) OR ("vi_do" IS NOT NULL AND "kinh_do" IS NOT NULL AND "vi_do" BETWEEN -90 AND 90 AND "kinh_do" BETWEEN -180 AND 180));
ALTER TABLE "KHO" ADD CONSTRAINT warehouse_planning_nonnegative CHECK (
 ("phi_dong_goi" IS NULL OR "phi_dong_goi" >= 0) AND "gio_xu_ly" BETWEEN 0 AND 168 AND "gio_cho" BETWEEN 0 AND 168);
-- Gaps after rollback are intentional; never count rows to reissue a document number.
CREATE SEQUENCE rma_code_seq;
SELECT setval('rma_code_seq', COALESCE(MAX(substring("ma_rma" FROM '^RMA-([0-9]+)$')::bigint),0)+1,false) FROM "HO_SO_TRA";
CREATE SEQUENCE carrier_claim_code_seq;
SELECT setval('carrier_claim_code_seq', COALESCE(MAX(substring("ma_bien_ban" FROM '^BB-([0-9]+)$')::bigint),0)+1,false) FROM "BIEN_BAN_BOI_THUONG";
CREATE INDEX "DON_HANG_trang_thai_cap_nhat_luc_idx" ON "DON_HANG"("trang_thai", "cap_nhat_luc");
CREATE INDEX "GIAO_DICH_TIEN_trang_thai_xac_nhan_luc_idx" ON "GIAO_DICH_TIEN"("trang_thai", "xac_nhan_luc");
