import { AppShell } from '@/components/layout/app-shell';
import { requireAccount } from '@/server/auth';
export const dynamic='force-dynamic';
export default async function WorkspaceLayout({children}:{children:React.ReactNode}){const account=await requireAccount();return <AppShell role={account.role} name={account.name}>{children}</AppShell>;}
