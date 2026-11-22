-- CreateEnum
CREATE TYPE "Role" AS ENUM ('NHAN_VIEN', 'QUAN_LY');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('NHAP', 'CHO_HANG', 'DA_XAC_NHAN', 'DA_HUY');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('NHAP_TAY', 'WEBSITE', 'SHOPEE', 'TIKTOK');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('TRA_TRUOC', 'COD');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('DANG_GIU', 'CHO_BAN_GIAO', 'DANG_GIAO', 'DA_GIAO', 'GIAO_THAT_BAI', 'CHUYEN_HOAN', 'DA_NHAN_HOAN', 'HUY');

-- CreateEnum
CREATE TYPE "ReturnKind" AS ENUM ('KHACH_TRA', 'CHUYEN_HOAN');

-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('CHO_DUYET', 'TU_CHOI', 'CHO_NHAN', 'CHO_QC', 'CHO_HOAN_TIEN', 'DA_DONG');

-- CreateEnum
CREATE TYPE "TransactionKind" AS ENUM ('THU', 'HOAN');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('CHO_XAC_NHAN', 'THANH_CONG', 'THAT_BAI', 'CHUA_RO');

-- CreateEnum
CREATE TYPE "TransactionSource" AS ENUM ('TIEN_MAT', 'CHUYEN_KHOAN', 'COD_MO_PHONG');

-- CreateEnum
CREATE TYPE "TransactionReason" AS ENUM ('THU_TRA_TRUOC', 'THU_COD', 'THU_PHI_CON_THIEU', 'HOAN_HUY', 'HOAN_RMA', 'HOAN_BU_THU_SAI', 'THU_BU_HOAN_SAI');

-- CreateEnum
CREATE TYPE "MovementKind" AS ENUM ('NHAP', 'GIU', 'GIAI_PHONG', 'XUAT', 'NHAN_HOAN', 'QC', 'DIEU_CHINH');

-- CreateTable
CREATE TABLE "TAI_KHOAN" (
    "id" TEXT NOT NULL,
    "ho_ten" TEXT NOT NULL,
    "ten_dang_nhap" TEXT NOT NULL,
    "mat_khau_bam" TEXT NOT NULL,
    "vai_tro" "Role" NOT NULL,
    "dang_hoat_dong" BOOLEAN NOT NULL DEFAULT true,
    "phien_ban_phien" INTEGER NOT NULL DEFAULT 1,
    "tao_luc" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TAI_KHOAN_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KHACH_HANG" (
    "id" TEXT NOT NULL,
    "ho_ten" TEXT NOT NULL,
    "so_dien_thoai" TEXT NOT NULL,
    "email" TEXT,
    "dia_chi_mac_dinh" TEXT,
    "tao_luc" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KHACH_HANG_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SKU" (
    "id" TEXT NOT NULL,
    "ten_san_pham" TEXT NOT NULL,
    "bien_the" TEXT,
    "nhom_hang" TEXT NOT NULL,
    "gia_ban" DECIMAL(14,0) NOT NULL,
    "khoi_luong_gram" INTEGER NOT NULL,
    "dang_kinh_doanh" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SKU_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KHO" (
    "id" TEXT NOT NULL,
    "ten_kho" TEXT NOT NULL,
    "dia_chi" TEXT NOT NULL,
    "vung_xuat" TEXT NOT NULL,
    "dang_hoat_dong" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "KHO_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TON_KHO" (
    "kho_id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "ton_ban_duoc" INTEGER NOT NULL DEFAULT 0,
    "dang_giu" INTEGER NOT NULL DEFAULT 0,
    "ton_an_toan" INTEGER NOT NULL DEFAULT 0,
    "cho_qc" INTEGER NOT NULL DEFAULT 0,
    "cach_ly" INTEGER NOT NULL DEFAULT 0,
    "phien_ban" INTEGER NOT NULL DEFAULT 1,
    "cap_nhat_luc" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "TON_KHO_pkey" PRIMARY KEY ("kho_id","sku_id")
);

-- CreateTable
CREATE TABLE "DON_HANG" (
    "id" TEXT NOT NULL,
    "khach_hang_id" TEXT NOT NULL,
    "kenh_ban" "Channel" NOT NULL,
    "ma_don_ngoai" TEXT,
    "ten_nguoi_nhan" TEXT NOT NULL,
    "sdt_nguoi_nhan" TEXT NOT NULL,
    "dia_chi_giao" TEXT NOT NULL,
    "vung_giao" TEXT NOT NULL,
    "phuong_thuc_thanh_toan" "PaymentMethod" NOT NULL,
    "phi_giao_khach_tra" DECIMAL(14,0) NOT NULL,
    "trang_thai" "OrderStatus" NOT NULL DEFAULT 'NHAP',
    "ly_do_cho_huy" TEXT,
    "han_giao" TIMESTAMPTZ(3),
    "xac_nhan_luc" TIMESTAMPTZ(3),
    "nguoi_tao_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tao_luc" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cap_nhat_luc" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "DON_HANG_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DONG_DON" (
    "id" TEXT NOT NULL,
    "don_hang_id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "ten_hang_chup" TEXT NOT NULL,
    "so_luong" INTEGER NOT NULL,
    "don_gia_chup" DECIMAL(14,0) NOT NULL,

    CONSTRAINT "DONG_DON_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KIEN_HANG" (
    "id" TEXT NOT NULL,
    "don_hang_id" TEXT NOT NULL,
    "kho_id" TEXT NOT NULL,
    "trang_thai" "ShipmentStatus" NOT NULL DEFAULT 'DANG_GIU',
    "ma_van_don" TEXT,
    "cuoc_du_kien" DECIMAL(14,0) NOT NULL,
    "phi_dong_goi" DECIMAL(14,0) NOT NULL,
    "du_kien_giao" TIMESTAMPTZ(3) NOT NULL,
    "can_cu_chon_kho" JSONB NOT NULL,
    "cod_phan_bo" DECIMAL(14,0) NOT NULL,
    "ly_do_trang_thai" TEXT,
    "ban_giao_luc" TIMESTAMPTZ(3),
    "giao_luc" TIMESTAMPTZ(3),
    "nguoi_cap_nhat_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tao_luc" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cap_nhat_luc" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "KIEN_HANG_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DONG_KIEN" (
    "id" TEXT NOT NULL,
    "kien_id" TEXT NOT NULL,
    "dong_don_id" TEXT NOT NULL,
    "so_luong" INTEGER NOT NULL,

    CONSTRAINT "DONG_KIEN_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HO_SO_TRA" (
    "id" TEXT NOT NULL,
    "don_hang_id" TEXT NOT NULL,
    "loai" "ReturnKind" NOT NULL,
    "kho_nhan_id" TEXT NOT NULL,
    "ly_do" TEXT NOT NULL,
    "trang_thai" "ReturnStatus" NOT NULL DEFAULT 'CHO_DUYET',
    "ma_van_don_hoan" TEXT,
    "nguoi_tao_id" TEXT NOT NULL,
    "nguoi_duyet_id" TEXT,
    "ket_luan_xu_ly" TEXT,
    "resolution" JSONB,
    "waivedAmount" DECIMAL(14,0) NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tao_luc" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duyet_luc" TIMESTAMPTZ(3),
    "dong_luc" TIMESTAMPTZ(3),

    CONSTRAINT "HO_SO_TRA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DONG_TRA" (
    "id" TEXT NOT NULL,
    "ho_so_tra_id" TEXT NOT NULL,
    "dong_kien_id" TEXT NOT NULL,
    "luong_yeu_cau" INTEGER NOT NULL,
    "luong_duyet" INTEGER NOT NULL DEFAULT 0,
    "luong_nhan" INTEGER NOT NULL DEFAULT 0,
    "luong_dat" INTEGER NOT NULL DEFAULT 0,
    "luong_loi" INTEGER NOT NULL DEFAULT 0,
    "luong_duyet_hoan" INTEGER NOT NULL DEFAULT 0,
    "ket_luan" TEXT,
    "nguoi_qc_id" TEXT,
    "nhan_luc" TIMESTAMPTZ(3),
    "qc_luc" TIMESTAMPTZ(3),

    CONSTRAINT "DONG_TRA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GIAO_DICH_TIEN" (
    "id" TEXT NOT NULL,
    "don_hang_id" TEXT NOT NULL,
    "kien_id" TEXT,
    "ho_so_tra_id" TEXT,
    "loai" "TransactionKind" NOT NULL,
    "reason" "TransactionReason" NOT NULL,
    "ly_do" TEXT NOT NULL,
    "so_tien" DECIMAL(14,0) NOT NULL,
    "nguon" "TransactionSource" NOT NULL,
    "ma_tham_chieu" TEXT NOT NULL,
    "trang_thai" "TransactionStatus" NOT NULL DEFAULT 'CHO_XAC_NHAN',
    "khoa_chong_trung" TEXT NOT NULL,
    "nguoi_ghi_id" TEXT NOT NULL,
    "nguoi_duyet_id" TEXT NOT NULL,
    "originalId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tao_luc" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "xac_nhan_luc" TIMESTAMPTZ(3),

    CONSTRAINT "GIAO_DICH_TIEN_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BIEN_DONG_TON" (
    "id" TEXT NOT NULL,
    "kho_id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "loai" "MovementKind" NOT NULL,
    "delta_ban_duoc" INTEGER NOT NULL,
    "delta_giu" INTEGER NOT NULL,
    "delta_cho_qc" INTEGER NOT NULL,
    "delta_cach_ly" INTEGER NOT NULL,
    "chung_tu_loai" TEXT NOT NULL,
    "chung_tu_id" TEXT NOT NULL,
    "ly_do" TEXT NOT NULL,
    "so_truoc" JSONB NOT NULL,
    "so_sau" JSONB NOT NULL,
    "nguoi_thuc_hien_id" TEXT NOT NULL,
    "nguoi_duyet_id" TEXT NOT NULL,
    "khoa_chong_trung" TEXT NOT NULL,
    "tao_luc" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BIEN_DONG_TON_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NHAT_KY" (
    "id" TEXT NOT NULL,
    "tai_khoan_id" TEXT,
    "doi_tuong" TEXT NOT NULL,
    "ma_doi_tuong" TEXT NOT NULL,
    "hanh_dong" TEXT NOT NULL,
    "truoc" JSONB,
    "sau" JSONB,
    "ly_do" TEXT,
    "commandKey" TEXT,
    "payloadHash" TEXT,
    "result" JSONB,
    "tao_luc" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NHAT_KY_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TAI_KHOAN_ten_dang_nhap_key" ON "TAI_KHOAN"("ten_dang_nhap");

-- CreateIndex
CREATE INDEX "KHACH_HANG_so_dien_thoai_idx" ON "KHACH_HANG"("so_dien_thoai");

-- CreateIndex
CREATE INDEX "DON_HANG_tao_luc_trang_thai_kenh_ban_idx" ON "DON_HANG"("tao_luc", "trang_thai", "kenh_ban");

-- CreateIndex
CREATE UNIQUE INDEX "DON_HANG_kenh_ban_ma_don_ngoai_key" ON "DON_HANG"("kenh_ban", "ma_don_ngoai");

-- CreateIndex
CREATE UNIQUE INDEX "DONG_DON_don_hang_id_sku_id_key" ON "DONG_DON"("don_hang_id", "sku_id");

-- CreateIndex
CREATE INDEX "KIEN_HANG_kho_id_trang_thai_idx" ON "KIEN_HANG"("kho_id", "trang_thai");

-- CreateIndex
CREATE UNIQUE INDEX "KIEN_HANG_don_hang_id_kho_id_key" ON "KIEN_HANG"("don_hang_id", "kho_id");

-- CreateIndex
CREATE INDEX "DONG_KIEN_dong_don_id_idx" ON "DONG_KIEN"("dong_don_id");

-- CreateIndex
CREATE UNIQUE INDEX "DONG_KIEN_kien_id_dong_don_id_key" ON "DONG_KIEN"("kien_id", "dong_don_id");

-- CreateIndex
CREATE INDEX "HO_SO_TRA_don_hang_id_trang_thai_idx" ON "HO_SO_TRA"("don_hang_id", "trang_thai");

-- CreateIndex
CREATE INDEX "DONG_TRA_dong_kien_id_idx" ON "DONG_TRA"("dong_kien_id");

-- CreateIndex
CREATE UNIQUE INDEX "DONG_TRA_ho_so_tra_id_dong_kien_id_key" ON "DONG_TRA"("ho_so_tra_id", "dong_kien_id");

-- CreateIndex
CREATE UNIQUE INDEX "GIAO_DICH_TIEN_khoa_chong_trung_key" ON "GIAO_DICH_TIEN"("khoa_chong_trung");

-- CreateIndex
CREATE INDEX "GIAO_DICH_TIEN_don_hang_id_trang_thai_idx" ON "GIAO_DICH_TIEN"("don_hang_id", "trang_thai");

-- CreateIndex
CREATE UNIQUE INDEX "GIAO_DICH_TIEN_nguon_loai_ma_tham_chieu_key" ON "GIAO_DICH_TIEN"("nguon", "loai", "ma_tham_chieu");

-- CreateIndex
CREATE UNIQUE INDEX "BIEN_DONG_TON_khoa_chong_trung_key" ON "BIEN_DONG_TON"("khoa_chong_trung");

-- CreateIndex
CREATE INDEX "BIEN_DONG_TON_kho_id_sku_id_tao_luc_idx" ON "BIEN_DONG_TON"("kho_id", "sku_id", "tao_luc");

-- CreateIndex
CREATE UNIQUE INDEX "NHAT_KY_commandKey_key" ON "NHAT_KY"("commandKey");

-- CreateIndex
CREATE INDEX "NHAT_KY_doi_tuong_ma_doi_tuong_tao_luc_idx" ON "NHAT_KY"("doi_tuong", "ma_doi_tuong", "tao_luc");

-- AddForeignKey
ALTER TABLE "TON_KHO" ADD CONSTRAINT "TON_KHO_kho_id_fkey" FOREIGN KEY ("kho_id") REFERENCES "KHO"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TON_KHO" ADD CONSTRAINT "TON_KHO_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "SKU"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DON_HANG" ADD CONSTRAINT "DON_HANG_khach_hang_id_fkey" FOREIGN KEY ("khach_hang_id") REFERENCES "KHACH_HANG"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DON_HANG" ADD CONSTRAINT "DON_HANG_nguoi_tao_id_fkey" FOREIGN KEY ("nguoi_tao_id") REFERENCES "TAI_KHOAN"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DONG_DON" ADD CONSTRAINT "DONG_DON_don_hang_id_fkey" FOREIGN KEY ("don_hang_id") REFERENCES "DON_HANG"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DONG_DON" ADD CONSTRAINT "DONG_DON_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "SKU"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KIEN_HANG" ADD CONSTRAINT "KIEN_HANG_don_hang_id_fkey" FOREIGN KEY ("don_hang_id") REFERENCES "DON_HANG"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KIEN_HANG" ADD CONSTRAINT "KIEN_HANG_kho_id_fkey" FOREIGN KEY ("kho_id") REFERENCES "KHO"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KIEN_HANG" ADD CONSTRAINT "KIEN_HANG_nguoi_cap_nhat_id_fkey" FOREIGN KEY ("nguoi_cap_nhat_id") REFERENCES "TAI_KHOAN"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DONG_KIEN" ADD CONSTRAINT "DONG_KIEN_kien_id_fkey" FOREIGN KEY ("kien_id") REFERENCES "KIEN_HANG"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DONG_KIEN" ADD CONSTRAINT "DONG_KIEN_dong_don_id_fkey" FOREIGN KEY ("dong_don_id") REFERENCES "DONG_DON"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HO_SO_TRA" ADD CONSTRAINT "HO_SO_TRA_don_hang_id_fkey" FOREIGN KEY ("don_hang_id") REFERENCES "DON_HANG"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HO_SO_TRA" ADD CONSTRAINT "HO_SO_TRA_kho_nhan_id_fkey" FOREIGN KEY ("kho_nhan_id") REFERENCES "KHO"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HO_SO_TRA" ADD CONSTRAINT "HO_SO_TRA_nguoi_tao_id_fkey" FOREIGN KEY ("nguoi_tao_id") REFERENCES "TAI_KHOAN"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HO_SO_TRA" ADD CONSTRAINT "HO_SO_TRA_nguoi_duyet_id_fkey" FOREIGN KEY ("nguoi_duyet_id") REFERENCES "TAI_KHOAN"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DONG_TRA" ADD CONSTRAINT "DONG_TRA_ho_so_tra_id_fkey" FOREIGN KEY ("ho_so_tra_id") REFERENCES "HO_SO_TRA"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DONG_TRA" ADD CONSTRAINT "DONG_TRA_dong_kien_id_fkey" FOREIGN KEY ("dong_kien_id") REFERENCES "DONG_KIEN"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DONG_TRA" ADD CONSTRAINT "DONG_TRA_nguoi_qc_id_fkey" FOREIGN KEY ("nguoi_qc_id") REFERENCES "TAI_KHOAN"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GIAO_DICH_TIEN" ADD CONSTRAINT "GIAO_DICH_TIEN_originalId_fkey" FOREIGN KEY ("originalId") REFERENCES "GIAO_DICH_TIEN"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GIAO_DICH_TIEN" ADD CONSTRAINT "GIAO_DICH_TIEN_don_hang_id_fkey" FOREIGN KEY ("don_hang_id") REFERENCES "DON_HANG"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GIAO_DICH_TIEN" ADD CONSTRAINT "GIAO_DICH_TIEN_kien_id_fkey" FOREIGN KEY ("kien_id") REFERENCES "KIEN_HANG"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GIAO_DICH_TIEN" ADD CONSTRAINT "GIAO_DICH_TIEN_ho_so_tra_id_fkey" FOREIGN KEY ("ho_so_tra_id") REFERENCES "HO_SO_TRA"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GIAO_DICH_TIEN" ADD CONSTRAINT "GIAO_DICH_TIEN_nguoi_ghi_id_fkey" FOREIGN KEY ("nguoi_ghi_id") REFERENCES "TAI_KHOAN"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GIAO_DICH_TIEN" ADD CONSTRAINT "GIAO_DICH_TIEN_nguoi_duyet_id_fkey" FOREIGN KEY ("nguoi_duyet_id") REFERENCES "TAI_KHOAN"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BIEN_DONG_TON" ADD CONSTRAINT "BIEN_DONG_TON_kho_id_fkey" FOREIGN KEY ("kho_id") REFERENCES "KHO"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BIEN_DONG_TON" ADD CONSTRAINT "BIEN_DONG_TON_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "SKU"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BIEN_DONG_TON" ADD CONSTRAINT "BIEN_DONG_TON_nguoi_thuc_hien_id_fkey" FOREIGN KEY ("nguoi_thuc_hien_id") REFERENCES "TAI_KHOAN"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BIEN_DONG_TON" ADD CONSTRAINT "BIEN_DONG_TON_nguoi_duyet_id_fkey" FOREIGN KEY ("nguoi_duyet_id") REFERENCES "TAI_KHOAN"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NHAT_KY" ADD CONSTRAINT "NHAT_KY_tai_khoan_id_fkey" FOREIGN KEY ("tai_khoan_id") REFERENCES "TAI_KHOAN"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
