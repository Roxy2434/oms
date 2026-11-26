import { AppShell } from '@/components/layout/app-shell';
import { requireAccount } from '@/server/auth';
import Link from 'next/link';
import {isPublicDeployment} from '@/domain/demo-mode';
export const dynamic='force-dynamic';
export default async function WorkspaceLayout({children}:{children:React.ReactNode}){const account=await requireAccount();return <AppShell role={account.role} name={account.name}>{isPublicDeployment()&&process.env.OMS_DEMO_REAL_BANK==='1'&&account.role==='QUAN_LY'&&<p role="note"><Link className="text-link" href="/bank">Đối soát giao dịch ngân hàng SePay →</Link></p>}{children}</AppShell>;}
