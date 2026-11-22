-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('CHO_GUI', 'DA_GUI', 'DUOC_BOI_THUONG', 'TU_CHOI', 'KHONG_YEU_CAU');

-- AlterTable
ALTER TABLE "HO_SO_TRA" ADD COLUMN     "ma_rma" TEXT;

-- CreateTable
CREATE TABLE "BIEN_BAN_BOI_THUONG" (
    "id" TEXT NOT NULL,
    "ma_bien_ban" TEXT NOT NULL,
    "ho_so_tra_id" TEXT NOT NULL,
    "ten_hang" TEXT NOT NULL,
    "so_luong" INTEGER NOT NULL,
    "gia_tri" DECIMAL(14,0) NOT NULL,
    "ly_do" TEXT NOT NULL,
    "trang_thai" "ClaimStatus" NOT NULL DEFAULT 'CHO_GUI',
    "ghi_chu" TEXT,
    "tao_luc" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cap_nhat_luc" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BIEN_BAN_BOI_THUONG_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BIEN_BAN_BOI_THUONG_ma_bien_ban_key" ON "BIEN_BAN_BOI_THUONG"("ma_bien_ban");

-- CreateIndex
CREATE INDEX "BIEN_BAN_BOI_THUONG_ho_so_tra_id_idx" ON "BIEN_BAN_BOI_THUONG"("ho_so_tra_id");

-- CreateIndex
CREATE UNIQUE INDEX "HO_SO_TRA_ma_rma_key" ON "HO_SO_TRA"("ma_rma");

-- AddForeignKey
ALTER TABLE "BIEN_BAN_BOI_THUONG" ADD CONSTRAINT "BIEN_BAN_BOI_THUONG_ho_so_tra_id_fkey" FOREIGN KEY ("ho_so_tra_id") REFERENCES "HO_SO_TRA"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Backfill: existing return cases get sequential RMA codes in creation order.
UPDATE "HO_SO_TRA" h SET "ma_rma" = 'RMA-' || lpad(x.n::text, 4, '0')
FROM (SELECT id, row_number() OVER (ORDER BY "tao_luc", id) AS n FROM "HO_SO_TRA") x
WHERE x.id = h.id;

ALTER TABLE "BIEN_BAN_BOI_THUONG" ADD CONSTRAINT "BIEN_BAN_BOI_THUONG_so_luong_check" CHECK ("so_luong" > 0);
ALTER TABLE "BIEN_BAN_BOI_THUONG" ADD CONSTRAINT "BIEN_BAN_BOI_THUONG_gia_tri_check" CHECK ("gia_tri" >= 0);
