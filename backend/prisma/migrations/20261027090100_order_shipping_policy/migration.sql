-- Existing orders retain their recorded manual charges; never reprice historical orders.
ALTER TABLE "DON_HANG" ADD COLUMN "chinh_sach_phi_giao" TEXT NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "DON_HANG" ADD CONSTRAINT "DON_HANG_shipping_policy" CHECK ("chinh_sach_phi_giao" IN ('MANUAL','SUM_FREIGHT_V1'));
