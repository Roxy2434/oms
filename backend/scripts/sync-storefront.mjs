// Copies ../frontend into backend/public when building the dedicated ShopVui storefront site (`OMS_SITE_ROLE=storefront`).
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const backendDir = process.cwd();
const frontendDir = resolve(backendDir, '..', 'frontend');
const publicDir = resolve(backendDir, 'public');

if (process.env.VERCEL === '1' && process.env.OMS_SITE_ROLE !== 'storefront') {
  rmSync(resolve(publicDir, 'shopvui.html'), { force: true });
  rmSync(resolve(publicDir, 'assets'), { recursive: true, force: true });
  console.log('[sync-storefront] Pure OMS role; skipped storefront static copy.');
} else if (existsSync(resolve(frontendDir, 'index.html'))) {
  mkdirSync(publicDir, { recursive: true });
  cpSync(resolve(frontendDir, 'index.html'), resolve(publicDir, 'shopvui.html'));
  const targetAssets = resolve(publicDir, 'assets');
  rmSync(targetAssets, { recursive: true, force: true });
  cpSync(resolve(frontendDir, 'assets'), targetAssets, { recursive: true });
  console.log('[sync-storefront] Synced ../frontend -> public/shopvui.html & public/assets');
} else {
  console.log('[sync-storefront] ../frontend not found; keeping existing public/shopvui.html if present.');
}
