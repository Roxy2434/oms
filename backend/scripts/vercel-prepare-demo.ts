import 'dotenv/config';
import { prepareDemo } from '../src/domain/demo/fixtures';
import { db } from '../src/server/db';
import { receiveStock } from '../src/domain/inventory/service';
import { demoMatrix } from '../prisma/demo-catalog';

const WAREHOUSE_INDEX: Record<string, 0 | 1 | 2> = {
  'KHO-HN': 0,
  'KHO-DN': 1,
  'KHO-HCM': 2,
};

async function main() {
  const result = await prepareDemo();
  const inv = await db.inventory.findMany({
    include: { warehouse: true, sku: true },
  });
  let toppedUp = 0;
  const target = 150;
  for (const row of inv) {
    if (!row.warehouse.active || !row.sku.active) continue;
    const matrix = demoMatrix[row.skuId];
    const wi = WAREHOUSE_INDEX[row.warehouseId];
    // Preserve intentional 0-stock cells in demoMatrix so 2-warehouse DOM split & backorder cases work live.
    if (matrix && wi !== undefined && matrix[wi] === 0) continue;
    const avail = row.sellable - row.reserved - row.safety;
    if (avail < target) {
      toppedUp++;
      await receiveStock('QL-01', `vercel-init-topup-${row.warehouseId}-${row.skuId}`, {
        warehouseId: row.warehouseId,
        skuId: row.skuId,
        quantity: target - avail,
        reason: 'Nhập bổ sung tồn kho đầu kỳ phục vụ bán hàng đa kênh',
      });
    }
  }
  console.log('[vercel-db-init] Live cases ready:', result.run.cases.length, '| Stock rows topped up:', toppedUp);
}

main()
  .catch((err) => {
    console.error('[vercel-prepare-demo] Failed:', err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
