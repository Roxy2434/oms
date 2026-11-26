// Zero-code classroom rescue helper: restock warehouses safely, pre-create student accounts, or print live status.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { hash } from 'argon2';
import { db } from '../src/server/db';
import { receiveStock } from '../src/domain/inventory/service';
import { OPENING_BALANCE } from '../src/domain/storefront/wallet';

const mode = process.argv[2] || 'status';

// Preserves the exact DOM teaching matrix:
// - Exclusive HN: BT-750-XANH, BD-28
// - Exclusive DN: HT-1200, KH-2
// - Exclusive HCM: DC-3, TG-1
// - Multi-warehouse (cost optimization): CH-500, TH-5, CB-6
// - Out-of-stock demo SKU: KT-SET (kept untouched at 0!)
const RESTOCK_MATRIX: [string, string[], number][] = [
  ['BT-750-XANH', ['KHO-HN'], 500],
  ['BD-28', ['KHO-HN'], 500],
  ['HT-1200', ['KHO-DN'], 500],
  ['KH-2', ['KHO-DN'], 500],
  ['DC-3', ['KHO-HCM'], 500],
  ['TG-1', ['KHO-HCM'], 500],
  ['CH-500', ['KHO-HN', 'KHO-DN', 'KHO-HCM'], 400],
  ['TH-5', ['KHO-HN', 'KHO-DN', 'KHO-HCM'], 400],
  ['CB-6', ['KHO-HN', 'KHO-DN', 'KHO-HCM'], 400],
];

async function run() {
  if (mode === 'restock') {
    const actor = await db.account.findFirstOrThrow({ where: { role: 'QUAN_LY', active: true }, orderBy: { createdAt: 'asc' } });
    let added = 0;
    for (const [skuId, warehouses, targetAtp] of RESTOCK_MATRIX) {
      const sku = await db.sku.findUnique({ where: { id: skuId } });
      if (!sku || !sku.active) continue;
      for (const warehouseId of warehouses) {
        const inv = await db.inventory.findUnique({ where: { warehouseId_skuId: { warehouseId, skuId } } });
        const currentAtp = inv ? Math.max(0, inv.sellable - inv.reserved - inv.safety) : 0;
        if (currentAtp < targetAtp) {
          const delta = targetAtp - currentAtp;
          await receiveStock(actor.id, `rescue-restock-${randomUUID()}`, {
            warehouseId,
            skuId,
            quantity: delta,
            reason: 'Bổ sung tồn kho phục vụ lớp học trải nghiệm',
          });
          added += delta;
        }
      }
    }
    console.log(`[OK] Đã bơm bổ sung ${added} đơn vị hàng hóa (giữ nguyên ma trận tách kho HN/ĐN/HCM và giữ KT-SET hết hàng).`);
    return;
  }

  if (mode === 'accounts') {
    const count = Math.min(100, Math.max(1, Number(process.argv[3] || '40')));
    const password = process.env.CLASSROOM_STUDENT_PASSWORD || 'LopHoc2026';
    const passwordHash = await hash(password);
    let created = 0;
    for (let i = 1; i <= count; i++) {
      const username = 'lop' + String(i).padStart(2, '0');
      const existing = await db.shopAccount.findUnique({ where: { username } });
      if (existing) continue;
      await db.$transaction(async (tx) => {
        const u = await tx.shopAccount.create({
          data: {
            username,
            email: `${username}@lop.demo`,
            name: `Sinh viên ${String(i).padStart(2, '0')}`,
            passwordHash,
            balance: OPENING_BALANCE,
          },
        });
        await tx.shopWalletEntry.create({
          data: {
            accountId: u.id,
            key: 'open:' + u.id,
            kind: 'OPEN',
            amount: OPENING_BALANCE,
            note: 'Tặng khi tạo tài khoản lớp học: 6.000.000đ mô phỏng',
          },
        });
      });
      created++;
    }
    console.log(`[OK] Sẵn sàng ${count} tài khoản học viên: lop01 -> lop${String(count).padStart(2, '0')} (mới tạo thêm: ${created})`);
    console.log(`[OK] Mật khẩu dùng chung cho học viên: ${password} (mỗi ví có sẵn 6.000.000đ mô phỏng)`);
    return;
  }

  const [orders, shopOrders, students, inv] = await Promise.all([
    db.order.count(),
    db.order.count({ where: { channel: 'SHOPVUI' } }),
    db.shopAccount.count(),
    db.inventory.findMany({ where: { warehouse: { active: true }, sku: { active: true } } }),
  ]);
  const totalAtp = inv.reduce((s, i) => s + Math.max(0, i.sellable - i.reserved - i.safety), 0);
  console.log(`[TRẠNG THÁI] Tổng đơn: ${orders} (ShopVui: ${shopOrders}) | Tài khoản khách: ${students} | Tổng tồn khả dụng (ATP): ${totalAtp}`);
}

run()
  .catch((e) => {
    console.error('[LỖI]', e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
