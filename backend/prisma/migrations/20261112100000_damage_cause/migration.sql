-- Return inspection grades the cause of damage; only carrier-caused damage (and carrier-lost sender-return goods) becomes a 3PL claim.
CREATE TYPE "DamageCause" AS ENUM ('VAN_CHUYEN', 'KHACH_HANG', 'SAN_XUAT');
CREATE TYPE "ClaimKind" AS ENUM ('HU_HONG', 'THAT_LAC');
ALTER TABLE "DONG_TRA" ADD COLUMN "nguyen_nhan_loi" "DamageCause";
ALTER TABLE "BIEN_BAN_BOI_THUONG" ADD COLUMN "loai" "ClaimKind" NOT NULL DEFAULT 'HU_HONG';
