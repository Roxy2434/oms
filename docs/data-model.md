# Mô hình dữ liệu
14 bảng nghiệp vụ; `_prisma_migrations` chỉ là metadata ORM.
| Prisma model | Bảng nguồn |
|---|---|
| Account | TAI_KHOAN |
| Customer | KHACH_HANG |
| Sku | SKU |
| Warehouse | KHO |
| Inventory | TON_KHO |
| Order | DON_HANG |
| OrderLine | DONG_DON |
| Shipment | KIEN_HANG |
| ShipmentLine | DONG_KIEN |
| ReturnCase | HO_SO_TRA |
| ReturnLine | DONG_TRA |
| MoneyTransaction | GIAO_DICH_TIEN |
| InventoryMovement | BIEN_DONG_TON |
| AuditLog | NHAT_KY |

Schema đầy đủ: `prisma/schema.prisma`. FK/UNIQUE/CHECK trong migrations. Trạng thái hàng, hồ sơ trả và tiền được theo dõi riêng; completion projector không tạo bảng nghiệp vụ mới.
Tiền NUMERIC(14,0), quantity nguyên; phiên bản trên order/shipment/inventory/RMA/transactions để phát hiện xung đột. NHAT_KY giữ command key/hash/result, trước/sau; BIEN_DONG_TON giữ delta và snapshot tồn. Không ghi passwordHash vào audit snapshots.
