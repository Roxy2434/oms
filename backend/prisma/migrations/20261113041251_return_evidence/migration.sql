-- AlterTable
ALTER TABLE "HO_SO_TRA" ADD COLUMN     "ghi_chu_khach" TEXT;

-- CreateTable
CREATE TABLE "ANH_TRA" (
    "id" TEXT NOT NULL,
    "ho_so_tra_id" TEXT NOT NULL,
    "loai_tep" TEXT NOT NULL,
    "du_lieu" BYTEA NOT NULL,
    "tao_luc" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ANH_TRA_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ANH_TRA_ho_so_tra_id_idx" ON "ANH_TRA"("ho_so_tra_id");

-- AddForeignKey
ALTER TABLE "ANH_TRA" ADD CONSTRAINT "ANH_TRA_ho_so_tra_id_fkey" FOREIGN KEY ("ho_so_tra_id") REFERENCES "HO_SO_TRA"("id") ON DELETE CASCADE ON UPDATE CASCADE;
